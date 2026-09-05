<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  let { onDismiss }: { onDismiss: () => void } = $props();
</script>

<div class="fixed inset-0 z-40 bg-[#431407]/40 backdrop-blur-[3px] flex items-center justify-center p-4" in:fade={{duration:180}} out:fade={{duration:140}}>
  <div class="w-full max-w-[360px] bg-[#fffbeb] border-2 border-white rounded-[24px] p-5 shadow-[0_18px_40px_rgba(67,20,7,0.25)] text-center" in:scale={{duration:260, start:0.92, easing: backOut}}>
    <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-amber-300 border-2 border-white shadow mx-auto flex items-center justify-center text-xl">🍬</div>
    <div class="game-font text-xl font-black text-[#431407] mt-3">Benvenutə in TileMama!</div>
    <div class="text-[13px] leading-relaxed text-[#7c2d12] mt-2 font-semibold">
      Trascina un blocco per farlo scivolare fino all’ostacolo.<br/>
      Stesso <b>colore + valore</b> → si fondono!<br/>
      <span class="inline-flex items-center gap-1 mt-1 bg-white border border-orange-200 rounded-full px-2 py-1 text-[11px]">🌈 Jolly fonde con tutto · 32 💥 fa +4</span>
    </div>
    <div class="grid grid-cols-3 gap-2 mt-4 text-[11px] font-black">
      <div class="bg-white border border-orange-200 rounded-2xl p-2">👆<br/>Swipe</div>
      <div class="bg-white border border-orange-200 rounded-2xl p-2">➕<br/>Merge</div>
      <div class="bg-white border border-orange-200 rounded-2xl p-2">💥<br/>32</div>
    </div>
    <button onclick={onDismiss} class="mt-4 w-full bg-gradient-to-b from-rose-400 to-rose-500 text-white font-black py-3 rounded-2xl border-2 border-white shadow active:scale-[0.98]">Gioca! 🍭</button>
    <div class="text-[10px] font-bold text-[#9a3412]/50 mt-2">Specials ogni 10s · bonus ogni 8-13s</div>
  </div>
</div>
