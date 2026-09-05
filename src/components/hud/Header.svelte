<script lang="ts">
  let { score, bestScore, muted, showHelp, onToggleMute, onToggleHelp }: {
    score: number; bestScore: number; muted: boolean; showHelp: boolean;
    onToggleMute: () => void; onToggleHelp: () => void;
  } = $props();
  let scorePop = $state(false);
  let prevScore = 0;
  $effect(() => {
    if (score !== prevScore) {
      if (score > prevScore) { scorePop = true; setTimeout(()=> scorePop=false, 220) }
      prevScore = score;
    }
  })
</script>

<header class="w-full max-w-[420px] sm:max-w-[560px] lg:max-w-[560px] flex items-center justify-between gap-2 sm:gap-3">
  <div class="flex items-center gap-2 sm:gap-2.5 min-w-0">
    <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-rose-400 to-amber-300 border-2 border-white shadow-[0_8px_18px_rgba(251,113,133,0.35)] flex items-center justify-center text-white font-black text-lg sm:text-xl game-font shrink-0" aria-hidden="true">T</div>
    <div class="min-w-0">
      <h1 class="game-font text-[20px] sm:text-[22px] lg:text-[24px] leading-none font-extrabold tracking-tight text-[#431407]">Tile<span class="text-[#fb7185]">Mama</span></h1>
      <div class="text-[10px] sm:text-[11px] font-extrabold tracking-[0.14em] text-[#9a3412]/70 -mt-0.5">CANDY POP</div>
    </div>
  </div>
  <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
    <div class="flex gap-1.5 sm:gap-2" aria-live="polite">
      <div class="bg-white border border-orange-200 rounded-2xl px-2.5 sm:px-3 py-1 sm:py-1.5 text-center min-w-[62px] sm:min-w-[78px] shadow-sm {scorePop ? 'animate-[scorePop_220ms_ease]' : ''}">
        <div class="text-[8px] sm:text-[9px] font-black tracking-widest text-[#9a3412]/60">SCORE</div>
        <div class="game-font font-extrabold text-[#431407] leading-none text-[13px] sm:text-[15px] tabular-nums">{score}</div>
      </div>
      <div class="bg-white border border-orange-200 rounded-2xl px-2.5 sm:px-3 py-1 sm:py-1.5 text-center min-w-[62px] sm:min-w-[78px] shadow-sm hidden max-[359px]:hidden sm:flex flex-col justify-center">
        <div class="text-[8px] sm:text-[9px] font-black tracking-widest text-[#9a3412]/60">BEST</div>
        <div class="game-font font-extrabold text-[#431407] leading-none text-[13px] sm:text-[15px] tabular-nums">{bestScore}</div>
      </div>
    </div>
    <button type="button" onclick={onToggleMute} aria-label={muted ? 'Attiva suoni' : 'Disattiva suoni'} aria-pressed={muted} class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-white border border-orange-200 shadow-sm flex items-center justify-center active:scale-95 transition text-sm focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:outline-none shrink-0">{muted ? '🔇' : '🔊'}</button>
    <button type="button" onclick={onToggleHelp} aria-label="Mostra aiuto" aria-expanded={showHelp} class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-white border border-orange-200 shadow-sm flex items-center justify-center active:scale-95 transition text-sm focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:outline-none shrink-0">?</button>
  </div>
</header>
