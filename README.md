# TileMama — Candy Pop 8x8

Puzzle swipe 8×8: sposta fino al muro, merge stesso colore+valore, **32 esplode in 4**, speciali ★ ogni 10s, bonus random 8-13s.

## Stack
Svelte 5 (runes) + Vite 8 + Tailwind 4 + PWA (`vite-plugin-pwa`) — SPA, no SvelteKit.

## Struttura
```
src/
  core/config/gameConfig.ts   # valori centralizzati (32, durate, pesi)
  core/engine/MoveResolver.ts # slide/merge/wall/special puro
  lib/  engine.ts, types.ts, candy.ts, sfx.ts, rng.ts, clock.ts
  services/ scheduler.ts (GameScheduler) + persistence.ts (zod)
  state/  game.svelte.ts (runes store)
  components/
    board/ Tile, SpecialTile, DragTrail
    hud/ PendingBanner
    modals/ Onboarding
  styles/ tokens.css, animations in app.css
  tests/ engine.test.ts
```

## Script
- `npm run dev` — vite
- `npm run build` — vite build + PWA
- `npm run check` — svelte-check + tsc
- `npm run lint` — eslint (ts/js)
- `npm run test` — vitest (engine explosion 32)
- `npm run preview`

## Note refactor 2025-09
- `App.svelte` scomposto (621→~260 righe): DragTrail, Tile, SpecialTile, PendingBanner, Onboarding estratti
- `GameScheduler` centralizza star/bonus/cleanup/virus, pausable su `pendingMode` e `visibilitychange`, tasti Z/N/M/?/Esc
- `persistence.ts` con `zod` + migrate v1→v2 (`pendingMultiplier`→`pendingMode`) + quota handling
- `EXPLOSION_VALUE` = 32 (prima 64), tier ritarato 16→5, test vitest verdi
- Vite `base` via `BASE_PATH` env, workbox runtimeCaching fonts
- a11y: aria-label/expanded/live, keyboard shortcuts
```
