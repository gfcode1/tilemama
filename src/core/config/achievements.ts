import { GAME_CONFIG } from './gameConfig'

// ── Mission kinds ──
export type MissionKind =
  | 'merge_color'
  | 'merge_total'
  | 'value_reach'
  | 'explosion'
  | 'combo'
  | 'special_use'
  | 'wall_break'
  | 'diagonal'
  | 'star_hunt'
  | 'jolly_use'
  | 'clone_use'
  | 'bomb_use'

export type MissionDifficulty = 'easy' | 'med' | 'hard'

export type MissionDef = {
  id: string
  kind: MissionKind
  label: string
  target: number
  difficulty: MissionDifficulty
  icon: string
  // optional discriminant for color/value
  color?: string
  value?: number
  specialKind?: string
}

export type AchievementDef = {
  id: string
  label: string
  desc: string
  icon: string
  target: number
  rewardCoins: number
  rewardScore: number
  permMult?: number
}

// 12 mission templates — easy/med/hard balanced, pool "tutto incluso"
export const MISSION_POOL: MissionDef[] = [
  // easy
  { id: 'merge_red_3', kind: 'merge_color', label: 'Fondi 3 rossi', target: 3, difficulty: 'easy', icon: '🔴', color: 'red' },
  { id: 'merge_green_3', kind: 'merge_color', label: 'Fondi 3 verdi', target: 3, difficulty: 'easy', icon: '🟢', color: 'green' },
  { id: 'merge_total_4', kind: 'merge_total', label: 'Fai 4 fusioni', target: 4, difficulty: 'easy', icon: '🧩' },
  { id: 'wall_break_1', kind: 'wall_break', label: 'Rompi 1 muro', target: 1, difficulty: 'easy', icon: '🧱' },
  // med
  { id: 'value_16', kind: 'value_reach', label: 'Crea valore 16', target: 1, difficulty: 'med', icon: '⭐', value: 16 },
  { id: 'special_vortex', kind: 'special_use', label: 'Usa 1 vortex/shuffle', target: 1, difficulty: 'med', icon: '🌀', specialKind: 'vortex' },
  { id: 'combo_3', kind: 'combo', label: 'Combo x3', target: 3, difficulty: 'med', icon: '🔥' },
  { id: 'star_2', kind: 'star_hunt', label: 'Cattura 2 stelle', target: 2, difficulty: 'med', icon: '★' },
  // hard
  { id: 'explosion_32', kind: 'explosion', label: 'Esplosione 32!', target: 1, difficulty: 'hard', icon: '💥' },
  { id: 'diagonal_2', kind: 'diagonal', label: '2 fusioni diagonali', target: 2, difficulty: 'hard', icon: '↗️' },
  { id: 'jolly_use_1', kind: 'jolly_use', label: 'Usa 1 jolly', target: 1, difficulty: 'hard', icon: '🌈' },
  { id: 'bomb_use_1', kind: 'bomb_use', label: 'Usa 1 bomba colore', target: 1, difficulty: 'hard', icon: '💣' },
]

export const MISSIONS_BY_DIFFICULTY: Record<MissionDifficulty, MissionDef[]> = {
  easy: MISSION_POOL.filter(m => m.difficulty === 'easy'),
  med: MISSION_POOL.filter(m => m.difficulty === 'med'),
  hard: MISSION_POOL.filter(m => m.difficulty === 'hard'),
}

// 6 achievements essenziali
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'merge_50', label: 'Fonditore', desc: '50 fusioni totali', icon: '🧩', target: 50, rewardCoins: 30, rewardScore: 150 },
  { id: 'value_16_5', label: 'Artigiano', desc: 'Crea 5x valore 16', icon: '⭐', target: 5, rewardCoins: 30, rewardScore: 150 },
  { id: 'explosion_3', label: 'Demolitore', desc: '3 esplosioni 32', icon: '💥', target: 3, rewardCoins: 30, rewardScore: 150, permMult: 0.05 },
  { id: 'combo_4', label: 'Catena', desc: 'Combo x4 una volta', icon: '🔥', target: 1, rewardCoins: 30, rewardScore: 150, permMult: 0.05 },
  { id: 'special_15', label: 'Collezionista', desc: 'Usa 15 speciali', icon: '🎁', target: 15, rewardCoins: 30, rewardScore: 150 },
  { id: 'wall_10', label: 'Muratore', desc: 'Rompi 10 muri', icon: '🧱', target: 10, rewardCoins: 30, rewardScore: 150 },
]

export const MISSION_REWARD = {
  score: GAME_CONFIG.missionRewardScore,
  coins: GAME_CONFIG.missionRewardCoins,
  buffMult: GAME_CONFIG.missionRewardMultiplier,
  buffDurationMs: 5000,
  allBonusScore: GAME_CONFIG.missionAllBonusScore,
  allBonusCoins: GAME_CONFIG.missionAllBonusCoins,
} as const

export const ACHIEVEMENT_REWARD = {
  coins: GAME_CONFIG.achievementRewardCoins,
  score: GAME_CONFIG.achievementRewardScore,
} as const

// scala soft: dopo soglie aumenta target di missioni count-based
export function scaledTarget(base: number, score: number, kind: MissionKind): number {
  if (kind === 'value_reach' || kind === 'explosion' || kind === 'combo') return base
  let add = 0
  if (score >= 600) add = 2
  else if (score >= 300) add = 1
  return base + add
}
