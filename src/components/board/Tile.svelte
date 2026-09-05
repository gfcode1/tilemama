<script lang="ts">
  import { scale } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import { candyTileClass, candyValueSize } from '../../lib/candy';
  import type { Block } from '../../lib/types';
  import icon1 from '../../assets/icons/1.png';
  import icon2 from '../../assets/icons/2.png';
  import icon4 from '../../assets/icons/4.png';
  import icon8 from '../../assets/icons/8.png';
  import icon16 from '../../assets/icons/16.png';

  const iconMap: Record<number, string> = { 1: icon1, 2: icon2, 4: icon4, 8: icon8, 16: icon16 };

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

  let pendingRing = $derived(
    !isPending ? '' :
    pendingMode==='x2' ? 'ring-2 ring-violet-300 shadow-[0_0_14px_rgba(167,139,250,0.55)]' :
    pendingMode==='jolly' ? 'ring-2 ring-pink-300 shadow-[0_0_14px_rgba(244,114,182,0.55)]' :
    pendingMode==='bombColor' ? 'ring-2 ring-rose-300 shadow-[0_0_14px_rgba(251,113,133,0.55)]' :
    pendingMode==='clone' ? 'ring-2 ring-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.55)]' :
    'ring-2 ring-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.45)]'
  );

  let iconSrc = $derived(iconMap[block.value] ?? null);
  let iconSize = $derived(
    block.value >= 16 ? 'w-[90%] h-[90%] max-w-[56px] max-h-[56px]' :
    block.value >= 8 ? 'w-[88%] h-[88%] max-w-[54px] max-h-[54px]' :
    block.value >= 4 ? 'w-[86%] h-[86%] max-w-[52px] max-h-[52px]' :
    block.value >= 2 ? 'w-[82%] h-[82%] max-w-[50px] max-h-[50px]' :
    'w-[78%] h-[78%] max-w-[48px] max-h-[48px]'
  );
</script>

<button
  class="absolute rounded-[14px] border-2 border-b-[4px] bg-gradient-to-b font-black flex items-center justify-center shadow-[0_10px_18px_rgba(124,45,18,0.18)] touch-none select-none overflow-hidden
    {candyTileClass(block.color, block.value, block.jolly, block.virus)} {isPop ? 'z-20' : 'z-10'} {isVibrating ? 'vibrate-block cursor-pointer' : ''} {isPending ? 'pending-pulse cursor-pointer ' + pendingRing : ''} {tier===5 ? 'animate-[candyPulseGold_900ms_ease_infinite]' : ''}"
  style="{posStyle}; transition: left 200ms cubic-bezier(.22,.8,.24,1), top 200ms cubic-bezier(.22,.8,.24,1), transform 320ms {isPop ? 'cubic-bezier(.34,1.56,.64,1)' : 'ease-out'}; {isPop ? 'transform: scale(1.14);' : ''} {isVibrating ? 'animation-delay: ' + ((block.x + block.y*3) % 5 * 38) + 'ms;' : ''}"
  in:scale={{duration: isSpawn ? 320 : 0, start:0.55, easing: backOut}}
  onpointerdown={(e)=>onPointerDown(e, block.id)}
  aria-label="{block.color} {block.value}"
>
  <span class="tile-highlight absolute inset-0 rounded-[12px] pointer-events-none"></span>
  <span class="tile-gloss absolute inset-0 rounded-[12px] pointer-events-none"></span>
  {#if iconSrc}
    <img src={iconSrc} alt={String(block.value)} width="48" height="48" class="relative {iconSize} object-contain drop-shadow-[0_1px_0_rgba(0,0,0,0.18)] pointer-events-none select-none {isPop ? 'animate-[candyPop_320ms_ease]' : ''}" draggable="false" loading="eager" decoding="async" />
  {:else}
    <span class="relative game-font {candyValueSize(block.value)} leading-none drop-shadow-[0_1px_0_rgba(0,0,0,0.18)] {isPop ? 'animate-[candyPop_320ms_ease]' : ''}">{block.value}</span>
  {/if}
  {#if block.jolly}
    <span class="absolute -top-1 -left-1 text-[9px] bg-gradient-to-br from-pink-400 to-pink-600 text-white rounded-full w-[18px] h-[18px] flex items-center justify-center font-black shadow border border-white">🌈</span>
  {/if}
  {#if block.virus}
    <span class="absolute -bottom-1 -right-1 text-[8px] bg-gradient-to-br from-lime-500 to-lime-600 text-white rounded-full w-[18px] h-[18px] flex items-center justify-center font-black shadow border border-white animate-pulse">☢️</span>
  {/if}
  {#if isPending && bannerIcon}
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
  @keyframes pendingPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.03); } }
  .pending-pulse { animation: pendingPulse 900ms ease-in-out infinite; }
</style>
