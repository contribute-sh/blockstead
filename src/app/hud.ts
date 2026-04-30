import { createCoordinatesLabel, type CoordinatesLabel } from "../hud/coordinatesLabel";
import { createCraftingPanel, type CraftingPanel } from "../hud/craftingPanel";
import { createHotbarElement, updateHotbarElement } from "../hud/hotbar";
import { createInventoryPanel, type InventoryPanel } from "../hud/inventoryPanel";
import { createPointerLockHint, type PointerLockHint } from "../hud/pointerLockHint";
import { createSaveStatus, type SaveStatusIndicator } from "../hud/saveStatus";
import type { Hotbar } from "../sim/hotbar";
import type { Simulation } from "../sim/simulation";

export interface HudElements {
  readonly root: HTMLElement;
  readonly hotbarElement: HTMLElement;
  readonly coordinatesLabel: CoordinatesLabel;
  readonly inventoryPanel: InventoryPanel;
  readonly craftingPanel: CraftingPanel;
  readonly saveStatus: SaveStatusIndicator;
  readonly worldStatus: HTMLElement;
  readonly pointerLockHint: PointerLockHint;
}

export function createHud(simulation: Simulation, hotbar: Hotbar): HudElements {
  const root = document.createElement("div");
  const coordinatesLabel = createCoordinatesLabel();
  const inventoryPanel = createInventoryPanel();
  const craftingPanel = createCraftingPanel();
  const saveStatus = createSaveStatus();
  const worldStatus = document.createElement("div");
  const pointerLockHint = createPointerLockHint();
  const hotbarElement = createHotbarElement({
    hotbar,
    inventory: simulation.inventory
  });

  root.dataset.testid = "hud-root";
  root.style.position = "absolute";
  root.style.inset = "0";
  root.style.pointerEvents = "none";
  root.style.color = "#f8fafc";
  root.style.font = "14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
  root.style.textShadow = "0 1px 3px rgb(0 0 0 / 0.8)";

  coordinatesLabel.element.style.position = "absolute";
  coordinatesLabel.element.style.left = "16px";
  coordinatesLabel.element.style.top = "16px";

  inventoryPanel.element.dataset.testid = "hud-inventory";
  inventoryPanel.element.style.position = "absolute";
  inventoryPanel.element.style.right = "16px";
  inventoryPanel.element.style.top = "16px";
  inventoryPanel.element.style.minWidth = "140px";
  inventoryPanel.element.style.padding = "10px";
  inventoryPanel.element.style.border = "1px solid rgb(255 255 255 / 0.2)";
  inventoryPanel.element.style.borderRadius = "10px";
  inventoryPanel.element.style.background = "rgb(15 23 42 / 0.78)";

  craftingPanel.element.dataset.testid = "hud-crafting-panel";
  craftingPanel.element.style.position = "absolute";
  craftingPanel.element.style.right = "16px";
  craftingPanel.element.style.top = "130px";
  craftingPanel.element.style.display = "none";
  craftingPanel.element.style.minWidth = "140px";
  craftingPanel.element.style.padding = "10px";
  craftingPanel.element.style.border = "1px solid rgb(250 204 21 / 0.5)";
  craftingPanel.element.style.borderRadius = "10px";
  craftingPanel.element.style.background = "rgb(15 23 42 / 0.88)";
  craftingPanel.element.style.pointerEvents = "auto";

  saveStatus.element.style.position = "absolute";
  saveStatus.element.style.left = "16px";
  saveStatus.element.style.top = "48px";

  worldStatus.dataset.testid = "hud-world-status";
  worldStatus.textContent = "Ready";
  worldStatus.style.position = "absolute";
  worldStatus.style.left = "16px";
  worldStatus.style.top = "80px";

  pointerLockHint.element.style.position = "absolute";
  pointerLockHint.element.style.left = "16px";
  pointerLockHint.element.style.bottom = "24px";

  hotbarElement.style.position = "absolute";
  hotbarElement.style.left = "50%";
  hotbarElement.style.bottom = "24px";
  hotbarElement.style.display = "grid";
  hotbarElement.style.gridTemplateColumns = "repeat(9, 36px)";
  hotbarElement.style.gap = "4px";
  hotbarElement.style.transform = "translateX(-50%)";

  root.append(
    coordinatesLabel.element,
    inventoryPanel.element,
    craftingPanel.element,
    saveStatus.element,
    worldStatus,
    pointerLockHint.element,
    hotbarElement
  );
  updateHud(
    {
      root,
      hotbarElement,
      coordinatesLabel,
      inventoryPanel,
      craftingPanel,
      saveStatus,
      worldStatus,
      pointerLockHint
    },
    simulation,
    hotbar
  );

  return {
    root,
    hotbarElement,
    coordinatesLabel,
    inventoryPanel,
    craftingPanel,
    saveStatus,
    worldStatus,
    pointerLockHint
  };
}

export function updateHud(
  hud: HudElements,
  simulation: Simulation,
  hotbar: Hotbar
): void {
  const [x, y, z] = simulation.player.position;

  hud.coordinatesLabel.update({ x, y, z });
  hud.inventoryPanel.update(simulation.inventory);
  hud.craftingPanel.update(simulation.inventory);
  updateHotbarElement(hud.hotbarElement, {
    hotbar,
    inventory: simulation.inventory
  });

  for (const child of Array.from(hud.hotbarElement.children)) {
    if (child instanceof HTMLElement) {
      styleHotbarSlot(child);
    }
  }
}

export function toggleCraftingPanel(hud: HudElements): void {
  hud.craftingPanel.element.style.display =
    hud.craftingPanel.element.style.display === "none" ? "block" : "none";
}

function styleHotbarSlot(slot: HTMLElement): void {
  slot.style.width = "36px";
  slot.style.height = "36px";
  slot.style.boxSizing = "border-box";
  slot.style.border = slot.dataset.selected === "true" ? "2px solid #facc15" : "1px solid rgb(255 255 255 / 0.45)";
  slot.style.background = "rgb(15 23 42 / 0.72)";
}
