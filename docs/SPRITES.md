            # TileMama — Inventario Sprite

> Sostituzione completa grafica placeholder (gradienti CSS + emoji Unicode) con sprite reali.
> Generato: 2026-02-13 · Stack: Svelte 5 + Vite 8 + Tailwind 4
> Riferimenti: `src/components/board/Tile.svelte`, `SpecialTile.svelte`, `src/lib/candy.ts`, `src/lib/types.ts`, `src/core/config/gameConfig.ts`, `src/App.svelte`, `src/app.css`

---

## 1. Riepilogo placeholder attuali

Tutto il rendering visivo è **CSS-only**: `bg-gradient-to-b`, `border-b-[4px]`, `ring-*`, `backdrop-blur`, `tile-highlight`/`tile-gloss` (`app.css:75-93`), emoji come icone (`★ ×2 🌈 💣 — 🧱 🌀 🔀 ➕ ♥`).

> **Correzione 2026-02-13:** `SpecialKind: virus` è stato **eliminato** (remap `virus → clone` in `persistence.ts:78`). `Block.virus` (`types.ts:19`) resta come campo legacy in `Tile.svelte:61-62` / `candy.ts:21` / `engine.ts:tickVirus()` stub → `return []`, ma **non spawna più**. `GameScheduler` virus tick (`scheduler.ts:34-37`) è no-op. Non produrre `special_virus.png`.

Unici bitmap esistenti:

```
src/assets/icons/1.png
src/assets/icons/2.png
src/assets/icons/4.png
src/assets/icons/8.png
src/assets/icons/16.png
src/assets/hero.png          # isometrica, non usata in griglia
public/icon-192.png
public/icon-512.png
public/favicon.svg
```

Mancano: `32.png`, `64.png`, tutti gli speciali (9 kind, wall ×2), overlay `jolly` (virus solo legacy), wall 1HP/2HP, particelle, board frame.

---

## 2. Tile regolari — ogni livello × ogni colore (CORE)

### 2.1 Specifica

- **Colori** (`src/lib/types.ts:1` `Color`): `green` | `red` | `yellow` | `blue` → 4
- **Valori** (`EXPLOSION_VALUE = 32` in `types.ts:51`, `gameConfig.ts:4`): `1, 2, 4, 8, 16, 32` → 6 livelli
- Logica `tierFor()` in `candy.ts:1-6` mappa `16+ → 5` (oro pulsante), ma con sprite ogni valore ha asset distinto.
- `x2` raddoppia il valore; `32 ×2 = 64` esplode immediatamente (`engine.ts:400-405`), quindi `64` è opzionale future-proof.

### 2.2 Lista file (24 obbligatori)

| # | File | Colore hex attuale | Valore | Tier | Sostituisce |
|---|------|--------------------|--------|------|-------------|
| 1 | `sprites/tiles/tile_green_1.png` | `emerald-300→500` | 1 | 2 | `candyTileClass()` + `icon1.png` |
| 2 | `sprites/tiles/tile_green_2.png` | emerald | 2 | 2 | `icon2.png` |
| 3 | `sprites/tiles/tile_green_4.png` | emerald | 4 | 3 | `icon4.png` + `ring-1 ring-white/60` |
| 4 | `sprites/tiles/tile_green_8.png` | emerald | 8 | 4 | `icon8.png` + `ring-2` |
| 5 | `sprites/tiles/tile_green_16.png` | emerald | 16 | 5 | `icon16.png` + `ring-amber-200` + `candyPulseGold` |
| 6 | `sprites/tiles/tile_green_32.png` | emerald | 32 | 5 | fallback `<span>32</span>` (manca PNG) |
| 7 | `sprites/tiles/tile_red_1.png` | `rose-300→500` | 1 | 2 | `icon1.png` variante rossa* |
| 8 | `sprites/tiles/tile_red_2.png` | rose | 2 | 2 | — |
| 9 | `sprites/tiles/tile_red_4.png` | rose | 4 | 3 | — |
| 10 | `sprites/tiles/tile_red_8.png` | rose | 8 | 4 | — |
| 11 | `sprites/tiles/tile_red_16.png` | rose | 16 | 5 | — |
| 12 | `sprites/tiles/tile_red_32.png` | rose | 32 | 5 | — |
| 13 | `sprites/tiles/tile_yellow_1.png` | `amber-200→400` | 1 | 2 | — |
| 14 | `sprites/tiles/tile_yellow_2.png` | amber | 2 | 2 | — |
| 15 | `sprites/tiles/tile_yellow_4.png` | amber | 4 | 3 | — |
| 16 | `sprites/tiles/tile_yellow_8.png` | amber | 8 | 4 | — |
| 17 | `sprites/tiles/tile_yellow_16.png` | amber | 16 | 5 | — |
| 18 | `sprites/tiles/tile_yellow_32.png` | amber | 32 | 5 | — |
| 19 | `sprites/tiles/tile_blue_1.png` | `sky-300→500` | 1 | 2 | — |
| 20 | `sprites/tiles/tile_blue_2.png` | sky | 2 | 2 | — |
| 21 | `sprites/tiles/tile_blue_4.png` | sky | 4 | 3 | — |
| 22 | `sprites/tiles/tile_blue_8.png` | sky | 8 | 4 | — |
| 23 | `sprites/tiles/tile_blue_16.png` | sky | 16 | 5 | — |
| 24 | `sprites/tiles/tile_blue_32.png` | sky | 32 | 5 | — |

