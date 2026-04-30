import { beforeEach, describe, expect, it } from "vitest";

import { createHud, toggleCraftingPanel, updateHud } from "../../src/app/hud";
import { BlockId } from "../../src/sim/blocks";
import { createHotbar, selectSlot, type Hotbar } from "../../src/sim/hotbar";
import { createInventory, type Inventory } from "../../src/sim/inventory";
import { createSimulation, type Simulation } from "../../src/sim/simulation";

function makeSimulation(slots: Inventory["slots"]): Simulation {
  const simulation = createSimulation({ seed: 1337 });

  simulation.inventory = {
    slots,
    selectedHotbarSlot: 0
  };

  return simulation;
}

function makeHud(slots: Inventory["slots"], hotbar: Hotbar = createHotbar(9)) {
  const simulation = makeSimulation(slots);

  return {
    hotbar,
    hud: createHud(simulation, hotbar),
    simulation
  };
}

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

describe("app HUD", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("assembles the root HUD with stable child selectors", () => {
    const { hud } = makeHud([
      { id: BlockId.DIRT, count: 8 },
      null,
      { id: BlockId.WOOD, count: 2 }
    ]);

    document.body.append(hud.root);

    expect(hud.root.dataset.testid).toBe("hud-root");
    expect(Array.from(hud.root.children)).toEqual(
      expect.arrayContaining([
        hud.hotbarElement,
        hud.coordinatesLabel.element,
        hud.inventoryPanel.element,
        hud.craftingPanel.element,
        hud.saveStatus.element,
        hud.worldStatus
      ])
    );
    expect(getByTestId(document, "hud-root")).toBe(hud.root);
    expect(getByTestId(hud.root, "hud-hotbar")).toBe(hud.hotbarElement);
    expect(getByTestId(hud.root, "hud-coordinates")).toBe(hud.coordinatesLabel.element);
    expect(getByTestId(hud.root, "hud-inventory")).toBe(hud.inventoryPanel.element);
    expect(getByTestId(hud.root, "hud-save-status")).toBe(hud.saveStatus.element);
    expect(getByTestId(hud.root, "hud-crafting-panel")).toBe(hud.craftingPanel.element);
  });

  it("updates coordinate text and selected hotbar slot markers", () => {
    const fixture = makeHud([
      { id: BlockId.DIRT, count: 8 },
      null,
      { id: BlockId.WOOD, count: 2 }
    ]);

    expect(getHotbarSlot(fixture.hud.root, 0).dataset.selected).toBe("true");

    fixture.simulation.player.position = [12.4, 65.5, -3.6];
    fixture.hotbar = selectSlot(fixture.hotbar, 4);

    updateHud(fixture.hud, fixture.simulation, fixture.hotbar);

    expect(fixture.hud.coordinatesLabel.element.textContent).toBe("X: 12 Y: 66 Z: -4");
    expect(getHotbarSlot(fixture.hud.root, 0).dataset.selected).toBeUndefined();
    expect(getHotbarSlot(fixture.hud.root, 4).dataset.selected).toBe("true");
  });

  it("toggles the crafting panel visibility and returns to the original state", () => {
    const { hud } = makeHud([{ id: BlockId.WOOD, count: 1 }]);
    const craftingPanel = getByTestId(hud.root, "hud-crafting-panel");
    const initialDisplay = craftingPanel.style.display;

    expect(initialDisplay).toBe("none");

    toggleCraftingPanel(hud);

    expect(craftingPanel.style.display).toBe("block");

    toggleCraftingPanel(hud);

    expect(craftingPanel.style.display).toBe(initialDisplay);
  });

  it("keeps HUD widgets mounted for an empty inventory", () => {
    const emptyInventory = createInventory(0);
    const { hud } = makeHud(emptyInventory.slots);
    const hotbar = getByTestId(hud.root, "hud-hotbar");
    const inventory = getByTestId(hud.root, "hud-inventory");
    const craftingPanel = getByTestId(hud.root, "hud-crafting-panel");
    const recipeRows = Array.from(craftingPanel.querySelectorAll<HTMLElement>("[data-recipe-id]"));

    expect(hotbar.children).toHaveLength(9);
    expect(Array.from(hotbar.children, (slot) => (slot as HTMLElement).dataset.itemId)).toEqual(
      Array.from({ length: 9 }, () => undefined)
    );
    expect(inventory.querySelectorAll("[data-item-id]")).toHaveLength(0);
    expect(recipeRows.map((row) => row.dataset.craftable)).toEqual(["false", "false", "false"]);
  });
});
