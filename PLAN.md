## Overview

Build the browser-free voxel data foundation for the MVP: a small typed block registry and a deterministic fixed-size chunk module backed by `Uint8Array`. This establishes stable block IDs, chunk coordinate math, bounds validation, and tested set/get behavior that later terrain generation, collision, mining, placement, inventory, crafting, save/load, and Three.js rendering can consume without coupling simulation logic to the browser.

## Architecture

- `src/world/blocks.ts` owns all public block identity and metadata. It exports small numeric IDs for `air`, `grass`, `dirt`, `stone`, `wood`, `planks`, `coal`, and `torch`, plus lookup helpers for solidity, opacity, and block definitions.
- `src/world/chunk.ts` owns fixed chunk dimensions, flat-array storage, coordinate-to-index conversion, chunk creation, cloning, and read/write helpers. The layout is deterministic: local `x` is the fastest-changing coordinate, followed by `z`, then `y`.
- `src/world/__tests__/chunk.test.ts` verifies the module without rendering, DOM, localStorage, random timing, or network access.
- Data flow is unidirectional and explicit: callers choose block IDs from the registry, create or receive a `Chunk`, use chunk helpers to read or produce an updated chunk, and later systems can serialize the typed array or transform it into render meshes. Rendering and input code never become dependencies of the data layer.
- Public helpers validate at runtime for JavaScript consumers and test fixtures. Internal assertion helpers can share validation logic, but only the documented exports are considered stable API.

## User experience

Public API from `src/world/blocks.ts`:

```ts
export const BLOCK_IDS: {
  readonly air: 0;
  readonly grass: 1;
  readonly dirt: 2;
  readonly stone: 3;
  readonly wood: 4;
  readonly planks: 5;
  readonly coal: 6;
  readonly torch: 7;
};

export type BlockKey = keyof typeof BLOCK_IDS;
export type BlockId = (typeof BLOCK_IDS)[BlockKey];

export interface BlockDefinition {
  readonly id: BlockId;
  readonly key: BlockKey;
  readonly label: string;
  readonly solid: boolean;
  readonly opaque: boolean;
}

export const BLOCK_DEFINITIONS: readonly BlockDefinition[];
export const BLOCK_BY_ID: Readonly<Record<BlockId, BlockDefinition>>;
export function isBlockId(value: number): value is BlockId;
export function getBlockDefinition(id: BlockId): BlockDefinition;
export function isSolidBlock(id: BlockId): boolean;
export function isOpaqueBlock(id: BlockId): boolean;
```

Public API from `src/world/chunk.ts`:

```ts
import type { BlockId } from "./blocks";

export const CHUNK_WIDTH = 16;
export const CHUNK_HEIGHT = 64;
export const CHUNK_DEPTH = 16;
export const CHUNK_VOLUME = CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH;

export interface ChunkLocalPosition {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Chunk {
  readonly blocks: Uint8Array;
}

export function createChunk(fillBlock?: BlockId): Chunk;
export function cloneChunk(chunk: Chunk): Chunk;
export function isInChunkBounds(x: number, y: number, z: number): boolean;
export function chunkIndex(x: number, y: number, z: number): number;
export function chunkPosition(index: number): ChunkLocalPosition;
export function getBlock(chunk: Chunk, x: number, y: number, z: number): BlockId;
export function setBlock(
  chunk: Chunk,
  x: number,
  y: number,
  z: number,
  block: BlockId,
): Chunk;
```

`setBlock` returns a new `Chunk` with a copied `Uint8Array` so the exported helper is deterministic and free of hidden mutation. Consumers that need bulk generation can later receive a separate internal builder or explicit mutating helper after the terrain generator requirements are known.

Usage snippet: create a default-air chunk and place one grass block.

```ts
import { BLOCK_IDS } from "./world/blocks";
import { createChunk, getBlock, setBlock } from "./world/chunk";

const empty = createChunk();
const withGrass = setBlock(empty, 2, 10, 3, BLOCK_IDS.grass);

getBlock(empty, 2, 10, 3); // BLOCK_IDS.air
getBlock(withGrass, 2, 10, 3); // BLOCK_IDS.grass
```

Usage snippet: validate bounds before applying a player edit.

```ts
import { BLOCK_IDS } from "./world/blocks";
import { isInChunkBounds, setBlock } from "./world/chunk";

const target = { x: 8, y: 12, z: 8 };

const nextChunk = isInChunkBounds(target.x, target.y, target.z)
  ? setBlock(chunk, target.x, target.y, target.z, BLOCK_IDS.planks)
  : chunk;
```

Usage snippet: consume registry metadata without coupling to rendering.

```ts
import { BLOCK_IDS, getBlockDefinition, isSolidBlock } from "./world/blocks";
import { getBlock } from "./world/chunk";

const block = getBlock(chunk, 4, 20, 4);
const definition = getBlockDefinition(block);
const blocksMovement = isSolidBlock(block);

definition.key; // "air" | "grass" | "dirt" | "stone" | "wood" | "planks" | "coal" | "torch"
getBlockDefinition(BLOCK_IDS.torch).solid; // false
```

Error handling and result shapes:

