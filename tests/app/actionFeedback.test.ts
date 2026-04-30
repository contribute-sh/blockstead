import { describe, expect, it } from "vitest";

import { applyActionFeedback } from "../../src/app/actionFeedback";
import { mineIntent, placeIntent } from "../../src/input/intents";
import { BlockId } from "../../src/sim/blocks";
import { addItem, type Inventory } from "../../src/sim/inventory";
import { createSimulation } from "../../src/sim/simulation";
import { setBlock } from "../../src/sim/world";
import type { HudElements } from "../../src/app/hud";

function createHud(textContent = "Ready"): HudElements {
  return {
    worldStatus: { textContent }
  } as unknown as HudElements;
}

function cloneInventory(inventory: Inventory): Inventory {
  return {
    slots: inventory.slots.map((slot) =>
      slot === null ? null : { id: slot.id, count: slot.count }
    ),
    selectedHotbarSlot: inventory.selectedHotbarSlot
  };
}

describe("applyActionFeedback", () => {
  it("reports a mined block when a mine action increases total inventory items", () => {
    const simulation = createSimulation({ seed: 333 });
    const hud = createHud();
    const actions = [mineIntent()];
    const target = { x: 0, y: 13, z: 3 };

    simulation.player = { ...simulation.player, position: [0.5, 12, 0.5], yaw: 0, pitch: 0 };
    setBlock(simulation.world, target.x, target.y, target.z, BlockId.STONE);
    const beforeInventory = cloneInventory(simulation.inventory);

    simulation.step({ move: null, look: null, actions }, 0);
    applyActionFeedback(simulation, hud, actions, beforeInventory);

    expect(hud.worldStatus.textContent).toBe("Mined block");
  });

  it("reports no mineable block when a mine action does not increase total inventory items", () => {
    const simulation = createSimulation({ seed: 334 });
    const hud = createHud();
    const beforeInventory = cloneInventory(simulation.inventory);

    applyActionFeedback(simulation, hud, [mineIntent()], beforeInventory);

    expect(hud.worldStatus.textContent).toBe("No mineable block in reach");
  });

  it("reports a placed block when a place action decreases the selected hotbar slot count", () => {
    const simulation = createSimulation({ seed: 444 });
    const hud = createHud();
    const actions = [placeIntent()];
    const support = { x: 0, y: 13, z: 3 };
    const target = { x: 0, y: 13, z: 2 };

    simulation.player = { ...simulation.player, position: [0.5, 12, 0.5], yaw: 0, pitch: 0 };
    simulation.inventory = addItem(simulation.inventory, BlockId.DIRT, 2).inventory;
    setBlock(simulation.world, support.x, support.y, support.z, BlockId.STONE);
    setBlock(simulation.world, target.x, target.y, target.z, BlockId.AIR);
    const beforeInventory = cloneInventory(simulation.inventory);

    simulation.step({ move: null, look: null, actions }, 0);
    applyActionFeedback(simulation, hud, actions, beforeInventory);

    expect(hud.worldStatus.textContent).toBe("Placed block");
  });

  it("reports a failed placement when a place action does not decrease the selected hotbar slot count", () => {
    const simulation = createSimulation({ seed: 445 });
    const hud = createHud();

    simulation.inventory = addItem(simulation.inventory, BlockId.DIRT, 2).inventory;
    const beforeInventory = cloneInventory(simulation.inventory);

    applyActionFeedback(simulation, hud, [placeIntent()], beforeInventory);

    expect(hud.worldStatus.textContent).toBe("Cannot place block");
  });

  it("leaves the world status unchanged when there are no actions", () => {
    const simulation = createSimulation({ seed: 446 });
    const hud = createHud("Already set");
    const beforeInventory = cloneInventory(simulation.inventory);

    applyActionFeedback(simulation, hud, [], beforeInventory);

    expect(hud.worldStatus.textContent).toBe("Already set");
  });
});
