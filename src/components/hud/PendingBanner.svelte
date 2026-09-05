<script lang="ts">
  import { scale } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  let { mode, onCancel }: { mode: string; onCancel: () => void } = $props();

  function bannerInfo(p: string) {
    const map: Record<string, {bg:string, icon:string, text:string}> = {
      x2: {bg:'from-violet-400 to-violet-600', icon:'×2', text:'Tocca un blocco per raddoppiarlo!'},
      div2: {bg:'from-orange-400 to-orange-600', icon:'÷2', text:'Tocca per dimezzarlo!'},
      jolly: {bg:'from-pink-400 to-pink-600', icon:'🌈', text:'Tocca per renderlo Jolly!'},
      bombColor: {bg:'from-rose-400 to-rose-600', icon:'💣', text:'Tocca per eliminare quel colore!'},
      clone: {bg:'from-emerald-400 to-emerald-600', icon:'➕', text:'Tocca per clonarlo!'},
      virus: {bg:'from-lime-500 to-lime-600', icon:'☢️', text:'Tocca per infettarlo!'},
      safeX5: {bg:'from-amber-300 to-yellow-500 text-amber-950', icon:'💎', text:'Prossimo merge ×5 — tocca un blocco!'},
    };
    return map[p] ?? map['x2'];
  }
  let info = $derived(bannerInfo(mode));
</script>

<div class="w-full max-w-[420px] rounded-2xl px-3 py-2.5 flex items-center justify-between font-black shadow-[0_10px_18px_rgba(0,0,0,0.12)] border-2 border-white bg-gradient-to-r {info.bg} {info.bg.includes('yellow') || info.bg.includes('amber') ? 'text-[#431407]' : 'text-white'}" in:scale={{duration:200, start:0.96, easing: backOut}}>
  <span class="flex items-center gap-2 text-[13px] leading-tight">
    <span class="w-8 h-8 rounded-xl bg-white/90 border border-white flex items-center justify-center text-[#431407] text-sm shadow-sm">{info.icon}</span>
    <span class="pr-2">{info.text}</span>
  </span>
  <button onclick={onCancel} class="shrink-0 bg-white text-[#431407] border border-black/5 rounded-xl px-3 py-1.5 text-xs font-black shadow-sm active:scale-95">Annulla ✕</button>
</div>
