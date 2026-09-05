<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte'
  import { scale, fade, fly } from 'svelte/transition'
  import { cubicOut, elasticOut, backOut } from 'svelte/easing'
  import confetti from 'canvas-confetti'
  import { game, initGame, newGame, doMove, spawnStar, spawnBonus, cleanupSpecials, applyPending, cancelPending, tickVirus, canUndo, undoMove } from './lib/game.svelte'
  import { GRID_SIZE } from './lib/types'
  import { sfx, isMuted, toggleMute } from './lib/sfx'
  import { candyTileClass, candyValueSize } from './lib/candy'

  let drag = $state<{ id: string; sx: number; sy: number; cx: number; cy: number } | null>(null)
  let trail = $state<{ x: number; y: number }[]>([])
  let animating = $state(false)
  let gridEl: HTMLDivElement | null = $state(null)
  let trailCanvas: HTMLCanvasElement | null = $state(null)
  let popIds = $state<Set<string>>(new Set())
  let spawnIds = $state<Set<string>>(new Set())
  let prevIds = new Set<string>()
  let scorePops = $state<{ id: string; x: number; y: number; text: string }[]>([])
  let shake = $state(false)
  let muted = $state(isMuted())
  let showOnboard = $state(false)
  let showHelp = $state(false)
  let swipeDir = $state<'N'|'S'|'E'|'W'| null>(null)

  let starInterval: number | null = null
  let bonusInterval: number | null = null
  let cleanupInterval: number | null = null
  let virusInterval: number | null = null

  function resetPrevIds() {
    prevIds = new Set([...game.blocks.map(b=>b.id), ...game.specials.map(s=>s.id)])
  }

  function scheduleBonus() {
    if (bonusInterval) clearTimeout(bonusInterval as any)
    const delay = 8000 + Math.random()*5000
    bonusInterval = window.setTimeout(() => {
      if (game.pendingMode || game.gameOver) {
        bonusInterval = window.setTimeout(() => scheduleBonus(), 1000) as any
        return
      }
      const s = spawnBonus()
      if (s) triggerSpecialSpawn(s.x, s.y, s.kind)
      scheduleBonus()
    }, delay) as any
  }

  let ro: ResizeObserver | null = null
  onMount(() => {
    initGame()
    resetPrevIds()
    try { if (!localStorage.getItem('tilemama_seen')) showOnboard = true } catch {}
    starInterval = window.setInterval(() => { 
      if (game.pendingMode || game.gameOver) return
      const s = spawnStar()
      if (s) triggerSpecialSpawn(s.x, s.y, s.kind)
    }, 10000) as any
    scheduleBonus()
    cleanupInterval = window.setInterval(() => { 
      const removed = cleanupSpecials()
      if (removed.length) void game.specialsTick
    }, 250)
    virusInterval = window.setInterval(() => {
      const changed = tickVirus()
      if (changed.length) void game.specialsTick
    }, 1000)
    // resize trail canvas
    ro = new ResizeObserver(()=> syncCanvasSize())
    if (gridEl) ro.observe(gridEl)
    syncCanvasSize()
    window.addEventListener('pointermove', handlePointerMove as any, { passive: true })
    window.addEventListener('pointerup', handlePointerUp as any)
    window.addEventListener('pointercancel', handlePointerCancel as any)
  })
  onDestroy(() => {
    if (starInterval) clearInterval(starInterval)
    if (bonusInterval) clearTimeout(bonusInterval as any)
    if (cleanupInterval) clearInterval(cleanupInterval)
    if (virusInterval) clearInterval(virusInterval)
    if (ro) ro.disconnect()
    window.removeEventListener('pointermove', handlePointerMove as any)
    window.removeEventListener('pointerup', handlePointerUp as any)
    window.removeEventListener('pointercancel', handlePointerCancel as any)
  })

  function dismissOnboard() {
    showOnboard = false
    try { localStorage.setItem('tilemama_seen','1') } catch {}
  }

  function syncCanvasSize() {
    if (!gridEl || !trailCanvas) return
    const r = gridEl.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    trailCanvas.width = r.width * dpr
    trailCanvas.height = r.height * dpr
    trailCanvas.style.width = r.width + 'px'
    trailCanvas.style.height = r.height + 'px'
    const ctx = trailCanvas.getContext('2d')
    if (ctx) ctx.setTransform(dpr,0,0,dpr,0,0)
  }

  function drawTrail() {
    if (!trailCanvas) return
    const ctx = trailCanvas.getContext('2d')
    if (!ctx) return
    const r = trailCanvas.getBoundingClientRect()
    // clear
    ctx.clearRect(0,0,r.width,r.height)
    if (trail.length < 2) return
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // glow backdrop
    ctx.strokeStyle = 'rgba(251,146,60,0.18)'
    ctx.lineWidth = 18
    ctx.beginPath()
    ctx.moveTo(trail[0].x, trail[0].y)
    for (let i=1;i<trail.length;i++) ctx.lineTo(trail[i].x, trail[i].y)
    ctx.stroke()
    // core
    const grad = ctx.createLinearGradient(trail[0].x, trail[0].y, trail[trail.length-1].x, trail[trail.length-1].y)
    grad.addColorStop(0, '#fb7185')
    grad.addColorStop(0.5, '#fde68a')
    grad.addColorStop(1, '#7dd3fc')
    ctx.strokeStyle = grad as any
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.moveTo(trail[0].x, trail[0].y)
    for (let i=1;i<trail.length;i++) ctx.lineTo(trail[i].x, trail[i].y)
    ctx.stroke()
    // arrow head
    if (swipeDir && trail.length >=2) {
      const last = trail[trail.length-1]
      const prev = trail[trail.length-2]
      const ang = Math.atan2(last.y - prev.y, last.x - prev.x)
      ctx.fillStyle = '#fff7ed'
      ctx.strokeStyle = 'rgba(67,20,7,0.15)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(last.x, last.y)
      ctx.lineTo(last.x - Math.cos(ang - 0.45)*16, last.y - Math.sin(ang - 0.45)*16)
      ctx.lineTo(last.x - Math.cos(ang + 0.45)*16, last.y - Math.sin(ang + 0.45)*16)
      ctx.closePath()
      ctx.fill(); ctx.stroke()
    }
  }

  $effect(()=> {
    // redraw trail when drag moves
    void drag; void trail.length
    drawTrail()
  })

  function handleNewGame() {
    newGame()
    resetPrevIds()
    spawnIds.clear()
    popIds.clear()
    scorePops = []
    const c=centerOfGrid()
    sfx.pop(); sfx.star()
    confetti({particleCount:28, spread:70, origin:c, colors:['#fb7185','#34d399','#fde68a','#7dd3fc','#f472b6'], scalar:0.95, zIndex:50})
  }

  function handleUndo() {
    if (!canUndo()) { sfx.error(); triggerShake(); return }
    const ok = undoMove()
    if (ok) { sfx.undo(); triggerShake(false); }
  }

  function handleToggleMute() {
    muted = toggleMute()
    sfx.tap()
  }

  // detect new spawns for scale-in
  let _version = $derived(game.version)
  let _sTick = $derived(game.specialsTick)
  let _blocks = $derived(game.blocks)
  let _specials = $derived(game.specials)
  $effect(() => {
    void _version; void _sTick; void _blocks; void _specials
    const cur = new Set([...game.blocks.map(b=>b.id), ...game.specials.map(s=>s.id)])
    const prev = untrack(() => new Set(prevIds))
    for (const id of cur) if (!prev.has(id)) {
      spawnIds.add(id)
      setTimeout(()=> { spawnIds.delete(id) }, 420)
    }
    untrack(() => { prevIds = cur })
  })

  function cellPos(x:number, y:number) {
    return `left: calc(${x} * ((100% - 28px)/8 + 4px)); top: calc(${y} * ((100% - 28px)/8 + 4px)); width: calc((100% - 28px)/8); height: calc((100% - 28px)/8);`
  }

  function posToOrigin(x:number, y:number) {
    if (!gridEl) return { x: 0.5, y: 0.5 }
    const r = gridEl.getBoundingClientRect()
    const cellW = (r.width - 14 - 28) / 8
    const gap = 4
    const cx = r.left + 7 + x * (cellW + gap) + cellW/2
    const cy = r.top + 7 + y * (cellW + gap) + cellW/2
    return { x: cx / window.innerWidth, y: cy / window.innerHeight }
  }

  function triggerShake(isError=false) {
    shake = true
    setTimeout(()=> shake=false, isError ? 420 : 320)
  }

  function pushScorePop(x:number,y:number,text:string) {
    const id = Math.random().toString(36).slice(2)
    scorePops = [...scorePops, { id, x, y, text }]
    setTimeout(()=> { scorePops = scorePops.filter(p=>p.id!==id) }, 900)
  }

  function handlePointerDown(e: PointerEvent, id: string) {
    if (game.gameOver || animating) return
    const r = gridEl?.getBoundingClientRect()
    const cx = r ? e.clientX - r.left : 0
    const cy = r ? e.clientY - r.top : 0
    drag = { id, sx: e.clientX, sy: e.clientY, cx, cy }
    trail = [{ x: cx, y: cy }]
    swipeDir = null
    // no pointer capture — we listen globally on window so trail keeps updating even outside grid
    e.preventDefault()
  }
  function handlePointerMove(e: PointerEvent) {
    if (!drag || !gridEl) return
    const r = gridEl.getBoundingClientRect()
    const cx = e.clientX - r.left
    const cy = e.clientY - r.top
    drag.cx = cx; drag.cy = cy
    const dx = e.clientX - drag.sx
    const dy = e.clientY - drag.sy
    if (Math.hypot(dx,dy) > 14) {
      if (Math.abs(dx) > Math.abs(dy)) swipeDir = dx>0 ? 'E':'W'
      else swipeDir = dy>0 ? 'S':'N'
    }
    trail = [...trail, { x: cx, y: cy }].slice(-18)
  }
  function handlePointerUp(e: PointerEvent) {
    if (!drag) return
    const dx = e.clientX - drag.sx
    const dy = e.clientY - drag.sy
    const id = drag.id
    const startTrail = [...trail]
    drag = null
    trail = []
    swipeDir = null
    drawTrail()

    // PENDING MODE: tap to apply
    if (game.pendingMode) {
      if (Math.hypot(dx, dy) < 28) {
        const block = game.blocks.find(b=>b.id===id)
        if (!block) return
        const res = applyPending(id)
        if (res?.applied) {
          popIds.add(id)
          setTimeout(()=> popIds.delete(id), 460)
          const origin = posToOrigin(block.x, block.y)
          const mode = res.mode
          sfx.apply()
          if (mode==='x2') burstAt(origin, '#a78bfa', 30, 0.9)
          else if (mode==='div2') burstAt(origin, '#fb923c', 30, 0.9)
          else if (mode==='jolly') burstAt(origin, '#f472b6', 28, 0.85)
          else if (mode==='bombColor') burstAt(origin, '#fb7185', 44, 1.05)
          else if (mode==='clone') burstAt(origin, '#34d399', 26, 0.85)
          else if (mode==='virus') burstAt(origin, '#a3e635', 26, 0.85)
          else if (mode==='safeX5') burstAt(origin, '#fde68a', 32, 0.9)
          if (res.exploded) { burstAt(origin, null, 42, 1.05); sfx.explode(); pushScorePop(block.x, block.y, 'BOOM!') }
          else pushScorePop(block.x, block.y, mode==='x2'?'×2!': mode==='div2'?'÷2': mode==='bombColor'?'BOOM!':'OK!')
          try { navigator.vibrate?.(60) } catch {}
        } else { sfx.error(); triggerShake(true) }
      }
      return
    }

    if (Math.hypot(dx, dy) < 28) return
    let dir: 'N'|'S'|'E'|'W' | null = null
    if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? 'E' : 'W'
    else dir = dy > 0 ? 'S' : 'N'
    if (!dir) return
    animating = true
    const before = game.blocks.find(b=>b.id===id)
    const res = doMove(id, dir)
    if (res) {
      const origin = posToOrigin(res.finalX, res.finalY)
      if (res.merged) {
        popIds.add(id)
        setTimeout(()=> popIds.delete(id), 420)
        sfx.merge()
        pushScorePop(res.finalX, res.finalY, `+${res.scoreGain}`)
        burstAt(origin, candyHex(before?.color ?? 'green'), 16, 0.65)
        if (game.pendingSafeX5) burstAt(origin, '#fde68a', 18, 0.65)
      } else if (res.moved) {
        sfx.move()
      } else {
        sfx.error()
        triggerShake(true)
      }
      if (res.exploded) {
        sfx.explode()
        triggerShake()
        burstAt(origin, null, 44, 1.05)
        pushScorePop(res.finalX,res.finalY,'64!')
      }
      if (res.hitWall) {
        if (res.wallDestroyed) sfx.wallBreak(); else sfx.wallHit()
        triggerShake(true)
        burstAt(origin, res.wallDestroyed ? '#a8a29e' : '#d6d3d1', res.wallDestroyed ? 28 : 12, 0.65)
        try { navigator.vibrate?.(28) } catch {}
      }
      if (res.hitSpecial) {
        const k = res.hitSpecialKind
        if (res.activatedPending) {
          sfx.pending()
          const col = pendingColor(res.activatedPending)
          burstAt(origin, col, 32, 0.9)
          try { navigator.vibrate?.(80) } catch {}
        } else if (k==='star') { sfx.star(); burstAt(origin, '#f0abfc', 32, 0.9); pushScorePop(res.finalX,res.finalY,'★ +4') }
        else if (k==='laser') { sfx.laser(); burstAt(origin, '#fb7185', 34, 0.9) }
        else if (k==='magnet') { sfx.magnet(); burstAt(origin, '#22d3ee', 28, 0.85) }
        else if (k==='vortex') { sfx.vortex(); burstAt(origin, '#a78bfa', 30, 0.9) }
        else if (k==='shuffle') { sfx.shuffle(); burstAt(origin, '#fbbf24', 30, 0.9) }
        else { sfx.bonus(); burstAt(origin, specialHex(k??'star'), 26, 0.85) }
      }
    } else {
      sfx.error()
    }
    setTimeout(() => animating = false, 200)
  }
  function handlePointerCancel() { drag = null; trail=[]; swipeDir=null; drawTrail() }

  function handleCancelPending() { cancelPending(); sfx.tap() }

  function centerOfGrid() {
    if (!gridEl) return { x: 0.5, y: 0.5 }
    const r = gridEl.getBoundingClientRect()
    return { x: (r.left + r.width/2)/window.innerWidth, y: (r.top + r.height/2)/window.innerHeight }
  }
  function burstAt(origin: {x:number,y:number}, hex: string | null, count:number, spreadMul:number) {
    const colors = hex ? [hex] : ['#fb7185','#34d399','#fde68a','#7dd3fc','#f472b6','#fbbf24']
    confetti({
      particleCount: count,
      spread: 72 * spreadMul,
      startVelocity: 28,
      ticks: 150,
      gravity: 1.02,
      origin,
      colors,
      scalar: 0.92,
      zIndex: 60,
    })
    if (count > 30) {
      setTimeout(()=> confetti({ particleCount: 16, spread: 120, origin, colors, scalar:0.72, ticks:120, zIndex:60 }), 80)
    }
  }
  function triggerSpecialSpawn(x:number,y:number, kind: string){
    burstAt(posToOrigin(x,y), specialHex(kind), 12, 0.55)
    sfx.bonus()
  }
  function candyHex(c:string){
    return { green:'#34d399', red:'#fb7185', yellow:'#fde68a', blue:'#7dd3fc' }[c] ?? '#fde68a'
  }
  function specialHex(k:string){
    const m:Record<string,string> = {
      star:'#f0abfc', x2:'#a78bfa', div2:'#fb923c', jolly:'#f472b6', bombColor:'#fb7185',
      laser:'#f43f5e', wall:'#a8a29e', magnet:'#22d3ee', vortex:'#a78bfa', shuffle:'#fbbf24',
      clone:'#34d399', virus:'#a3e635', safeX5:'#fde68a'
    }
    return m[k] ?? '#f0abfc'
  }
  function pendingColor(m:string){
    const col:Record<string,string> = { x2:'#a78bfa', div2:'#fb923c', jolly:'#f472b6', bombColor:'#fb7185', clone:'#34d399', virus:'#a3e635', safeX5:'#fde68a' }
    return col[m] ?? '#a78bfa'
  }

  function specialClass(k: string) {
    if (k==='x2') return 'from-violet-400 to-violet-600 border-violet-200 text-white shadow-violet-500/25'
    if (k==='div2') return 'from-orange-400 to-orange-600 border-orange-200 text-white shadow-orange-500/25'
    if (k==='jolly') return 'from-pink-400 to-pink-600 border-pink-200 text-white shadow-pink-500/25'
    if (k==='bombColor') return 'from-rose-400 to-rose-600 border-rose-200 text-white shadow-rose-500/25'
    if (k==='laser') return 'from-rose-600 to-red-600 border-rose-200 text-white shadow-red-600/25'
    if (k==='wall') return 'from-stone-400 to-stone-600 border-stone-200 text-white shadow-stone-500/25'
    if (k==='magnet') return 'from-cyan-400 to-cyan-600 border-cyan-200 text-white shadow-cyan-600/25'
    if (k==='vortex') return 'from-violet-500 to-violet-700 border-violet-200 text-white shadow-violet-700/25'
    if (k==='shuffle') return 'from-amber-400 to-amber-600 border-amber-200 text-white shadow-amber-500/25'
    if (k==='clone') return 'from-emerald-400 to-emerald-600 border-emerald-200 text-white shadow-emerald-600/25'
    if (k==='virus') return 'from-lime-500 to-lime-600 border-lime-200 text-white shadow-lime-600/25'
    if (k==='safeX5') return 'from-amber-200 to-yellow-400 border-yellow-100 text-amber-950 shadow-yellow-500/25'
    return 'from-fuchsia-400 to-fuchsia-600 border-fuchsia-200 text-white'
  }
  function specialLabel(k: string) {
    if (k==='x2') return '×2'
    if (k==='div2') return '÷2'
    if (k==='jolly') return '🌈'
    if (k==='bombColor') return '💣'
    if (k==='laser') return '—'
    if (k==='wall') return '🧱'
    if (k==='magnet') return '🧲'
    if (k==='vortex') return '🌀'
    if (k==='shuffle') return '🔀'
    if (k==='clone') return '➕'
    if (k==='virus') return '☢️'
    if (k==='safeX5') return '💎'
    return '★'
  }
  function pendingBanner(p: string) {
    const map:Record<string,{bg:string, icon:string, text:string}> = {
      x2: {bg:'from-violet-400 to-violet-600', icon:'×2', text:'Tocca un blocco per raddoppiarlo!'},
      div2: {bg:'from-orange-400 to-orange-600', icon:'÷2', text:'Tocca per dimezzarlo!'},
      jolly: {bg:'from-pink-400 to-pink-600', icon:'🌈', text:'Tocca per renderlo Jolly!'},
      bombColor: {bg:'from-rose-400 to-rose-600', icon:'💣', text:'Tocca per eliminare quel colore!'},
      clone: {bg:'from-emerald-400 to-emerald-600', icon:'➕', text:'Tocca per clonarlo!'},
      virus: {bg:'from-lime-500 to-lime-600', icon:'☢️', text:'Tocca per infettarlo!'},
      safeX5: {bg:'from-amber-300 to-yellow-500 text-amber-950', icon:'💎', text:'Prossimo merge ×5 — tocca un blocco!'},
    }
    return map[p] ?? map['x2']
  }
  let banner = $derived(game.pendingMode ? pendingBanner(game.pendingMode) : null)
  let canUndoNow = $derived(canUndo() && !game.pendingMode && !game.gameOver)
