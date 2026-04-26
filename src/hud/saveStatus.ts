export type SaveStatusState = "idle" | "saving" | "saved" | "error";

export interface SaveStatusIndicator {
  element: HTMLElement;
  setStatus: (state: SaveStatusState, detail?: string) => void;
}

const statusLabels: Record<SaveStatusState, string> = {
  idle: "Idle",
  saving: "Saving...",
  saved: "Saved",
  error: "Error"
};

function formatStatusText(state: SaveStatusState, detail?: string): string {
  const label = statusLabels[state];

  return detail === undefined || detail.length === 0 ? label : `${label}: ${detail}`;
}

export function createSaveStatus(): SaveStatusIndicator {
  const element = document.createElement("div");
  element.dataset.testid = "hud-save-status";

  function setStatus(state: SaveStatusState, detail?: string): void {
    element.dataset.state = state;
    element.textContent = formatStatusText(state, detail);
  }

  setStatus("idle");

  return {
    element,
    setStatus
  };
}
