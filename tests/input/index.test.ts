import { describe, expect, it } from "vitest";

import {
  EMPTY_INTENT_FRAME,
  createHotbarKeysAdapter,
  createKeyboardAdapter,
  createMouseAdapter,
  createPointerLock,
  lookIntent,
  mineIntent,
  moveIntent,
  placeIntent,
  saveIntent,
  selectHotbarIntent,
  toggleInventoryIntent,
  type Intent,
  type IntentFrame
} from "../../src/input";

describe("input module", () => {
  it("re-exports adapter factories from the barrel", () => {
    expect(createKeyboardAdapter).toEqual(expect.any(Function));
    expect(createMouseAdapter).toEqual(expect.any(Function));
    expect(createPointerLock).toEqual(expect.any(Function));
    expect(createHotbarKeysAdapter).toEqual(expect.any(Function));
  });

  it("re-exports intent helpers from the barrel", () => {
    const move: Intent = moveIntent(1, 0, -1, true);
    const look: Intent = lookIntent(2, -3);
    const frame: IntentFrame = EMPTY_INTENT_FRAME;

    expect(move).toEqual({ kind: "move", forward: 1, right: 0, up: -1, jump: true });
    expect(look).toEqual({ kind: "look", yawDelta: 2, pitchDelta: -3 });
    expect(mineIntent()).toEqual({ kind: "mine" });
    expect(placeIntent()).toEqual({ kind: "place" });
    expect(selectHotbarIntent(4)).toEqual({ kind: "selectHotbar", slot: 4 });
    expect(toggleInventoryIntent()).toEqual({ kind: "toggleInventory" });
    expect(saveIntent()).toEqual({ kind: "save" });
    expect(frame).toEqual({ move: null, look: null, actions: [] });
  });
});