> * Oggi `1.png/2.png/4.png/8.png/16.png` sono unici (non per colore). Con sprite reali ogni colore ha variante cromatica distinta.

**Opzionale future-proof (+4):**

| 25 | `sprites/tiles/tile_green_64.png` | emerald | 64 | 5+ |
| 26 | `sprites/tiles/tile_red_64.png` | rose | 64 | 5+ |
| 27 | `sprites/tiles/tile_yellow_64.png` | amber | 64 | 5+ |
| 28 | `sprites/tiles/tile_blue_64.png` | sky | 64 | 5+ |

**Specifiche tecniche consigliate:**

- Sorgente: `256×256` PNG trasparente (downscale a `48-60px` a schermo, cfr. `Tile.svelte:32-39` `max-w-[60px]`)
- Export: `PNG` + `WebP` ottimizzato (Vite gestisce entrambi)
- Stile: candy cartoon gonfiato, bordo inferiore spesso baked, highlight/gloss baked (sostituisce `tile-highlight`/`tile-gloss` CSS + `border-b-[4px]`)
- Numero: baked nello sprite (alternativa: overlay font `Fredoka` se vuoi valori dinamici >32)
- Ombra: baked leggera o mantenuta via `shadow-[0_10px_18px_rgba(124,45,18,0.18)]` in `Tile.svelte:43`

---

## 3. Overlay / stati tile (riusabili)

Non richiedono variante per colore — sono badge sovrapposti.

| # | File | Emoji/trigger attuale | Posizione | File sorgente | Stato |
|---|------|-----------------------|-----------|---------------|-------|
| 29 | `sprites/overlays/overlay_jolly.png` | `🌈` `block.jolly` `Tile.svelte:59` | `-top-1 -left-1` 20×20 | badge arcobaleno | ✅ necessario |
| 30 | `sprites/overlays/overlay_virus.png` | `☢️` `block.virus` `Tile.svelte:62` | `-bottom-1 -right-1` | badge lime | ⚠️ **LEGACY — non produrre** (`tickVirus()` stub, mai spawnato; tenuto solo per compatibilità save) |
| 31 | `sprites/overlays/overlay_pending_x2.png` | `×2` `pendingMeta()` `candy.ts:48` | `-top-1 -right-1` bg white | cerchio bianco ×2 | ✅ necessario |
| 32 | `sprites/overlays/overlay_pending_jolly.png` | `🌈` | idem | cerchio bianco 🌈 | ✅ necessario |
| 33 | `sprites/overlays/overlay_pending_bomb.png` | `💣` | idem | cerchio bianco 💣 | ✅ necessario |
| 34 | `sprites/overlays/overlay_pending_clone.png` | `➕` | idem | cerchio bianco ➕ | ✅ necessario |
| 35 | `sprites/overlays/overlay_heart.png` | `♥` wall HP `SpecialTile.svelte:22` | badge HP | opzionale se HP integrato in wall sprite | opzionale |

> **Decisione overlay vs variante:** overlay separato = 24 file base + 6 overlay attivi (virus escluso). Variante baked = 24 × 2 stati (base/jolly) = 48 file. Overlay è consigliato.

**Sostituisce:** `Tile.svelte:59-65` badge gradient + `candy.ts:46-53` `pendingMeta()` ring `ring-violet/pink/rose/emerald-300` + `shadow-[0_0_14px]`.

> **Azione legacy:** se vuoi pulizia definitiva, rimuovi `block.virus`/`virusNextAt` da `types.ts:19-20`, `candyTileClass(..., virus)` in `candy.ts:8,21`, badge `{#if block.virus}` in `Tile.svelte:61-63`, e `virusIntervalMs/virusTickMs` da `gameConfig.ts:12-14` + `GameScheduler` virus interval. Altrimenti lascia `overlay_virus.png` fuori dalla produzione.

---

## 4. Speciali (`SpecialKind` — 9 tipi)

