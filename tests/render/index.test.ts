import { describe, expect, it } from "vitest";

import {
  applyPlayerPose,
  buildChunkMesh,
  createBlockTargetMesh,
  createPlayerCamera,
  createScene,
  createWorldRenderer,
  getBlockFaceUV,
  setBlockTarget
} from "../../src/render";

describe("render module", () => {
  it("re-exports render helpers from the barrel", () => {
    expect(createScene).toEqual(expect.any(Function));
    expect(createPlayerCamera).toEqual(expect.any(Function));
    expect(applyPlayerPose).toEqual(expect.any(Function));
    expect(buildChunkMesh).toEqual(expect.any(Function));
    expect(getBlockFaceUV).toEqual(expect.any(Function));
    expect(createWorldRenderer).toEqual(expect.any(Function));
    expect(createBlockTargetMesh).toEqual(expect.any(Function));
    expect(setBlockTarget).toEqual(expect.any(Function));
  });
});
