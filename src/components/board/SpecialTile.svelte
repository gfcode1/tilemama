<script lang="ts">
  import { scale, fade } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import type { Special } from '../../lib/types';

  let { special, posStyle }: { special: Special; posStyle: string } = $props();

  function specialClass(k: string) {
    if (k==='x2') return 'from-violet-400 to-violet-600 border-violet-200 text-white shadow-violet-500/25';
    if (k==='jolly') return 'from-pink-400 to-pink-600 border-pink-200 text-white shadow-pink-500/25';
    if (k==='bombColor') return 'from-rose-400 to-rose-600 border-rose-200 text-white shadow-rose-500/25';
    if (k==='laser') return 'from-rose-600 to-red-600 border-rose-200 text-white shadow-red-600/25';
    if (k==='wall') return 'from-stone-400 to-stone-600 border-stone-200 text-white shadow-stone-500/25';
    if (k==='vortex') return 'from-violet-500 to-violet-700 border-violet-200 text-white shadow-violet-700/25';
    if (k==='shuffle') return 'from-amber-400 to-amber-600 border-amber-200 text-white shadow-amber-500/25';
    if (k==='clone') return 'from-emerald-400 to-emerald-600 border-emerald-200 text-white shadow-emerald-600/25';
    return 'from-fuchsia-400 to-fuchsia-600 border-fuchsia-200 text-white';
  }
  function specialLabel(k: string) {
    if (k==='x2') return '×2';
    if (k==='jolly') return '🌈';
    if (k==='bombColor') return '💣';
    if (k==='laser') return '—';
    if (k==='wall') return '🧱';
    if (k==='vortex') return '🌀';
    if (k==='shuffle') return '🔀';
    if (k==='clone') return '➕';
    return '★';
  }
</script>

<div
  class="absolute rounded-[12px] border-2 border-b-[3px] bg-gradient-to-b flex items-center justify-center font-black shadow-[0_8px_14px_rgba(0,0,0,0.12)] z-10 overflow-hidden {specialClass(special.kind)} {special.kind==='wall' && (special.hp ?? 2)===1 ? 'opacity-85' : ''}"
  style="{posStyle};"
  in:scale={{duration:260, start:0.55, easing: backOut}}
  out:fade={{duration:140}}
>
  <span class="tile-gloss absolute inset-0 rounded-[10px] pointer-events-none opacity-60"></span>
  <span class="relative animate-[pulse_900ms_ease_infinite] text-[13px]">{specialLabel(special.kind)}</span>
  {#if special.kind==='wall'}<span class="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] bg-white text-stone-700 rounded-full px-1.5 py-0.5 font-black border border-stone-200">{special.hp ?? 2}♥</span>{/if}
  <div class="absolute bottom-0 left-0 right-0 h-[4px] bg-black/15">
    <div class="h-full bg-white/90 origin-left" style="animation: candyTimer {special.kind==='wall' ? 5000 : 3000}ms linear forwards;"></div>
  </div>
</div>
