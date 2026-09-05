<script lang="ts">
  import type { LeaderboardEntry } from '../../services/leaderboard'
  import { clearLeaderboard } from '../../services/leaderboard'
  let { entries, onBack }: { entries: LeaderboardEntry[]; onBack: ()=>void } = $props();
  function fmt(d:string){ try{ return new Date(d).toLocaleDateString('it-IT')}catch{return d.slice(0,10)} }
</script>

<div class="w-full max-w-[420px] sm:max-w-[560px] bg-white/90 backdrop-blur border border-orange-200 rounded-2xl p-4 shadow-sm">
  <div class="flex items-center justify-between">
    <h2 class="game-font text-lg font-black text-[#431407]">Classifica</h2>
    <button type="button" onclick={onBack} class="bg-white border border-orange-200 rounded-xl px-3 py-1.5 text-xs font-black shadow-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:outline-none">← Indietro</button>
  </div>
  {#if entries.length===0}
    <div class="mt-4 text-center text-sm font-bold text-[#9a3412]/60 py-8">Nessuna partita ancora — gioca!</div>
  {:else}
    <ol class="mt-3 grid gap-2">
      {#each entries as e,i}
        <li class="flex items-center justify-between bg-[#fffbeb] border border-orange-100 rounded-xl px-3 py-2">
          <span class="flex items-center gap-2">
            <span class="w-7 h-7 rounded-full bg-gradient-to-br from-amber-300 to-rose-400 text-white font-black text-xs flex items-center justify-center">{i+1}</span>
            <span class="font-black text-[#431407] tabular-nums">{e.score}</span>
            {#if e.maxTile}<span class="text-xs font-bold text-[#9a3412]/60">max {e.maxTile}</span>{/if}
          </span>
          <span class="text-xs font-bold text-[#9a3412]/50">{fmt(e.date)}</span>
        </li>
      {/each}
    </ol>
    <button type="button" onclick={()=>{ clearLeaderboard(); location.reload(); }} class="mt-3 w-full text-xs font-black text-[#9a3412]/50 py-2">Azzera classifica</button>
  {/if}
</div>
