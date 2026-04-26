# Constitution

Version: 1.0.0

## Purpose
Blockstead is a browser-based voxel sandbox game inspired by the approachable building and exploration loop of Minecraft. The project exists to test whether autonomous contributors can take a greenfield interactive product from an empty repo to a playable, tested MVP and then harden it without losing architectural coherence.

The MVP should be small but real: a deterministic seeded voxel world, first-person movement, block mining and placement, a tiny inventory and crafting loop, and local save/load. The project optimizes for testable game systems over visual spectacle.

## Principles
- Build deterministic systems first: world generation, voxel updates, inventory, crafting, and save/load must be testable without a browser.
- Keep rendering and simulation separated so contributors can improve Three.js presentation without destabilizing core logic.
- Prefer small, explicit data formats for chunks, items, recipes, and saved worlds.
- Maintain a playable vertical slice at all times once the first MVP PR lands.
- Browser interactions must be understandable with keyboard and mouse, with visible status for selected block, inventory, and save state.
- Use accessible UI controls where practical, especially for menus, hotbar selection, and debug/test panels.

## Stack
- language: typescript
- package_manager: pnpm
- install: pnpm install --frozen-lockfile
- test: pnpm test
- lint: pnpm eslint .
- typecheck: pnpm tsc --noEmit
- build: pnpm build
- manifest_files: package.json, pnpm-lock.yaml, tsconfig.json, vite.config.ts, playwright.config.ts

## Boundaries
- Will NOT implement multiplayer, accounts, cloud saves, networking, chat, or servers.
- Will NOT attempt an infinite production-scale world; MVP and hardening use bounded deterministic chunks.
- Will NOT add heavyweight game engines or physics engines; Three.js is allowed for rendering, but simulation logic stays project-owned.
- Will NOT depend on external art packs, paid assets, or remote APIs.
- Will NOT make visual polish tasks block core correctness, persistence, or tests.
- Will NOT hide failing tests by weakening scripts, skipping Playwright flows, or removing assertions.

## Quality Standards
- pnpm install --frozen-lockfile, pnpm test, pnpm tsc --noEmit, and pnpm build must pass on every merged PR after the project is scaffolded.
- Pure unit tests must cover seeded world generation, voxel mutation, collision-relevant position math, inventory, crafting, and save/load serialization.
- At least one Playwright happy-path test must cover loading the app, moving, mining a block, placing a block, crafting an item, saving, reloading, and observing preserved state by the end of hardening.
- Game state must be deterministic for a fixed seed and test fixtures must not rely on random timing.
- Rendering code should expose test-friendly state through DOM labels, debug HUD text, or stable data attributes rather than screenshot-only assertions.
- Contributors must keep modules focused: simulation, rendering, controls, inventory, crafting, persistence, and UI should be separable.

## Verification
- MVP verification: seeded world loads, player can move, mine one block, place one block, craft one item, and save/reload locally.
- Harden verification: unit tests and at least one Playwright happy path pass reliably in a clean install.
- Human gate: after hardening drains, a human should play the browser build for at least five minutes and confirm the loop is understandable.

## Roadmap
### MVP
- Scaffold a Vite + TypeScript app with Three.js rendering, Vitest unit tests, Playwright setup, ESLint, and scripts wired to the Stack commands.
- Implement deterministic voxel world data structures with a small seeded terrain generator for grass, dirt, stone, and air.
- Implement first-person or close third-person movement over the voxel world with simple collision against solid blocks.
- Implement mining and placing blocks with mouse/keyboard input, a visible hotbar, and deterministic block selection.
- Implement inventory and three crafting recipes: planks from wood, sticks from planks, and a simple torch from stick plus coal or stone.
- Implement local save/load of world mutations, player position, inventory, and selected hotbar slot.
- Add unit tests for world generation, block mutation, inventory, crafting, and save/load plus a smoke-level browser test if feasible.

### Hardening
- Add the full Playwright happy path for load, move, mine, place, craft, save, reload, and preserved state.
- Improve input edge cases including pointer lock fallback, hotbar keyboard selection, paused state, and browser focus loss.
- Add tests for invalid save data, missing localStorage, recipe failures, and deterministic seed regression fixtures.
- Add lightweight performance guards for chunk mesh rebuilds and avoid unnecessary full-world recomputation.
- Improve HUD clarity for selected block, inventory counts, active recipe, save status, and player coordinates.
- Document local development, controls, test commands, and MVP limitations in README.

### Polish
- Add day/night lighting, simple ambient sound toggles, and clearer block materials after MVP/hardening are stable.
- Add optional creative-mode helpers such as block palette search, coordinate teleport for tests, or debug overlays.
- Add more block types and recipes only after core placement, persistence, and tests remain stable.
