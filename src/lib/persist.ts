import type { Block, Special } from './types'

const KEY = 'tilemama-save-v1'

export type SaveData = {
  grid: (Block | Special | null)[][]
  score: number
  bestScore: number
  gameOver: boolean
}

export function load(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as SaveData
    if (!data.grid || typeof data.score !== 'number') return null
    return data
  } catch { return null }
}

export function save(data: SaveData) {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
}

export function clear() {
  try { localStorage.removeItem(KEY) } catch {}
}
