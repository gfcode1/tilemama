<script lang="ts">
  let { onBack }: { onBack: ()=>void } = $props();
</script>

<div class="w-full max-w-[420px] sm:max-w-[560px] bg-white/90 backdrop-blur border border-orange-200 rounded-2xl p-5 shadow-sm">
  <div class="flex items-center justify-between">
    <h2 class="game-font text-lg font-black text-[#431407]">Credits</h2>
    <button type="button" onclick={onBack} class="bg-white border border-orange-200 rounded-xl px-3 py-1.5 text-xs font-black shadow-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:outline-none">← Indietro</button>
  </div>
  <div class="mt-4 grid gap-3 text-sm leading-relaxed text-[#7c2d12]">
    <div>
      <div class="font-black text-[#431407]">TileMama</div>
      <div class="text-xs font-bold text-[#9a3412]/60">di Giovanni Favaro — candy pop puzzle 8×8</div>
    </div>
    <div class="bg-[#fffbeb] border border-orange-100 rounded-xl p-3">
      <div class="font-black text-[#431407] text-xs">Librerie & licenze</div>
      <ul class="mt-1 text-xs font-semibold list-disc pl-4 space-y-0.5">
        <li>Svelte 5 + Vite 8 + Tailwind CSS 4 — MIT</li>
        <li>canvas-confetti — ISC</li>
        <li>zod — MIT</li>
        <li>vite-plugin-pwa (Workbox) — MIT</li>
        <li>Playwright / Vitest / svelte-check — MIT / Apache-2.0</li>
        <li>Font Fredoka & Nunito — SIL OFL (Google Fonts)</li>
      </ul>
      <div class="text-[11px] font-bold text-[#9a3412]/50 mt-2">Vedi package.json per versioni complete.</div>
    </div>
    <div class="text-xs font-bold text-[#9a3412]/60">PWA installabile · offline ready · nessun tracciamento</div>
  </div>
</div>
