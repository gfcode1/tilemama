<script lang="ts">
  let { combo, multiplier }: { combo: number; multiplier: number } = $props();
  let show = $derived(combo > 1 || multiplier > 1.01);
</script>

{#if show}
  <div class="w-full max-w-[420px] sm:max-w-[560px] lg:max-w-[560px] bg-white border border-orange-200 rounded-full px-2 py-1.5 flex items-center gap-2 shadow-sm overflow-hidden" role="status" aria-live="polite">
    <div class="shrink-0 bg-gradient-to-br from-amber-400 to-rose-500 text-white font-black text-[11px] sm:text-xs rounded-full px-2.5 py-1 leading-none">COMBO ×{combo}</div>
    {#if multiplier > 1.01}
      <div class="text-[11px] sm:text-xs font-black text-[#431407] tabular-nums">×{multiplier.toFixed(2).replace(/\.00$/,'')}</div>
    {/if}
    <div class="flex-1 h-1.5 bg-orange-100 rounded-full overflow-hidden ml-1">
      <div class="h-full bg-gradient-to-r from-amber-400 to-rose-500 rounded-full origin-left" style="animation: candyTimer 1200ms linear forwards;"></div>
    </div>
    <span class="text-[10px] font-black tracking-widest text-[#9a3412]/50 hidden sm:inline">CHAIN</span>
  </div>
{/if}
