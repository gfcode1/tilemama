<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte'
  import { fade } from 'svelte/transition'
  import confetti from 'canvas-confetti'
  import { game, initGame, newGame, doMove, spawnStar, spawnBonus, cleanupSpecials, applyPending, cancelPending, tickVirus, canUndo, undoMove } from './lib/game.svelte'
  import { GRID_SIZE } from './lib/types'
  import { sfx, isMuted, toggleMute } from './lib/sfx'
  import { GameScheduler } from './services/scheduler'
  import Tile from './components/board/Tile.svelte'
  import SpecialTile from './components/board/SpecialTile.svelte'
  import DragTrail from './components/board/DragTrail.svelte'
  import PendingBanner from './components/hud/PendingBanner.svelte'
  import Header from './components/hud/Header.svelte'
  import Help from './components/hud/Help.svelte'
  import Onboarding from './components/modals/Onboarding.svelte'

  let drag = $state<{ id: string; sx: number; sy: number; cx: number; cy: number } | null>(null)
  let trail = $state<{ x: number; y: number }[]>([])
  let animating = $state(false)
  let gridEl: HTMLDivElement | null = $state(null)
  let popIds = $state<Set<string>>(new Set())
  let spawnIds = $state<Set<string>>(new Set())
  let prevIds = new Set<string>()
  let scorePops = $state<{ id: string; x: number; y: number; text: string }[]>([])
  let shake = $state(false)
  let muted = $state(isMuted())
  let showOnboard = $state(false)
  let showHelp = $state(false)
  let swipeDir = $state<'N'|'S'|'E'|'W'| null>(null)

  let scheduler: GameScheduler | null = null

  function resetPrevIds() {
    prevIds = new Set([...game.blocks.map(b=>b.id), ...game.specials.map(s=>s.id)])
  }

  onMount(() => {
    initGame()
    resetPrevIds()
    try { if (!localStorage.getItem('tilemama_seen')) showOnboard = true } catch {}
    scheduler = new GameScheduler({
      onStar: () => {
        if (game.pendingMode || game.gameOver) return
        const s = spawnStar()
        if (s) triggerSpecialSpawn(s.x, s.y, s.kind)
      },
      onBonus: () => {
        if (game.pendingMode || game.gameOver) return
        const s = spawnBonus()
        if (s) triggerSpecialSpawn(s.x, s.y, s.kind)
      },
      onCleanup: () => {
        const removed = cleanupSpecials()
        if (removed.length) void game.specialsTick
      },
      onVirus: () => {
        const changed = tickVirus()
        if (changed.length) void game.specialsTick
      }
    })
    scheduler.start()
    window.addEventListener('pointermove', handlePointerMove as any, { passive: true })
    window.addEventListener('pointerup', handlePointerUp as any)
    window.addEventListener('pointercancel', handlePointerCancel as any)
    window.addEventListener('keydown', handleKeydown as any)
  })
  onDestroy(() => {
    scheduler?.stop()
    window.removeEventListener('pointermove', handlePointerMove as any)
    window.removeEventListener('pointerup', handlePointerUp as any)
    window.removeEventListener('pointercancel', handlePointerCancel as any)
    window.removeEventListener('keydown', handleKeydown as any)
  })

  // pause scheduler when pending or gameOver
  $effect(() => {
    scheduler?.setPaused(!!game.pendingMode || !!game.gameOver)
  })

  function dismissOnboard() {
    showOnboard = false
    try { localStorage.setItem('tilemama_seen','1') } catch {}
  }

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

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleUndo(); }
    else if (e.key === 'n' || e.key === 'N') { if (!game.pendingMode) handleNewGame(); }
    else if (e.key === 'm' || e.key === 'M') handleToggleMute()
    else if (e.key === '?') showHelp = !showHelp
    else if (e.key === 'Escape' && game.pendingMode) { cancelPending(); sfx.tap(); }
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
    drag = null
    trail = []
    swipeDir = null

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
        pushScorePop(res.finalX,res.finalY,'32!')
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
  function handlePointerCancel() { drag = null; trail=[]; swipeDir=null; }

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

  let bannerIcon = $derived.by(() => {
    if (!game.pendingMode) return ''
    const map:Record<string,string> = { x2:'×2', div2:'÷2', jolly:'🌈', bombColor:'💣', clone:'➕', virus:'☢️', safeX5:'💎' }
    return map[game.pendingMode] ?? '×2'
  })
  let canUndoNow = $derived(canUndo() && !game.pendingMode && !game.gameOver)
</script>

