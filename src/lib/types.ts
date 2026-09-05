export type Color = 'green' | 'red' | 'yellow' | 'blue'
export const COLORS: Color[] = ['green', 'red', 'yellow', 'blue']

export type Dir = 'N' | 'S' | 'E' | 'W'
export const DIRS: Record<Dir, { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  S: { dx: 0, dy: 1 },
  W: { dx: -1, dy: 0 },
  E: { dx: 1, dy: 0 },
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
  | 'div2'
  | 'jolly'
  | 'bombColor'
  | 'laser'
  | 'wall'
  | 'magnet'
  | 'vortex'
  | 'shuffle'
  | 'clone'
  | 'virus'
  | 'safeX5'

export type MultiplierMode = 'x2' | 'div2' | null
export type PendingMode = 'x2' | 'div2' | 'jolly' | 'bombColor' | 'clone' | 'virus' | 'safeX5' | null

export type Special = {
  id: string
  x: number
  y: number
  expiresAt: number
  kind: SpecialKind
  hp?: number // wall has 2 hp
}

export const WALL_HP = 2
export const WALL_DURATION_MS = 5000
export const SPECIAL_DURATION_MS = 3000
export const VIRUS_INTERVAL_MS = 3000

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

export const PENDING_KINDS: Set<SpecialKind> = new Set<SpecialKind>(['x2','div2','jolly','bombColor','clone','virus','safeX5'])
export const INSTANT_KINDS: Set<SpecialKind> = new Set<SpecialKind>(['laser','magnet','vortex','shuffle','wall'])
