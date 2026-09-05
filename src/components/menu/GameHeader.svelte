<script lang="ts">
  let { score, bestScore, muted, onMenu, onToggleMute }: {
    score: number; bestScore: number; muted: boolean;
    onMenu: () => void; onToggleMute: () => void;
  } = $props();
  let scorePop = $state(false)
  let prev = 0
  $effect(()=>{ if(score!==prev){ if(score>prev){ scorePop=true; setTimeout(()=>scorePop=false,220)} prev=score }})
</script>

<header class="w-full max-w-[420px] sm:max-w-[560px] flex items-center justify-between gap-2">
  <button type="button" onclick={onMenu} class="shrink-0 bg-white border border-orange-200 rounded-xl px-3 py-2 font-black text-xs shadow-sm active:scale-95 transition focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:outline-none min-h-[40px]">← Menu</button>
  <div class="flex gap-1.5" aria-live="polite">
    <div class="bg-white border border-orange-200 rounded-2xl px-3 py-1.5 text-center min-w-[72px] shadow-sm {scorePop ? 'animate-[scorePop_220ms_ease]' : ''}">
      <div class="text-[8px] font-black tracking-widest text-[#9a3412]/60">SCORE</div>
      <div class="game-font font-extrabold text-[#431407] leading-none text-[15px] tabular-nums">{score}</div>
    </div>
    <div class="bg-white border border-orange-200 rounded-2xl px-3 py-1.5 text-center min-w-[72px] shadow-sm hidden sm:flex flex-col justify-center">
      <div class="text-[8px] font-black tracking-widest text-[#9a3412]/60">BEST</div>
      <div class="game-font font-extrabold text-[#431407] leading-none text-[15px] tabular-nums">{bestScore}</div>
    </div>
  </div>
  <button type="button" onclick={onToggleMute} aria-label={muted ? 'Attiva suoni' : 'Disattiva suoni'} aria-pressed={muted} class="w-10 h-10 rounded-xl bg-white border border-orange-200 shadow-sm flex items-center justify-center active:scale-95 transition focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:outline-none shrink-0">{muted ? '🔇' : '🔊'}</button>
</header>