</script>

<div class="candy-orbs min-h-[100dvh] min-h-[100svh] flex flex-col items-center px-3 pt-[max(10px,env(safe-area-inset-top))] pb-[max(10px,env(safe-area-inset-bottom))] gap-3 select-none touch-manipulation">
  <!-- HEADER -->
  <header class="w-full max-w-[420px] flex items-center justify-between gap-2">
    <div class="flex items-center gap-2">
      <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-400 to-amber-300 border-2 border-white shadow-[0_8px_18px_rgba(251,113,133,0.35)] flex items-center justify-center text-white font-black text-lg game-font">T</div>
      <div>
        <h1 class="game-font text-[22px] leading-none font-extrabold tracking-tight text-[#431407]">Tile<span class="text-[#fb7185]">Mama</span></h1>
        <div class="text-[10px] font-extrabold tracking-[0.14em] text-[#9a3412]/70 -mt-0.5">CANDY POP</div>
      </div>
    </div>
    <div class="flex items-center gap-1.5">
      <button onclick={handleToggleMute} aria-label="toggle sound" class="w-9 h-9 rounded-xl bg-white border border-orange-200 shadow-sm flex items-center justify-center active:scale-95 transition text-sm">{muted ? '🔇' : '🔊'}</button>
      <button onclick={()=> showHelp = !showHelp} aria-label="help" class="w-9 h-9 rounded-xl bg-white border border-orange-200 shadow-sm flex items-center justify-center active:scale-95 transition text-sm">?</button>
      <div class="hidden sm:flex gap-1.5">
        <div class="bg-white border border-orange-200 rounded-2xl px-3 py-1.5 text-center min-w-[72px] shadow-sm">
          <div class="text-[9px] font-black tracking-widest text-[#9a3412]/60">SCORE</div>
          <div class="game-font font-extrabold text-[#431407] leading-none text-[15px]">{game.score}</div>
        </div>
        <div class="bg-white border border-orange-200 rounded-2xl px-3 py-1.5 text-center min-w-[72px] shadow-sm">
          <div class="text-[9px] font-black tracking-widest text-[#9a3412]/60">BEST</div>
          <div class="game-font font-extrabold text-[#431407] leading-none text-[15px]">{game.bestScore}</div>
        </div>
      </div>
    </div>
  </header>

  <!-- SCORE PILLS MOBILE -->
  <div class="w-full max-w-[420px] flex sm:hidden gap-2">
    <div class="flex-1 bg-white border border-orange-200 rounded-2xl px-3 py-2 flex items-center justify-between shadow-sm">
      <span class="text-[10px] font-black tracking-widest text-[#9a3412]/60">SCORE</span>
      <span class="game-font font-extrabold text-[#431407] text-lg leading-none">{game.score}</span>
    </div>
    <div class="flex-1 bg-white border border-orange-200 rounded-2xl px-3 py-2 flex items-center justify-between shadow-sm">
      <span class="text-[10px] font-black tracking-widest text-[#9a3412]/60">BEST</span>
      <span class="game-font font-extrabold text-[#431407] text-lg leading-none">{game.bestScore}</span>
    </div>
  </div>

  <!-- HELP COLLAPSIBLE -->
  {#if showHelp}
    <div class="w-full max-w-[420px] bg-white/90 backdrop-blur border border-orange-200 rounded-2xl p-3 text-[11px] leading-relaxed text-[#7c2d12] shadow-sm" in:fly={{ y: -8, duration: 180 }} out:fade={{duration:120}}>
      <b>Swipe</b> per scorrere fino al muro/blocco. <b>Stesso colore+valore → merge</b> (somma). <b>64</b> esplode in 4. <b>★</b> 4 blocchi ogni 10s. Bonus random 8-13s: 💣🧲🌀🔀➕☢️💎🧱 — alcuni richiedono <b>tap</b>. Jolly 🌈 fonde con tutto.
    </div>
  {/if}

  <!-- GRID CARD -->
  <div bind:this={gridEl} role="grid" aria-label="Griglia di gioco 8x8" class="w-full max-w-[420px] aspect-square bg-[#fffbeb] border-2 border-[#fed7aa] rounded-[28px] p-[7px] shadow-[0_18px_40px_rgba(124,45,18,0.14),0_6px_14px_rgba(124,45,18,0.08)] relative overflow-hidden {shake ? 'animate-[candyShake_320ms_ease]' : ''} {game.pendingMode ? 'ring-2 ' + (game.pendingMode==='x2' ? 'ring-violet-300' : game.pendingMode==='div2' ? 'ring-orange-300' : game.pendingMode==='jolly' ? 'ring-pink-300' : game.pendingMode==='bombColor' ? 'ring-rose-300' : game.pendingMode==='virus' ? 'ring-lime-300' : game.pendingMode==='safeX5' ? 'ring-amber-300' : 'ring-cyan-300') : ''}"
    style="touch-action:none"
  >
    <!-- cells -->
    <div class="absolute inset-[7px] grid gap-1" style="grid-template-columns: repeat({GRID_SIZE}, minmax(0,1fr)); grid-template-rows: repeat({GRID_SIZE}, minmax(0,1fr));">
      {#each Array(GRID_SIZE*GRID_SIZE) as _}
        <div class="bg-white/85 border border-orange-100 rounded-[14px] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"></div>
      {/each}
    </div>

    <!-- trail canvas -->
    <canvas bind:this={trailCanvas} class="absolute inset-[7px] pointer-events-none z-[5] rounded-[20px]"></canvas>

    <!-- blocks + specials -->
    <div class="absolute inset-[7px]">
      {#each game.blocks as b (b.id)}
        {@const isPop = popIds.has(b.id)}
        {@const isSpawn = spawnIds.has(b.id)}
        {@const isVibrating = !!game.pendingMode}
        {@const tier = b.value >= 32 ? 5 : b.value >=16 ? 4 : b.value >=8 ?3: b.value>=4?2:1}
        <button
          class="absolute rounded-[14px] border-2 border-b-[4px] bg-gradient-to-b font-black flex items-center justify-center shadow-[0_10px_18px_rgba(124,45,18,0.18)] touch-none select-none overflow-hidden
            {candyTileClass(b.color, b.value, b.jolly, b.virus)} {isPop ? 'z-20' : 'z-10'} {isVibrating ? 'vibrate-block cursor-pointer' : ''} {tier===5 ? 'animate-[candyPulseGold_900ms_ease_infinite]' : ''}"
          style="{cellPos(b.x,b.y)}; transition: left 200ms cubic-bezier(.22,.8,.24,1), top 200ms cubic-bezier(.22,.8,.24,1), transform 320ms {isPop ? 'cubic-bezier(.34,1.56,.64,1)' : 'ease-out'}; {isPop ? 'transform: scale(1.14);' : ''} {isVibrating ? 'animation-delay: ' + ((b.x + b.y*3) % 5 * 38) + 'ms;' : ''}"
          in:scale={{duration: isSpawn ? 320 : 0, start:0.55, easing: backOut}}
          onpointerdown={(e)=>handlePointerDown(e, b.id)}
          onpointerup={handlePointerUp}
          onpointercancel={handlePointerCancel}
          aria-label="{b.color} {b.value}"
        >
          <span class="tile-highlight absolute inset-0 rounded-[12px] pointer-events-none"></span>
          <span class="tile-gloss absolute inset-0 rounded-[12px] pointer-events-none"></span>
          <span class="relative game-font {candyValueSize(b.value)} leading-none drop-shadow-[0_1px_0_rgba(0,0,0,0.18)] {isPop ? 'animate-[candyPop_320ms_ease]' : ''}">{b.value}</span>
          {#if b.jolly}
            <span class="absolute -top-1 -left-1 text-[9px] bg-gradient-to-br from-pink-400 to-pink-600 text-white rounded-full w-[18px] h-[18px] flex items-center justify-center font-black shadow border border-white">🌈</span>
          {/if}
          {#if b.virus}
            <span class="absolute -bottom-1 -right-1 text-[8px] bg-gradient-to-br from-lime-500 to-lime-600 text-white rounded-full w-[18px] h-[18px] flex items-center justify-center font-black shadow border border-white animate-pulse">☢️</span>
          {/if}
          {#if isVibrating && banner}
            <span class="absolute -top-1 -right-1 text-[9px] bg-white text-[#431407] rounded-full w-[18px] h-[18px] flex items-center justify-center font-black shadow border border-orange-200">{banner.icon}</span>
          {/if}
          {#if tier>=3}
            <span class="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-white/35 rounded-full blur-[1px] pointer-events-none"></span>
          {/if}
        </button>
      {/each}
      {#each game.specials as s (s.id)}
        {@const life =  (Date.now() - s.expiresAt + (s.kind==='wall' ? 5000 : 3000)) }
        <div
          class="absolute rounded-[12px] border-2 border-b-[3px] bg-gradient-to-b flex items-center justify-center font-black shadow-[0_8px_14px_rgba(0,0,0,0.12)] z-10 overflow-hidden {specialClass(s.kind)} {s.kind==='wall' && (s.hp ?? 2)===1 ? 'opacity-85' : ''}"
          style="{cellPos(s.x,s.y)};"
          in:scale={{duration:260, start:0.55, easing: backOut}}
          out:fade={{duration:140}}
        >
          <span class="tile-gloss absolute inset-0 rounded-[10px] pointer-events-none opacity-60"></span>
          <span class="relative animate-[pulse_900ms_ease_infinite] text-[13px]">{specialLabel(s.kind)}</span>
          {#if s.kind==='wall'}<span class="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] bg-white text-stone-700 rounded-full px-1.5 py-0.5 font-black border border-stone-200">{s.hp ?? 2}♥</span>{/if}
          <!-- timer bar -->
          <div class="absolute bottom-0 left-0 right-0 h-[4px] bg-black/15">
            <div class="h-full bg-white/90 origin-left" style="animation: candyTimer {s.kind==='wall' ? 5000 : 3000}ms linear forwards;"></div>
          </div>
        </div>
      {/each}

      <!-- score pops -->
      {#each scorePops as p (p.id)}
        <div class="absolute z-30 pointer-events-none game-font font-black text-[13px] text-[#431407] bg-white border border-orange-200 rounded-full px-2 py-0.5 shadow-md"
          style="left: calc({p.x} * ((100% - 28px)/8 + 4px) + ((100% - 28px)/8)/2); top: calc({p.y} * ((100% - 28px)/8 + 4px)); transform: translate(-50%, -8px); animation: candyFloat 900ms ease forwards;">
          {p.text}
        </div>
      {/each}
    </div>

    {#if game.gameOver}
      <div class="absolute inset-0 bg-[#fff7ed]/85 backdrop-blur-[6px] flex flex-col items-center justify-center gap-3 p-6 text-center z-30" in:fade={{duration:220}} out:fade={{duration:140}}>
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 to-amber-300 flex items-center justify-center text-2xl shadow">🍭</div>
        <div class="game-font text-2xl font-black text-[#431407]">Game Over</div>
        <div class="text-sm font-bold text-[#9a3412]/70">Griglia piena!</div>
        <div class="text-[13px] bg-white border border-orange-200 rounded-2xl px-4 py-2 shadow-sm">Score <span class="font-black text-[#431407]">{game.score}</span> · Best <span class="font-black text-[#431407]">{game.bestScore}</span></div>
        <button onclick={handleNewGame} class="mt-1 bg-gradient-to-b from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-black px-7 py-3 rounded-2xl shadow-[0_10px_18px_rgba(244,63,94,0.3)] border-2 border-white active:scale-95 transition">Ricomincia</button>
      </div>
    {/if}
  </div>

  {#if game.pendingMode && banner}
    <div class="w-full max-w-[420px] rounded-2xl px-3 py-2.5 flex items-center justify-between font-black shadow-[0_10px_18px_rgba(0,0,0,0.12)] border-2 border-white bg-gradient-to-r {banner.bg} {banner.bg.includes('yellow') || banner.bg.includes('amber') ? 'text-[#431407]' : 'text-white'}" in:scale={{duration:200, start:0.96, easing: backOut}}>
      <span class="flex items-center gap-2 text-[13px] leading-tight">
        <span class="w-8 h-8 rounded-xl bg-white/90 border border-white flex items-center justify-center text-[#431407] text-sm shadow-sm">{banner.icon}</span>
        <span class="pr-2">{banner.text}</span>
      </span>
      <button onclick={handleCancelPending} class="shrink-0 bg-white text-[#431407] border border-black/5 rounded-xl px-3 py-1.5 text-xs font-black shadow-sm active:scale-95">Annulla ✕</button>
    </div>
  {/if}
  {#if game.pendingSafeX5}
    <div class="w-full max-w-[420px] bg-gradient-to-r from-amber-200 to-yellow-400 border-2 border-white text-[#431407] rounded-2xl px-3 py-2 text-xs font-black text-center shadow-sm" in:fade={{duration:150}}>💎 Prossimo merge ×5 attivo!</div>
  {/if}

  <!-- THUMB BAR -->
  <div class="w-full max-w-[420px] grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
    <button onclick={handleUndo} disabled={!canUndoNow} class="bg-white border-2 border-orange-200 rounded-2xl py-3 font-black text-sm shadow-sm active:scale-[0.98] transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:grayscale">
      ↩ Undo
    </button>
    <div class="text-[10px] font-black tracking-widest text-[#9a3412]/50 text-center leading-none">TRASCINA<br/><span class="text-[11px]">PER MUOVERE</span></div>
    <button onclick={handleNewGame} class="bg-gradient-to-b from-[#431407] to-[#7c2d12] text-[#fffbeb] border-2 border-white rounded-2xl py-3 font-black text-sm shadow-sm active:scale-[0.98] transition">Nuova</button>
  </div>

  <footer class="w-full max-w-[420px] text-[10px] font-bold tracking-wide text-[#9a3412]/45 text-center px-2 leading-relaxed">
    PWA installabile · {game.blocks.length} blocchi · {game.specials.length} speciali {#if game.pendingMode}· {game.pendingMode}{/if} {#if game.pendingSafeX5}· ×5{/if}
  </footer>

  <!-- ONBOARDING -->
  {#if showOnboard}
    <div class="fixed inset-0 z-40 bg-[#431407]/40 backdrop-blur-[3px] flex items-center justify-center p-4" in:fade={{duration:180}} out:fade={{duration:140}}>
      <div class="w-full max-w-[360px] bg-[#fffbeb] border-2 border-white rounded-[24px] p-5 shadow-[0_18px_40px_rgba(67,20,7,0.25)] text-center" in:scale={{duration:260, start:0.92, easing: backOut}}>
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-amber-300 border-2 border-white shadow mx-auto flex items-center justify-center text-xl">🍬</div>
        <div class="game-font text-xl font-black text-[#431407] mt-3">Benvenutə in TileMama!</div>
        <div class="text-[13px] leading-relaxed text-[#7c2d12] mt-2 font-semibold">
          Trascina un blocco per farlo scivolare fino all’ostacolo.<br/>
          Stesso <b>colore + valore</b> → si fondono!<br/>
          <span class="inline-flex items-center gap-1 mt-1 bg-white border border-orange-200 rounded-full px-2 py-1 text-[11px]">🌈 Jolly fonde con tutto · 64 💥 fa +4</span>
        </div>
        <div class="grid grid-cols-3 gap-2 mt-4 text-[11px] font-black">
          <div class="bg-white border border-orange-200 rounded-2xl p-2">👆<br/>Swipe</div>
          <div class="bg-white border border-orange-200 rounded-2xl p-2">➕<br/>Merge</div>
          <div class="bg-white border border-orange-200 rounded-2xl p-2">💥<br/>64</div>
        </div>
        <button onclick={dismissOnboard} class="mt-4 w-full bg-gradient-to-b from-rose-400 to-rose-500 text-white font-black py-3 rounded-2xl border-2 border-white shadow active:scale-[0.98]">Gioca! 🍭</button>
        <div class="text-[10px] font-bold text-[#9a3412]/50 mt-2">Specials ogni 10s · bonus ogni 8-13s</div>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(html){ overscroll-behavior:none }
  @keyframes vibrate {
    0% { transform: translate(0,0) rotate(0deg); }
    12% { transform: translate(-1px, 1px) rotate(-0.5deg); }
    24% { transform: translate(1px, -1px) rotate(0.5deg); }
    36% { transform: translate(-1.1px, 0.5px) rotate(-0.35deg); }
    48% { transform: translate(1.1px, 0.7px) rotate(0.35deg); }
    60% { transform: translate(-0.8px, -0.7px) rotate(-0.25deg); }
    72% { transform: translate(0.8px, 0.5px) rotate(0.25deg); }
    84% { transform: translate(-0.5px, 0.8px) rotate(-0.15deg); }
    100% { transform: translate(0,0) rotate(0deg); }
  }
  .vibrate-block { animation: vibrate 220ms linear infinite; }
</style>
