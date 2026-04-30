export interface PointerLockHintState {
  readonly supported: boolean;
  readonly locked: boolean;
}

export interface PointerLockHint {
  element: HTMLElement;
  update(state: PointerLockHintState): void;
}

export function createPointerLockHint(): PointerLockHint {
  const element = document.createElement("div");
  element.dataset.testid = "hud-pointer-lock-hint";

  function update(state: PointerLockHintState): void {
    const stateName = state.supported ? (state.locked ? "locked" : "unlocked") : "unsupported";

    element.dataset.state = stateName;
    element.textContent = stateName === "locked" ? "Pointer locked" : stateName === "unlocked" ? "Click canvas for mouse look" : "Mouse look unavailable";
  }

  update({ supported: true, locked: false });

  return {
    element,
    update
  };
}
