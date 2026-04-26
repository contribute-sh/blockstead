import { describe, expect, it } from "vitest";

import { BlockId } from "../../src/sim/blocks";
import { createSimulation } from "../../src/sim/simulation";

describe("simulation aggregate", () => {
  it("populates terrain chunks around the spawn", () => {
    const simulation = createSimulation({ seed: 1234 });
    const spawnChunk = simulation.world.getChunk(0, 0, 0);
    const hasNonAirBlock = spawnChunk.blocks.some((blockId) => blockId !== BlockId.AIR);

    expect(hasNonAirBlock).toBe(true);
  });

  it("moves the player forward according to dt and speed", () => {
    const simulation = createSimulation({ seed: 1234 });
    const startX = simulation.player.position.x;

    simulation.step({ move: { forward: 1 } }, 0.25);

    expect(simulation.player.position.x).toBeCloseTo(startX + simulation.player.speed * 0.25);
    expect(simulation.player.position.z).toBeCloseTo(0.5);
  });

  it("mines a targeted solid block into inventory", () => {
    const simulation = createSimulation({ seed: 1234 });
    const target = { x: 3, y: 3, z: 0 };

    simulation.world.setBlock(target.x, target.y, target.z, BlockId.STONE);

    simulation.step({ mine: true }, 0);

    expect(simulation.world.getBlock(target.x, target.y, target.z)).toBe(BlockId.AIR);
    expect(simulation.inventory.getCount(BlockId.STONE)).toBe(1);
  });

  it("places the selected hotbar block into the targeted adjacent air voxel", () => {
    const simulation = createSimulation({ seed: 1234 });
    const hit = { x: 3, y: 3, z: 0 };
    const target = { x: 2, y: 3, z: 0 };
    const slot = simulation.inventory.hotbar[0];

    simulation.world.setBlock(hit.x, hit.y, hit.z, BlockId.STONE);
    simulation.world.setBlock(target.x, target.y, target.z, BlockId.AIR);
    slot.blockId = BlockId.DIRT;
    slot.count = 2;

    simulation.step({ place: true }, 0);

    expect(simulation.world.getBlock(target.x, target.y, target.z)).toBe(BlockId.DIRT);
    expect(slot.count).toBe(1);
  });
});
