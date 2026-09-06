<script lang="ts">
  import { SHOP_ITEMS } from '../../core/shop/shopConfig'
  import { game, purchaseShopItem, setShopActive } from '../../lib/game.svelte'

  let { onBack }: { onBack: () => void } = $props()

  let coins = $derived(game.coins)
  let owned = $derived(game.shopOwned)
  let active = $derived(game.shopActive)
  let msg = $state<string | null>(null)

  function buy(id: string, price: number) {
    const ok = purchaseShopItem(id, price)
    if (ok) { msg = 'Acquistato!'; setTimeout(()=> msg=null, 1500) }
    else { msg = 'Coin insufficienti o già posseduto'; setTimeout(()=> msg=null, 1500) }
  }
  function equip(id: string) {
    if (active === id) setShopActive(null)
    else setShopActive(id)
  }
</script>

<div class="w-full max-w-[420px] sm:max-w-[560px] flex flex-col gap-3">
  <div class="flex items-center justify-between">
    <button type="button" onclick={onBack} class="bg-white border border-orange-200 rounded-xl px-3 py-2 text-xs font-black shadow-sm">← Menu</button>
    <div class="bg-gradient-to-br from-amber-100 to-yellow-50 border border-amber-200 rounded-xl px-3 py-1.5 text-center shadow-sm">
      <div class="text-[8px] font-black tracking-widest text-[#9a3412]/60">COIN</div>
      <div class="game-font font-black text-[#431407]">🪙 {coins}</div>
    </div>
  </div>

  <div class="bg-white border-2 border-orange-200 rounded-2xl p-4 shadow-sm">
    <div class="game-font font-black text-lg text-[#431407]">Shop</div>
    <div class="text-xs font-bold text-[#9a3412]/60">Spendi le coin guadagnate con missioni e achievements. Placeholder cosmetico — gli effetti visivi arrivano nel prossimo sprint.</div>
    {#if msg}
      <div class="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs font-black text-amber-800">{msg}</div>
    {/if}
  </div>

  <div class="grid grid-cols-1 gap-2.5">
    {#each SHOP_ITEMS as item}
      {@const isOwned = owned.includes(item.id)}
      {@const isActive = active === item.id}
      {@const canAfford = coins >= item.price}
      <div class="bg-white border-2 rounded-2xl p-3 flex items-center gap-3 shadow-sm {isActive ? 'border-amber-300 bg-amber-50' : isOwned ? 'border-emerald-200' : 'border-orange-200'}">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 flex items-center justify-center text-xl">{item.icon}</div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-black text-[#431407] leading-none">{item.label} {#if isActive}<span class="text-[10px] bg-amber-400 text-white px-1.5 py-0.5 rounded-full ml-1">ATTIVO</span>{/if}</div>
          <div class="text-[11px] font-bold text-[#9a3412]/60 leading-tight mt-0.5">{item.desc}</div>
          <div class="text-[11px] font-black mt-1 {isOwned ? 'text-emerald-700' : canAfford ? 'text-[#431407]' : 'text-rose-500'}">{isOwned ? 'Posseduto' : `🪙 ${item.price}`}</div>
        </div>
        {#if isOwned}
          <button type="button" onclick={()=>equip(item.id)} class="shrink-0 px-4 py-2 rounded-xl font-black text-xs border-2 {isActive ? 'bg-white border-amber-300 text-amber-700' : 'bg-[#431407] text-white border-[#431407]'}">
            {isActive ? 'Togli' : 'Equipaggia'}
          </button>
        {:else}
          <button type="button" onclick={()=>buy(item.id, item.price)} disabled={!canAfford} class="shrink-0 px-4 py-2 rounded-xl font-black text-xs border-2 disabled:opacity-40 disabled:grayscale bg-gradient-to-b from-rose-400 to-rose-500 text-white border-white shadow">
            Compra
          </button>
        {/if}
      </div>
    {/each}
  </div>

  <div class="bg-orange-50 border border-orange-200 rounded-2xl p-3 text-[11px] font-bold text-[#9a3412]/70 leading-relaxed">
    <b>Come guadagnare coin:</b> completa le 3 missioni a rotazione (+15🪙 ciascuna, +80 score, + buff x1.5 5s) e sblocca i 6 achievements (+30🪙 +150 score). Scala soft dopo 300/600pt.
  </div>
</div>
