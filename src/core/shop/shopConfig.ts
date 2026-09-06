export type ShopItem = {
  id: string
  label: string
  desc: string
  icon: string
  price: number
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'theme_midnight', label: 'Tema Notte', desc: 'Sfondo scuro elegante', icon: '🌙', price: 100 },
  { id: 'theme_sunset', label: 'Tema Tramonto', desc: 'Gradiente caldo', icon: '🌅', price: 80 },
  { id: 'border_rainbow', label: 'Bordo Arcobaleno', desc: 'Griglia effetto rainbow', icon: '🌈', price: 60 },
]
