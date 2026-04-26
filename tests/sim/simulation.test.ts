import { describe, expect, it } from "vitest";

import { BlockId } from "../../src/sim/blocks";
import { addItem } from "../../src/sim/inventory";
import { createSimulation } from "../../src/sim/simulation";
import { getBlock, setBlock } from "../../src/sim/world";

describe("simulation aggregate", () => {
  it("populates terrain chunks around the spawn for a fixed seed", () => {
    const simulation = createSimulation({ seed: 1234 });
    const spawnChunk = simulation.world["0,0,0"];

    expect(spawnChunk).toBeDefined();
    expect(spawnChunk?.blocks.some((block) => block !== BlockId.AIR)).toBe(true);
  });

  it("advances the player in the forward move direction according to dt", () => {
    const simulation = createSimulation({ seed: 222 });
    const start = [...simulation.player.position];

    simulation.step(
      {
        move: { kind: "move", forward: 1, right: 0, up: 0, jump: false },
        look: null,
        actions: []
      },
      0.25
    );

    expect(simulation.player.position[0]).toBeCloseTo(start[0]);
    expect(simulation.player.position[1]).toBeCloseTo(start[1]);
    expect(simulation.player.position[2]).toBeCloseTo(start[2] + 0.75);
  });

  it("mines a targeted solid block and adds it to inventory", () => {
    const simulation = createSimulation({ seed: 333 });
    const target = { x: 0, y: 13, z: 3 };

    simulation.player = { ...simulation.player, position: [0.5, 12, 0.5], yaw: 0, pitch: 0 };
    setBlock(simulation.world, target.x, target.y, target.z, BlockId.STONE);

    simulation.step({ move: null, look: null, actions: [{ kind: "mine" }] }, 0);

    expect(getBlock(simulation.world, target.x, target.y, target.z)).toBe(BlockId.AIR);
    expect(simulation.inventory.slots[0]).toEqual({ id: BlockId.STONE, count: 1 });
  });

  it("places a selected hotbar block into targeted air and consumes one item", () => {
    const simulation = createSimulation({ seed: 444 });
    const support = { x: 0, y: 13, z: 3 };
    const target = { x: 0, y: 13, z: 2 };

    simulation.player = { ...simulation.player, position: [0.5, 12, 0.5], yaw: 0, pitch: 0 };
    simulation.inventory = addItem(simulation.inventory, BlockId.DIRT, 2).inventory;
    setBlock(simulation.world, support.x, support.y, support.z, BlockId.STONE);
    setBlock(simulation.world, target.x, target.y, target.z, BlockId.AIR);

    simulation.step({ move: null, look: null, actions: [{ kind: "place" }] }, 0);

    expect(getBlock(simulation.world, target.x, target.y, target.z)).toBe(BlockId.DIRT);
    expect(simulation.inventory.slots[0]).toEqual({ id: BlockId.DIRT, count: 1 });
  });
});
