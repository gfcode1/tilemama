import { describe, it, expect, beforeEach } from 'vitest';
import { Engine } from './engine';
import { EXPLOSION_VALUE } from './types';

describe('Engine explosion at 32', () => {
  let e: Engine;
  beforeEach(() => {
    e = new Engine();
    e.init();
    // clear random init blocks
    e.grid = Array.from({ length: 8 }, () => Array(8).fill(null));
    e.blocks.clear();
    e.specials.clear();
    e.score = 0;
    e.gameOver = false;
  });

  it('merging 16+16 should explode at 32 and spawn 4 blocks', () => {
    const b1 = { id: 'a', x: 0, y: 0, color: 'green' as const, value: 16 };
    const b2 = { id: 'b', x: 1, y: 0, color: 'green' as const, value: 16 };
    e.grid[0][0] = b1; e.blocks.set(b1.id, b1);
    e.grid[0][1] = b2; e.blocks.set(b2.id, b2);
    const res = e.move('a', 'E');
    expect(res.merged).toBe(true);
    expect(res.exploded).toBe(true);
    expect(res.scoreGain).toBe(32);
    // exploded block removed, 4 new blocks spawned
    expect(e.blocks.size).toBe(4);
    expect(e.blocks.has('a')).toBe(false);
  });

  it('merging 8+8 should NOT explode', () => {
    const b1 = { id: 'a', x: 0, y: 0, color: 'red' as const, value: 8 };
    const b2 = { id: 'b', x: 1, y: 0, color: 'red' as const, value: 8 };
    e.grid[0][0] = b1; e.blocks.set(b1.id, b1);
    e.grid[0][1] = b2; e.blocks.set(b2.id, b2);
    const res = e.move('a', 'E');
    expect(res.exploded).toBe(false);
    expect(e.blocks.get('a')?.value).toBe(16);
  });

  it('x2 pending on 16 should explode', () => {
    const b = { id: 'a', x: 0, y: 0, color: 'blue' as const, value: 16 };
    e.grid[0][0] = b; e.blocks.set(b.id, b);
    e.pendingMode = 'x2';
    const res = e.applyPending('a');
    expect(res?.exploded).toBe(true);
    expect(res?.newValue).toBe(32);
    expect(e.blocks.has('a')).toBe(false);
  });

  it('EXPLOSION_VALUE constant is 32', () => {
    expect(EXPLOSION_VALUE).toBe(32);
  });
});
