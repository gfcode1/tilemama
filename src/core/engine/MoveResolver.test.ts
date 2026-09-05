import { describe, it, expect } from 'vitest';
import { resolveMove } from './MoveResolver';
import type { Block } from '../../lib/types';

function b(x:number,y:number,color: Block['color']='green', value=1, id='a', jolly=false): Block { return { id, x, y, color, value, jolly } as Block; }

describe('MoveResolver', () => {
  it('slide to border when empty', () => {
    const block = b(2,2);
    const grid: any = Array.from({length:8},()=>Array(8).fill(null));
    const r = resolveMove(block,'E',grid);
    expect(r.type).toBe('slide');
    if (r.type==='slide') expect(r.finalX).toBe(7);
  });
  it('merge when same color+value', () => {
    const block = b(0,0,'red',2,'a');
    const target = b(2,0,'red',2,'b');
    const grid: any = Array.from({length:8},()=>Array(8).fill(null));
    grid[0][2]=target;
    const r = resolveMove(block,'E',grid);
    expect(r.type).toBe('merge');
  });
  it('no merge different color without jolly', () => {
    const block = b(0,0,'red',2,'a');
    const target = b(1,0,'green',2,'b');
    const grid: any = Array.from({length:8},()=>Array(8).fill(null));
    grid[0][1]=target;
    const r = resolveMove(block,'E',grid);
    expect(r.type).toBe('slide');
    if (r.type==='slide') expect(r.finalX).toBe(0);
  });
  it('jolly merges any color same value', () => {
    const block = b(0,0,'red',2,'a',true);
    const target = b(1,0,'green',2,'b');
    const grid: any = Array.from({length:8},()=>Array(8).fill(null));
    grid[0][1]=target;
    const r = resolveMove(block,'E',grid);
    expect(r.type).toBe('merge');
  });
  it('hits special', () => {
    const block = b(0,0);
    const grid: any = Array.from({length:8},()=>Array(8).fill(null));
    grid[0][1]={ id:'s', x:1,y:0,expiresAt:Date.now()+3000,kind:'star'};
    const r = resolveMove(block,'E',grid);
    expect(r.type).toBe('special');
  });
});
