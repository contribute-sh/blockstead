import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import { createApp, type AppRenderer } from "../src/app";

function createTestRenderer(): AppRenderer {
  return {
    domElement: document.createElement("canvas"),
    render: vi.fn(),
    setSize: vi.fn()
  };
}

describe("createApp", () => {
  it("creates the Three.js bootstrap objects and visible shell", () => {
    const app = createApp({ rendererFactory: createTestRenderer });

    expect(app.scene).toBeInstanceOf(THREE.Scene);
    expect(app.camera).toBeInstanceOf(THREE.PerspectiveCamera);
    expect(Array.from(app.element.children)).toContain(app.renderer.domElement);
    expect(app.renderer.domElement.dataset.testid).toBe("canvas-host");
    expect(app.element.querySelector('[data-testid="hud-root"]')).toBeInstanceOf(
      HTMLElement
    );
  });

  it("renders generated terrain instead of an empty black scene", () => {
    const app = createApp({ rendererFactory: createTestRenderer });
    const terrainMeshes = app.scene.children.filter(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh
    );

    expect(app.scene.background).toBeInstanceOf(THREE.Color);
    expect(terrainMeshes.length).toBeGreaterThan(0);
  });
});
