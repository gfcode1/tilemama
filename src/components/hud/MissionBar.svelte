<script lang="ts">
  let { missions, buffActive }: {
    missions: { instanceId: string; icon: string; label: string; progress: number; scaledTarget: number; difficulty: string }[]
    buffActive: boolean
  } = $props()
</script>

<div class="w-full max-w-[420px] sm:max-w-[560px] flex flex-col gap-1.5" aria-live="polite" aria-label="Missioni attive">
  <div class="flex items-center justify-between px-1">
    <span class="text-[10px] font-black tracking-widest text-[#9a3412]/50">MISSIONI</span>
    {#if buffActive}
      <span class="text-[10px] font-black tracking-widest text-amber-600 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5 animate-pulse">⚡ x1.5 5s</span>
    {/if}
  </div>
  <div class="grid grid-cols-3 gap-1.5 sm:gap-2">
    {#each missions as m (m.instanceId)}
      {@const pct = Math.min(100, Math.round((m.progress / m.scaledTarget) * 100))}
      {@const done = m.progress >= m.scaledTarget}
      <div class="relative bg-white border rounded-2xl px-2 py-2 sm:py-2.5 text-center shadow-sm overflow-hidden transition
        {done ? 'border-emerald-300 bg-emerald-50' : m.difficulty==='hard' ? 'border-rose-200' : m.difficulty==='med' ? 'border-amber-200' : 'border-orange-200'}">
        <div class="absolute inset-x-0 bottom-0 h-1 bg-orange-100">
          <div class="h-full transition-all duration-500 {done ? 'bg-emerald-400' : 'bg-gradient-to-r from-amber-400 to-rose-500'}" style="width:{pct}%"></div>
        </div>
        <div class="text-[16px] leading-none">{m.icon}</div>
        <div class="text-[10px] sm:text-[11px] font-black text-[#431407] leading-tight mt-1 line-clamp-2 min-h-[22px]">{m.label}</div>
        <div class="text-[10px] font-bold tabular-nums mt-0.5 {done ? 'text-emerald-700' : 'text-[#9a3412]/60'}">{Math.min(m.progress, m.scaledTarget)}/{m.scaledTarget}</div>
        <div class="absolute top-1 right-1 text-[7px] font-black tracking-widest px-1 py-0.5 rounded-full
          {m.difficulty==='hard' ? 'bg-rose-100 text-rose-700 border border-rose-200' : m.difficulty==='med' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-orange-50 text-[#9a3412]/50 border border-orange-200'}">
          {m.difficulty==='hard' ? 'HARD' : m.difficulty==='med' ? 'MED' : 'EASY'}
        </div>
      </div>
    {/each}
  </div>
</div>
