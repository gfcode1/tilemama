# AGENTS.md — TileMama

## Stack
- Svelte 5 (runes, `*.svelte.ts` stores) + Vite 8 + Tailwind 4 (`@tailwindcss/vite` plugin) + PWA (`vite-plugin-pwa`). SPA only — no SvelteKit.
- Node 20 required (see `.github/workflows/deploy.yml`).

## Commands
| Task | Command |
|------|---------|
| Dev | `npm run dev` — serves at `http://localhost:5173/tilemama/` (Vite `base` defaults to `/tilemama/`) |
| Build | `npm run build` — respects `BASE_PATH` env (default `/tilemama/`). CI runs `npm ci && npm run build` |
| Typecheck | `npm run check` — runs `svelte-check --tsconfig tsconfig.app.json` + `tsc -p tsconfig.node.json` (two project references) |
| Lint | `npm run lint` — **currently ignores `*.svelte` and `*.svelte.ts`** (`eslint.config.js` `ignores`); result is noisy-false-pass, trust `check` instead |
| Format | `npm run format` — Prettier `semi:false, singleQuote, printWidth:100` |
| Unit tests | `npm run test` (`vitest run`) / `npm run test:watch`; single file: `npx vitest run src/lib/engine.test.ts` or `npx vitest run -t "explosion"` |
| E2E | `npm run test:e2e` — Playwright, `testDir: e2e`, `baseURL: http://localhost:5173/tilemama/`, auto-starts `npm run dev` |

Verify order: `check` → `test` → `test:e2e` → `build`.

## Architecture
- `src/core/config/gameConfig.ts` — single source of truth for tuning (`explosionValue:32`, `starIntervalMs:10000`, `bonusMin/MaxDelayMs:6500/10500`, `specialDurationMs:3000`, `wallHp:2`, etc.). Change values here, not in call sites.
- `src/core/engine/MoveResolver.ts` — pure function `resolveMove(block, dir, grid) → {type: wall|special|merge|slide}`. No side effects; used for both real moves and ghost preview in `App.svelte`.
- `src/lib/engine.ts` — `Engine` class: `grid[y][x]`, `blocks`/`specials` Maps, `move()`, `spawnStar/spawnRandomBonus`, `applyPending/cancelPending`, `applyLaser/Vortex/Shuffle`, `cleanupExpiredSpecials`, single-undo `pushHistory/undo`. Pending modes: `x2 | jolly | bombColor | clone`.
- `src/lib/game.svelte.ts` — runes store bridging `Engine` + `ComboState` + `persistence.ts`. Exposes `game` (derived getters), `engine`, `combo`, `initGame/newGame/doMove/spawnStar/spawnBonus/cleanupSpecials/tickVirus/applyPending/cancelPending/undoMove`. `doMove`/`applyPending` apply combo multiplier before scoring.
- `src/core/combo/ComboState.ts` — combo chain + multiplier; `peekMultiplier` used before `engine.move`, `onMerge/onMiss` after.
- `src/services/scheduler.ts` — `GameScheduler` (intervals: star 10s, bonus random 6.5–10.5s rescheduled via `setTimeout`, cleanup 250ms, virus 1s). Paused via `setPaused(!!pendingMode||gameOver)` and `visibilitychange`; stopped in `onDestroy`.
- `src/services/persistence.ts` — zod-validated `localStorage` key `tilemama-save-v2` (legacy `v1` read), migrates `pendingMultiplier→pendingMode`, remaps obsolete kinds (`div2→x2`, `magnet→shuffle`, etc.), silent `QuotaExceededError` drop.
- `src/App.svelte` (~480 lines) — drag/pointer handling, ghost preview (derived from `resolveMove`), confetti/particle bursts, score pop animations. Global shortcuts: `Ctrl/Cmd+Z` undo, `N` new game (blocked in pending), `M` mute, `?` help, `Esc` cancel pending.
- `vite.config.ts` — `base: process.env.BASE_PATH ?? '/tilemama/'`, PWA `runtimeCaching` for Google Fonts.

## Conventions & Gotchas
- Vite base `/tilemama/` affects routing and e2e `baseURL`; `deploy.yml` copies `dist/index.html → 404.html` + `.nojekyll` for GitHub Pages SPA fallback.
- `eslint` is effectively disabled for Svelte — do not rely on it for correctness.
- Vitest uses `jsdom` + `globals:true`, Svelte plugin enabled; tests live colinearly (`src/**/*.test.ts`).
- Persistence writes are debounced 50ms via `setTimeout` in `game.svelte.ts`; tests mock `localStorage`.
- Do not hardcode magic numbers (32, 10s, etc.) — import from `GAME_CONFIG` or `types.ts` constants (`EXPLOSION_VALUE`, `GRID_SIZE`, `SPECIAL_DURATION_MS`).
- State mutations must go through `game.svelte.ts` helpers so `version`/`specialsTick` bump and `sync()`/`persist()` fire; mutating `engine` directly skips reactivity.
