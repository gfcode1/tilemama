import { describe, it, expect } from 'vitest';
import { ComboState, COMBO_WINDOW_MS } from './ComboState';

describe('ComboState arcade (catena+tempo, reset solo miss)', () => {
  it('first merge => combo1 multiplier 1', () => {
    const c = new ComboState();
    const r = c.onMerge(1000);
    expect(r.combo).toBe(1);
    expect(r.multiplier).toBe(1);
  });
  it('second merge within window => chain 1.5 * time 1.5 = 2.25', () => {
    const c = new ComboState();
    c.onMerge(1000);
    const r = c.onMerge(1000 + 1000);
    expect(r.combo).toBe(2);
    expect(r.multiplier).toBeCloseTo(2.25);
  });
  it('third merge within window => chain 2 *1.5=3', () => {
    const c = new ComboState();
    c.onMerge(0);
    c.onMerge(500);
    const r = c.onMerge(1000);
    expect(r.combo).toBe(3);
    expect(r.multiplier).toBeCloseTo(3);
  });
  it('outside window => no time bonus', () => {
    const c = new ComboState();
    c.onMerge(0);
    const r = c.onMerge(COMBO_WINDOW_MS + 100);
    expect(r.multiplier).toBeCloseTo(1.5); // chain 1.5 but time 1
  });
  it('reset solo su miss', () => {
    const c = new ComboState();
    c.onMerge(0); c.onMerge(500);
    c.onMiss();
    expect(c.combo).toBe(0);
    expect(c.multiplier()).toBe(1);
    const r = c.onMerge(10000);
    expect(r.combo).toBe(1);
  });
  it('chain capped', () => {
    const c = new ComboState();
    for (let i=0;i<10;i++) c.onMerge(i*100);
    expect(c.multiplier(1000)).toBeCloseTo(4 * 1.5); // chain capped 3 => 1+3=4 *1.5
  });
});
