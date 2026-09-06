import { MISSION_POOL, MISSIONS_BY_DIFFICULTY, ACHIEVEMENTS, scaledTarget, type MissionDef, type AchievementDef } from '../config/achievements'

export type ActiveMissionInstance = MissionDef & { progress: number; instanceId: string; scaledTarget: number }
export type AchievementProgress = { progress: number; completedAt?: number }

export type TrackEvent = {
  type: 'merge' | 'special' | 'wall_break' | 'explosion'
  color?: string
  value?: number
  combo?: number
  dir?: string
  specialKind?: string
  isDiagonal?: boolean
}

export type ManagerSnapshot = {
  activeMissions: ActiveMissionInstance[]
  achievements: Record<string, AchievementProgress>
  coins: number
}

let missionCounter = 0
function nextInstanceId() { return `m-${Date.now()}-${++missionCounter}-${Math.random().toString(36).slice(2, 4)}` }

function pickOne(pool: MissionDef[], excludeIds: Set<string>): MissionDef {
  const filtered = pool.filter(m => !excludeIds.has(m.id))
  const src = filtered.length ? filtered : pool
  return src[Math.floor(Math.random() * src.length)]
}

export function rollMissions(score = 0, excludeIds: Set<string> = new Set()): ActiveMissionInstance[] {
  const easy = pickOne(MISSIONS_BY_DIFFICULTY.easy, excludeIds)
  const med = pickOne(MISSIONS_BY_DIFFICULTY.med, new Set([...excludeIds, easy.id]))
  const hard = pickOne(MISSIONS_BY_DIFFICULTY.hard, new Set([...excludeIds, easy.id, med.id]))
  return [easy, med, hard].map(def => ({
    ...def,
    progress: 0,
    instanceId: nextInstanceId(),
    scaledTarget: scaledTarget(def.target, score, def.kind),
  }))
}

export class AchievementManager {
  activeMissions: ActiveMissionInstance[] = []
  achievements: Record<string, AchievementProgress> = {}
  coins = 0
  // global counters for achievements (cumulative across runs)
  totalMerges = 0
  totalValue16 = 0
  totalExplosions = 0
  totalSpecials = 0
  totalWalls = 0
  maxComboEver = 0

  constructor(snapshot?: Partial<ManagerSnapshot> & { totalMerges?: number; totalValue16?: number; totalExplosions?: number; totalSpecials?: number; totalWalls?: number; maxComboEver?: number }) {
    if (snapshot?.activeMissions) this.activeMissions = snapshot.activeMissions as any
    if (snapshot?.achievements) this.achievements = { ...snapshot.achievements }
    if (snapshot?.coins != null) this.coins = snapshot.coins
    if (snapshot?.totalMerges != null) this.totalMerges = snapshot.totalMerges
    if (snapshot?.totalValue16 != null) this.totalValue16 = snapshot.totalValue16
    if (snapshot?.totalExplosions != null) this.totalExplosions = snapshot.totalExplosions
    if (snapshot?.totalSpecials != null) this.totalSpecials = snapshot.totalSpecials
    if (snapshot?.totalWalls != null) this.totalWalls = snapshot.totalWalls
    if (snapshot?.maxComboEver != null) this.maxComboEver = snapshot.maxComboEver
    // init achievements map
    for (const a of ACHIEVEMENTS) if (!this.achievements[a.id]) this.achievements[a.id] = { progress: 0 }
  }

  initRun(score = 0) {
    const exclude = new Set(this.activeMissions.map(m => m.id))
    this.activeMissions = rollMissions(score, exclude)
  }

  snapshot(): ManagerSnapshot & { totalMerges: number; totalValue16: number; totalExplosions: number; totalSpecials: number; totalWalls: number; maxComboEver: number } {
    return {
      activeMissions: this.activeMissions.map(m => ({ ...m })),
      achievements: JSON.parse(JSON.stringify(this.achievements)),
      coins: this.coins,
      totalMerges: this.totalMerges,
      totalValue16: this.totalValue16,
      totalExplosions: this.totalExplosions,
      totalSpecials: this.totalSpecials,
      totalWalls: this.totalWalls,
      maxComboEver: this.maxComboEver,
    }
  }

  restore(s: any) {
    if (!s) return
    if (s.activeMissions) this.activeMissions = s.activeMissions
    if (s.achievements) this.achievements = { ...s.achievements }
    if (s.coins != null) this.coins = s.coins
    if (s.totalMerges != null) this.totalMerges = s.totalMerges
    if (s.totalValue16 != null) this.totalValue16 = s.totalValue16
    if (s.totalExplosions != null) this.totalExplosions = s.totalExplosions
    if (s.totalSpecials != null) this.totalSpecials = s.totalSpecials
    if (s.totalWalls != null) this.totalWalls = s.totalWalls
    if (s.maxComboEver != null) this.maxComboEver = s.maxComboEver
    // ensure all achievements exist (migrates old saves with partial map)
    for (const a of ACHIEVEMENTS) if (!this.achievements[a.id]) this.achievements[a.id] = { progress: 0 }
  }

