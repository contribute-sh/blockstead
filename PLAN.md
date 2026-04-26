## Overview

Define the browser-free voxel data layer that later terrain generation, mining, placement, save/load, and rendering code will build on. The implementation should add a typed block registry for the MVP block set and a deterministic fixed-size chunk abstraction backed internally by a `Uint8Array`, with pure coordinate, read, write, and serialization helpers.

This proposal is intentionally limited to data structures. It does not generate terrain, render blocks, add controls, implement inventory, or touch browser entry points. Because the current repository only contains `CONSTITUTION.md`, `PLAN.md`, and `README.md`, this task depends on the scaffold task landing first with `package.json`, TypeScript, pnpm, and Vitest. If the scaffold is still missing when implementation starts, the implementation should stop and report that prerequisite instead of expanding this task into package/config setup.

## Architecture

- `src/world/blocks.ts` is the source of truth for block IDs, block names, and small metadata needed by simulation code. It exports a typed registry for `air`, `grass`, `dirt`, `stone`, `wood`, `planks`, `coal`, and a placeholder `torch`.
- `src/world/chunk.ts` owns chunk dimensions, chunk volume, coordinate validation, deterministic coordinate-to-index math, chunk creation, block reads, block writes, and byte serialization.
- `Chunk` is an opaque public type, not a structural object with a public mutable `blocks: Uint8Array` field. The implementation may use a non-exported symbol, private class field, or module-private backing store, but consumers should create chunks only through exported helpers.
- `getBlock` validates coordinates and validates the stored byte before returning it as a `BlockId`. `setBlock` validates coordinates and block IDs before creating the updated chunk.
- `src/world/__tests__/chunk.test.ts` covers registry validity, coordinate bounds, default-air chunks, set/get round trips, pure writes that do not mutate the input chunk, serialization copying, and rejection of malformed byte input.
- The modules stay pure and deterministic: no Three.js, DOM, localStorage, timers, random values, filesystem, networking, or process-global mutable state.

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

export type BlockName = keyof typeof BLOCK_IDS;
export type BlockId = (typeof BLOCK_IDS)[BlockName];

export interface BlockDefinition {
  readonly id: BlockId;
  readonly name: BlockName;
  readonly solid: boolean;
  readonly transparent: boolean;
}

export const BLOCKS: readonly BlockDefinition[];
export function isBlockId(value: number): value is BlockId;
export function assertBlockId(value: number): BlockId;
export function getBlockDefinition(id: BlockId): BlockDefinition;
```

Public API from `src/world/chunk.ts`:

```ts
import type { BlockId } from "./blocks";

export const CHUNK_WIDTH = 16;
export const CHUNK_HEIGHT = 64;
export const CHUNK_DEPTH = 16;
export const CHUNK_VOLUME = CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH;

export interface Chunk {
  // Opaque brand or private implementation detail; no public raw byte field.
}

export function createChunk(fill?: BlockId): Chunk;
export function createChunkFromBytes(blocks: Uint8Array): Chunk;
export function chunkIndex(x: number, y: number, z: number): number;
export function getBlock(chunk: Chunk, x: number, y: number, z: number): BlockId;
export function setBlock(chunk: Chunk, x: number, y: number, z: number, block: BlockId): Chunk;
export function chunkToBytes(chunk: Chunk): Uint8Array;
```

Usage snippet: create a default empty chunk and read air from the origin.

```ts
import { BLOCK_IDS } from "./world/blocks";
import { createChunk, getBlock } from "./world/chunk";

const chunk = createChunk();
expect(getBlock(chunk, 0, 0, 0)).toBe(BLOCK_IDS.air);
```

Usage snippet: write a block without mutating the original chunk.

```ts
import { BLOCK_IDS } from "./world/blocks";
import { createChunk, getBlock, setBlock } from "./world/chunk";

const original = createChunk();
const updated = setBlock(original, 1, 2, 3, BLOCK_IDS.stone);

expect(getBlock(original, 1, 2, 3)).toBe(BLOCK_IDS.air);
expect(getBlock(updated, 1, 2, 3)).toBe(BLOCK_IDS.stone);
```

Usage snippet: serialize bytes for deterministic fixtures without exposing mutable storage.

```ts
import { createChunk, chunkToBytes } from "./world/chunk";

const bytes = chunkToBytes(createChunk());
expect(bytes).toHaveLength(16 * 64 * 16);
```

Error handling and result shapes:

- Successful reads return a validated `BlockId`.
- `createChunkFromBytes` rejects arrays with the wrong length or any unknown block byte, and copies accepted input before storing it.
- `chunkToBytes` returns a defensive copy; mutating the returned `Uint8Array` cannot mutate the chunk.
- `getBlock` validates the stored byte before returning. If internal storage is ever malformed, it throws instead of widening an invalid byte to `BlockId`.
- Coordinate helpers throw `RangeError` for fractional, negative, or out-of-range `x`, `y`, or `z` coordinates.
- Block validation throws `RangeError` for numeric IDs that are not in the registry.

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

This planning task only modifies `PLAN.md`. The later implementation should create the `src/world` files above only after the TypeScript/Vitest scaffold exists. It should not change renderer code, app-entry code, package scripts, package metadata, lockfiles, or configuration as part of this data-layer task.

## Dependencies

- Explicit prerequisite: the scaffold task must already provide `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, Vitest, and a working `pnpm test` script. In the current checkout that prerequisite is not yet satisfied, so execution of this data-layer implementation is blocked until scaffold exists.
- No new runtime dependencies.
- No external voxel, ECS, serialization, or validation package.
- Use TypeScript, `Uint8Array`, standard `RangeError`, and the project test stack once scaffolded.
- Follow the constitution stack once available: package manager `pnpm`, unit tests through Vitest via `pnpm test`, lint through `pnpm eslint .`, typecheck through `pnpm tsc --noEmit`, and build through `pnpm build`.
- Playwright and Three.js are not needed for this task because the behavior is headlessly testable.

