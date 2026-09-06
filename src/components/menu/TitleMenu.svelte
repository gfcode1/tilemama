<script lang="ts">
  import { titleSprite } from '../../lib/sprites';
  let { hasSave, bestScore, coins, muted, onNewGame, onContinue, onHelp, onLeaderboard, onShop, onCredits, onToggleMute }: {
    hasSave: boolean; bestScore: number; coins: number; muted: boolean;
    onNewGame: () => void; onContinue: () => void; onHelp: () => void; onLeaderboard: () => void; onShop: () => void; onCredits: () => void; onToggleMute: () => void;
  } = $props();
</script>

<div class="w-full max-w-[360px] flex flex-col items-center gap-4 py-6">
  <div class="flex flex-col items-center gap-2">
    <img src={titleSprite} alt="TileMama" width="320" height="120" class="w-[200px] sm:w-[240px] h-auto object-contain drop-shadow-[0_10px_24px_rgba(124,45,18,0.12)]" decoding="async" loading="eager" />
    <div class="text-[11px] font-extrabold tracking-[0.16em] text-[#9a3412]/60 -mt-1">CANDY POP</div>
    {#if bestScore > 0}
      <div class="mt-1 bg-white border border-orange-200 rounded-full px-3 py-1 text-xs font-black text-[#431407] shadow-sm tabular-nums">BEST {bestScore}</div>
    {/if}
    <div class="mt-1 bg-gradient-to-br from-amber-100 to-yellow-50 border border-amber-200 rounded-full px-3 py-1 text-xs font-black text-[#431407] shadow-sm tabular-nums">🪙 {coins}</div>
  </div>

  <div class="w-full flex flex-col gap-2.5 mt-2">
    {#if hasSave}
      <button type="button" onclick={onContinue} class="w-full bg-gradient-to-b from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-black py-3.5 rounded-2xl border-2 border-white shadow-[0_10px_18px_rgba(244,63,94,0.3)] active:scale-[0.98] transition focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:outline-none min-h-[56px] text-[15px]">Continua</button>
      <button type="button" onclick={onNewGame} class="w-full bg-gradient-to-b from-[#431407] to-[#7c2d12] text-[#fffbeb] font-black py-3.5 rounded-2xl border-2 border-white shadow-sm active:scale-[0.98] transition focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:outline-none min-h-[56px] text-[15px]">Nuova partita</button>
    {:else}
      <button type="button" onclick={onNewGame} class="w-full bg-gradient-to-b from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-black py-3.5 rounded-2xl border-2 border-white shadow-[0_10px_18px_rgba(244,63,94,0.3)] active:scale-[0.98] transition focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:outline-none min-h-[56px] text-[15px]">Nuova partita</button>
    {/if}
    <button type="button" onclick={onLeaderboard} class="w-full bg-white border-2 border-orange-200 rounded-2xl py-3.5 font-black text-sm shadow-sm active:scale-[0.98] transition focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:outline-none min-h-[56px]">Classifica</button>
    <button type="button" onclick={onShop} class="w-full bg-gradient-to-br from-amber-300 to-yellow-400 border-2 border-white rounded-2xl py-3.5 font-black text-sm shadow-sm active:scale-[0.98] transition focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none min-h-[56px]">🛒 Shop · 🪙 {coins}</button>
    <button type="button" onclick={onHelp} class="w-full bg-white border-2 border-orange-200 rounded-2xl py-3.5 font-black text-sm shadow-sm active:scale-[0.98] transition focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:outline-none min-h-[56px]">Come giocare</button>
    <button type="button" onclick={onCredits} class="w-full text-[#9a3412]/60 font-black py-2 text-sm active:opacity-70 transition focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:outline-none rounded-xl">Credits</button>
  </div>

  <div class="flex items-center gap-2 mt-1">
    <button type="button" onclick={onToggleMute} aria-label={muted ? 'Attiva suoni' : 'Disattiva suoni'} aria-pressed={muted} class="w-10 h-10 rounded-xl bg-white border border-orange-200 shadow-sm flex items-center justify-center active:scale-95 transition focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:outline-none">{muted ? '🔇' : '🔊'}</button>
    <span class="text-[11px] font-bold text-[#9a3412]/40">PWA installabile</span>
  </div>
</div>
