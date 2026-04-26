import { describe, expect, it } from "vitest";

import { createSaveStatus, type SaveStatusState } from "../../src/hud/saveStatus";

const transitions: Array<[SaveStatusState, string]> = [
  ["idle", "Idle"],
  ["saving", "Saving..."],
  ["saved", "Saved"],
  ["error", "Error"]
];

describe("save status HUD", () => {
  it("returns an element with the stable test selector", () => {
    const saveStatus = createSaveStatus();

    expect(saveStatus.element.dataset.testid).toBe("hud-save-status");
  });

  it("starts in the idle state", () => {
    const saveStatus = createSaveStatus();

    expect(saveStatus.element.dataset.state).toBe("idle");
    expect(saveStatus.element.textContent).toBe("Idle");
  });

  it("updates data-state and text across deterministic transitions", () => {
    const saveStatus = createSaveStatus();

    for (const [state, label] of transitions) {
      saveStatus.setStatus(state);

      expect(saveStatus.element.dataset.state).toBe(state);
      expect(saveStatus.element.textContent).toBe(label);
    }
  });

  it("surfaces error details in visible text", () => {
    const saveStatus = createSaveStatus();

    saveStatus.setStatus("error", "localStorage unavailable");

    expect(saveStatus.element.dataset.state).toBe("error");
    expect(saveStatus.element.textContent).toBe("Error: localStorage unavailable");
  });

  it("keeps repeated same-state updates idempotent", () => {
    const saveStatus = createSaveStatus();

    saveStatus.setStatus("saving");
    const firstText = saveStatus.element.textContent;
    const firstState = saveStatus.element.dataset.state;

    saveStatus.setStatus("saving");

    expect(saveStatus.element.dataset.state).toBe(firstState);
    expect(saveStatus.element.textContent).toBe(firstText);
  });
});
