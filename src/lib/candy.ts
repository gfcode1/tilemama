export function tierFor(value: number): 1|2|3|4|5 {
  if (value >= 16) return 5
  if (value >= 8) return 4
  if (value >= 4) return 3
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
  if (value >= 16) return 'text-[17px] tracking-tight sm:text-[18px]'
  if (value >= 8) return 'text-[18px] tracking-tight sm:text-[19px]'
  if (value >= 4) return 'text-[17px] sm:text-[18px]'
  return 'text-[15px] sm:text-[16px]'
}

export const TILE_PASTEL: Record<string, string> = {
  green: 'bg-emerald-100 border-emerald-200/80',
  red: 'bg-rose-100 border-rose-200/80',
  yellow: 'bg-amber-100 border-amber-200/80',
  blue: 'bg-sky-100 border-sky-200/80',
  jolly: 'bg-gradient-to-br from-fuchsia-100 to-violet-100 border-fuchsia-200/80',
}

export function tilePastelBg(color: string, jolly?: boolean): string {
  if (jolly) return TILE_PASTEL.jolly
  return TILE_PASTEL[color] ?? 'bg-white border-orange-200'
}

export type SpecialKind = string
export interface SpecialMeta { hex: string; bg: string; icon: string; label: string; aria: string; timerMs: number }
export const SPECIAL_META: Record<string, SpecialMeta> = {
  star: { hex:'#f0abfc', bg:'from-fuchsia-400 to-fuchsia-600 border-fuchsia-200', icon:'★', label:'Stella', aria:'Stella bonus', timerMs: 3000 },
  x2: { hex:'#a78bfa', bg:'from-violet-400 to-violet-600 border-violet-200', icon:'×2', label:'×2', aria:'Moltiplicatore x2', timerMs: 3000 },
  jolly: { hex:'#f472b6', bg:'from-pink-400 to-pink-600 border-pink-200', icon:'🌈', label:'Jolly', aria:'Jolly arcobaleno', timerMs: 3000 },
  bombColor: { hex:'#fb7185', bg:'from-rose-400 to-rose-600 border-rose-200', icon:'💣', label:'Bomba', aria:'Bomba colore', timerMs: 3000 },
  laser: { hex:'#f43f5e', bg:'from-rose-600 to-red-600 border-rose-200', icon:'—', label:'Laser', aria:'Laser riga', timerMs: 3000 },
  wall: { hex:'#a8a29e', bg:'from-stone-400 to-stone-600 border-stone-200', icon:'🧱', label:'Muro', aria:'Muro', timerMs: 5000 },
  vortex: { hex:'#a78bfa', bg:'from-violet-500 to-violet-700 border-violet-200', icon:'🌀', label:'Vortex', aria:'Vortice', timerMs: 3000 },
  shuffle: { hex:'#fbbf24', bg:'from-amber-400 to-amber-600 border-amber-200', icon:'🔀', label:'Shuffle', aria:'Rimescola', timerMs: 3000 },
  clone: { hex:'#34d399', bg:'from-emerald-400 to-emerald-600 border-emerald-200', icon:'➕', label:'Clone', aria:'Clona blocco', timerMs: 3000 },
}
export function specialMeta(kind: string): SpecialMeta { return SPECIAL_META[kind] ?? SPECIAL_META.star }
export function pendingMeta(mode: string | null) {
  const m: Record<string,{ring:string; glow:string; icon:string; text:string; bg:string}> = {
    x2: { ring:'ring-violet-300', glow:'shadow-[0_0_14px_rgba(167,139,250,0.55)]', icon:'×2', text:'Tocca un blocco per raddoppiarlo!', bg:'from-violet-400 to-violet-600' },
    jolly: { ring:'ring-pink-300', glow:'shadow-[0_0_14px_rgba(244,114,182,0.55)]', icon:'🌈', text:'Tocca per renderlo Jolly!', bg:'from-pink-400 to-pink-600' },
    bombColor: { ring:'ring-rose-300', glow:'shadow-[0_0_14px_rgba(251,113,133,0.55)]', icon:'💣', text:'Tocca per eliminare quel colore!', bg:'from-rose-400 to-rose-600' },
    clone: { ring:'ring-emerald-300', glow:'shadow-[0_0_14px_rgba(52,211,153,0.55)]', icon:'➕', text:'Tocca per clonarlo!', bg:'from-emerald-400 to-emerald-600' },
  }
  return m[mode ?? ''] ?? { ring:'ring-cyan-300', glow:'shadow-[0_0_14px_rgba(34,211,238,0.45)]', icon:'×2', text:'Scegli un blocco', bg:'from-cyan-400 to-cyan-600' }
}
