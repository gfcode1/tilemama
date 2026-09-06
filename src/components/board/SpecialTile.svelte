<script lang="ts">
  import { scale, fade } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import type { Special } from '../../lib/types';
  import { specialMeta } from '../../lib/candy';
  import { specialSpriteStyle } from '../../lib/sprites';

  let { special, posStyle, onTap }: { special: Special; posStyle: string; onTap?: (s: Special) => void } = $props();
  let meta = $derived(specialMeta(special.kind));
  let spriteStyle = $derived(specialSpriteStyle(special.kind, special.hp));
  let isCracked = $derived(special.kind==='wall' && (special.hp ?? 2)===1);

  // size+anim per kind: wall più contenuto, star/laser più imponente
  let sizeCls = $derived(
    special.kind==='star' ? 'w-[175%] h-[175%]' :
    special.kind==='laser' ? 'w-[170%] h-[170%]' :
    special.kind==='vortex' ? 'w-[168%] h-[168%]' :
    special.kind==='shuffle' ? 'w-[165%] h-[165%]' :
    special.kind==='wall' ? (isCracked ? 'w-[152%] h-[152%]' : 'w-[158%] h-[158%]') :
    'w-[165%] h-[165%]'
  );
  let animCls = $derived(
    special.kind==='star' ? 'anim-float' :
    special.kind==='x2' ? 'anim-pulse' :
    special.kind==='jolly' ? 'anim-rainbow' :
    special.kind==='bombColor' ? 'anim-wiggle' :
    special.kind==='laser' ? 'anim-laser' :
    special.kind==='vortex' ? 'anim-spin' :
    special.kind==='shuffle' ? 'anim-shuffle' :
    special.kind==='clone' ? 'anim-float' :
    special.kind==='wall' && isCracked ? 'anim-cracked' : 'anim-breathe'
  );
</script>

<button
  type="button"
  class="absolute rounded-[16px] border-2 border-b-[4px] bg-white flex flex-col items-center justify-center font-black shadow-[0_10px_20px_rgba(0,0,0,0.16)] z-[15] overflow-visible isolate cursor-pointer active:scale-[0.96] transition-transform focus-visible:ring-2 focus-visible:ring-fuchsia-300 focus-visible:outline-none {animCls} {isCracked ? 'opacity-95' : ''}"
  style="{posStyle};"
  in:scale={{duration:320, start:0.45, easing: backOut}}
  out:fade={{duration:160}}
  aria-label="{meta.aria} — tocca per raccogliere"
  title="Tocca per raccogliere"
  onclick={() => onTap?.(special)}
  onkeydown={(e)=> { if(e.key==='Enter'||e.key===' ') { e.preventDefault(); onTap?.(special) } }}
>
  <div
    role="img"
    aria-label={meta.aria}
    class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 {sizeCls} max-w-none pointer-events-none select-none drop-shadow-[0_6px_14px_rgba(0,0,0,0.22)] drop-shadow-[0_2px_0_rgba(0,0,0,0.12)]"
    style="{spriteStyle}"
  ></div>
  <span class="absolute -bottom-1 left-1/2 -translate-x-1/2 z-10 text-[7px] sm:text-[8px] font-black tracking-widest leading-none bg-black/60 text-white rounded-full px-1.5 py-0.5 backdrop-blur-[1px] border border-white/20 whitespace-nowrap">{meta.label}</span>
  {#if special.kind==='wall'}<span class="absolute -top-1 left-1/2 -translate-x-1/2 z-10 text-[7px] bg-white text-stone-700 rounded-full px-1.5 py-0.5 font-black border border-stone-200 shadow">{special.hp ?? 2}♥</span>{/if}
  <svg class="absolute inset-0 w-full h-full pointer-events-none rounded-[14px]" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <rect x="2" y="2" width="96" height="96" rx="12" fill="none" stroke="rgba(255,255,255,0.92)" stroke-width="3" stroke-dasharray="360" stroke-dashoffset="0" style="animation: candyTimer {meta.timerMs}ms linear forwards; transform-origin: center;" />
  </svg>
</button>

<style>
  @keyframes candyTimer { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 360; } }
  @keyframes specialFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
  @keyframes specialPulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.04) } }
  @keyframes specialRainbow { 0% { filter: hue-rotate(0deg) brightness(1) } 50% { filter: hue-rotate(12deg) brightness(1.08) } 100% { filter: hue-rotate(0deg) brightness(1) } }
  @keyframes specialWiggle { 0%,100% { transform: rotate(0deg) } 15% { transform: rotate(-2.5deg) } 30% { transform: rotate(2.5deg) } 45% { transform: rotate(-1.5deg) } }
  @keyframes specialLaser { 0%,100% { filter: brightness(1) drop-shadow(0 0 0 rgba(244,63,94,0)) } 50% { filter: brightness(1.12) drop-shadow(0 0 8px rgba(244,63,94,0.45)) } }
  @keyframes specialSpin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
  /* shuffle jitter: leggero */
  @keyframes specialShuffle { 0%,100% { transform: translateX(0) } 10% { transform: translateX(-1.5px) } 20% { transform: translateX(1.5px) } 30% { transform: translateX(-1px) } }
  @keyframes specialBreathe { 0%,100% { transform: scale(1) } 50% { transform: scale(1.03) } }
  @keyframes specialCracked { 0%,100% { transform: translateX(0) } 25% { transform: translateX(-1px) rotate(-0.6deg) } 75% { transform: translateX(1px) rotate(0.6deg) } }

  .anim-float { animation: specialFloat 2.2s ease-in-out infinite; }
  .anim-pulse { animation: specialPulse 1.1s ease-in-out infinite; }
  .anim-rainbow { animation: specialRainbow 2s ease-in-out infinite, specialFloat 2.4s ease-in-out infinite; }
  .anim-wiggle { animation: specialWiggle 0.85s ease-in-out infinite, specialFloat 2s ease-in-out infinite; }
  .anim-laser { animation: specialLaser 0.9s ease-in-out infinite, specialFloat 2s ease-in-out infinite; }
  .anim-spin :global(img) { animation: specialSpin 4.2s linear infinite; }
  .anim-spin { animation: specialFloat 2.4s ease-in-out infinite; }
  .anim-shuffle { animation: specialShuffle 0.7s ease-in-out infinite, specialFloat 2s ease-in-out infinite; }
  .anim-breathe { animation: specialBreathe 2.6s ease-in-out infinite; }
  .anim-cracked { animation: specialCracked 0.45s ease-in-out infinite, specialBreathe 2.6s ease-in-out infinite; }

  @media (prefers-reduced-motion: reduce) {
    .anim-float, .anim-pulse, .anim-rainbow, .anim-wiggle, .anim-laser, .anim-spin, .anim-shuffle, .anim-breathe, .anim-cracked { animation: none !important; }
  }
</style>
