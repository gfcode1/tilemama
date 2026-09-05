export type Rng = () => number;

export function createRng(seed?: number): Rng {
  if (seed == null) return Math.random;
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function pickRandom<T>(arr: T[], rng: Rng = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}
