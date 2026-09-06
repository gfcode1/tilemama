<script lang="ts">
  let { toasts }: {
    toasts: { id: string; title: string; subtitle: string; icon: string; kind: 'mission'|'achievement' }[]
  } = $props()
</script>

{#if toasts.length}
  <div class="pointer-events-none fixed top-[76px] left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2 items-center w-[92%] max-w-[380px]">
    {#each toasts as t (t.id)}
      <div class="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl shadow-[0_10px_24px_rgba(0,0,0,0.18)] border-2 animate-[candyPop_420ms_cubic-bezier(.34,1.56,.64,1)]
        {t.kind==='achievement' ? 'bg-gradient-to-br from-amber-300 to-orange-400 border-white text-[#431407]' : 'bg-white border-emerald-200 text-[#431407]'}">
        <div class="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-[18px] {t.kind==='achievement' ? 'bg-white/90 border border-white' : 'bg-emerald-50 border border-emerald-200'}">{t.icon}</div>
        <div class="flex-1 min-w-0 text-left">
          <div class="text-[12px] font-black leading-none truncate">{t.title}</div>
          <div class="text-[10px] font-bold opacity-70 leading-none mt-0.5 truncate">{t.subtitle}</div>
        </div>
        <div class="shrink-0 text-[10px] font-black tracking-widest px-2 py-1 rounded-full {t.kind==='achievement' ? 'bg-white text-amber-700' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}">
          {t.kind==='achievement' ? 'ACH' : 'MISS'}
        </div>
      </div>
    {/each}
  </div>
{/if}
