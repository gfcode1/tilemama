<script lang="ts">
  import { scale, fade } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import type { Special } from '../../lib/types';
  import { specialMeta } from '../../lib/candy';

  let { special, posStyle }: { special: Special; posStyle: string } = $props();
  let meta = $derived(specialMeta(special.kind));
</script>

<div
  class="absolute rounded-[12px] sm:rounded-[14px] border-2 border-b-[3px] bg-gradient-to-b flex flex-col items-center justify-center font-black shadow-[0_8px_14px_rgba(0,0,0,0.12)] z-10 overflow-hidden {meta.bg} text-white {special.kind==='wall' && (special.hp ?? 2)===1 ? 'opacity-85' : ''}"
  style="{posStyle};"
  in:scale={{duration:260, start:0.55, easing: backOut}}
  out:fade={{duration:140}}
  role="img"
  aria-label={meta.aria}
>
  <span class="tile-gloss absolute inset-0 rounded-[10px] sm:rounded-[12px] pointer-events-none opacity-60"></span>
  <span class="relative animate-[pulse_900ms_ease_infinite] text-[13px] sm:text-[15px] leading-none">{meta.icon}</span>
  <span class="relative text-[7px] sm:text-[8px] font-black tracking-widest opacity-90 leading-none mt-0.5">{meta.label}</span>
  {#if special.kind==='wall'}<span class="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] bg-white text-stone-700 rounded-full px-1.5 py-0.5 font-black border border-stone-200">{special.hp ?? 2}♥</span>{/if}
  <!-- circular-ish timer ring via SVG -->
  <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <rect x="2" y="2" width="96" height="96" rx="10" fill="none" stroke="rgba(255,255,255,0.92)" stroke-width="3" stroke-dasharray="360" stroke-dashoffset="0" style="animation: candyTimer {meta.timerMs}ms linear forwards; transform-origin: center;" />
  </svg>
</div>
<style>
  @keyframes candyTimer { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 360; } }
</style>
