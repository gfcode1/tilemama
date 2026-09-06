<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte'
  import { fade } from 'svelte/transition'
  import { game, initGame, newGame, doMove, spawnStar, spawnBonus, cleanupSpecials, applyPending, cancelPending, tickVirus, canUndo, undoMove, engine, tapSpecial } from './lib/game.svelte'
  import { GRID_SIZE, DIRS } from './lib/types'
  import type { Dir } from './lib/types'
  import { sfx, isMuted, toggleMute } from './lib/sfx'
  import { GameScheduler } from './services/scheduler'
  import { resolveMove } from './core/engine/MoveResolver'
  import { loadPersisted } from './services/persistence'
  import { loadLeaderboard, pushScore } from './services/leaderboard'
  import type { LeaderboardEntry } from './services/leaderboard'
  import Tile from './components/board/Tile.svelte'
  import SpecialTile from './components/board/SpecialTile.svelte'
  import DragTrail from './components/board/DragTrail.svelte'
  import PendingBanner from './components/hud/PendingBanner.svelte'
  import Help from './components/hud/Help.svelte'
  import Onboarding from './components/modals/Onboarding.svelte'
  import ParticleLayer from './components/effects/ParticleLayer.svelte'
  import ComboBar from './components/hud/ComboBar.svelte'
  import MissionBar from './components/hud/MissionBar.svelte'
  import AchievementToast from './components/hud/AchievementToast.svelte'
  import TitleMenu from './components/menu/TitleMenu.svelte'
  import GameHeader from './components/menu/GameHeader.svelte'
  import PauseSheet from './components/menu/PauseSheet.svelte'
  import Leaderboard from './components/menu/Leaderboard.svelte'
  import Credits from './components/menu/Credits.svelte'
  import Shop from './components/shop/Shop.svelte'
  import { ACHIEVEMENTS } from './core/config/achievements'

  function angleToDir8(dx:number, dy:number): Dir {
    const a = Math.atan2(dy, dx) * 180 / Math.PI
    if (a > -22.5 && a <= 22.5) return 'E'
    if (a > 22.5 && a <= 67.5) return 'SE'
    if (a > 67.5 && a <= 112.5) return 'S'
    if (a > 112.5 && a <= 157.5) return 'SW'
    if (a > 157.5 || a <= -157.5) return 'W'
    if (a > -157.5 && a <= -112.5) return 'NW'
    if (a > -112.5 && a <= -67.5) return 'N'
    return 'NE'
  }

  type View = 'menu' | 'game' | 'help' | 'leaderboard' | 'credits' | 'shop'

  let drag = $state<{ id: string; sx: number; sy: number; cx: number; cy: number } | null>(null)
  let trail = $state<{ x: number; y: number }[]>([])
  let animating = $state(false)
  let gridEl: HTMLDivElement | null = $state(null)
  let popIds = $state<Set<string>>(new Set())
  let spawnIds = $state<Set<string>>(new Set())
  let prevIds = new Set<string>()
  let scorePops = $state<{ id: string; x: number; y: number; main: string; sub?: string; kind: string }[]>([])
  let shake = $state(false)
  let flash = $state(false)
  let muted = $state(isMuted())
  let showOnboard = $state(false)
  let swipeDir = $state<Dir | null>(null)

  let view = $state<View>('menu')
  let hasSave = $state(false)
  let showPause = $state(false)
  let leaderboardEntries = $state<LeaderboardEntry[]>([])

  let scheduler: GameScheduler | null = null
  let particleLayer: ParticleLayer | null = $state(null)

  function resetPrevIds() {
    prevIds = new Set([...game.blocks.map(b=>b.id), ...game.specials.map(s=>s.id)])
  }

  function refreshHasSave() {
    try {
      const s = loadPersisted()
      hasSave = !!s && !s.gameOver && !!s.grid?.flat().some((c: any) => c !== null)
    } catch { hasSave = false }
  }

  onMount(() => {
    initGame()
    resetPrevIds()
    refreshHasSave()
    leaderboardEntries = loadLeaderboard()
    try { if (!localStorage.getItem('tilemama_seen')) showOnboard = true } catch {}
    scheduler = new GameScheduler({
      onStar: () => {
        if (view !== 'game' || game.pendingMode || game.gameOver) return
        const s = spawnStar()
        if (s) triggerSpecialSpawn(s.x, s.y, s.kind)
      },
      onBonus: () => {
        if (view !== 'game' || game.pendingMode || game.gameOver) return
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

  $effect(() => {
    const paused = view !== 'game' || !!game.pendingMode || !!game.gameOver || showPause
    scheduler?.setPaused(paused)
  })

  // push to leaderboard on gameOver (avoid duplicate on initial load)
  let prevGameOver = $state(false)
  let leaderboardPushedForScore = $state<number | null>(null)
  $effect(() => {
    const go = game.gameOver
    if (go && !prevGameOver && game.score > 0 && leaderboardPushedForScore !== game.score) {
      const maxTile = Math.max(0, ...game.blocks.map(b=>b.value))
      leaderboardEntries = pushScore(game.score, maxTile)
      leaderboardPushedForScore = game.score
    }
    if (!go) leaderboardPushedForScore = null
    prevGameOver = go
  })

  // achievement/mission toasts side-effects (sfx + burst)
  let prevToastsLen = 0
  $effect(() => {
    const len = game.toasts.length
    if (len > prevToastsLen && len > 0) {
      const t = game.toasts[game.toasts.length - 1]
      if (t.kind === 'mission') { sfx.star(); try { navigator.vibrate?.(40) } catch {} }
      else { sfx.bonus(); try { navigator.vibrate?.([40,30,60]) } catch {} }
      // burst at center grid
      try { burstKind(centerOfGrid(), 'star', 18) } catch {}
    }
    prevToastsLen = len
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
    view = 'game'
    showPause = false
    refreshHasSave()
    const c=centerOfGrid()
    sfx.pop(); sfx.star()
    try { (particleLayer as any)?.burst?.(c, 'boom', 24, null) } catch {}
  }

  function handleContinue() {
    // initGame already loaded save; just go to game view
    resetPrevIds()
    view = 'game'
    showPause = false
  }

  function handleGoMenu() {
    if (view === 'game' && !game.gameOver && game.blocks.length > 0) {
      showPause = true
      return
    }
    view = 'menu'
    showPause = false
    refreshHasSave()
    leaderboardEntries = loadLeaderboard()
  }

  function handleResume() { showPause = false; sfx.tap() }
  function handleRestartFromPause() {
    showPause = false
    handleNewGame()
  }
  function handleExitToMenu() {
    showPause = false
    view = 'menu'
    refreshHasSave()
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
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if(view==='game') handleUndo(); }
    else if (e.key === 'm' || e.key === 'M') handleToggleMute()
    else if (e.key === 'Escape') {
      if (showPause) { showPause = false; return }
      if (game.pendingMode) { cancelPending(); sfx.tap(); return }
      if (view === 'game') handleGoMenu()
      else if (view !== 'menu') view = 'menu'
    }
    else if (e.key === '?' && view==='game') { view='help' }
    else if (e.key === '?' && view==='help') { view='game' }
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
    const style = getComputedStyle(gridEl)
    const pad = parseFloat(style.paddingLeft) || 7
    // measure actual gap from computed --grid-gap fallback 4
    const gap = parseFloat(style.getPropertyValue('--grid-gap')) || 4
    const innerW = r.width - pad * 2
    const cellW = (innerW - gap * 7) / 8
    const cx = r.left + pad + x * (cellW + gap) + cellW/2
    const cy = r.top + pad + y * (cellW + gap) + cellW/2
    return { x: cx / window.innerWidth, y: cy / window.innerHeight }
  }

  function triggerShake(isError=false) {
    shake = true
    setTimeout(()=> shake=false, isError ? 420 : 320)
  }
  function triggerFlash() {
    flash = true
    setTimeout(()=> flash=false, 120)
  }

  function pushScorePop(x:number,y:number,main:string, sub?:string, kind='merge') {
    const id = Math.random().toString(36).slice(2)
    scorePops = [...scorePops, { id, x, y, main, sub, kind }]
    setTimeout(()=> { scorePops = scorePops.filter(p=>p.id!==id) }, kind==='boom' ? 1100 : 900)
  }

  function handlePointerDown(e: PointerEvent, id: string) {
    if (view !== 'game' || game.gameOver || animating) return
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
      swipeDir = angleToDir8(dx, dy)
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
          else if (mode==='jolly') burstAt(origin, '#f472b6', 28, 0.85)
          else if (mode==='bombColor') burstAt(origin, '#fb7185', 44, 1.05)
          else if (mode==='clone') burstAt(origin, '#34d399', 26, 0.85)
          const comboTxt = (res as any).combo >1 ? `×${(res as any).combo}` : undefined
          if (res.exploded) { burstAt(origin, null, 42, 1.05); sfx.explode(); pushScorePop(block.x, block.y, 'BOOM!', comboTxt ? `${comboTxt} +${res.scoreGain ?? ''}` : `+${res.scoreGain ?? 32}`, 'boom') }
          else pushScorePop(block.x, block.y, mode==='x2'?'×2!': mode==='bombColor'?'BOOM!':'OK!', comboTxt, 'pending')
          try { navigator.vibrate?.(60) } catch {}
        } else { sfx.error(); triggerShake(true) }
      }
      return
    }

    if (Math.hypot(dx, dy) < 28) return
    let dir: Dir | null = angleToDir8(dx, dy)
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
        const c = (res as any).combo as number|undefined
        const m = (res as any).multiplier as number|undefined
        const sub = c && c>1 ? `×${c}${m && m>1 ? ` · ×${m.toFixed(2).replace(/\.00$/,'')}` : ''}` : (m && m>1 ? `×${m.toFixed(2)}` : undefined)
        const kind = (res as any).combo && (res as any).combo>=3 ? 'boom' : 'merge'
        pushScorePop(res.finalX, res.finalY, `+${res.scoreGain}`, sub, kind)
        burstAt(origin, candyHex(before?.color ?? 'green'), c && c>1 ? 22 : 16, c && c>1 ? 0.8 : 0.65)
      } else if (res.moved) {
        sfx.move()
      } else {
        sfx.error()
        triggerShake(true)
      }
      if (res.exploded) {
        sfx.explode()
        triggerShake()
        triggerFlash()
        burstAt(origin, null, 44, 1.05)
        const c = (res as any).combo as number|undefined
        const sub = c && c>1 ? `×${c} COMBO!` : undefined
        pushScorePop(res.finalX,res.finalY,'BOOM 32!', sub, 'boom')
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
        } else if (k==='star') { sfx.star(); burstKind(origin, 'star', 32); pushScorePop(res.finalX,res.finalY,'★ +4', undefined, 'star') }
        else if (k==='laser') { sfx.laser(); burstKind(origin, 'laser', 34) }
        else if (k==='vortex') { sfx.vortex(); burstKind(origin, 'vortex', 30) }
        else if (k==='shuffle') { sfx.shuffle(); burstKind(origin, 'shuffle', 30) }
        else { sfx.bonus(); burstKind(origin, k??'star', 26) }
      }
    } else {
      sfx.error()
    }
    setTimeout(() => animating = false, 200)
  }
  function handlePointerCancel() { drag = null; trail=[]; swipeDir=null; }

  function handleSpecialTap(s: any) {
    if (view !== 'game' || game.gameOver || animating) return
    if (game.pendingMode) { sfx.error(); triggerShake(true); return }
    // avoid tap immediately after drag end
    const res: any = tapSpecial(s.id)
    if (!res) { sfx.error(); triggerShake(true); return }
    const origin = posToOrigin(s.x, s.y)
    if (res.hitWall) {
      if (res.wallDestroyed) { sfx.wallBreak(); triggerShake(true); burstAt(origin, '#a8a29e', 28, 0.65); pushScorePop(s.x, s.y, 'CRACK!', undefined, 'boom') }
      else { sfx.wallHit(); triggerShake(true); burstAt(origin, '#d6d3d1', 12, 0.6) }
      try { navigator.vibrate?.(28) } catch {}
      return
    }
    if (res.hitSpecial) {
      const k = res.hitSpecialKind
      if (res.activatedPending) {
        sfx.pending()
        burstAt(origin, pendingColor(res.activatedPending), 32, 0.9)
        try { navigator.vibrate?.(80) } catch {}
      } else if (k==='star') { sfx.star(); burstKind(origin, 'star', 32); pushScorePop(s.x,s.y,'★ +4', undefined, 'star') }
      else if (k==='laser') { sfx.laser(); burstKind(origin, 'laser', 34) }
      else if (k==='vortex') { sfx.vortex(); burstKind(origin, 'vortex', 30) }
      else if (k==='shuffle') { sfx.shuffle(); burstKind(origin, 'shuffle', 30) }
      else { sfx.bonus(); burstKind(origin, k??'star', 26) }
    }
  }

  function handleCancelPending() { cancelPending(); sfx.tap() }

  function centerOfGrid() {
    if (!gridEl) return { x: 0.5, y: 0.5 }
    const r = gridEl.getBoundingClientRect()
    return { x: (r.left + r.width/2)/window.innerWidth, y: (r.top + r.height/2)/window.innerHeight }
  }
  function burstAt(origin: {x:number,y:number}, hex: string | null, count:number, _spreadMul:number) {
    try {
      const kind = !hex ? 'boom' : 'merge'
      ;(particleLayer as any)?.burst?.(origin, kind, Math.min(count, 28), hex)
    } catch {}
  }
  function burstKind(origin:{x:number,y:number}, kind:string, count:number) {
    const map:Record<string,string> = { star:'#f0abfc', laser:'#f43f5e', vortex:'#a78bfa', shuffle:'#fbbf24', wall:'#a8a29e', clone:'#34d399', bombColor:'#fb7185', jolly:'#f472b6', x2:'#a78bfa' }
    const hex = map[kind] ?? null
    try { (particleLayer as any)?.burst?.(origin, kind==='star'?'star': kind==='laser'?'laser': kind==='vortex'?'vortex': kind==='shuffle'?'shuffle': kind==='wall'?'wall': kind==='bombColor'?'bomb': kind==='clone'?'merge': 'default', Math.min(count, 28), hex ?? map[kind] ?? null) } catch {}
    // single emission only — ParticleLayer handles second wave internally
  }
  function triggerSpecialSpawn(x:number,y:number, kind: string){
    burstKind(posToOrigin(x,y), kind, 14)
    sfx.bonus()
  }
  function candyHex(c:string){
    return { green:'#34d399', red:'#fb7185', yellow:'#fde68a', blue:'#7dd3fc' }[c] ?? '#fde68a'
  }
  function pendingColor(m:string){
    const col:Record<string,string> = { x2:'#a78bfa', jolly:'#f472b6', bombColor:'#fb7185', clone:'#34d399' }
    return col[m] ?? '#a78bfa'
  }

  let bannerIcon = $derived.by(() => {
    if (!game.pendingMode) return ''
    const map:Record<string,string> = { x2:'×2', jolly:'🌈', bombColor:'💣', clone:'➕' }
    return map[game.pendingMode] ?? '×2'
  })
  let canUndoNow = $derived(canUndo() && !game.pendingMode && !game.gameOver)

  type Preview = { finalX:number; finalY:number; type:string; path:{x:number;y:number}[] }
  let preview = $derived.by<Preview|null>(() => {
    if (view!=='game' || !drag || !swipeDir || game.pendingMode || game.gameOver) return null
    const block = game.blocks.find(b=>b.id===drag!.id)
    if (!block) return null
    const g = engine.grid.map(row=> [...row]) as any
    g[block.y][block.x] = null
    const r: any = resolveMove(block as any, swipeDir as any, g)
    const path: {x:number;y:number}[] = []
    let cx = block.x, cy = block.y
    const { dx, dy } = DIRS[swipeDir as Dir]
    const targetX = r.type==='wall' ? (r as any).beforeX : r.finalX
    const targetY = r.type==='wall' ? (r as any).beforeY : r.finalY
    if (r.type==='slide' && !(r as any).moved) return null
    while (cx!==targetX || cy!==targetY) {
      cx += dx; cy += dy
      if (cx<0||cx>=GRID_SIZE||cy<0||cy>=GRID_SIZE) break
      path.push({x:cx,y:cy})
    }
    if (path.length===0) path.push({x:r.finalX, y:r.finalY})
    return { finalX: r.finalX, finalY: r.finalY, type: r.type, path }
  })

  let pendingIds = $derived.by<Set<string>>(() => {
    if (!game.pendingMode) return new Set()
    return new Set(game.blocks.map(b=>b.id))
  })
  let bombColorHint: string | null = $state(null)
  $effect(() => {
    if (game.pendingMode==='bombColor' && game.blocks.length) {
      const counts: Record<string,number> = {}
      for (const b of game.blocks) counts[b.color] = (counts[b.color]??0)+1
      bombColorHint = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? null
    } else bombColorHint = null
  })