Definiti in `src/lib/types.ts:23-32` e `SPECIAL_META` in `candy.ts:34-44`. Durata `SPECIAL_DURATION_MS=3000`, `WALL_DURATION_MS=5000` (`types.ts:47-48`).

| # | Kind | Emoji attuale | File proposto | Bg placeholder attuale | Timer |
|---|------|---------------|---------------|------------------------|-------|
| 36 | `star` | `★` | `sprites/specials/special_star.png` | `from-fuchsia-400 to-fuchsia-600` | 3000ms |
| 37 | `x2` | `×2` | `sprites/specials/special_x2.png` | `from-violet-400 to-violet-600` | 3000ms |
| 38 | `jolly` | `🌈` | `sprites/specials/special_jolly.png` | `from-pink-400 to-pink-600` | 3000ms |
| 39 | `bombColor` | `💣` | `sprites/specials/special_bomb.png` | `from-rose-400 to-rose-600` | 3000ms |
| 40 | `laser` | `—` | `sprites/specials/special_laser.png` | `from-rose-600 to-red-600` | 3000ms |
| 41 | `wall` (2 HP) | `🧱` | `sprites/specials/special_wall_2hp.png` | `from-stone-400 to-stone-600` | 5000ms |
| 42 | `wall` (1 HP) | `🧱` crack | `sprites/specials/special_wall_1hp.png` | idem `opacity-85` | 5000ms |
| 43 | `vortex` | `🌀` | `sprites/specials/special_vortex.png` | `from-violet-500 to-violet-700` | 3000ms |
| 44 | `shuffle` | `🔀` | `sprites/specials/special_shuffle.png` | `from-amber-400 to-amber-600` | 3000ms |
| 45 | `clone` | `➕` | `sprites/specials/special_clone.png` | `from-emerald-400 to-emerald-600` | 3000ms |

**Sostituisce:** `SpecialTile.svelte:11-22` `border-b-[3px]` + `bg-gradient-to-b` + `tile-gloss opacity 60%` + `pulse_900ms` + SVG timer ring `stroke-dasharray="360"` `SpecialTile.svelte:24-26`.

**Nota wall:** ha 2 stati HP (`WALL_HP=2` `types.ts:46`). O crei 2 sprite distinti o 1 sprite + overlay crepa.

---

## 5. Board / Griglia / Effetti (fase 2 — opzionale)

| # | Categoria | File proposto | Sostituisce |
|---|-----------|---------------|-------------|
| 46 | Cella vuota | `sprites/board/board_cell_empty.png` | `App.svelte:484` `bg-white/78 border-orange-100/70 rounded-[14px]` |
| 47 | Board frame | `sprites/board/board_frame.9.png` (9-slice) | `App.svelte:479` `bg-[#fffbeb] border-[#fed7aa] rounded-[28px] p-[7px]` |
| 48 | Ghost merge | `sprites/ghosts/ghost_merge.png` | `App.svelte:493` `bg-emerald-400/18 border-emerald-400/40` |
| 49 | Ghost special | `sprites/ghosts/ghost_special.png` | `bg-fuchsia-400/18` |
| 50 | Ghost wall | `sprites/ghosts/ghost_wall.png` | `bg-stone-400/16` |
| 51 | Ghost slide | `sprites/ghosts/ghost_slide.png` | `bg-orange-300/22` |
| 52 | Freccia preview | `sprites/ghosts/trail_arrow.png` | `App.svelte:498` `→ / ＋ / ★ / 🧱` |
| 53 | Ribbon drag | `sprites/effects/trail_ribbon.png` | `DragTrail.svelte:28-57` canvas gradient `#fb7185→#fde68a→#7dd3fc` |
| 54-58 | Particelle | `sprites/particles/particle_candy_green.png` `particle_candy_red.png` `particle_candy_yellow.png` `particle_candy_blue.png` `particle_star.png` | `ParticleLayer.svelte:28-39` `ctx.arc` + `confetti()` `App.svelte:367-383` |
| 59 | Score boom | `sprites/effects/pop_boom.png` | `App.svelte:522-531` `candyFloat`/`candyBoom` pill |
| 60 | BG blur | `sprites/board/bg_candy_blur.png` | `app.css:35-57` `.candy-orbs` radial gradient blur |

**UI extra (se vuoi rimpiazzare emoji testuali):**

| 61 | `sprites/ui/icon_mute.png` / `icon_unmute.png` | `🔇/🔊` `TitleMenu.svelte:31`, `Header.svelte:35` |
| 62 | `sprites/ui/icon_help.png` | `?` |
| 63 | `sprites/ui/icon_undo.png` | `↩` `App.svelte:572` |

