/**
 * ComboState — arcade combo (catena + tempo), reset solo su mossa vuota.
 * - chainDepth incrementa ad ogni merge/speciale utile
 * - timeBonus 1.5x se < WINDOW_MS dal lastMergeAt
 * - multiplier = (1 + 0.5*chainDepth capped 3) * timeBonus
 * - reset solo su onMiss (mossa senza effetto)
 */
export const COMBO_WINDOW_MS = 2500;
export const COMBO_MAX_CHAIN_BONUS = 3; // max chain multiplier before time

export type ComboSnapshot = { combo: number; chainDepth: number; lastAt: number | null };

export class ComboState {
  combo = 0;
  chainDepth = 0;
  lastAt: number | null = null;

  multiplier(now = Date.now()): number {
    if (this.combo === 0) return 1;
    const chain = 1 + Math.min(this.chainDepth * 0.5, COMBO_MAX_CHAIN_BONUS);
    const timeBonus = this.lastAt != null && now - this.lastAt < COMBO_WINDOW_MS ? 1.5 : 1;
    return chain * timeBonus;
  }
  peekMultiplier(now = Date.now()): number {
    const chain = 1 + Math.min(this.combo * 0.5, COMBO_MAX_CHAIN_BONUS);
    const timeBonus = this.lastAt != null && now - this.lastAt < COMBO_WINDOW_MS ? 1.5 : 1;
    return chain * timeBonus;
  }

  onMerge(now = Date.now()): { combo: number; multiplier: number } {
    const prevAt = this.lastAt;
    const prevCombo = this.combo;
    this.chainDepth = prevCombo;
    this.combo += 1;
    // multiplier uses prevAt for time bonus (no bonus on first)
    const chain = 1 + Math.min(this.chainDepth * 0.5, COMBO_MAX_CHAIN_BONUS);
    const timeBonus = prevAt != null && now - prevAt < COMBO_WINDOW_MS ? 1.5 : 1;
    const mult = chain * timeBonus;
    this.lastAt = now;
    return { combo: this.combo, multiplier: mult };
  }

  onMiss(): void {
    this.combo = 0;
    this.chainDepth = 0;
    this.lastAt = null;
  }

  snapshot(): ComboSnapshot {
    return { combo: this.combo, chainDepth: this.chainDepth, lastAt: this.lastAt };
  }

  restore(s: ComboSnapshot) {
    this.combo = s.combo;
    this.chainDepth = s.chainDepth;
    this.lastAt = s.lastAt;
  }

  reset() { this.onMiss(); }
}
