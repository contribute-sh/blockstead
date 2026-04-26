export interface CoordinatesPosition {
  x: number;
  y: number;
  z: number;
}

export interface CoordinatesLabel {
  element: HTMLElement;
  update: (pos: CoordinatesPosition) => void;
}

function formatCoordinatesText(pos: CoordinatesPosition): string {
  return `X: ${Math.round(pos.x)} Y: ${Math.round(pos.y)} Z: ${Math.round(pos.z)}`;
}

export function createCoordinatesLabel(): CoordinatesLabel {
  const element = document.createElement("div");
  element.dataset.testid = "hud-coordinates";

  function update(pos: CoordinatesPosition): void {
    element.textContent = formatCoordinatesText(pos);
  }

  update({ x: 0, y: 0, z: 0 });

  return {
    element,
    update
  };
}
