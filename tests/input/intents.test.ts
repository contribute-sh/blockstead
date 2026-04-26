import { describe, expect, it } from "vitest";

import {
  EMPTY_INTENT_FRAME,
  lookIntent,
  mineIntent,
  moveIntent,
  placeIntent,
  saveIntent,
  selectHotbarIntent,
  toggleInventoryIntent,
  type Intent
} from "../../src/input/intents";

function describeIntent(intent: Intent): string {
  switch (intent.kind) {
    case "move":
      return `move:${intent.forward},${intent.right},${intent.up},${intent.jump}`;
    case "look":
      return `look:${intent.yawDelta},${intent.pitchDelta}`;
    case "mine":
      return "mine";
    case "place":
      return "place";
    case "selectHotbar":
      return `selectHotbar:${intent.slot}`;
    case "toggleInventory":
      return "toggleInventory";
    case "save":
      return "save";
  }
}

describe("input intents", () => {
  it("constructs movement and look intents", () => {
    expect(moveIntent(1, -1, 0, true)).toEqual({
      kind: "move",
      forward: 1,
      right: -1,
      up: 0,
      jump: true
    });

    expect(lookIntent(0.25, -0.5)).toEqual({
      kind: "look",
      yawDelta: 0.25,
      pitchDelta: -0.5
    });
  });

  it("constructs action intents", () => {
    expect(mineIntent()).toEqual({ kind: "mine" });
    expect(placeIntent()).toEqual({ kind: "place" });
    expect(selectHotbarIntent(4)).toEqual({ kind: "selectHotbar", slot: 4 });
    expect(toggleInventoryIntent()).toEqual({ kind: "toggleInventory" });
    expect(saveIntent()).toEqual({ kind: "save" });
  });

  it("exposes an empty neutral intent frame", () => {
    expect(EMPTY_INTENT_FRAME).toEqual({
      move: null,
      look: null,
      actions: []
    });
  });

  it("narrows intent payloads by kind", () => {
    expect(describeIntent(moveIntent(1, 0, -1, false))).toBe("move:1,0,-1,false");
    expect(describeIntent(lookIntent(Math.PI / 2, -Math.PI / 4))).toBe(
      `look:${Math.PI / 2},${-Math.PI / 4}`
    );
    expect(describeIntent(selectHotbarIntent(7))).toBe("selectHotbar:7");
    expect(describeIntent(saveIntent())).toBe("save");
  });
});
