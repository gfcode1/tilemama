<script lang="ts">
  let { score, bestScore, muted, showHelp, onToggleMute, onToggleHelp }: {
    score: number; bestScore: number; muted: boolean; showHelp: boolean;
    onToggleMute: () => void; onToggleHelp: () => void;
  } = $props();
</script>

<header class="w-full max-w-[420px] flex items-center justify-between gap-2">
  <div class="flex items-center gap-2">
    <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-400 to-amber-300 border-2 border-white shadow-[0_8px_18px_rgba(251,113,133,0.35)] flex items-center justify-center text-white font-black text-lg game-font" aria-hidden="true">T</div>
    <div>
      <h1 class="game-font text-[22px] leading-none font-extrabold tracking-tight text-[#431407]">Tile<span class="text-[#fb7185]">Mama</span></h1>
      <div class="text-[10px] font-extrabold tracking-[0.14em] text-[#9a3412]/70 -mt-0.5">CANDY POP</div>
    </div>
  </div>
  <div class="flex items-center gap-1.5">
    <button type="button" onclick={onToggleMute} aria-label={muted ? 'Attiva suoni' : 'Disattiva suoni'} class="w-9 h-9 rounded-xl bg-white border border-orange-200 shadow-sm flex items-center justify-center active:scale-95 transition text-sm focus-visible:ring-2 focus-visible:ring-rose-300">{muted ? '🔇' : '🔊'}</button>
    <button type="button" onclick={onToggleHelp} aria-label="Mostra aiuto" aria-expanded={showHelp} class="w-9 h-9 rounded-xl bg-white border border-orange-200 shadow-sm flex items-center justify-center active:scale-95 transition text-sm focus-visible:ring-2 focus-visible:ring-rose-300">?</button>
    <div class="hidden sm:flex gap-1.5" aria-live="polite">
      <div class="bg-white border border-orange-200 rounded-2xl px-3 py-1.5 text-center min-w-[72px] shadow-sm">
        <div class="text-[9px] font-black tracking-widest text-[#9a3412]/60">SCORE</div>
        <div class="game-font font-extrabold text-[#431407] leading-none text-[15px]">{score}</div>
      </div>
      <div class="bg-white border border-orange-200 rounded-2xl px-3 py-1.5 text-center min-w-[72px] shadow-sm">
        <div class="text-[9px] font-black tracking-widest text-[#9a3412]/60">BEST</div>
        <div class="game-font font-extrabold text-[#431407] leading-none text-[15px]">{bestScore}</div>
      </div>
    </div>
  </div>
</header>
