<script lang="ts">
  import { scale } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import { candyTileClass, candyValueSize } from '../../lib/candy';
  import type { Block } from '../../lib/types';

  let { block, isPop = false, isSpawn = false, isVibrating = false, bannerIcon = '', tier = 1, posStyle = '', onPointerDown }: {
    block: Block;
    isPop: boolean;
    isSpawn: boolean;
    isVibrating: boolean;
    bannerIcon: string;
    tier: number;
    posStyle: string;
    onPointerDown: (e: PointerEvent, id: string) => void;
  } = $props();
</script>

<button
  class="absolute rounded-[14px] border-2 border-b-[4px] bg-gradient-to-b font-black flex items-center justify-center shadow-[0_10px_18px_rgba(124,45,18,0.18)] touch-none select-none overflow-hidden
    {candyTileClass(block.color, block.value, block.jolly, block.virus)} {isPop ? 'z-20' : 'z-10'} {isVibrating ? 'vibrate-block cursor-pointer' : ''} {tier===5 ? 'animate-[candyPulseGold_900ms_ease_infinite]' : ''}"
  style="{posStyle}; transition: left 200ms cubic-bezier(.22,.8,.24,1), top 200ms cubic-bezier(.22,.8,.24,1), transform 320ms {isPop ? 'cubic-bezier(.34,1.56,.64,1)' : 'ease-out'}; {isPop ? 'transform: scale(1.14);' : ''} {isVibrating ? 'animation-delay: ' + ((block.x + block.y*3) % 5 * 38) + 'ms;' : ''}"
  in:scale={{duration: isSpawn ? 320 : 0, start:0.55, easing: backOut}}
  onpointerdown={(e)=>onPointerDown(e, block.id)}
  aria-label="{block.color} {block.value}"
>
  <span class="tile-highlight absolute inset-0 rounded-[12px] pointer-events-none"></span>
  <span class="tile-gloss absolute inset-0 rounded-[12px] pointer-events-none"></span>
  <span class="relative game-font {candyValueSize(block.value)} leading-none drop-shadow-[0_1px_0_rgba(0,0,0,0.18)] {isPop ? 'animate-[candyPop_320ms_ease]' : ''}">{block.value}</span>
  {#if block.jolly}
    <span class="absolute -top-1 -left-1 text-[9px] bg-gradient-to-br from-pink-400 to-pink-600 text-white rounded-full w-[18px] h-[18px] flex items-center justify-center font-black shadow border border-white">🌈</span>
  {/if}
  {#if block.virus}
    <span class="absolute -bottom-1 -right-1 text-[8px] bg-gradient-to-br from-lime-500 to-lime-600 text-white rounded-full w-[18px] h-[18px] flex items-center justify-center font-black shadow border border-white animate-pulse">☢️</span>
  {/if}
  {#if isVibrating && bannerIcon}
    <span class="absolute -top-1 -right-1 text-[9px] bg-white text-[#431407] rounded-full w-[18px] h-[18px] flex items-center justify-center font-black shadow border border-orange-200">{bannerIcon}</span>
  {/if}
  {#if tier>=3}
    <span class="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-white/35 rounded-full blur-[1px] pointer-events-none"></span>
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
</style>
