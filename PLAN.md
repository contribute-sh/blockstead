## Overview

Build a deterministic terrain generation layer for the voxel world by adding a small seeded value-noise helper and a `generateChunk(seed, chunkX, chunkZ)` API. The generator will fill each fixed-size chunk with air above the terrain surface, grass at the top solid block, a shallow dirt layer below the surface, and stone deeper underground, giving later movement, rendering, mining, placement, and save/load work a stable world source that remains testable without a browser.

## Architecture

- `src/world/generator.ts` is the public terrain generation module. It validates inputs, converts chunk-local coordinates into world-space coordinates, samples deterministic height noise, and fills a new `Chunk` using the existing chunk and block primitives.
- `src/world/noise.ts` is an internal deterministic helper module. It normalizes a string or numeric seed into a stable 32-bit value, hashes integer lattice coordinates, interpolates lattice values, and exposes a small value-noise function used by the generator. It has no dependency on `Math.random`, timers, browser state, or external packages.
- Existing `src/world/blocks.ts` remains the source of block IDs for `air`, `grass`, `dirt`, and `stone`. Existing `src/world/chunk.ts` remains the source of chunk dimensions, `Chunk` storage shape, and coordinate/index helpers.
- `src/world/__tests__/generator.test.ts` covers deterministic byte output and structural terrain invariants through Vitest. The tests inspect chunk bytes directly and do not require Three.js, DOM, Playwright, localStorage, or rendering.
- Data flow is pure: callers provide a seed and integer chunk coordinates, the generator returns a newly generated chunk, and the function does not mutate external state or cache global results.

## User experience

Public API from `src/world/generator.ts`:

```ts
import type { Chunk } from "./chunk";

export type TerrainSeed = string | number;

export interface TerrainHeightRange {
  readonly min: number;
  readonly max: number;
}

export interface TerrainGeneratorConfig {
  readonly seed: TerrainSeed;
  readonly chunkX: number;
  readonly chunkZ: number;
  readonly heightRange: TerrainHeightRange;
  readonly dirtDepth: number;
}

export const DEFAULT_TERRAIN_HEIGHT_RANGE: TerrainHeightRange;
export const DEFAULT_DIRT_DEPTH: number;

export function generateChunk(
  seed: TerrainSeed,
  chunkX: number,
  chunkZ: number,
): Chunk;
```

Internal API from `src/world/noise.ts`:

```ts
export function normalizeSeed(seed: TerrainSeed): number;
export function valueNoise2D(seed: number, x: number, z: number): number;
```

`src/world/noise.ts` exports are implementation details for the world module and targeted tests only. The stable public surface for consumers is `generateChunk`, `TerrainSeed`, `TerrainHeightRange`, `TerrainGeneratorConfig`, `DEFAULT_TERRAIN_HEIGHT_RANGE`, and `DEFAULT_DIRT_DEPTH`.

Usage snippet: generate the origin chunk for a named world seed.

```ts
import { generateChunk } from "./world/generator";
import { getBlock } from "./world/chunk";

const chunk = generateChunk("demo-world", 0, 0);
const blockAtSpawn = getBlock(chunk, 8, 32, 8);
```

Usage snippet: generate neighboring chunks from the same seed.

```ts
import { generateChunk } from "./world/generator";

const seed = 12345;
const center = generateChunk(seed, 0, 0);
const east = generateChunk(seed, 1, 0);
const north = generateChunk(seed, 0, -1);
```

Usage snippet: compare generated chunk bytes for deterministic regression tests.

```ts
import { generateChunk } from "./world/generator";

const first = generateChunk("fixture-seed", -2, 3);
const second = generateChunk("fixture-seed", -2, 3);

expect(Array.from(second.blocks)).toEqual(Array.from(first.blocks));
```

Error handling and result shapes:

- Successful generation returns a new `Chunk` whose `blocks` storage contains only known block IDs.
- `generateChunk` throws `TypeError` when `seed` is not a finite number or non-empty string.
- `generateChunk` throws `RangeError` when `chunkX` or `chunkZ` is not a finite integer.
- The default generator has no recoverable error result type because it performs no I/O and has no async work.
- The module has no filesystem, network, DOM, localStorage, global random, timer, rendering, or process side effects.
- The generated world is deterministic for a fixed implementation version, seed, and chunk coordinate. Changing terrain constants or noise math should be treated as a deliberate fixture-affecting change.

## File tree

```text
PLAN.md
src/
  world/
    generator.ts
    noise.ts
    __tests__/
      generator.test.ts
```

This planning task only modifies `PLAN.md`. The later implementation should create the world files above and use existing block/chunk modules without changing application entry points, renderer code, package scripts, or configuration unless an existing public export barrel must be updated.

## Dependencies

