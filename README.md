# Blockstead

Blockstead is a browser-based voxel sandbox game used to test whether autonomous contributors can take a greenfield interactive project from an empty repository to a playable, tested MVP.

The game is intentionally small: deterministic voxel world systems, first-person style input, block mining and placement, inventory, crafting, and local save/load are prioritized over visual polish.

## Requirements

- Node.js 22 or newer
- pnpm 10.x

## Setup

```bash
pnpm install --frozen-lockfile
```

## Run Locally

```bash
pnpm dev
```

Vite prints the local URL after startup, usually `http://localhost:5173/`.

## Useful Commands

```bash
pnpm test
pnpm tsc --noEmit
pnpm eslint .
pnpm build
```

## Controls

- `W`, `A`, `S`, `D` or arrow keys: move
- `Space`: jump intent
- Mouse move: look intent
- Left mouse button: mine intent
- Right mouse button: place intent
- `1` through `9`: select hotbar slot
- `E`: toggle inventory intent
- `P`: save intent

## Current Scope

The repository contains the core TypeScript/Vite project structure plus tested simulation, rendering, input, HUD, inventory, crafting, save/load, terrain, and world modules.

The current browser entry point mounts a Three.js canvas. Some gameplay systems are still exposed primarily as tested modules rather than fully wired into the runtime loop. See `CONSTITUTION.md` for the MVP, hardening, and polish boundaries.

## Project Structure

- `src/sim/`: deterministic game systems such as chunks, terrain, inventory, crafting, saves, and player state
- `src/render/`: Three.js scene, camera, chunk mesh, targeting, and world renderer helpers
- `src/input/`: keyboard, mouse, pointer-lock, hotbar, and intent adapters
- `src/hud/`: DOM HUD components for hotbar, inventory, crafting, save status, and coordinates
- `tests/`: Vitest and Playwright coverage for simulation, rendering helpers, input, HUD, and browser smoke flows
