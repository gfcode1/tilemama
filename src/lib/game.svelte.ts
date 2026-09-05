import { Engine } from './engine'
import { load, save } from './persist'
import type { Block, Special, MultiplierMode, PendingMode } from './types'

export const engine = new Engine()

// reactive state via runes
let score = $state(0)
let bestScore = $state(0)
let gameOver = $state(false)
let version = $state(0) // bump to trigger grid re-render
let specialsTick = $state(0)
let blocks = $state<Block[]>([])
let specials = $state<Special[]>([])
let pendingMode = $state<PendingMode>(null)
let pendingSafeX5 = $state(false)

function sync() {
  blocks = [...engine.blocks.values()]
  specials = [...engine.specials.values()]
  pendingMode = engine.pendingMode
  pendingSafeX5 = engine.pendingSafeX5
}

export const game = {
  get score() { return score },
  set score(v) { score = v },
  get bestScore() { return bestScore },
  get gameOver() { return gameOver },
  get version() { return version },
  get specialsTick() { return specialsTick },
  get grid() { return engine.grid },
  get blocks() { return blocks },
  get specials() { return specials },
  get multiplierMode() { return pendingMode }, // compat
  get pendingMode() { return pendingMode },
  get pendingSafeX5() { return pendingSafeX5 },
}

let persistTimer: number | null = null

function persist() {
  if (persistTimer) return
  persistTimer = window.setTimeout(() => {
    persistTimer = null
    save({ grid: engine.grid as any, score: engine.score, bestScore, gameOver: engine.gameOver, pendingMode: engine.pendingMode, pendingMultiplier: engine.pendingMode, pendingSafeX5: engine.pendingSafeX5 } as any)
  }, 50)
}

export function initGame() {
  const saved = load() as any
  if (saved && saved.grid?.length === 8) {
    try {
      engine.fromJSON({ grid: saved.grid as any, score: saved.score, gameOver: saved.gameOver, pendingMode: saved.pendingMode ?? saved.pendingMultiplier, pendingMultiplier: saved.pendingMode ?? saved.pendingMultiplier, pendingSafeX5: saved.pendingSafeX5 } as any)
      score = saved.score
      bestScore = saved.bestScore ?? saved.score
      gameOver = saved.gameOver
      version++
      sync()
      return
    } catch {}
  }
  newGame()
}

export function newGame() {
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  engine.init()
  score = 0
  gameOver = false
  version++
  specialsTick++
  sync()
  save({ grid: engine.grid as any, score: 0, bestScore, gameOver: false, pendingMode: null, pendingMultiplier: null, pendingSafeX5: false } as any)
}

export function canUndo(): boolean { return engine.canUndo() }

export function undoMove(): boolean {
  if (!engine.canUndo()) return false
  const ok = engine.undo()
  if (ok) {
    score = engine.score
    gameOver = engine.gameOver
    version++
    specialsTick++
    sync()
    persist()
  }
  return ok
}

export function doMove(blockId: string, dir: 'N'|'S'|'E'|'W') {
  if (gameOver) return null
  if (engine.pendingMode) return null
  // snapshot before move for undo gratis
  engine.pushHistory()
  const res = engine.move(blockId, dir)
  if (res.moved || res.merged || res.hitSpecial || res.hitWall) {
    score = engine.score
    if (score > bestScore) bestScore = score
    gameOver = engine.gameOver
    version++
    if (res.hitSpecial || res.exploded || res.activatedPending || res.hitWall) specialsTick++
    sync()
    persist()
  } else {
    // no effect -> discard snapshot
    engine.undo()
  }
  return res
}

export function spawnStar(): Special | null {
  if (gameOver) return null
  if (engine.pendingMode) return null
  const s = engine.spawnStar()
  if (s) { version++; specialsTick++; sync(); persist(); return s }
  return null
}

export function spawnBonus(): Special | null {
  if (gameOver) return null
  if (engine.pendingMode) return null
  const s = engine.spawnRandomBonus()
  if (s) { version++; specialsTick++; sync(); persist(); return s }
  return null
}

// legacy
export function spawnSpecialTick() {
  return spawnBonus()
}

export function cleanupSpecials() {
  const removed = engine.cleanupExpiredSpecials()
  if (removed.length) { version++; specialsTick++; sync() }
  return removed
}

export function tickVirus() {
  const changed = engine.tickVirus()
  if (changed.length) { version++; specialsTick++; sync(); persist() }
  return changed
}

export function applyPending(blockId: string) {
  if (!engine.pendingMode) return null
  engine.pushHistory()
  const res = engine.applyPending(blockId)
  if (res?.applied) {
    score = engine.score
    if (score > bestScore) bestScore = score
    gameOver = engine.gameOver
    version++
    specialsTick++
    sync()
    persist()
  } else {
    engine.undo()
  }
  return res
}

// alias compat
export function applyMultiplier(blockId: string) { return applyPending(blockId) as any }

export function cancelPending() {
  if (!engine.pendingMode) return
  engine.cancelPending()
  version++; specialsTick++; sync(); persist()
}
export function cancelMultiplier() { return cancelPending() }

export function bump() { version++; sync() }
