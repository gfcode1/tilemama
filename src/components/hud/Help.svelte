<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  let { showHelp }: { showHelp: boolean } = $props();
</script>

{#if showHelp}
  <div class="w-full max-w-[420px] sm:max-w-[560px] lg:max-w-[960px] bg-white/90 backdrop-blur border border-orange-200 rounded-2xl p-3 sm:p-4 shadow-sm" in:fly={{ y: -8, duration: 180 }} out:fade={{duration:120}}>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-[11px] sm:text-xs leading-relaxed text-[#7c2d12]">
      <div class="bg-[#fffbeb] border border-orange-100 rounded-xl p-2.5">
        <div class="font-black text-[#431407] text-xs mb-1">↔︎ Swipe</div>
        Scorri in 8 direzioni (anche diagonale) fino a muro/blocco. Anteprima ghost mostra destino.
      </div>
      <div class="bg-[#fffbeb] border border-orange-100 rounded-xl p-2.5">
        <div class="font-black text-[#431407] text-xs mb-1">Merge</div>
        Stesso <b>colore+valore → somma</b>. <b>16</b> esplode in 4, combo aumenta punteggio.
      </div>
      <div class="bg-[#fffbeb] border border-orange-100 rounded-xl p-2.5">
        <div class="font-black text-[#431407] text-xs mb-1">Speciali ★</div>
        Stella ogni 10s, bonus random 8-13s. Jolly 🌈 fonde con tutto.
      </div>
    </div>
    <div class="mt-2 text-[10px] font-bold tracking-wide text-[#9a3412]/55 text-center">Tasti: Ctrl+Z undo · N nuova · M mute · ? help · Esc annulla pending</div>
  </div>
{/if}
