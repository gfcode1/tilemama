<script lang="ts">
  import { fade, scale } from 'svelte/transition'
  import { backOut } from 'svelte/easing'
  let { onResume, onRestart, onExit }: { onResume: ()=>void; onRestart: ()=>void; onExit: ()=>void } = $props();
</script>

<div class="fixed inset-0 z-40 bg-[#431407]/40 backdrop-blur-[3px] flex items-center justify-center p-4" in:fade={{duration:160}} out:fade={{duration:120}} role="dialog" aria-modal="true" aria-label="Pausa">
  <div class="w-full max-w-[340px] bg-[#fffbeb] border-2 border-white rounded-[24px] p-5 shadow-[0_18px_40px_rgba(67,20,7,0.25)] flex flex-col gap-3" in:scale={{duration:220, start:0.96, easing: backOut}}>
    <div class="text-center">
      <div class="game-font text-xl font-black text-[#431407]">Pausa</div>
      <div class="text-xs font-bold text-[#9a3412]/60">Vuoi uscire? Progresso salvato.</div>
    </div>
    <button type="button" onclick={onResume} class="w-full bg-gradient-to-b from-rose-400 to-rose-500 text-white font-black py-3 rounded-2xl border-2 border-white shadow active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:outline-none min-h-[48px]">Continua</button>
    <button type="button" onclick={onRestart} class="w-full bg-white border-2 border-orange-200 rounded-2xl py-3 font-black text-sm shadow-sm active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:outline-none min-h-[48px]">Ricomincia</button>
    <button type="button" onclick={onExit} class="w-full bg-gradient-to-b from-[#431407] to-[#7c2d12] text-[#fffbeb] border-2 border-white rounded-2xl py-3 font-black text-sm shadow-sm active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:outline-none min-h-[48px]">Menu (salva)</button>
  </div>
</div>
