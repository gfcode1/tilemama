import { GAME_CONFIG } from '../core/config/gameConfig'

export type Color = 'green' | 'red' | 'yellow' | 'blue'
export const COLORS: Color[] = ['green', 'red', 'yellow', 'blue']

export type Dir = 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW'
export const DIRS: Record<Dir, { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  S: { dx: 0, dy: 1 },
  W: { dx: -1, dy: 0 },
  E: { dx: 1, dy: 0 },
  NE: { dx: 1, dy: -1 },
  NW: { dx: -1, dy: -1 },
  SE: { dx: 1, dy: 1 },
  SW: { dx: -1, dy: 1 },
}

export type Block = {
  id: string
  x: number
  y: number
  color: Color
  value: number
  jolly?: boolean
  virus?: boolean
  virusNextAt?: number
}

export type SpecialKind =
  | 'star'
  | 'x2'
  | 'jolly'
  | 'bombColor'
  | 'laser'
  | 'wall'
  | 'vortex'
  | 'shuffle'
  | 'clone'

export type MultiplierMode = 'x2' | null
export type PendingMode = 'x2' | 'jolly' | 'bombColor' | 'clone' | null

export type Special = {
  id: string
  x: number
  y: number
  expiresAt: number
  kind: SpecialKind
  hp?: number // wall has 2 hp
}

export const WALL_HP = 2
export const WALL_DURATION_MS = GAME_CONFIG.wallDurationMs
export const SPECIAL_DURATION_MS = GAME_CONFIG.specialDurationMs
export const VIRUS_INTERVAL_MS = GAME_CONFIG.virusIntervalMs

export const EXPLOSION_VALUE = 32
export const EXPLOSION_SPAWN_COUNT = 4

export type Cell = Block | Special | null

export function isSpecial(c: Cell): c is Special {
  return !!c && 'expiresAt' in c
}
export function isBlock(c: Cell): c is Block {
  return !!c && 'value' in c
}
export function isWall(c: Cell): c is Special {
  return !!c && 'expiresAt' in c && (c as Special).kind === 'wall'
}

export const GRID_SIZE = 8

export const PENDING_KINDS: Set<SpecialKind> = new Set<SpecialKind>(['x2','jolly','bombColor','clone'])
export const INSTANT_KINDS: Set<SpecialKind> = new Set<SpecialKind>(['laser','vortex','shuffle','wall'])
