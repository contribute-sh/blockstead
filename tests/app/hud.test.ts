import { beforeEach, describe, expect, it } from "vitest";

import { createHud, toggleCraftingPanel, updateHud } from "../../src/app/hud";
import { BlockId } from "../../src/sim/blocks";
import { createHotbar, selectSlot, type Hotbar } from "../../src/sim/hotbar";
import { addItem } from "../../src/sim/inventory";
import { createSimulation, type Simulation } from "../../src/sim/simulation";

function createFixture(): { readonly simulation: Simulation; readonly hotbar: Hotbar } {
  const simulation = createSimulation({ seed: 20260430 });

  simulation.inventory = addItem(simulation.inventory, BlockId.DIRT, 4).inventory;
  simulation.inventory = addItem(simulation.inventory, BlockId.WOOD, 2).inventory;

  return {
    simulation,
    hotbar: createHotbar(9)
  };
}

function getByTestId(root: ParentNode, testId: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

  if (element === null) {
    throw new Error(`Missing element with test id "${testId}".`);
  }

  return element;
}

function getHotbarSlot(root: ParentNode, index: number): HTMLElement {
  return getByTestId(root, `hud-hotbar-slot-${index}`);
}

describe("app HUD assembly", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("creates a root containing the assembled HUD elements with stable selectors", () => {
    const { simulation, hotbar } = createFixture();
    const hud = createHud(simulation, hotbar);

    document.body.append(hud.root);

    expect(hud.root.dataset.testid).toBe("hud-root");
    expect(document.querySelector('[data-testid="hud-root"]')).toBe(hud.root);
    expect(getByTestId(hud.root, "hud-hotbar")).toBe(hud.hotbarElement);
    expect(getByTestId(hud.root, "hud-coordinates")).toBe(hud.coordinatesLabel.element);
    expect(getByTestId(hud.root, "hud-save-status")).toBe(hud.saveStatus.element);
    expect(getByTestId(hud.root, "hud-inventory")).toBe(hud.inventoryPanel.element);
    expect(getByTestId(hud.root, "hud-crafting-panel")).toBe(hud.craftingPanel.element);
    expect(getByTestId(hud.root, "hud-world-status")).toBe(hud.worldStatus);
    expect(hud.root.style.zIndex).toBe("1");
    expect(hud.root.style.pointerEvents).toBe("none");
    expect(hud.craftingPanel.element.style.pointerEvents).toBe("auto");
  });

  it("updates coordinates and the selected hotbar slot from new state", () => {
    const { simulation, hotbar } = createFixture();
    const hud = createHud(simulation, hotbar);
    const updatedHotbar = selectSlot(hotbar, 3);

    simulation.player = {
      ...simulation.player,
      position: [12.2, 4.6, -7.5]
    };
    updateHud(hud, simulation, updatedHotbar);

    expect(hud.coordinatesLabel.element.textContent).toBe("X: 12 Y: 5 Z: -7");
    expect(getHotbarSlot(hud.root, 0).dataset.selected).toBeUndefined();
    expect(getHotbarSlot(hud.root, 3).dataset.selected).toBe("true");
  });

  it("toggles the crafting panel display and returns to the original state", () => {
    const { simulation, hotbar } = createFixture();
    const hud = createHud(simulation, hotbar);
    const panel = hud.craftingPanel.element;
    const originalDisplay = panel.style.display;

    expect(panel.dataset.testid).toBe("hud-crafting-panel");
    expect(originalDisplay).toBe("none");

    toggleCraftingPanel(hud);
    expect(panel.style.display).toBe("block");

    toggleCraftingPanel(hud);
    expect(panel.style.display).toBe(originalDisplay);
  });

  it("handles an empty inventory and zero-slot hotbar without inventing child rows", () => {
    const simulation = createSimulation({ seed: 20260431 });
    const hotbar: Hotbar = { size: 0, selected: 0 };
    const hud = createHud(simulation, hotbar);

    expect(hud.hotbarElement.children).toHaveLength(0);
    expect(hud.inventoryPanel.element.querySelectorAll("[data-item-id]")).toHaveLength(0);
  });

  it("surfaces inventory rendering errors for unknown block ids", () => {
    const simulation = createSimulation({ seed: 20260432 });
    const hotbar = createHotbar(9);

    simulation.inventory = {
      slots: [{ id: 999 as BlockId, count: 1 }],
      selectedHotbarSlot: 0
    };

    expect(() => createHud(simulation, hotbar)).toThrow("Unknown block id: 999");
  });
});
