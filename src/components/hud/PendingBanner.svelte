<script lang="ts">
  import { scale } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import { pendingMeta } from '../../lib/candy';
  let { mode, onCancel }: { mode: string; onCancel: () => void } = $props();
  let info = $derived(pendingMeta(mode));
</script>

<div class="w-full rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between font-black shadow-[0_10px_18px_rgba(0,0,0,0.12)] border-2 border-white bg-gradient-to-r {info.bg} text-white" in:scale={{duration:200, start:0.96, easing: backOut}} role="status" aria-live="polite">
  <span class="flex items-center gap-2 sm:gap-3 text-[13px] sm:text-[14px] leading-tight">
    <span class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/90 border border-white flex items-center justify-center text-[#431407] text-sm sm:text-base shadow-sm shrink-0">{info.icon}</span>
    <span class="pr-2">{info.text}</span>
  </span>
  <button onclick={onCancel} class="shrink-0 bg-white text-[#431407] border border-black/5 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-black shadow-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none">Annulla ✕</button>
</div>
