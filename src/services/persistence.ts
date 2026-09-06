import { z } from 'zod';
import type { Block, Special } from '../lib/types';

const blockSchema = z.object({
  id: z.string(),
  x: z.number().int().min(0).max(7),
  y: z.number().int().min(0).max(7),
  color: z.enum(['green', 'red', 'yellow', 'blue']),
  value: z.number().int().min(1).max(64),
  jolly: z.boolean().optional(),
  virus: z.boolean().optional(),
  virusNextAt: z.number().optional(),
});

const specialSchema = z.object({
  id: z.string(),
  x: z.number().int().min(0).max(7),
  y: z.number().int().min(0).max(7),
  expiresAt: z.number(),
  kind: z.enum([
    'star',
    'x2',
    'jolly',
    'bombColor',
    'laser',
    'wall',
    'vortex',
    'shuffle',
    'clone',
  ]),
  hp: z.number().optional(),
});

const achievementProgressSchema = z.object({
  progress: z.number().int().min(0),
  completedAt: z.number().optional(),
})

const activeMissionSchema = z.object({
  id: z.string(),
  kind: z.string(),
  label: z.string(),
  target: z.number(),
  difficulty: z.enum(['easy', 'med', 'hard']),
  icon: z.string(),
  color: z.string().optional(),
  value: z.number().optional(),
  specialKind: z.string().optional(),
  progress: z.number().int().min(0),
  instanceId: z.string(),
  scaledTarget: z.number().int().min(1),
})

const saveSchema = z.object({
  grid: z.array(z.array(z.union([blockSchema, specialSchema, z.null()]))),
  score: z.number().int().min(0),
  bestScore: z.number().int().min(0).optional(),
  gameOver: z.boolean(),
  pendingMode: z
    .enum(['x2', 'jolly', 'bombColor', 'clone'])
    .nullable()
    .optional(),
  pendingMultiplier: z.enum(['x2']).nullable().optional(),
  pendingSafeX5: z.boolean().optional(),
  coins: z.number().int().min(0).optional(),
  achievements: z.record(z.string(), achievementProgressSchema).optional(),
  activeMissions: z.array(activeMissionSchema).optional(),
  totalMerges: z.number().int().min(0).optional(),
  totalValue16: z.number().int().min(0).optional(),
  totalExplosions: z.number().int().min(0).optional(),
  totalSpecials: z.number().int().min(0).optional(),
  totalWalls: z.number().int().min(0).optional(),
  maxComboEver: z.number().int().min(0).optional(),
  shopOwned: z.array(z.string()).optional(),
  shopActive: z.string().nullable().optional(),
});

export type PersistedSave = z.infer<typeof saveSchema>;

const KEY = 'tilemama-save-v3';
const LEGACY_KEY = 'tilemama-save-v2';
const LEGACY_KEY_V1 = 'tilemama-save-v1';

export function loadPersisted(): PersistedSave | null {
  for (const k of [KEY, LEGACY_KEY, LEGACY_KEY_V1]) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const res = saveSchema.safeParse(parsed);
      if (res.success) return migrate(res.data);
      // fallback: try lenient migration
      if (parsed?.grid) return migrate(parsed as any);
    } catch {}
  }
  return null;
}

function migrate(data: any): PersistedSave {
  // reset pulito v2->v3: achievements/coins azzerati, mantieni bestScore
  if (data.coins == null) data.coins = 0
  if (!data.achievements) data.achievements = {}
  if (!data.shopOwned) data.shopOwned = []
  if (data.shopActive === undefined) data.shopActive = null
  // v1 -> v2: pendingMultiplier -> pendingMode
  if (data.pendingMultiplier && !data.pendingMode) {
    data.pendingMode = data.pendingMultiplier;
  }
  // drop obsolete pending modes (div2, virus, safeX5)
  const validPending = new Set(['x2','jolly','bombColor','clone']);
  if (data.pendingMode && !validPending.has(data.pendingMode)) data.pendingMode = null;
  if (data.pendingMultiplier && !validPending.has(data.pendingMultiplier)) data.pendingMultiplier = null;
  // ensure kind default + migrate obsolete specials (div2/magnet/virus/safeX5 -> star)
  const validKinds = new Set(['star','x2','jolly','bombColor','laser','wall','vortex','shuffle','clone']);
  const remap: Record<string,string> = { div2:'x2', magnet:'shuffle', virus:'clone', safeX5:'star' };
  if (data.grid) {
    data.grid = data.grid.map((row: any[]) =>
      row.map((c: any) => {
        if (!c) return null;
        if ('expiresAt' in c && !('kind' in c)) return { ...c, kind: 'star' };
        if (c.kind && !validKinds.has(c.kind)) return { ...c, kind: remap[c.kind] ?? 'star' };
        if (c.kind === 'wall' && c.hp == null) return { ...c, hp: 2 };
        return c;
      })
    );
  }
  return data as PersistedSave;
}

export function savePersisted(data: PersistedSave) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e: any) {
    if (e?.name === 'QuotaExceededError') {
      console.warn('[persist] quota exceeded, save dropped');
    }
  }
}

export function clearPersisted() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(LEGACY_KEY);
    localStorage.removeItem(LEGACY_KEY_V1);
    localStorage.removeItem('tilemama-save-v1');
  } catch {}
}
