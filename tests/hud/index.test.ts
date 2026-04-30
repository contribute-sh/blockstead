import { describe, expect, it } from "vitest";

import {
  createCoordinatesLabel,
  createCraftingPanel,
  createHotbarElement,
  createInventoryPanel,
  createSaveStatus,
  updateHotbarElement
} from "../../src/hud";

describe("hud module", () => {
  it("exposes HUD factories through the barrel", () => {
    expect(createHotbarElement).toBeTypeOf("function");
    expect(updateHotbarElement).toBeTypeOf("function");
    expect(createInventoryPanel).toBeTypeOf("function");
    expect(createCoordinatesLabel).toBeTypeOf("function");
    expect(createSaveStatus).toBeTypeOf("function");
    expect(createCraftingPanel).toBeTypeOf("function");
  });
});
