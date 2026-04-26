import { describe, expect, it } from "vitest";

import { createCoordinatesLabel } from "../../src/hud/coordinatesLabel";

describe("coordinates HUD", () => {
  it("returns a div with the stable test selector and default text", () => {
    const coordinatesLabel = createCoordinatesLabel();

    expect(coordinatesLabel.element.tagName).toBe("DIV");
    expect(coordinatesLabel.element.dataset.testid).toBe("hud-coordinates");
    expect(coordinatesLabel.element.textContent).toBe("X: 0 Y: 0 Z: 0");
  });

  it("rounds fractional inputs before writing text", () => {
    const coordinatesLabel = createCoordinatesLabel();

    coordinatesLabel.update({ x: 1.4, y: 2.6, z: -0.5 });

    expect(coordinatesLabel.element.textContent).toBe("X: 1 Y: 3 Z: 0");
  });

  it("reflects only the latest update", () => {
    const coordinatesLabel = createCoordinatesLabel();

    coordinatesLabel.update({ x: 5, y: 6, z: 7 });
    coordinatesLabel.update({ x: -2.2, y: 10.5, z: 99.1 });

    expect(coordinatesLabel.element.textContent).toBe("X: -2 Y: 11 Z: 99");
  });

  it("keeps the same node and selector across repeated updates", () => {
    const coordinatesLabel = createCoordinatesLabel();
    const element = coordinatesLabel.element;

    coordinatesLabel.update({ x: 1, y: 2, z: 3 });
    coordinatesLabel.update({ x: 4, y: 5, z: 6 });

    expect(coordinatesLabel.element).toBe(element);
    expect(coordinatesLabel.element.dataset.testid).toBe("hud-coordinates");
  });
});
