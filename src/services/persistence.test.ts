import { describe, it, expect, beforeEach } from 'vitest';
import { loadPersisted, savePersisted, clearPersisted } from './persistence';

describe('persistence migrate', () => {
  beforeEach(() => clearPersisted());
  it('migrates v1 pendingMultiplier to pendingMode', () => {
    const fakeGrid = Array.from({length:8},()=>Array(8).fill(null));
    localStorage.setItem('tilemama-save-v1', JSON.stringify({ grid: fakeGrid, score: 10, bestScore: 20, gameOver: false, pendingMultiplier: 'x2' }));
    const loaded = loadPersisted() as any;
    expect(loaded.pendingMode).toBe('x2');
  });
  it('save and load roundtrip', () => {
    const fakeGrid = Array.from({length:8},()=>Array(8).fill(null));
    savePersisted({ grid: fakeGrid as any, score: 5, bestScore: 5, gameOver: false, pendingMode: null, pendingSafeX5: false } as any);
    const loaded = loadPersisted();
    expect(loaded?.score).toBe(5);
  });
});
