import { describe, it, expect, beforeEach } from 'vitest'
import { AchievementManager, rollMissions } from './AchievementManager'
import { MISSION_POOL, scaledTarget } from '../config/achievements'

describe('rollMissions', () => {
  it('ritorna 3 missioni 1 easy 1 med 1 hard', () => {
    const ms = rollMissions(0)
    expect(ms).toHaveLength(3)
    expect(ms[0].difficulty).toBe('easy')
    expect(ms[1].difficulty).toBe('med')
    expect(ms[2].difficulty).toBe('hard')
  })
  it('scala target dopo 300 e 600', () => {
    expect(scaledTarget(3, 0, 'merge_color')).toBe(3)
    expect(scaledTarget(3, 400, 'merge_color')).toBe(4)
    expect(scaledTarget(3, 700, 'merge_color')).toBe(5)
    expect(scaledTarget(1, 700, 'value_reach')).toBe(1)
    expect(scaledTarget(1, 700, 'explosion')).toBe(1)
  })
})

describe('AchievementManager', () => {
  let mgr: AchievementManager
  beforeEach(() => { mgr = new AchievementManager(); mgr.initRun(0) })

  it('initRun popola 3 missioni', () => {
    expect(mgr.activeMissions).toHaveLength(3)
    expect(mgr.activeMissions.every(m => m.progress === 0)).toBe(true)
  })

  it('merge_color incrementa solo colore giusto', () => {
    // forza missione rossa
    mgr.activeMissions[0] = { ...MISSION_POOL.find(m => m.id === 'merge_red_3')! , progress: 0, instanceId: 'test', scaledTarget: 3 } as any
    mgr.track({ type: 'merge', color: 'red', value: 4 }, 0)
    expect(mgr.activeMissions[0].progress).toBe(1)
    mgr.track({ type: 'merge', color: 'green', value: 4 }, 0)
    expect(mgr.activeMissions[0].progress).toBe(1)
  })

  it('missione completa rerolla e da 15 coin', () => {
    mgr.activeMissions[0] = { ...MISSION_POOL.find(m => m.id === 'merge_red_3')! , progress: 2, instanceId: 'a', scaledTarget: 3 } as any
    const beforeCoins = mgr.coins
    const { completedMissions } = mgr.track({ type: 'merge', color: 'red', value: 2 }, 0)
    expect(completedMissions).toHaveLength(1)
    expect(mgr.coins).toBe(beforeCoins + 15)
    expect(mgr.activeMissions[0].progress).toBe(0)
    expect(mgr.activeMissions[0].instanceId).not.toBe('a')
  })

  it('value_reach completa su valore >=16', () => {
    mgr.activeMissions[1] = { ...MISSION_POOL.find(m => m.id === 'value_16')! , progress: 0, instanceId: 'b', scaledTarget: 1 } as any
    let r = mgr.track({ type: 'merge', color: 'red', value: 8 }, 0)
    expect(r.completedMissions).toHaveLength(0)
    r = mgr.track({ type: 'merge', color: 'red', value: 16 }, 0)
    expect(r.completedMissions).toHaveLength(1)
  })

  it('diagonal richiede isDiagonal', () => {
    mgr.activeMissions[2] = { ...MISSION_POOL.find(m => m.id === 'diagonal_2')! , progress: 0, instanceId: 'c', scaledTarget: 2 } as any
    mgr.track({ type: 'merge', color: 'red', value: 2, isDiagonal: false }, 0)
    expect(mgr.activeMissions[2].progress).toBe(0)
    mgr.track({ type: 'merge', color: 'red', value: 2, isDiagonal: true }, 0)
    expect(mgr.activeMissions[2].progress).toBe(1)
  })

  it('special_use vortex conta anche shuffle', () => {
    mgr.activeMissions[1] = { ...MISSION_POOL.find(m => m.id === 'special_vortex')! , progress: 0, instanceId: 'd', scaledTarget: 1 } as any
    const r = mgr.track({ type: 'special', specialKind: 'shuffle' }, 0)
    expect(r.completedMissions).toHaveLength(1)
  })

  it('achievement merge_50 progressivo', () => {
    const m = new AchievementManager()
    m.initRun(0)
    for (let i = 0; i < 49; i++) m.track({ type: 'merge', color: 'red', value: 2 }, 0)
    expect(m.achievements['merge_50'].progress).toBe(49)
    const { completedAchievements } = m.track({ type: 'merge', color: 'red', value: 2 }, 0)
    expect(completedAchievements.map(a=>a.id)).toContain('merge_50')
    expect(m.achievements['merge_50'].completedAt).toBeDefined()
    expect(m.coins).toBeGreaterThanOrEqual(30)
  })

  it('achievement combo_4 su maxComboEver', () => {
    const m = new AchievementManager()
    m.initRun(0)
    m.track({ type: 'merge', combo: 3 }, 0)
    expect(m.achievements['combo_4'].progress).toBe(0)
    const { completedAchievements } = m.track({ type: 'merge', combo: 4 }, 0)
    expect(completedAchievements.map(a=>a.id)).toContain('combo_4')
  })

  it('permMult max 0.1', () => {
    const m = new AchievementManager()
    // forza completamento achievements con permMult
    m.achievements['explosion_3'] = { progress: 3, completedAt: Date.now() }
    m.achievements['combo_4'] = { progress: 1, completedAt: Date.now() }
    expect(m.permMult()).toBe(0.1)
  })

  it('non incrementa achievement già completato', () => {
    const m = new AchievementManager()
    m.achievements['merge_50'] = { progress: 50, completedAt: Date.now() }
    const coinsBefore = m.coins
    m.track({ type: 'merge', color: 'red', value: 2 }, 0)
    expect(m.coins).toBe(coinsBefore)
    expect(m.achievements['merge_50'].progress).toBe(50)
  })

  it('snapshot/restore roundtrip', () => {
    mgr.track({ type: 'merge', color: 'red', value: 2 }, 0)
    const snap = mgr.snapshot()
    const m2 = new AchievementManager(snap)
    expect(m2.totalMerges).toBe(mgr.totalMerges)
    expect(m2.coins).toBe(mgr.coins)
    expect(m2.activeMissions.length).toBe(3)
  })

  it('wall_break incrementa correttamente', () => {
    mgr.activeMissions[0] = { ...MISSION_POOL.find(m => m.id === 'wall_break_1')! , progress: 0, instanceId: 'e', scaledTarget: 1 } as any
    const r = mgr.track({ type: 'wall_break' }, 0)
    expect(r.completedMissions).toHaveLength(1)
  })
})