---

## 6. Riepilogo conteggi

| Gruppo | Obbligatori | Opzionali / Legacy |
|--------|-------------|-------------------|
| Tile regolari (4 colori × 6 valori) | **24** | +4 (64) |
| Overlay jolly/pending/heart (virus escluso) | **6** | +1 legacy (`overlay_virus.png` — non produrre) |
| Speciali (9 kind, wall ×2) | **10** | — |
| Board / Ghost / Effetti | — | **15** |
| UI | — | **3** |
| **Totale fase 1 (minimo per rimpiazzo completo)** | **40** | — |
| **Totale con 64 + fase 2** | — | **~62** (+1 legacy virus) |

---

## 7. Struttura cartelle proposta

```
src/assets/sprites/
├── tiles/
│   ├── tile_green_1.png   (+ .webp)
│   ├── tile_green_2.png
│   ├── tile_green_4.png
│   ├── tile_green_8.png
│   ├── tile_green_16.png
│   ├── tile_green_32.png
│   ├── tile_red_1.png … tile_red_32.png
│   ├── tile_yellow_1.png … tile_yellow_32.png
│   └── tile_blue_1.png … tile_blue_32.png
├── specials/
│   ├── special_star.png
│   ├── special_x2.png
│   ├── special_jolly.png
│   ├── special_bomb.png
│   ├── special_laser.png
│   ├── special_wall_2hp.png
│   ├── special_wall_1hp.png
│   ├── special_vortex.png
│   ├── special_shuffle.png
│   └── special_clone.png
├── overlays/
│   ├── overlay_jolly.png
│   ├── overlay_pending_x2.png
│   ├── overlay_pending_jolly.png
│   ├── overlay_pending_bomb.png
│   ├── overlay_pending_clone.png
│   ├── overlay_heart.png
│   └── overlay_virus.png          # LEGACY — non produrre (tickVirus stub)
├── board/
│   ├── board_cell_empty.png
│   ├── board_frame.9.png
│   └── bg_candy_blur.png
├── ghosts/
│   ├── ghost_merge.png
│   ├── ghost_special.png
│   ├── ghost_wall.png
│   ├── ghost_slide.png
│   └── trail_arrow.png
├── particles/
│   ├── particle_candy_green.png
│   ├── particle_candy_red.png
│   ├── particle_candy_yellow.png
│   ├── particle_candy_blue.png
│   └── particle_star.png
├── effects/
│   ├── trail_ribbon.png
│   └── pop_boom.png
└── ui/
    ├── icon_mute.png
    ├── icon_unmute.png
    ├── icon_help.png
    └── icon_undo.png
```

Naming: `snake_case`, prefisso per categoria, suffisso `_{color}_{value}` per tile. Prepara anche `sprites.json` manifest se vuoi import dinamico via Vite `import.meta.glob`.

---

## 8. Piano integrazione codice (dopo produzione asset)

1. **Produzione asset** — generare sorgenti `256×256` nello stile scelto (candy cartoon gonfiato consigliato, coerente con `hero.png`).
2. **Codice `candy.ts`** — rimuovere `candyTileClass()` gradient, aggiungere `tileSpriteMap: Record<Color, Record<number,string>>` e `getTileSprite(color,value)` con `import.meta.glob`.
3. **`Tile.svelte`** — estendere `iconMap` da 5 a 24 voci, rimuovere binding `candyTileClass`, rimuovere `tile-highlight`/`tile-gloss` CSS se baked, eliminare `candyValueSize()` se numero baked.
4. **`SpecialTile.svelte`** — sostituire `SPECIAL_META.icon` emoji con `specialSpriteMap`, rimuovere `meta.bg` gradient e `pulse_900ms` se animazione baked.
5. **`app.css`** — depurare `.tile-gloss::after` / `.tile-highlight::before` (o mantenere come fallback).
6. **Verifica** — `npm run check` → `npm run test` → `npm run build` (rispetta `BASE_PATH`).

---

## 9. Decisioni aperte (da confermare prima di generare)

- [ ] Stile grafico definitivo (candy / flat / pixel / 3D)?
- [ ] Numero baked nello sprite vs overlay font `Fredoka`?
- [ ] Risoluzione sorgente (`128` vs `256`) e formato (`PNG` + `WebP`)?
- [ ] Overlay separati vs varianti baked per jolly (virus legacy escluso)?
- [ ] Wall: 2 sprite o 1 + overlay crepa?
- [ ] Spritesheet unico `1024×1024` vs file singoli?

> Consiglio default: **candy cartoon 256px PNG+WebP, numero baked, overlay separati, wall ×2, file singoli** — più semplice da integrare con `Tile.svelte` attuale.
