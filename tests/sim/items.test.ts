import { describe, expect, it } from "vitest";

import { BlockId, getBlockDefinition } from "../../src/sim/blocks";
import { ITEM_REGISTRY, ItemId, getItemDefinition, type ItemDef } from "../../src/sim/items";

describe("item registry", () => {
  it("has a registry entry for every item id", () => {
    const itemIds = Object.values(ItemId);

    expect(Object.keys(ITEM_REGISTRY)).toHaveLength(itemIds.length);

    for (const id of itemIds) {
      expect(ITEM_REGISTRY[id]?.id).toBe(id);
    }
  });

  it("keeps item ids disjoint from block ids", () => {
    const blockIds = new Set<number>(Object.values(BlockId));

    for (const id of Object.values(ItemId)) {
      expect(blockIds.has(id)).toBe(false);
    }
  });

  it("only references valid placeable block ids", () => {
    const items: ReadonlyArray<ItemDef> = Object.values(ITEM_REGISTRY);

    for (const item of items) {
      if (item.placesBlockId !== undefined) {
        expect(getBlockDefinition(item.placesBlockId).id).toBe(item.placesBlockId);
      }
    }
  });

  it("gets item definitions by id", () => {
    expect(getItemDefinition(ItemId.WOOD_LOG)).toBe(ITEM_REGISTRY[ItemId.WOOD_LOG]);
  });

  it("throws for unknown numeric ids", () => {
    expect(() => getItemDefinition(999 as ItemId)).toThrow("Unknown item id: 999");
  });

  it("defines positive integer stack sizes", () => {
    for (const item of Object.values(ITEM_REGISTRY)) {
      expect(Number.isInteger(item.stackSize)).toBe(true);
      expect(item.stackSize).toBeGreaterThan(0);
    }
  });
});
