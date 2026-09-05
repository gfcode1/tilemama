import { Engine } from './engine'
import { loadPersisted, savePersisted } from '../services/persistence'
import type { Block, Special, MultiplierMode, PendingMode } from './types'
import { ComboState } from '../core/combo/ComboState'

export const engine = new Engine()
export const combo = new ComboState()

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
let comboSnap = $state({ combo: 0, chainDepth: 0, lastAt: null as number | null })

function sync() {
  blocks = [...engine.blocks.values()]
  specials = [...engine.specials.values()]
  pendingMode = engine.pendingMode
  pendingSafeX5 = engine.pendingSafeX5
  comboSnap = combo.snapshot()
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
  get combo() { return comboSnap.combo },
  get comboMult() { return combo.multiplier() },
}

let persistTimer: number | null = null
let comboHistory: ReturnType<typeof combo.snapshot>[] = []

function persist() {
  if (persistTimer) return
  persistTimer = window.setTimeout(() => {
    persistTimer = null
    savePersisted({ grid: engine.grid as any, score: engine.score, bestScore, gameOver: engine.gameOver, pendingMode: engine.pendingMode as any, pendingMultiplier: engine.pendingMode as any, pendingSafeX5: engine.pendingSafeX5 } as any)
  }, 50)
}

export function initGame() {
  const saved = loadPersisted() as any
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
  combo.reset()
  comboHistory = []
  score = 0
  gameOver = false
  version++
  specialsTick++
  sync()
  savePersisted({ grid: engine.grid as any, score: 0, bestScore, gameOver: false, pendingMode: null, pendingMultiplier: null, pendingSafeX5: false } as any)
}

export function canUndo(): boolean { return engine.canUndo() }

export function undoMove(): boolean {
  if (!engine.canUndo()) return false
  const ok = engine.undo()
  if (ok) {
    score = engine.score
    gameOver = engine.gameOver
    const prev = comboHistory.pop()
    if (prev) combo.restore(prev)
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
  const now = Date.now()
  const peek = combo.peekMultiplier(now)
  comboHistory = [combo.snapshot()]
  engine.pushHistory()
  const res = engine.move(blockId, dir, peek)
  if (res.moved || res.merged || res.hitSpecial || res.hitWall) {
    const isScoring = res.merged || res.hitSpecial || res.exploded
    if (isScoring) {
      const { combo: c, multiplier } = combo.onMerge(now)
      ;(res as any).combo = c
      ;(res as any).multiplier = multiplier
      // engine already scored with peek (which equals multiplier), no extra patch needed
    }
    score = engine.score
    if (score > bestScore) bestScore = score
    gameOver = engine.gameOver
    version++
    if (res.hitSpecial || res.exploded || res.activatedPending || res.hitWall) specialsTick++
    sync()
    persist()
  } else {
    engine.undo()
    const prev = comboHistory.pop()
    if (prev) combo.restore(prev)
    combo.onMiss()
    sync()
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
  comboHistory = [combo.snapshot()]
  engine.pushHistory()
  const res = engine.applyPending(blockId)
  if (res?.applied) {
    const scoringModes: any[] = ['x2', 'bombColor']
    if (scoringModes.includes(res.mode) || res.exploded) {
      const now = Date.now()
      // for x2/bomb we want to apply peek multiplier to the pending scoreGain if any
      // engine.applyPending currently adds scoreGain without multiplier for x2 explosion
      // patch if needed
      if (res.exploded && res.scoreGain) {
        const peek = combo.peekMultiplier(now)
        const corrected = Math.round(res.scoreGain * peek)
        const delta = corrected - res.scoreGain
        if (delta) { engine.score += delta; res.scoreGain = corrected; (res as any).baseGain = res.scoreGain / peek }
      }
      const { combo: c, multiplier } = combo.onMerge(now)
      ;(res as any).combo = c
      ;(res as any).multiplier = multiplier
    }
    score = engine.score
    if (score > bestScore) bestScore = score
    gameOver = engine.gameOver
    version++
    specialsTick++
    sync()
    persist()
  } else {
    engine.undo()
    const prev = comboHistory.pop()
    if (prev) combo.restore(prev)
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
