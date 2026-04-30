import { beforeEach, describe, expect, it } from "vitest";

import { createHud, toggleCraftingPanel, updateHud } from "../../src/app/hud";
import { BlockId } from "../../src/sim/blocks";
import { createHotbar, selectSlot, type Hotbar } from "../../src/sim/hotbar";
import type { Inventory } from "../../src/sim/inventory";
import { createSimulation, type Simulation } from "../../src/sim/simulation";

function getByTestId(root: ParentNode, testId: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

  if (element === null) {
    throw new Error(`Missing element with data-testid="${testId}".`);
  }

  return element;
}

function getHotbarSlot(root: ParentNode, index: number): HTMLElement {
  return getByTestId(root, `hud-hotbar-slot-${index}`);
}

function createTestSimulation(slots: Inventory["slots"] = createFilledSlots()): Simulation {
  const simulation = createSimulation({ seed: 1234 });

  simulation.inventory = {
    slots,
    selectedHotbarSlot: 0
  };
  simulation.player.position = [4.25, 18.5, -2.25];

  return simulation;
}

function createFilledSlots(): Inventory["slots"] {
  return [
    { id: BlockId.DIRT, count: 8 },
    { id: BlockId.WOOD, count: 1 },
    null,
    { id: BlockId.COAL, count: 2 },
    null,
    null,
    null,
    null,
    null
  ];
}

function createHudFixture(slots?: Inventory["slots"]): { readonly simulation: Simulation; readonly hotbar: Hotbar } {
  return {
    simulation: createTestSimulation(slots),
    hotbar: createHotbar(9)
  };
}

describe("app HUD assembly", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("creates a root element with each HUD sub-element discoverable by stable selectors", () => {
    const { simulation, hotbar } = createHudFixture();
    const hud = createHud(simulation, hotbar);

    document.body.append(hud.root);

    expect(hud.root.dataset.testid).toBe("hud-root");
    expect(getByTestId(document, "hud-root")).toBe(hud.root);
    expect(getByTestId(hud.root, "hud-hotbar")).toBe(hud.hotbarElement);
    expect(getByTestId(hud.root, "hud-inventory")).toBe(hud.inventoryPanel.element);
    expect(getByTestId(hud.root, "hud-coordinates")).toBe(hud.coordinatesLabel.element);
    expect(getByTestId(hud.root, "hud-save-status")).toBe(hud.saveStatus.element);
    expect(getByTestId(hud.root, "hud-crafting-panel")).toBe(hud.craftingPanel.element);
    expect(hud.hotbarElement.children).toHaveLength(9);
  });

  it("updates coordinate text and selected hotbar slot from new state", () => {
    const { simulation, hotbar } = createHudFixture();
    const hud = createHud(simulation, hotbar);
    const nextHotbar = selectSlot(hotbar, 4);

    simulation.player.position = [10.4, 21.6, -30.5];

    updateHud(hud, simulation, nextHotbar);

    expect(hud.coordinatesLabel.element.textContent).toBe("X: 10 Y: 22 Z: -30");
    expect(getHotbarSlot(hud.root, 0).dataset.selected).toBeUndefined();
    expect(getHotbarSlot(hud.root, 4).dataset.selected).toBe("true");
  });

  it("toggles the crafting panel open state and returns to the original state", () => {
    const { simulation, hotbar } = createHudFixture();
    const hud = createHud(simulation, hotbar);
    const panel = getByTestId(hud.root, "hud-crafting-panel");
    const originalDisplay = panel.style.display;

    expect(originalDisplay).toBe("none");

    toggleCraftingPanel(hud);

    expect(panel.style.display).toBe("block");
    expect(getByTestId(hud.root, "hud-crafting-panel")).toBe(panel);

    toggleCraftingPanel(hud);

    expect(panel.style.display).toBe(originalDisplay);
  });

  it("keeps empty inventory and hotbar slots queryable without selected item data", () => {
    const emptySlots = Array.from({ length: 9 }, () => null);
    const { simulation, hotbar } = createHudFixture(emptySlots);
    const hud = createHud(simulation, hotbar);

    expect(hud.inventoryPanel.element.querySelectorAll("[data-item-id]")).toHaveLength(0);
    expect(getHotbarSlot(hud.root, 0).dataset.selected).toBe("true");
    expect(getHotbarSlot(hud.root, 0).dataset.itemId).toBeUndefined();

    updateHud(hud, simulation, selectSlot(hotbar, 8));

    expect(getHotbarSlot(hud.root, 0).dataset.selected).toBeUndefined();
    expect(getHotbarSlot(hud.root, 8).dataset.selected).toBe("true");
    expect(getHotbarSlot(hud.root, 8).dataset.itemId).toBeUndefined();
  });
});