</script>

<div class="candy-orbs min-h-[100dvh] min-h-[100svh] flex flex-col items-center px-3 sm:px-4 lg:px-6 pt-[max(10px,env(safe-area-inset-top))] pb-[max(10px,env(safe-area-inset-bottom))] gap-3 sm:gap-4 select-none touch-manipulation">

  {#if view==='menu'}
    <div class="flex-1 flex flex-col items-center justify-center w-full py-6" in:fade={{duration:200}}>
      <TitleMenu hasSave={hasSave} bestScore={game.bestScore} coins={game.coins} {muted} onNewGame={handleNewGame} onContinue={handleContinue} onHelp={()=> view='help'} onLeaderboard={()=> { leaderboardEntries=loadLeaderboard(); view='leaderboard'}} onShop={()=> view='shop'} onCredits={()=> view='credits'} onToggleMute={handleToggleMute} />
      {#if showOnboard}
        <Onboarding onDismiss={dismissOnboard} />
      {/if}
    </div>
  {:else if view==='help'}
    <div class="w-full max-w-[420px] sm:max-w-[560px] pt-2 flex flex-col gap-3" in:fade={{duration:160}}>
      <button type="button" onclick={()=> view='menu'} class="self-start bg-white border border-orange-200 rounded-xl px-3 py-2 text-xs font-black shadow-sm">← Menu</button>
      <Help showHelp={true} />
      <button type="button" onclick={()=> view='menu'} class="w-full bg-white border-2 border-orange-200 rounded-2xl py-3 font-black text-sm shadow-sm">Chiudi</button>
    </div>
  {:else if view==='leaderboard'}
    <div class="w-full flex flex-col items-center pt-2" in:fade={{duration:160}}>
      <Leaderboard entries={leaderboardEntries} onBack={()=> view='menu'} />
    </div>
  {:else if view==='credits'}
    <div class="w-full flex flex-col items-center pt-2" in:fade={{duration:160}}>
      <Credits onBack={()=> view='menu'} />
    </div>
  {:else if view==='shop'}
    <div class="w-full flex flex-col items-center pt-2" in:fade={{duration:160}}>
      <Shop onBack={()=> view='menu'} />
    </div>
  {:else}
    <!-- GAME VIEW -->
    <GameHeader score={game.score} bestScore={game.bestScore} coins={game.coins} {muted} onMenu={handleGoMenu} onToggleMute={handleToggleMute} />
    <AchievementToast toasts={game.toasts} />

    <div bind:this={gridEl} role="grid" aria-label="Griglia di gioco 8x8" aria-busy={animating} class="w-full max-w-[420px] sm:max-w-[560px] aspect-square bg-[#fffbeb] border-2 sm:border-[2.5px] border-[#fed7aa] rounded-[28px] sm:rounded-[32px] p-[7px] sm:p-[8px] shadow-[0_18px_40px_rgba(124,45,18,0.14),0_6px_14px_rgba(124,45,18,0.08)] relative overflow-hidden {shake ? 'animate-[candyShake_420ms_ease]' : ''} {game.pendingMode ? 'ring-2 ' + (game.pendingMode==='x2' ? 'ring-violet-300' : game.pendingMode==='jolly' ? 'ring-pink-300' : game.pendingMode==='bombColor' ? 'ring-rose-300' : 'ring-cyan-300') : ''}"
      style="touch-action:none"
    >
      <div class="absolute inset-[7px] sm:inset-[8px] grid" style="grid-template-columns: repeat({GRID_SIZE}, minmax(0,1fr)); grid-template-rows: repeat({GRID_SIZE}, minmax(0,1fr)); gap: var(--grid-gap);">
        {#each Array(GRID_SIZE*GRID_SIZE) as _}
          <div class="bg-white/78 backdrop-blur-[1px] border border-orange-100/70 rounded-[14px] sm:rounded-[16px] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"></div>
        {/each}
      </div>

      <DragTrail trail={trail} swipeDir={swipeDir} gridEl={gridEl} />
      <ParticleLayer bind:this={particleLayer} gridEl={gridEl} />

      {#if preview}
        {#each preview.path as p (p.x + '-' + p.y)}
          <div class="absolute rounded-[14px] sm:rounded-[16px] pointer-events-none z-[6] border-2 {preview.type==='merge' ? 'bg-emerald-400/18 border-emerald-400/40' : preview.type==='special' ? 'bg-fuchsia-400/18 border-fuchsia-400/40' : preview.type==='wall' ? 'bg-stone-400/16 border-stone-400/35' : 'bg-orange-300/22 border-orange-300/40'}"
            style="{cellPos(p.x,p.y)}; transition: opacity 120ms ease;"></div>
        {/each}
        <div class="absolute rounded-[14px] sm:rounded-[16px] pointer-events-none z-[6] border-[2.5px] bg-white/62 backdrop-blur-[2px] flex items-center justify-center {preview.type==='merge' ? 'border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]' : preview.type==='special' ? 'border-fuchsia-400 shadow-[0_0_12px_rgba(232,121,249,0.45)]' : preview.type==='wall' ? 'border-stone-500' : 'border-orange-400/60'}"
          style="{cellPos(preview.finalX, preview.finalY)}">
           <span class="text-[12px] sm:text-[13px] font-black {preview.type==='merge' ? 'text-emerald-700' : preview.type==='special' ? 'text-fuchsia-700' : preview.type==='wall' ? 'text-stone-600' : 'text-orange-600/80'}">{preview.type==='merge' ? '＋' : preview.type==='special' ? '★' : preview.type==='wall' ? '🧱' : ({N:'↑',S:'↓',E:'→',W:'←',NE:'↗',NW:'↖',SE:'↘',SW:'↙'}[swipeDir as string] ?? '→')}</span>
        </div>
      {/if}

      {#if flash}
        <div class="absolute inset-0 bg-white/80 z-20 pointer-events-none animate-[flash_120ms_ease] rounded-[28px]"></div>
      {/if}
      <div class="absolute inset-[7px] sm:inset-[8px] overflow-visible">
        {#each game.blocks as b (b.id)}
          {@const isPop = popIds.has(b.id)}
          {@const isSpawn = spawnIds.has(b.id)}
          {@const rawPending = pendingIds.has(b.id)}
          {@const isBombDim = game.pendingMode==='bombColor' && bombColorHint && b.color !== bombColorHint}
          {@const isPending = rawPending && !isBombDim}
          {@const isDimmed = isBombDim}
          {@const tier = b.value >= 16 ? 5 : b.value >=8 ? 4 : b.value >=4?3: b.value>=1?2:1}
          <div class="{isDimmed ? 'opacity-45 grayscale-[0.25] saturate-50' : ''} contents">
          <Tile block={b} isPop={isPop} isSpawn={isSpawn} isVibrating={false} isPending={isPending} pendingMode={game.pendingMode} bannerIcon={bannerIcon} tier={tier} posStyle={cellPos(b.x,b.y)} onPointerDown={handlePointerDown} />
          </div>
        {/each}
        {#each game.specials as s (s.id)}
          <SpecialTile special={s} posStyle={cellPos(s.x,s.y)} onTap={handleSpecialTap} />
        {/each}

        {#each scorePops as p (p.id)}
          <div class="absolute z-30 pointer-events-none flex flex-col items-center -translate-x-1/2 {p.kind==='boom' ? 'animate-[candyBoom_900ms_cubic-bezier(.34,1.56,.64,1)_forwards]' : 'animate-[candyFloat_900ms_ease_forwards]'}"
            style="left: calc({p.x} * ((100% - 28px)/8 + 4px) + ((100% - 28px)/8)/2); top: calc({p.y} * ((100% - 28px)/8 + 4px));">
            <span class="game-font font-black {p.kind==='boom' ? 'text-[18px] text-white bg-gradient-to-br from-rose-500 to-amber-400 border-2 border-white shadow-[0_6px_16px_rgba(244,63,94,0.4)] rounded-full px-3 py-1' : p.kind==='star' ? 'text-[13px] text-[#431407] bg-white border border-orange-200 rounded-full px-2 py-0.5 shadow-md' : 'text-[15px] text-white bg-[#431407] border border-white/20 rounded-full px-2.5 py-0.5 shadow-[0_6px_14px_rgba(0,0,0,0.25)]'} leading-none">{p.main}</span>
            {#if p.sub}
              <span class="mt-0.5 game-font font-black text-[10px] leading-none {p.kind==='boom' ? 'text-amber-900 bg-white rounded-full px-1.5 py-0.5 border border-amber-200' : 'text-white bg-black/70 rounded-full px-1.5 py-0.5'}">{p.sub}</span>
            {/if}
          </div>
        {/each}
      </div>

      {#if game.gameOver}
        <div class="absolute inset-0 bg-[#fff7ed]/88 backdrop-blur-[6px] flex flex-col items-center justify-center gap-3 p-6 text-center z-30" in:fade={{duration:220}} out:fade={{duration:140}}>
          <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-amber-300 flex items-center justify-center text-2xl sm:text-3xl shadow">🍭</div>
          <div class="game-font text-2xl sm:text-3xl font-black text-[#431407]">Game Over</div>
          <div class="text-sm font-bold text-[#9a3412]/70">Griglia piena!</div>
          <div class="grid grid-cols-2 gap-2 w-full max-w-[280px]">
            <div class="bg-white border border-orange-200 rounded-2xl px-3 py-2 shadow-sm text-center">
              <div class="text-[9px] font-black tracking-widest text-[#9a3412]/60">SCORE</div><div class="game-font font-black text-[#431407] tabular-nums">{game.score}</div>
            </div>
            <div class="bg-white border border-orange-200 rounded-2xl px-3 py-2 shadow-sm text-center">
              <div class="text-[9px] font-black tracking-widest text-[#9a3412]/60">BEST</div><div class="game-font font-black text-[#431407] tabular-nums">{game.bestScore}</div>
            </div>
          </div>
          <div class="text-[11px] font-bold text-[#9a3412]/55">{game.blocks.length} blocchi · max {Math.max(0,...game.blocks.map(b=>b.value))}</div>
          <div class="flex gap-2 mt-1">
            <button type="button" onclick={handleNewGame} class="bg-gradient-to-b from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-black px-6 py-3 rounded-2xl shadow-[0_10px_18px_rgba(244,63,94,0.3)] border-2 border-white active:scale-95 transition focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:outline-none">Rigioca</button>
            <button type="button" onclick={()=> view='menu'} class="bg-white border-2 border-orange-200 rounded-2xl px-5 py-3 font-black text-sm shadow-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:outline-none">Menu</button>
          </div>
        </div>
      {/if}
    </div>

    <!-- combo fixed-height slot below grid: prevents layout shift -->
    {@const showCombo = game.combo > 1 || game.comboMult > 1.01}
    <div class="w-full max-w-[420px] sm:max-w-[560px] h-[40px] sm:h-[44px] flex items-center justify-center shrink-0" aria-live="polite" aria-atomic="true">
      <div class="w-full flex justify-center transition-opacity duration-200 {showCombo ? 'opacity-100' : 'opacity-0 pointer-events-none'}" aria-hidden={!showCombo}>
        <ComboBar combo={game.combo} multiplier={game.comboMult} />
      </div>
    </div>

    <!-- MISSIONS BAR — 3 a rotazione per partita -->
    <div class="w-full max-w-[420px] sm:max-w-[560px]">
      <MissionBar missions={game.missions} buffActive={game.buffActive} />
    </div>

    {#if game.pendingMode}
      <div class="w-full max-w-[420px] sm:max-w-[560px]">
        <PendingBanner mode={game.pendingMode} onCancel={handleCancelPending} />
      </div>
    {/if}

    <!-- minimal game controls -->
    <div class="w-full max-w-[420px] sm:max-w-[560px] grid grid-cols-[72px_1fr_72px] gap-2 items-center">
      <button type="button" onclick={handleUndo} disabled={!canUndoNow} aria-label="Annulla mossa" class="bg-white border-2 border-orange-200 rounded-2xl py-3 font-black text-sm shadow-sm active:scale-[0.98] transition flex items-center justify-center disabled:opacity-40 disabled:grayscale focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:outline-none min-h-[44px]">
        ↩ Undo
      </button>
      <div class="flex items-center justify-center gap-1.5 text-[11px] font-black tracking-widest text-[#9a3412]/45 text-center leading-none select-none">
        <span>TRASCINA</span><span class="inline-block animate-[hintNudge_1.2s_ease_infinite]">→</span>
      </div>
      <button type="button" onclick={handleGoMenu} class="bg-white border-2 border-orange-200 rounded-2xl py-3 font-black text-sm shadow-sm active:scale-[0.98] transition focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:outline-none min-h-[44px]">Menu</button>
    </div>

    {#if showPause}
      <PauseSheet onResume={handleResume} onRestart={handleRestartFromPause} onExit={handleExitToMenu} />
      <div class="w-full max-w-[420px] sm:max-w-[560px] bg-white border border-orange-200 rounded-2xl p-3 shadow-sm mt-2">
        <div class="text-[11px] font-black tracking-widest text-[#9a3412]/60 mb-2">ACHIEVEMENTS · {Object.values(game.achievements).filter((a:any)=>a.completedAt).length}/{ACHIEVEMENTS.length}</div>
        <div class="grid grid-cols-3 gap-2">
          {#each ACHIEVEMENTS as a}
            {@const prog = (game.achievements as any)[a.id]?.progress ?? 0}
            {@const done = !!(game.achievements as any)[a.id]?.completedAt}
            <div class="border rounded-xl px-2 py-2 text-center {done ? 'bg-amber-50 border-amber-200' : 'bg-white border-orange-100'}">
              <div class="text-[14px]">{a.icon}</div>
              <div class="text-[10px] font-black leading-tight truncate">{a.label}</div>
              <div class="text-[9px] font-bold text-[#9a3412]/50">{done ? 'Fatto ✓' : `${prog}/${a.target}`}</div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>
