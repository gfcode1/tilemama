import { Engine } from './engine'
import { loadPersisted, savePersisted } from '../services/persistence'
import type { Block, Special, Dir, MultiplierMode, PendingMode } from './types'
import { ComboState } from '../core/combo/ComboState'
import { AchievementManager } from '../core/achievements/AchievementManager'
import { GAME_CONFIG } from '../core/config/gameConfig'
import { ACHIEVEMENTS } from '../core/config/achievements'

export const engine = new Engine()
export const combo = new ComboState()
export const achievementManager = new AchievementManager()

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
let coins = $state(0)
let missions = $state<ReturnType<typeof achievementManager.snapshot>['activeMissions']>([])
let achievementsState = $state<Record<string, { progress: number; completedAt?: number }>>({})
let buffActive = $state(false)
let buffTimer: number | null = null
let toasts = $state<{ id: string; title: string; subtitle: string; icon: string; kind: 'mission' | 'achievement' }[]>([])
let shopOwned = $state<string[]>([])
let shopActive = $state<string | null>(null)

function sync() {
  blocks = [...engine.blocks.values()]
  specials = [...engine.specials.values()]
  pendingMode = engine.pendingMode
  pendingSafeX5 = engine.pendingSafeX5
  comboSnap = combo.snapshot()
  missions = [...achievementManager.activeMissions]
  achievementsState = JSON.parse(JSON.stringify(achievementManager.achievements))
  coins = achievementManager.coins
}

function syncAchievements() {
  missions = [...achievementManager.activeMissions]
  achievementsState = JSON.parse(JSON.stringify(achievementManager.achievements))
  coins = achievementManager.coins
}

function pushToast(title: string, subtitle: string, icon: string, kind: 'mission' | 'achievement') {
  const id = Math.random().toString(36).slice(2, 8)
  toasts = [...toasts, { id, title, subtitle, icon, kind }]
  setTimeout(() => { toasts = toasts.filter(t => t.id !== id) }, kind === 'achievement' ? 3200 : 2500)
}

function activateBuff() {
  buffActive = true
  if (buffTimer) clearTimeout(buffTimer)
  buffTimer = window.setTimeout(() => { buffActive = false; buffTimer = null }, 5000) as any
}

function handleMissionAndAchEvents(completedMissions: any[], completedAchievements: any[], currentScore: number) {
  for (const m of completedMissions) {
    const rewardScore = GAME_CONFIG.missionRewardScore
    const rewardCoins = GAME_CONFIG.missionRewardCoins
    engine.score += rewardScore
    // coins already added inside manager.track (15), keep sync
    activateBuff()
    pushToast(m.label, `+${rewardScore} · +${rewardCoins}🪙 · x1.5 5s`, m.icon, 'mission')
  }
  for (const a of completedAchievements) {
    engine.score += a.rewardScore
    pushToast(a.label, `Achievement! +${a.rewardScore} · +${a.rewardCoins}🪙`, a.icon, 'achievement')
  }
  if (completedMissions.length || completedAchievements.length) {
    score = engine.score
    if (score > bestScore) bestScore = score
    syncAchievements()
  }
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
  get comboMult() { return buffActive ? combo.multiplier() * GAME_CONFIG.missionRewardMultiplier : combo.multiplier() + achievementManager.permMult() },
  get coins() { return coins },
  get missions() { return missions },
  get achievements() { return achievementsState },
  get buffActive() { return buffActive },
  get toasts() { return toasts },
  get permMult() { return achievementManager.permMult() },
  get shopOwned() { return shopOwned },
  get shopActive() { return shopActive },
}

let persistTimer: number | null = null
let comboHistory: ReturnType<typeof combo.snapshot>[] = []

function persist() {
  if (persistTimer) return
  persistTimer = window.setTimeout(() => {
    persistTimer = null
    const snap = achievementManager.snapshot()
    savePersisted({
      grid: engine.grid as any, score: engine.score, bestScore, gameOver: engine.gameOver,
      pendingMode: engine.pendingMode as any, pendingMultiplier: engine.pendingMode as any, pendingSafeX5: engine.pendingSafeX5,
      coins: snap.coins, achievements: snap.achievements, activeMissions: snap.activeMissions as any,
      totalMerges: snap.totalMerges, totalValue16: snap.totalValue16, totalExplosions: snap.totalExplosions,
      totalSpecials: snap.totalSpecials, totalWalls: snap.totalWalls, maxComboEver: snap.maxComboEver,
      shopOwned, shopActive,
    } as any)
  }, 50)
}

