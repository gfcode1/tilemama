<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  let { showHelp }: { showHelp: boolean } = $props();
</script>

{#if showHelp}
  <div class="w-full max-w-[420px] bg-white/90 backdrop-blur border border-orange-200 rounded-2xl p-3 text-[11px] leading-relaxed text-[#7c2d12] shadow-sm" in:fly={{ y: -8, duration: 180 }} out:fade={{duration:120}}>
    <b>Swipe</b> per scorrere fino al muro/blocco. <b>Stesso colore+valore → merge</b> (somma). <b>32</b> esplode in 4. <b>★</b> 4 blocchi ogni 10s. Bonus random 8-13s: 💣🧲🌀🔀➕☢️💎🧱 — alcuni richiedono <b>tap</b>. Jolly 🌈 fonde con tutto. <span class="opacity-60">Tasti: Z undo, N nuova, M mute, ? help, Esc annulla.</span>
  </div>
{/if}