- No new runtime dependencies.
- No external noise package; implement a small deterministic hashed value-noise helper in TypeScript.
- Use existing project primitives: `Uint8Array` chunk storage, TypeScript types, and standard `TypeError`/`RangeError`.
- Use the constitution stack exactly: package manager `pnpm`, unit tests through Vitest via `pnpm test`, lint through `pnpm eslint .`, typecheck through `pnpm tsc --noEmit`, and build through `pnpm build`.
- Playwright and Three.js are not needed for this generator task because the behavior is headlessly testable.

## Data model

- `TerrainSeed` accepts a finite number or non-empty string. Strings are normalized with a stable 32-bit hash; numbers are normalized into a deterministic 32-bit integer without using platform-dependent randomness.
- Chunk coordinates are signed integers. Local chunk coordinates are converted to world-space with `worldX = chunkX * CHUNK_WIDTH + localX` and `worldZ = chunkZ * CHUNK_DEPTH + localZ`.
- The terrain heightmap is one height value per `(worldX, worldZ)` column. Noise output is normalized to `[0, 1]`, scaled into `DEFAULT_TERRAIN_HEIGHT_RANGE`, and clamped to valid chunk `y` coordinates.
- `DEFAULT_TERRAIN_HEIGHT_RANGE` should keep terrain inside the chunk, with air above the surface and enough vertical room for stone below. Exact min/max values should be constants in `generator.ts`, not magic numbers spread through tests.
- `DEFAULT_DIRT_DEPTH` defines the number of dirt blocks below grass before stone begins.
- For each `(x, z)` column:
  - `y > surfaceHeight` is `air`.
  - `y === surfaceHeight` is `grass`.
  - `surfaceHeight - DEFAULT_DIRT_DEPTH <= y < surfaceHeight` is `dirt`, clamped at the bottom of the chunk.
  - `0 <= y < surfaceHeight - DEFAULT_DIRT_DEPTH` is `stone`.
- Generated chunks contain only `BLOCK_IDS.air`, `BLOCK_IDS.grass`, `BLOCK_IDS.dirt`, and `BLOCK_IDS.stone`.

## Implementation phases

1. Confirm the existing block and chunk modules expose the needed block IDs, chunk dimensions, chunk creation, and block storage helpers. If they do not, stop and document the missing prerequisite rather than expanding this terrain task into unrelated data-structure work.
2. Add `src/world/noise.ts` with deterministic seed normalization, integer coordinate hashing, smooth interpolation, and a small 2D value-noise sampler. Keep the module pure and dependency-free.
3. Add `src/world/generator.ts` with public terrain constants, input validation, world-coordinate conversion, height sampling, and chunk filling for grass, dirt, stone, and air.
4. Prefer direct chunk byte writes during generation if the existing chunk API supports safe construction; otherwise use the existing set/get helpers while keeping the returned chunk shape identical to other world code.
5. Add `src/world/__tests__/generator.test.ts` for same seed/coords determinism, different coordinate coverage, valid block IDs only, top solid block is grass for every column, air exists above surface where height permits, and no dirt appears above a column's grass block.
6. Run `pnpm test` for the unit suite. If the scaffold is present, also run `pnpm tsc --noEmit` because the task adds exported TypeScript API.
7. Keep renderer, controls, inventory, crafting, save/load, package metadata, lockfiles, and browser tests unchanged for this generator-only implementation.

## Acceptance criteria

- `src/world/generator.ts` exports the documented `generateChunk(seed, chunkX, chunkZ)` API and terrain constants.
- `src/world/noise.ts` implements deterministic value noise without external dependencies, `Math.random`, global mutable seed state, timers, browser APIs, or I/O.
- Calling `generateChunk` twice with the same seed and chunk coordinates returns chunks with identical byte arrays.
- Generated chunks contain only air, grass, dirt, and stone block IDs.
- Every `(x, z)` column has grass as its top solid block.
- No dirt block appears above the grass block in any generated column.
- Air fills all cells above the surface height.
- Dirt forms a shallow layer under grass and stone fills deeper terrain.
- Invalid seed or non-integer chunk coordinate inputs throw the documented standard errors.
- Unit tests for generator determinism and invariants pass with `pnpm test`.
- The implementation does not couple simulation code to Three.js, DOM, localStorage, Playwright, filesystem APIs, networking APIs, or visual polish.

## Open questions

- Do the current chunk primitives expose a mutating construction path for efficient generation, or should this task initially use immutable `setBlock` helpers despite the extra copying?
- Should `src/world/noise.ts` be tested directly, or should noise behavior remain covered only through generator determinism tests?
- Should `generateChunk` be re-exported from an existing `src/world/index.ts` or package entry point if one exists?
- What exact default terrain height range best matches the eventual player spawn and movement collision work?
