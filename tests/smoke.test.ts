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
  it("creates the Three.js bootstrap objects", () => {
    const app = createApp({ rendererFactory: createTestRenderer });

    expect(app.scene).toBeInstanceOf(THREE.Scene);
    expect(app.camera).toBeInstanceOf(THREE.PerspectiveCamera);
  });
});
