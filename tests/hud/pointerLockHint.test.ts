import { describe, expect, it } from "vitest";

import { createPointerLockHint } from "../../src/hud/pointerLockHint";

describe("pointer lock hint", () => {
  it("creates a stable selector and updates pointer lock states", () => {
    const hint = createPointerLockHint();

    expect(hint.element.dataset.testid).toBe("hud-pointer-lock-hint");
    expect(hint.element.dataset.state).toBe("unlocked");
    expect(hint.element.textContent).toBe("Click canvas for mouse look");

    hint.update({ supported: true, locked: true });

    expect(hint.element.dataset.state).toBe("locked");
    expect(hint.element.textContent).toBe("Pointer locked");

    hint.update({ supported: false, locked: false });

    expect(hint.element.dataset.state).toBe("unsupported");
    expect(hint.element.textContent).toBe("Mouse look unavailable");
  });
});
