export function tierFor(value: number): 1|2|3|4|5 {
  if (value >= 8) return 5
  if (value >= 4) return 4
  if (value >= 2) return 3
  return 2
}

export function candyTileClass(color: string, value: number, jolly?: boolean, virus?: boolean) {
  const t = tierFor(value)
  const base: Record<string,string> = {
    green: 'from-emerald-300 to-emerald-500 border-emerald-700/30 text-emerald-950 shadow-emerald-500/25',
    red: 'from-rose-300 to-rose-500 border-rose-700/30 text-rose-950 shadow-rose-500/25',
    yellow: 'from-amber-200 to-amber-400 border-amber-700/25 text-amber-950 shadow-amber-500/30',
    blue: 'from-sky-300 to-sky-500 border-sky-700/30 text-sky-950 shadow-sky-500/25',
  }
  let cls = base[color] ?? 'from-zinc-300 to-zinc-500 border-zinc-700/30'
  if (t >= 3) cls += ' ring-1 ring-white/60'
  if (t >= 4) cls += ' ring-2 ring-white/70'
  if (t === 5) cls += ' ring-2 ring-amber-200/90'
  if (jolly) cls += ' ring-2 ring-pink-300'
  if (virus) cls += ' ring-2 ring-lime-300/80'
  return cls
}

export function candyValueSize(value: number) {
  if (value >= 8) return 'text-[18px] tracking-tight'
  if (value >= 4) return 'text-[17px]'
  return 'text-[15px]'
}