## Data model

- Block IDs are small unsigned integer literals. The initial registry reserves:
  - `air = 0`
  - `grass = 1`
  - `dirt = 2`
  - `stone = 3`
  - `wood = 4`
  - `planks = 5`
  - `coal = 6`
  - `torch = 7`
- `air` is non-solid and transparent. `grass`, `dirt`, `stone`, `wood`, `planks`, and `coal` are solid and opaque. `torch` is a non-solid transparent placeholder so crafting and placement code can reference it later without requiring lighting behavior in this task.
- A chunk is exactly `16 x 64 x 16` blocks with `CHUNK_VOLUME = 16_384`.
- Chunk bytes use `Uint8Array` internally for compact deterministic storage, but raw mutable storage is not part of the public `Chunk` result shape.
- The deterministic index formula is `index = y * CHUNK_WIDTH * CHUNK_DEPTH + z * CHUNK_WIDTH + x`.
- `createChunk()` fills every cell with `BLOCK_IDS.air`. `createChunk(fill)` fills every cell with a validated block ID.
- `setBlock` is pure: it copies the chunk bytes, writes the validated block ID at the validated index, and returns a new `Chunk`.
- `createChunkFromBytes` is the only public way to construct a chunk from bytes. It requires exact chunk volume, validates every byte as a known `BlockId`, and stores a copy.
- `chunkToBytes` returns a copy for tests, save/load, and deterministic fixtures. Consumers that need mutation must call `setBlock`.

## Implementation phases

1. Confirm the scaffold exists before implementation: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, Vitest, and `pnpm test` must be present. If any are missing, stop and document that this proposal depends on the scaffold task rather than adding package/config files here.
2. Add `src/world/blocks.ts` with `BLOCK_IDS`, `BlockName`, `BlockId`, `BlockDefinition`, `BLOCKS`, `isBlockId`, `assertBlockId`, and `getBlockDefinition`.
3. Add `src/world/chunk.ts` with chunk constants, an opaque `Chunk` representation, coordinate validation, `chunkIndex`, `createChunk`, `createChunkFromBytes`, `getBlock`, `setBlock`, and `chunkToBytes`.
4. Ensure no API exposes mutable backing storage. Use defensive copies at all byte boundaries and validate stored bytes before returning `BlockId`.
5. Add `src/world/__tests__/chunk.test.ts` for registry IDs, block metadata lookups, bounds errors, default-air chunks, fill chunks, set/get round trips, pure writes, serialization copies, malformed byte length rejection, and unknown block byte rejection.
6. Run `pnpm test` for the unit suite. If scaffold scripts exist, also run `pnpm tsc --noEmit` because the task adds exported TypeScript API.
7. Keep terrain generation, renderer, controls, inventory, crafting, save/load, package metadata, lockfiles, and browser tests unchanged for this data-layer implementation.

## Acceptance criteria

- The implementation starts only after the TypeScript/Vitest scaffold exists, or else reports the missing scaffold prerequisite without modifying package/config files.
- `src/world/blocks.ts` exports the documented block registry, types, and validation helpers for air, grass, dirt, stone, wood, planks, coal, and torch.
- `src/world/chunk.ts` exports the documented chunk constants and helper API for a `16 x 64 x 16` chunk.
- `Chunk` does not expose public mutable raw storage. Consumers cannot construct valid chunks from arbitrary bytes without going through validation helpers.
- `getBlock` returns only validated `BlockId` values and throws if coordinates or stored bytes are invalid.
- `setBlock` validates block IDs and coordinates, returns a new chunk, and does not mutate its input chunk.
- `createChunkFromBytes` validates exact length and every stored block ID, and stores a defensive copy.
- `chunkToBytes` returns a defensive copy suitable for tests and future save/load work.
- Unit tests for registry behavior, chunk bounds, default-air state, set/get round trips, immutable writes, and invalid byte input pass with `pnpm test` once scaffolded.
- The implementation does not couple simulation code to Three.js, DOM, localStorage, Playwright, filesystem APIs, networking APIs, visual polish, or terrain generation.

## Open questions

- Should later terrain generation use `setBlock` for purity or an additional internal chunk builder API for efficient bulk writes?
- Should `torch` remain only a placeholder block in this registry until lighting/rendering work exists, or should it include extra metadata in a later task?
- Should `src/world/blocks.ts` and `src/world/chunk.ts` be re-exported from a future `src/world/index.ts` or package entry point after the scaffold is in place?
- Should future save/load use `chunkToBytes` directly or wrap it in a versioned world serialization format?

## Revision notes for round 1

- Addressed issue comment `4321282544` by making the missing scaffold an explicit prerequisite in the overview, dependencies, implementation phases, and acceptance criteria. The plan now says to stop if `package.json`, TypeScript, pnpm, and Vitest are not present instead of changing package/config files inside this data-layer task.
- Addressed issue comment `4321282795` by removing the public `blocks: Uint8Array` result shape from `Chunk`. The revised plan requires an opaque chunk representation, defensive copies for byte import/export, validated construction through `createChunkFromBytes`, and stored-byte validation inside `getBlock` before returning `BlockId`.
