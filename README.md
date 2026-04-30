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

Reference table:

| Action | Key/Button | Notes |
| --- | --- | --- |
| Move forward | `KeyW` (`W`) or `ArrowUp` | From `DEFAULT_BINDINGS`; part of WASD and arrow-key movement. |
| Move backward | `KeyS` (`S`) or `ArrowDown` | From `DEFAULT_BINDINGS`; part of WASD and arrow-key movement. |
| Move left | `KeyA` (`A`) or `ArrowLeft` | From `DEFAULT_BINDINGS`; part of WASD and arrow-key movement. |
| Move right | `KeyD` (`D`) or `ArrowRight` | From `DEFAULT_BINDINGS`; part of WASD and arrow-key movement. |
| Jump | `Space` | Emits jump through the movement intent. |
| Toggle inventory | `KeyE` (`E`) | Bound to the inventory/crafting toggle intent. |
| Save | `KeyP` (`P`) | Source binds `KeyP`; `Ctrl+S` is not currently bound. |
| Select hotbar slot | `Digit1` through `Digit9` | Selects hotbar slots 1-9; modified and repeated digit presses are ignored by the hotbar adapter. |
| Mine | Left mouse button (`button === 0`) | Mouse button events emit mine intent. |
| Place | Right mouse button (`button === 2`) | Mouse button events emit place intent. |
| Lock pointer | Click the canvas/target | The pointer-lock adapter requests pointer lock on click. |
| Look | Mouse movement | Mouse movement emits look intent; pointer-lock look deltas are emitted only while locked. |

## MVP Limitations

- New games default to deterministic seed `1337`.
- Saves use a single `localStorage` slot (`blockstead:mvp-save`); there is no save management UI, and saving overwrites the current slot.
- There is no day/night cycle.
- There is no audio.
- Terrain is currently a single biome.
- Browser focus loss is a known input edge case: if the window loses focus while keys are held, input state may not be released cleanly.

## Current Scope

The repository contains the core TypeScript/Vite project structure plus tested simulation, rendering, input, HUD, inventory, crafting, save/load, terrain, and world modules.

The current browser entry point mounts a Three.js canvas. Some gameplay systems are still exposed primarily as tested modules rather than fully wired into the runtime loop. See `CONSTITUTION.md` for the MVP, hardening, and polish boundaries.

## Project Structure

- `src/sim/`: deterministic game systems such as chunks, terrain, inventory, crafting, saves, and player state
- `src/render/`: Three.js scene, camera, chunk mesh, targeting, and world renderer helpers
- `src/input/`: keyboard, mouse, pointer-lock, hotbar, and intent adapters
- `src/hud/`: DOM HUD components for hotbar, inventory, crafting, save status, and coordinates
- `tests/`: Vitest and Playwright coverage for simulation, rendering helpers, input, HUD, and browser smoke flows