- Successful block lookups return `BlockDefinition`; successful chunk reads return `BlockId`; successful writes return a new `Chunk`.
- `createChunk` throws `RangeError` if `fillBlock` is not a known block ID at runtime.
- `chunkIndex`, `getBlock`, and `setBlock` throw `RangeError` when `x`, `y`, or `z` is non-integer or outside `0 <= x < 16`, `0 <= y < 64`, `0 <= z < 16`.
- `chunkPosition` throws `RangeError` when `index` is non-integer or outside `0 <= index < CHUNK_VOLUME`.
- `getBlockDefinition`, `isSolidBlock`, `isOpaqueBlock`, and `setBlock` throw `RangeError` for unknown numeric block IDs passed from untyped JavaScript.
- The module has no filesystem, network, DOM, localStorage, global state, timers, randomness, or rendering side effects.
- Public names listed above are stable for MVP consumers. Internal assertion and normalization helpers are not exported and may change without a major API decision.

## File tree

```text
PLAN.md
src/
  world/
    blocks.ts
    chunk.ts
    __tests__/
      chunk.test.ts
```

The current planning task only creates `PLAN.md`. The later implementation task should create the `src/world` files above and should not need package, config, renderer, or app-entry changes.

## Dependencies

- No new runtime dependencies.
- Use TypeScript, `Uint8Array`, and standard JavaScript errors for the data layer.
- Use the existing Vitest setup for unit tests through the project stack command `pnpm test`.
- Keep compatibility with the constitution stack: `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm eslint .`, `pnpm tsc --noEmit`, and `pnpm build`.

## Data model

- Block IDs are compact unsigned byte values. `air` is `0` so a new zero-filled `Uint8Array` represents an empty chunk without extra initialization.
- Registry entries are immutable definitions with `id`, `key`, `label`, `solid`, and `opaque`. `air` and `torch` are non-solid and non-opaque; terrain and crafting blocks are solid and opaque unless a later rendering or collision requirement says otherwise.
- A chunk is exactly `16 x 64 x 16`, with `CHUNK_VOLUME = 16_384` cells stored in one `Uint8Array`.
- Flat index formula is `index = x + z * CHUNK_WIDTH + y * CHUNK_WIDTH * CHUNK_DEPTH`.
- Reverse coordinate formula is `y = Math.floor(index / (CHUNK_WIDTH * CHUNK_DEPTH))`, `remainder = index % (CHUNK_WIDTH * CHUNK_DEPTH)`, `z = Math.floor(remainder / CHUNK_WIDTH)`, `x = remainder % CHUNK_WIDTH`.
- `createChunk()` returns default air because typed arrays initialize to zero.
- `createChunk(fillBlock)` returns a chunk filled with that block ID after validating the ID.
- `setBlock` preserves the input chunk and returns a chunk with copied storage and one changed byte.
- Runtime validation rejects fractional, negative, out-of-range, and unknown block values. TypeScript types prevent most invalid block IDs at compile time for typed consumers.

## Implementation phases

1. Confirm the repo already has the Vite, TypeScript, pnpm, and Vitest stack expected by the constitution before implementing code.
2. Add `src/world/blocks.ts` with `BLOCK_IDS`, literal union types, immutable definitions, lookup tables, and registry helper functions.
3. Add `src/world/chunk.ts` with fixed dimension constants, chunk interfaces, `createChunk`, `cloneChunk`, coordinate validation, index conversion, reverse conversion, `getBlock`, and immutable `setBlock`.
4. Add `src/world/__tests__/chunk.test.ts` covering default air at representative coordinates, all bounds edges, out-of-bounds failures, coordinate/index round trips, block set/get round trips, and proof that `setBlock` does not mutate its input chunk.
5. Run focused tests while developing, then run `pnpm test`. If the scaffold exists, also run `pnpm tsc --noEmit` because the task defines exported TypeScript API.
6. Keep the implementation isolated from renderer, controls, generation, save/load, inventory, crafting, and app startup code.

## Acceptance criteria

- `src/world/blocks.ts` exports the documented registry, typed IDs, metadata, and helper functions for the eight MVP blocks.
- `src/world/chunk.ts` exports fixed chunk constants, chunk data shape, coordinate math, and deterministic get/set helpers using `Uint8Array`.
- A new chunk reads as air at every valid coordinate without requiring a fill loop.
- Setting one coordinate to a valid non-air block can be read back from the returned chunk.
- The original chunk remains unchanged after `setBlock`.
- Boundary coordinates `(0, 0, 0)` and `(15, 63, 15)` are valid; negative, height-overflow, width-overflow, depth-overflow, fractional, and invalid-index inputs fail with `RangeError`.
- Unit tests live under `src/world/__tests__/chunk.test.ts` and pass with `pnpm test`.
- The data layer imports no browser APIs, Three.js, app UI modules, filesystem APIs, networking APIs, timers, or randomness.
- The implementation avoids untyped escape hatches and suppressed TypeScript or ESLint diagnostics.

## Open questions

- Should `torch` eventually carry light-level metadata in the block registry, or should lighting stay in a separate renderer/world-lighting module?
- Should the later terrain generator use the immutable `setBlock` helper for simplicity or receive a separate explicit bulk-fill API for performance?
- Should public imports remain module-specific (`src/world/blocks`, `src/world/chunk`) for MVP, or should a future `src/world/index.ts` barrel be added once more world modules exist?
- How will world-space coordinates map to chunk-space coordinates when bounded multi-chunk terrain is introduced?
