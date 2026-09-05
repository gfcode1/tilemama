export type Clock = { now: () => number };

export const realClock: Clock = { now: () => Date.now() };
export function fixedClock(ms: number): Clock { return { now: () => ms }; }
