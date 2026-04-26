import { describe, expect, it } from "vitest";

import { BlockId } from "../../src/sim/blocks";
import { resolveMine, resolvePlace, type BlockDrop, type BlockDrops, type Hit } from "../../src/sim/actions";
import { type Inventory } from "../../src/sim/inventory";
import { createWorld, getBlock, setBlock, type ChunkKey, type World } from "../../src/sim/world";

const originHit: Hit = {
  target: { x: 1, y: 2, z: 3 },
  normal: { x: 0, y: 0, z: 1 }
};

const drops = {
  [BlockId.STONE]: { itemId: BlockId.DIRT, count: 2 },
  [BlockId.WOOD]: { itemId: BlockId.WOOD, count: 1 }
} satisfies BlockDrops;

describe("action resolvers", () => {
  it("mines a mineable block into air and adds the mapped drop without mutating inputs", () => {
    const world = createWorld();
    const inventory = makeInventory([null]);
    setBlock(world, originHit.target.x, originHit.target.y, originHit.target.z, BlockId.STONE);
    const worldSnapshot = cloneWorld(world);
    const inventorySnapshot = cloneInventory(inventory);
    const hitSnapshot = cloneHit(originHit);
    const dropsSnapshot = cloneDrops(drops);

    const result = resolveMine(world, originHit, inventory, drops);

    expect(result.ok).toBe(true);
    expect(result.world).not.toBe(world);
    expect(result.inventory).not.toBe(inventory);
    expect(getBlock(result.world, originHit.target.x, originHit.target.y, originHit.target.z)).toBe(BlockId.AIR);
    expect(result.inventory.slots).toEqual([{ id: BlockId.DIRT, count: 2 }]);
    expect(result.world["0,0,0" as ChunkKey]).not.toBe(world["0,0,0" as ChunkKey]);
    expect(world).toEqual(worldSnapshot);
    expect(inventory).toEqual(inventorySnapshot);
    expect(originHit).toEqual(hitSnapshot);
    expect(drops).toEqual(dropsSnapshot);
  });

  it("returns ok false for mining air with inputs unchanged", () => {
    const world = createWorld();
    const inventory = makeInventory([null]);
    const worldSnapshot = cloneWorld(world);
    const inventorySnapshot = cloneInventory(inventory);

    const result = resolveMine(world, originHit, inventory, drops);

    expect(result).toEqual({ ok: false, world, inventory });
    expect(result.world).toBe(world);
    expect(result.inventory).toBe(inventory);
    expect(world).toEqual(worldSnapshot);
    expect(inventory).toEqual(inventorySnapshot);
  });

  it("returns ok false for mining a non-mineable block with inputs unchanged", () => {
    const world = createWorld();
    const inventory = makeInventory([null]);
    setBlock(world, originHit.target.x, originHit.target.y, originHit.target.z, BlockId.STICK);
    const worldSnapshot = cloneWorld(world);
    const inventorySnapshot = cloneInventory(inventory);

    const result = resolveMine(world, originHit, inventory, drops);

    expect(result).toEqual({ ok: false, world, inventory });
    expect(getBlock(world, originHit.target.x, originHit.target.y, originHit.target.z)).toBe(BlockId.STICK);
    expect(world).toEqual(worldSnapshot);
    expect(inventory).toEqual(inventorySnapshot);
  });

  it("places into the adjacent air cell and consumes exactly one matching item without mutating inputs", () => {
    const world = createWorld();
    const inventory = makeInventory([{ id: BlockId.DIRT, count: 2 }]);
    setBlock(world, originHit.target.x, originHit.target.y, originHit.target.z, BlockId.STONE);
    const worldSnapshot = cloneWorld(world);
    const inventorySnapshot = cloneInventory(inventory);
    const hitSnapshot = cloneHit(originHit);

    const result = resolvePlace(world, originHit, inventory, BlockId.DIRT);

    expect(result.ok).toBe(true);
    expect(result.world).not.toBe(world);
    expect(result.inventory).not.toBe(inventory);
    expect(getBlock(result.world, originHit.target.x, originHit.target.y, originHit.target.z)).toBe(BlockId.STONE);
    expect(getBlock(result.world, 1, 2, 4)).toBe(BlockId.DIRT);
    expect(result.inventory.slots).toEqual([{ id: BlockId.DIRT, count: 1 }]);
    expect(world).toEqual(worldSnapshot);
    expect(inventory).toEqual(inventorySnapshot);
    expect(originHit).toEqual(hitSnapshot);
  });

  it("returns ok false when placement adjacent cell is non-air", () => {
    const world = createWorld();
    const inventory = makeInventory([{ id: BlockId.DIRT, count: 1 }]);
    setBlock(world, originHit.target.x, originHit.target.y, originHit.target.z, BlockId.STONE);
    setBlock(world, 1, 2, 4, BlockId.WOOD);
    const worldSnapshot = cloneWorld(world);
    const inventorySnapshot = cloneInventory(inventory);

    const result = resolvePlace(world, originHit, inventory, BlockId.DIRT);

    expect(result).toEqual({ ok: false, world, inventory });
    expect(result.world).toBe(world);
    expect(result.inventory).toBe(inventory);
    expect(world).toEqual(worldSnapshot);
    expect(inventory).toEqual(inventorySnapshot);
  });

  it("returns ok false when inventory lacks the block being placed", () => {
    const world = createWorld();
    const inventory = makeInventory([null]);
    setBlock(world, originHit.target.x, originHit.target.y, originHit.target.z, BlockId.STONE);
    const worldSnapshot = cloneWorld(world);
    const inventorySnapshot = cloneInventory(inventory);

    const result = resolvePlace(world, originHit, inventory, BlockId.DIRT);

    expect(result).toEqual({ ok: false, world, inventory });
    expect(getBlock(world, 1, 2, 4)).toBe(BlockId.AIR);
    expect(world).toEqual(worldSnapshot);
    expect(inventory).toEqual(inventorySnapshot);
  });
});

function makeInventory(slots: Inventory["slots"], selectedHotbarSlot = 0): Inventory {
  return { slots, selectedHotbarSlot };
}

function cloneInventory(inventory: Inventory): Inventory {
  return {
    selectedHotbarSlot: inventory.selectedHotbarSlot,
    slots: inventory.slots.map((slot) => (slot === null ? null : { id: slot.id, count: slot.count }))
  };
}

function cloneHit(hit: Hit): Hit {
  return {
    target: { ...hit.target },
    normal: { ...hit.normal }
  };
}

function cloneDrops(blockDrops: BlockDrops): BlockDrops {
  const clone: Partial<Record<BlockId, BlockDrop>> = {};

  for (const blockId of Object.values(BlockId) as BlockId[]) {
    const drop = blockDrops[blockId];

    if (drop !== undefined) {
      clone[blockId] = { itemId: drop.itemId, count: drop.count };
    }
  }

  return clone;
}

function cloneWorld(world: World): World {
  const clone: World = {};

  for (const [key, chunk] of Object.entries(world)) {
    if (chunk === undefined) {
      continue;
    }

    clone[key as ChunkKey] = {
      size: chunk.size,
      blocks: new Uint8Array(chunk.blocks)
    };
  }

  return clone;
}
