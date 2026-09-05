import { z } from 'zod'

const entrySchema = z.object({
  score: z.number().int().min(0),
  date: z.string(),
  maxTile: z.number().int().min(0).optional(),
})

export type LeaderboardEntry = z.infer<typeof entrySchema>
const listSchema = z.array(entrySchema)

const KEY = 'tilemama-leaderboard-v1'
const MAX = 10

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const res = listSchema.safeParse(parsed)
    if (res.success) return res.data.slice(0, MAX)
    return []
  } catch { return [] }
}

export function saveLeaderboard(list: LeaderboardEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch (e: any) {
    if (e?.name === 'QuotaExceededError') console.warn('[leaderboard] quota exceeded')
  }
}

export function pushScore(score: number, maxTile = 0): LeaderboardEntry[] {
  if (score <= 0) return loadLeaderboard()
  const list = loadLeaderboard()
  const entry: LeaderboardEntry = { score, date: new Date().toISOString(), maxTile }
  const next = [...list, entry].sort((a,b)=> b.score - a.score).slice(0, MAX)
  // Only keep if in top MAX or list not full
  if (next.includes(entry) || list.length < MAX) saveLeaderboard(next)
  else return list
  return next
}

export function clearLeaderboard() {
  try { localStorage.removeItem(KEY) } catch {}
}
