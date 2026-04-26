import { beforeEach, describe, expect, it } from "vitest";

import { createInventoryPanel } from "../../src/hud/inventoryPanel";
import { BlockId } from "../../src/sim/blocks";
import type { Inventory } from "../../src/sim/inventory";

function makeInventory(slots: Inventory["slots"]): Inventory {
  return {
    slots,
    selectedHotbarSlot: 0
  };
}

function readRenderedItems(): Array<{ id: string; count: string }> {
  const root = document.querySelector<HTMLElement>('[data-testid="inventory-panel"]');

  if (root === null) {
    throw new Error("Inventory panel was not rendered");
  }

  return Array.from(root.querySelectorAll<HTMLElement>("[data-item-id]"), (row) => ({
    id: row.dataset.itemId ?? "",
    count: row.dataset.itemCount ?? ""
  }));
}

describe("inventory panel", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("renders an initial snapshot with stacked items", () => {
    const panel = createInventoryPanel();
    document.body.append(panel.element);

    panel.update(
      makeInventory([
        { id: BlockId.DIRT, count: 12 },
        null,
        { id: BlockId.STONE, count: 64 },
        { id: BlockId.WOOD, count: 3 }
      ])
    );

    expect(readRenderedItems()).toEqual([
      { id: String(BlockId.DIRT), count: "12" },
      { id: String(BlockId.STONE), count: "64" },
      { id: String(BlockId.WOOD), count: "3" }
    ]);
  });

  it("updates rows when items are added, removed, or count-changed", () => {
    const panel = createInventoryPanel();
    document.body.append(panel.element);

    panel.update(
      makeInventory([
        { id: BlockId.DIRT, count: 12 },
        { id: BlockId.STONE, count: 64 },
        { id: BlockId.WOOD, count: 3 }
      ])
    );

    panel.update(
      makeInventory([
        { id: BlockId.DIRT, count: 9 },
        null,
        { id: BlockId.TORCH, count: 5 }
      ])
    );

    expect(readRenderedItems()).toEqual([
      { id: String(BlockId.DIRT), count: "9" },
      { id: String(BlockId.TORCH), count: "5" }
    ]);
  });

  it("does not render item rows for empty slots", () => {
    const panel = createInventoryPanel();
    document.body.append(panel.element);

    panel.update(makeInventory([null, null, { id: BlockId.COAL, count: 2 }, null]));

    expect(readRenderedItems()).toEqual([{ id: String(BlockId.COAL), count: "2" }]);
  });
});