  permMult(): number {
    let m = 0
    for (const a of ACHIEVEMENTS) {
      const p = this.achievements[a.id]
      if (p?.completedAt && a.permMult) m += a.permMult
    }
    return Math.min(m, 0.1)
  }

  track(event: TrackEvent, currentScore = 0): { completedMissions: ActiveMissionInstance[]; completedAchievements: AchievementDef[] } {
    const completedMissions: ActiveMissionInstance[] = []
    const completedAchievements: AchievementDef[] = []

    // update global counters for achievements
    if (event.type === 'merge') {
      this.totalMerges++
      if (event.value && event.value >= 16) this.totalValue16++
    }
    if (event.type === 'explosion') this.totalExplosions++
    if (event.type === 'special') this.totalSpecials++
    if (event.type === 'wall_break') this.totalWalls++
    if (event.combo && event.combo > this.maxComboEver) this.maxComboEver = event.combo

    // achievements check
    const achMap: Record<string, number> = {
      merge_50: this.totalMerges,
      value_16_5: this.totalValue16,
      explosion_3: this.totalExplosions,
      combo_4: this.maxComboEver >= 4 ? 1 : 0,
      special_15: this.totalSpecials,
      wall_10: this.totalWalls,
    }
    for (const a of ACHIEVEMENTS) {
      let prog = this.achievements[a.id]
      if (!prog) {
        prog = this.achievements[a.id] = { progress: 0 }
      }
      if (prog.completedAt) continue
      const cur = achMap[a.id] ?? 0
      const target = a.target
      const newProg = a.id === 'combo_4' ? (cur ? 1 : 0) : Math.min(cur, target)
      prog.progress = newProg
      if (newProg >= target) {
        prog.completedAt = Date.now()
        completedAchievements.push(a)
        this.coins += a.rewardCoins
      }
    }

    // missions check — iterate copy because we will reroll completed
    const toReroll: number[] = []
    for (let i = 0; i < this.activeMissions.length; i++) {
      const m = this.activeMissions[i]
      let inc = 0
      switch (m.kind) {
        case 'merge_color':
          if (event.type === 'merge' && event.color === m.color) inc = 1
          break
        case 'merge_total':
          if (event.type === 'merge') inc = 1
          break
        case 'value_reach':
          if (event.type === 'merge' && event.value && event.value >= (m.value ?? 16)) inc = 1
          break
        case 'explosion':
          if (event.type === 'explosion') inc = 1
          break
        case 'combo':
          if (event.combo && event.combo >= (m.target)) inc = 1
          // alternative: progress = current combo
          if (event.combo) m.progress = Math.max(m.progress, event.combo)
          break
        case 'special_use':
          if (event.type === 'special' && (m.specialKind === 'vortex' ? (event.specialKind === 'vortex' || event.specialKind === 'shuffle') : event.specialKind === m.specialKind)) inc = 1
          else if (event.type === 'special' && !m.specialKind) inc = 1
          break
        case 'wall_break':
          if (event.type === 'wall_break') inc = 1
          break
        case 'diagonal':
          if (event.type === 'merge' && event.isDiagonal) inc = 1
          break
        case 'star_hunt':
          if (event.type === 'special' && event.specialKind === 'star') inc = 1
          break
        case 'jolly_use':
          if (event.type === 'special' && event.specialKind === 'jolly') inc = 1
          // also pending jolly apply counts as special?
          if (event.type === 'merge' && (event as any).jolly) inc = 1
          break
        case 'clone_use':
          if (event.type === 'special' && event.specialKind === 'clone') inc = 1
          break
        case 'bomb_use':
          if (event.type === 'special' && event.specialKind === 'bombColor') inc = 1
          break
      }
      if (m.kind !== 'combo') {
        if (inc) m.progress += inc
      }
      // cap
      if (m.progress >= m.scaledTarget) {
        completedMissions.push({ ...m })
        toReroll.push(i)
      }
    }

    // reroll completed missions (keep difficulty)
    for (const idx of toReroll.sort((a, b) => b - a)) {
      const old = this.activeMissions[idx]
      const pool = MISSIONS_BY_DIFFICULTY[old.difficulty]
      const exclude = new Set(this.activeMissions.map(x => x.id))
      // allow reroll to same id but avoid immediate duplicate if possible
      let pick = pickOne(pool, exclude)
      // if pick is same as old and pool has alternative, try again
      if (pick.id === old.id && pool.length > 1) {
        const alt = pool.filter(p => p.id !== old.id)
        pick = alt[Math.floor(Math.random() * alt.length)]
      }
      this.activeMissions[idx] = {
        ...pick,
        progress: 0,
        instanceId: nextInstanceId(),
        scaledTarget: scaledTarget(pick.target, currentScore, pick.kind),
      }
      this.coins += 15 // missionRewardCoins — keep in sync with GAME_CONFIG
    }

    return { completedMissions, completedAchievements }
  }
}