<div class="candy-orbs min-h-[100dvh] min-h-[100svh] flex flex-col items-center px-3 pt-[max(10px,env(safe-area-inset-top))] pb-[max(10px,env(safe-area-inset-bottom))] gap-3 select-none touch-manipulation">
  <Header score={game.score} bestScore={game.bestScore} muted={muted} showHelp={showHelp} onToggleMute={handleToggleMute} onToggleHelp={()=> showHelp=!showHelp} />

  <div class="w-full max-w-[420px] flex sm:hidden gap-2" aria-live="polite">
    <div class="flex-1 bg-white border border-orange-200 rounded-2xl px-3 py-2 flex items-center justify-between shadow-sm">
      <span class="text-[10px] font-black tracking-widest text-[#9a3412]/60">SCORE</span>
      <span class="game-font font-extrabold text-[#431407] text-lg leading-none">{game.score}</span>
    </div>
    <div class="flex-1 bg-white border border-orange-200 rounded-2xl px-3 py-2 flex items-center justify-between shadow-sm">
      <span class="text-[10px] font-black tracking-widest text-[#9a3412]/60">BEST</span>
      <span class="game-font font-extrabold text-[#431407] text-lg leading-none">{game.bestScore}</span>
    </div>
  </div>

  <Help showHelp={showHelp} />

  <div bind:this={gridEl} role="grid" aria-label="Griglia di gioco 8x8" class="w-full max-w-[420px] aspect-square bg-[#fffbeb] border-2 border-[#fed7aa] rounded-[28px] p-[7px] shadow-[0_18px_40px_rgba(124,45,18,0.14),0_6px_14px_rgba(124,45,18,0.08)] relative overflow-hidden {shake ? 'animate-[candyShake_320ms_ease]' : ''} {game.pendingMode ? 'ring-2 ' + (game.pendingMode==='x2' ? 'ring-violet-300' : game.pendingMode==='div2' ? 'ring-orange-300' : game.pendingMode==='jolly' ? 'ring-pink-300' : game.pendingMode==='bombColor' ? 'ring-rose-300' : game.pendingMode==='virus' ? 'ring-lime-300' : game.pendingMode==='safeX5' ? 'ring-amber-300' : 'ring-cyan-300') : ''}"
    style="touch-action:none"
  >
    <div class="absolute inset-[7px] grid gap-1" style="grid-template-columns: repeat({GRID_SIZE}, minmax(0,1fr)); grid-template-rows: repeat({GRID_SIZE}, minmax(0,1fr));">
      {#each Array(GRID_SIZE*GRID_SIZE) as _}
        <div class="bg-white/85 border border-orange-100 rounded-[14px] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"></div>
      {/each}
    </div>

    <DragTrail trail={trail} swipeDir={swipeDir} gridEl={gridEl} />

    <div class="absolute inset-[7px]">
      {#each game.blocks as b (b.id)}
        {@const isPop = popIds.has(b.id)}
        {@const isSpawn = spawnIds.has(b.id)}
        {@const isVibrating = !!game.pendingMode}
        {@const tier = b.value >= 16 ? 5 : b.value >=8 ? 4 : b.value >=4 ?3: b.value>=2?2:1}
        <Tile block={b} isPop={isPop} isSpawn={isSpawn} isVibrating={isVibrating} bannerIcon={bannerIcon} tier={tier} posStyle={cellPos(b.x,b.y)} onPointerDown={handlePointerDown} />
      {/each}
      {#each game.specials as s (s.id)}
        <SpecialTile special={s} posStyle={cellPos(s.x,s.y)} />
      {/each}

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
        <button type="button" onclick={handleNewGame} class="mt-1 bg-gradient-to-b from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-black px-7 py-3 rounded-2xl shadow-[0_10px_18px_rgba(244,63,94,0.3)] border-2 border-white active:scale-95 transition">Ricomincia</button>
      </div>
    {/if}
  </div>

  {#if game.pendingMode}
    <PendingBanner mode={game.pendingMode} onCancel={handleCancelPending} />
  {/if}
  {#if game.pendingSafeX5}
    <div class="w-full max-w-[420px] bg-gradient-to-r from-amber-200 to-yellow-400 border-2 border-white text-[#431407] rounded-2xl px-3 py-2 text-xs font-black text-center shadow-sm" in:fade={{duration:150}}>💎 Prossimo merge ×5 attivo!</div>
  {/if}

  <div class="w-full max-w-[420px] grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
    <button type="button" onclick={handleUndo} disabled={!canUndoNow} class="bg-white border-2 border-orange-200 rounded-2xl py-3 font-black text-sm shadow-sm active:scale-[0.98] transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:grayscale">
      ↩ Undo
    </button>
    <div class="text-[10px] font-black tracking-widest text-[#9a3412]/50 text-center leading-none">TRASCINA<br/><span class="text-[11px]">PER MUOVERE</span></div>
    <button type="button" onclick={handleNewGame} class="bg-gradient-to-b from-[#431407] to-[#7c2d12] text-[#fffbeb] border-2 border-white rounded-2xl py-3 font-black text-sm shadow-sm active:scale-[0.98] transition">Nuova</button>
  </div>

  <footer class="w-full max-w-[420px] text-[10px] font-bold tracking-wide text-[#9a3412]/45 text-center px-2 leading-relaxed">
    PWA installabile · {game.blocks.length} blocchi · {game.specials.length} speciali {#if game.pendingMode}· {game.pendingMode}{/if} {#if game.pendingSafeX5}· ×5{/if}
  </footer>

  {#if showOnboard}
    <Onboarding onDismiss={dismissOnboard} />
  {/if}
</div>