function persistNow() {
  if (persistTimer) { clearTimeout(persistTimer); persistTimer = null }
  const snap = achievementManager.snapshot()
  savePersisted({
    grid: engine.grid as any, score: engine.score, bestScore, gameOver: engine.gameOver,
    pendingMode: engine.pendingMode as any, pendingMultiplier: engine.pendingMode as any, pendingSafeX5: engine.pendingSafeX5,
    coins: snap.coins, achievements: snap.achievements, activeMissions: snap.activeMissions as any,
    totalMerges: snap.totalMerges, totalValue16: snap.totalValue16, totalExplosions: snap.totalExplosions,
    totalSpecials: snap.totalSpecials, totalWalls: snap.totalWalls, maxComboEver: snap.maxComboEver,
    shopOwned, shopActive,
  } as any)
}

export function initGame() {
  const saved = loadPersisted() as any
  if (saved && saved.grid?.length === 8) {
    try {
      engine.fromJSON({ grid: saved.grid as any, score: saved.score, gameOver: saved.gameOver, pendingMode: saved.pendingMode ?? saved.pendingMultiplier, pendingMultiplier: saved.pendingMode ?? saved.pendingMultiplier, pendingSafeX5: saved.pendingSafeX5 } as any)
      score = saved.score
      bestScore = saved.bestScore ?? saved.score
      gameOver = saved.gameOver
      achievementManager.restore({
        activeMissions: saved.activeMissions,
        achievements: saved.achievements,
        coins: saved.coins ?? 0,
        totalMerges: saved.totalMerges,
        totalValue16: saved.totalValue16,
        totalExplosions: saved.totalExplosions,
        totalSpecials: saved.totalSpecials,
        totalWalls: saved.totalWalls,
        maxComboEver: saved.maxComboEver,
      })
      shopOwned = saved.shopOwned ?? []
      shopActive = saved.shopActive ?? null
      if (!achievementManager.activeMissions.length) achievementManager.initRun(score)
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
  if (buffTimer) { clearTimeout(buffTimer); buffTimer = null; buffActive = false }
  engine.init()
  combo.reset()
  comboHistory = []
  score = 0
  gameOver = false
  achievementManager.initRun(0)
  version++
  specialsTick++
  sync()
  const snap = achievementManager.snapshot()
  savePersisted({ grid: engine.grid as any, score: 0, bestScore, gameOver: false, pendingMode: null, pendingMultiplier: null, pendingSafeX5: false, coins: snap.coins, achievements: snap.achievements, activeMissions: snap.activeMissions as any, totalMerges: snap.totalMerges, totalValue16: snap.totalValue16, totalExplosions: snap.totalExplosions, totalSpecials: snap.totalSpecials, totalWalls: snap.totalWalls, maxComboEver: snap.maxComboEver, shopOwned, shopActive } as any)
}

export function tapSpecial(specialId: string) {
  if (gameOver) return null
  if (engine.pendingMode) return null
  const s = engine.specials.get(specialId)
  if (!s) return null
  const now = Date.now()
  comboHistory = [combo.snapshot()]
  engine.pushHistory()
  const res = engine.tapSpecial(specialId)
  if (res && (res.moved || res.hitSpecial || res.hitWall)) {
    const isScoring = res.merged || res.hitSpecial || res.exploded
    if (isScoring && res.hitSpecialKind) {
      const peek = buffActive ? combo.peekMultiplier(now) * GAME_CONFIG.missionRewardMultiplier : combo.peekMultiplier(now) + achievementManager.permMult()
      const { combo: c, multiplier } = combo.onMerge(now)
      const finalMult = buffActive ? multiplier * GAME_CONFIG.missionRewardMultiplier : multiplier + achievementManager.permMult()
      ;(res as any).combo = c
      ;(res as any).multiplier = finalMult
      void peek
    } else if (res.hitWall && res.wallDestroyed) {
      const { combo: c, multiplier } = combo.onMerge(now)
      const finalMult = buffActive ? multiplier * GAME_CONFIG.missionRewardMultiplier : multiplier + achievementManager.permMult()
      ;(res as any).combo = c
      ;(res as any).multiplier = finalMult
    }
    // achievements tracking
    if (res.hitSpecialKind) {
      const ev: any = { type: res.hitWall ? 'wall_break' : 'special', specialKind: res.hitSpecialKind, combo: (res as any).combo }
      if (res.hitWall && res.wallDestroyed) ev.type = 'wall_break'
      const { completedMissions, completedAchievements } = achievementManager.track(ev, engine.score)
      handleMissionAndAchEvents(completedMissions, completedAchievements, engine.score)
    } else if (res.hitWall && !res.wallDestroyed) {
      // still no mission progress for cracked wall
    }
    score = engine.score
    if (score > bestScore) bestScore = score
    gameOver = engine.gameOver
    version++
    if (res.hitSpecial || res.exploded || res.activatedPending || res.hitWall) specialsTick++
    sync()
    persist()
  } else if (res && res.hitWall && !res.wallDestroyed) {
    // cracked wall from tap — still sync hp without scoring
    version++
    specialsTick++
    sync()
    persist()
  } else if (res === null) {
    engine.undo()
    const prev = comboHistory.pop()
    if (prev) combo.restore(prev)
  }
  return res
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

export function doMove(blockId: string, dir: Dir) {
  if (gameOver) return null
  if (engine.pendingMode) return null
  const now = Date.now()
  const basePeek = combo.peekMultiplier(now) + achievementManager.permMult()
  const peek = buffActive ? basePeek * GAME_CONFIG.missionRewardMultiplier : basePeek
  comboHistory = [combo.snapshot()]
  engine.pushHistory()
  const res = engine.move(blockId, dir, peek)
  if (res.moved || res.merged || res.hitSpecial || res.hitWall) {
    const isScoring = res.merged || res.hitSpecial || res.exploded || (!!res.hitWall && !!res.wallDestroyed)
    if (isScoring) {
      const { combo: c, multiplier } = combo.onMerge(now)
      const finalMult = buffActive ? multiplier * GAME_CONFIG.missionRewardMultiplier : multiplier + achievementManager.permMult()
      ;(res as any).combo = c
      ;(res as any).multiplier = finalMult
      // engine already scored with peek (which equals multiplier), no extra patch needed
    } else {
      // strict: slide vuota o muro crepato (hitWall senza distruzione) chiude combo pur restando mossa valida
      combo.onMiss()
    }
    // achievements / missions tracking
    if (isScoring || res.exploded) {
      const isDiag = dir === 'NE' || dir === 'NW' || dir === 'SE' || dir === 'SW'
      let ev: any = null
      if (res.merged) {
        const block = engine.blocks.get(blockId) ?? (res as any)._block
        const mergedValue = (res as any).baseGain ?? 0
        // find merged block value via scoreGain / multiplier approx
        ev = { type: res.exploded ? 'explosion' : 'merge', color: (engine.blocks.get(blockId) as any)?.color, value: mergedValue, combo: (res as any).combo, dir, isDiagonal: isDiag }
        if (res.exploded) ev = { type: 'explosion', combo: (res as any).combo, dir, isDiagonal: isDiag }
      } else if (res.hitSpecial) {
        ev = { type: 'special', specialKind: res.hitSpecialKind, combo: (res as any).combo }
      } else if (res.hitWall && res.wallDestroyed) {
        ev = { type: 'wall_break', combo: (res as any).combo }
      }
      if (res.exploded && res.merged) {
        // both merge and explosion — track both
        const { completedMissions: cm1, completedAchievements: ca1 } = achievementManager.track({ type: 'merge', color: (engine.blocks.get(blockId) as any)?.color, value: (res as any).baseGain, combo: (res as any).combo, dir, isDiagonal: isDiag }, engine.score)
        handleMissionAndAchEvents(cm1, ca1, engine.score)
        const { completedMissions: cm2, completedAchievements: ca2 } = achievementManager.track({ type: 'explosion', combo: (res as any).combo, dir, isDiagonal: isDiag }, engine.score)
        handleMissionAndAchEvents(cm2, ca2, engine.score)
      } else if (ev) {
        const { completedMissions, completedAchievements } = achievementManager.track(ev, engine.score)
        handleMissionAndAchEvents(completedMissions, completedAchievements, engine.score)
      }
    } else if (res.hitWall && res.wallDestroyed) {
      const { completedMissions, completedAchievements } = achievementManager.track({ type: 'wall_break', combo: (res as any).combo }, engine.score)
      handleMissionAndAchEvents(completedMissions, completedAchievements, engine.score)
    } else if (res.hitSpecial) {
      const { completedMissions, completedAchievements } = achievementManager.track({ type: 'special', specialKind: res.hitSpecialKind, combo: (res as any).combo }, engine.score)
      handleMissionAndAchEvents(completedMissions, completedAchievements, engine.score)
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
  const pendingKind = engine.pendingMode
  const res = engine.applyPending(blockId)
  if (res?.applied) {
    const scoringModes: any[] = ['x2', 'bombColor']
    if (scoringModes.includes(res.mode) || res.exploded) {
      const now = Date.now()
      // for x2/bomb we want to apply peek multiplier to the pending scoreGain if any
      // engine.applyPending currently adds scoreGain without multiplier for x2 explosion
      // patch if needed
      if (res.exploded && res.scoreGain) {
        const basePeek = combo.peekMultiplier(now) + achievementManager.permMult()
        const peek = buffActive ? basePeek * GAME_CONFIG.missionRewardMultiplier : basePeek
        const corrected = Math.round(res.scoreGain * peek)
        const delta = corrected - res.scoreGain
        if (delta) { engine.score += delta; res.scoreGain = corrected; (res as any).baseGain = res.scoreGain / peek }
      }
      const { combo: c, multiplier } = combo.onMerge(now)
      const finalMult = buffActive ? multiplier * GAME_CONFIG.missionRewardMultiplier : multiplier + achievementManager.permMult()
      ;(res as any).combo = c
      ;(res as any).multiplier = finalMult
    }
    // track pending use for missions (jolly/clone/bomb)
    if (pendingKind === 'jolly') {
      const { completedMissions, completedAchievements } = achievementManager.track({ type: 'special', specialKind: 'jolly' } as any, engine.score)
      handleMissionAndAchEvents(completedMissions, completedAchievements, engine.score)
    } else if (pendingKind === 'clone') {
      const { completedMissions, completedAchievements } = achievementManager.track({ type: 'special', specialKind: 'clone' } as any, engine.score)
      handleMissionAndAchEvents(completedMissions, completedAchievements, engine.score)
    } else if (pendingKind === 'bombColor') {
      const { completedMissions, completedAchievements } = achievementManager.track({ type: 'special', specialKind: 'bombColor' } as any, engine.score)
      handleMissionAndAchEvents(completedMissions, completedAchievements, engine.score)
    }
    if (res.exploded) {
      const { completedMissions, completedAchievements } = achievementManager.track({ type: 'explosion' } as any, engine.score)
      handleMissionAndAchEvents(completedMissions, completedAchievements, engine.score)
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

export function purchaseShopItem(itemId: string, price: number): boolean {
  if (shopOwned.includes(itemId)) return false
  if (achievementManager.coins < price) return false
  achievementManager.coins -= price
  shopOwned = [...shopOwned, itemId]
  shopActive = itemId
  coins = achievementManager.coins
  pushToast('Acquistato!', `-${price}🪙 · ${itemId}`, '🛒', 'achievement')
  persistNow()
  syncAchievements()
  return true
}

export function setShopActive(itemId: string | null) {
  if (itemId && !shopOwned.includes(itemId)) return false
  shopActive = itemId
  persistNow()
  return true
}

export function addCoins(amount: number) {
  achievementManager.coins += amount
  coins = achievementManager.coins
  persistNow()
  syncAchievements()
}

export function bump() { version++; sync() }
