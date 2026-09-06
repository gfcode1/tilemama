<script lang="ts">
  import { scale } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import { pendingMeta, tilePastelBg } from '../../lib/candy';
  import type { Block } from '../../lib/types';
  import { tileSpriteStyle } from '../../lib/sprites';

  let { block, isPop = false, isSpawn = false, isVibrating = false, isPending = false, pendingMode = null, bannerIcon = '', tier = 1, posStyle = '', onPointerDown }: {
    block: Block;
    isPop: boolean;
    isSpawn: boolean;
    isVibrating: boolean;
    isPending: boolean;
    pendingMode: string | null;
    bannerIcon: string;
    tier: number;
    posStyle: string;
    onPointerDown: (e: PointerEvent, id: string) => void;
  } = $props();

  let pm = $derived(pendingMode ? pendingMeta(pendingMode) : null);
  let pendingRing = $derived(
    !isPending || !pm ? '' : `ring-2 ${pm.ring} ${pm.glow}`
  );

  let spriteStyle = $derived(tileSpriteStyle(block));
</script>

<button
  class="absolute rounded-[14px] sm:rounded-[16px] border-2 border-b-[4px] sm:border-b-[5px] font-black flex items-center justify-center shadow-[0_10px_18px_rgba(124,45,18,0.18)] touch-none select-none overflow-visible isolate focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:outline-none
    {tilePastelBg(block.color, block.jolly)} {isPop ? 'z-20' : 'z-10'} {isVibrating ? 'vibrate-block cursor-pointer' : ''} {isPending ? 'pending-pulse cursor-pointer ' + pendingRing : ''} {tier===5 ? 'animate-[candyPulseGold_900ms_ease_infinite]' : ''}"
  style="{posStyle}; transition: left 200ms cubic-bezier(.22,.8,.24,1), top 200ms cubic-bezier(.22,.8,.24,1), transform 320ms {isPop ? 'cubic-bezier(.34,1.56,.64,1)' : 'ease-out'}; {isPop ? 'transform: scale(1.14);' : ''} {isVibrating ? 'animation-delay: ' + ((block.x + block.y*3) % 5 * 38) + 'ms;' : ''}"
  in:scale={{duration: isSpawn ? 320 : 0, start:0.55, easing: backOut}}
  onpointerdown={(e)=>onPointerDown(e, block.id)}
  aria-label="{block.color} {block.value}{block.jolly ? ' jolly' : ''}{block.virus ? ' virus' : ''}"
  aria-pressed={isPending}
>
  <div
    role="img"
    aria-label="{block.jolly ? 'jolly ' : ''}{block.color} {block.value}"
    class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] max-w-none pointer-events-none select-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.18)] drop-shadow-[0_1px_0_rgba(0,0,0,0.12)] {isPop ? 'animate-[candyPop_320ms_ease]' : ''}"
    style="{spriteStyle}"
  ></div>
  {#if block.virus}
    <span class="absolute -bottom-1 -right-1 z-10 text-[8px] sm:text-[9px] bg-gradient-to-br from-lime-500 to-lime-600 text-white rounded-full w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] flex items-center justify-center font-black shadow border border-white animate-pulse">☢️</span>
  {/if}
  {#if isPending && bannerIcon}
    <span class="absolute -top-1 -right-1 z-10 text-[9px] sm:text-[10px] bg-white text-[#431407] rounded-full w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] flex items-center justify-center font-black shadow border border-orange-200">{bannerIcon}</span>
  {/if}
</button>

<style>
  @keyframes vibrate {
    0% { transform: translate(0,0) rotate(0deg); }
    12% { transform: translate(-1px, 1px) rotate(-0.5deg); }
    24% { transform: translate(1px, -1px) rotate(0.5deg); }
    36% { transform: translate(-1.1px, 0.5px) rotate(-0.35deg); }
    48% { transform: translate(1.1px, 0.7px) rotate(0.35deg); }
    60% { transform: translate(-0.8px, -0.7px) rotate(-0.25deg); }
    72% { transform: translate(0.8px, 0.5px) rotate(0.25deg); }
    84% { transform: translate(-0.5px, 0.8px) rotate(-0.15deg); }
    100% { transform: translate(0,0) rotate(0deg); }
  }
  .vibrate-block { animation: vibrate 220ms linear infinite; }
  @keyframes pendingPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.03); } }
  .pending-pulse { animation: pendingPulse 900ms ease-in-out infinite; }
</style>
