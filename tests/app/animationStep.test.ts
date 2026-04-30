import { afterEach, describe, expect, it, vi } from "vitest";

import { createApp, type App, type AppRenderer } from "../../src/app";
import { getBlockDefinition } from "../../src/sim/blocks";
import type { Vec3 } from "../../src/sim/player";
import { getBlock } from "../../src/sim/world";

const APP_MODULE = "../../src/app";
const MAIN_MODULE = "../../src/main";
const OVERSIZED_DT = 5;
const PLAYER_HALF_WIDTH = 0.3;
const PLAYER_HEIGHT = 1.8;
const PLAYER_ACCELERATION = 12;
const CELL_EPSILON = 0.0001;

class MemoryStorage implements Storage {
  [name: string]: unknown;

  private readonly values = new Map<string, string>();

  public get length(): number {
    return this.values.size;
  }

  public clear(): void {
    this.values.clear();
  }

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  public removeItem(key: string): void {
    this.values.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function createTestRenderer(): AppRenderer {
  return {
    domElement: document.createElement("canvas"),
    render: vi.fn(),
    setSize: vi.fn()
  };
}

function createSubject(): App {
  return createApp({
    rendererFactory: createTestRenderer,
    getLocalStorage: () => new MemoryStorage()
  });
}

function syntheticKeyboardEvent(
  type: "keydown" | "keyup",
  init: { readonly code: string; readonly key: string; readonly repeat?: boolean }
): KeyboardEvent {
  const event = new Event(type, { cancelable: true }) as unknown as KeyboardEvent;
  Object.defineProperty(event, "code", { value: init.code });
  Object.defineProperty(event, "key", { value: init.key });
  Object.defineProperty(event, "repeat", { value: init.repeat ?? false });
  return event;
}

function pressForward(): void {
  window.dispatchEvent(syntheticKeyboardEvent("keydown", { code: "KeyW", key: "w" }));
}

function horizontalDistance(from: Readonly<Vec3>, to: Readonly<Vec3>): number {
  return Math.hypot(to[0] - from[0], to[2] - from[2]);
}

function playerIntersectsSolidBlock(app: App): boolean {
  const position = app.simulation.player.position;
  const minX = Math.floor(position[0] - PLAYER_HALF_WIDTH + CELL_EPSILON);
  const maxX = Math.floor(position[0] + PLAYER_HALF_WIDTH - CELL_EPSILON);
  const minY = Math.floor(position[1] + CELL_EPSILON);
  const maxY = Math.floor(position[1] + PLAYER_HEIGHT - CELL_EPSILON);
  const minZ = Math.floor(position[2] - PLAYER_HALF_WIDTH + CELL_EPSILON);
  const maxZ = Math.floor(position[2] + PLAYER_HALF_WIDTH - CELL_EPSILON);

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        if (getBlockDefinition(getBlock(app.simulation.world, x, y, z)).solid) {
          return true;
        }
      }
    }
  }

  return false;
}

function createFakeMainApp(): {
  readonly camera: { aspect: number; updateProjectionMatrix: ReturnType<typeof vi.fn> };
  readonly element: HTMLElement;
  readonly renderer: {
    readonly domElement: HTMLCanvasElement;
    readonly render: ReturnType<typeof vi.fn>;
    readonly setSize: ReturnType<typeof vi.fn>;
  };
  readonly scene: object;
  readonly step: ReturnType<typeof vi.fn>;
} {
  return {
    camera: {
      aspect: 0,
      updateProjectionMatrix: vi.fn()
    },
    element: document.createElement("div"),
    renderer: {
      domElement: document.createElement("canvas"),
      render: vi.fn(),
      setSize: vi.fn()
    },
    scene: {},
    step: vi.fn()
  };
}

async function importMainWithFakeApp(): Promise<{
  readonly app: ReturnType<typeof createFakeMainApp>;
  readonly main: typeof import("../../src/main");
  readonly requestAnimationFrame: ReturnType<typeof vi.fn>;
  readonly runNextFrame: (frameTime: DOMHighResTimeStamp) => void;
}> {
  const app = createFakeMainApp();
  let nextFrame: FrameRequestCallback | null = null;
  const requestAnimationFrame = vi.fn((callback: FrameRequestCallback): number => {
    nextFrame = callback;
    return 1;
  });

  document.body.replaceChildren(document.createElement("div"));
  document.body.firstElementChild?.setAttribute("id", "app");
  vi.stubGlobal("requestAnimationFrame", requestAnimationFrame);
  vi.spyOn(performance, "now").mockReturnValue(1000);
  vi.doMock(APP_MODULE, () => ({
    createApp: () => app
  }));

  const main = await import(MAIN_MODULE);

  return {
    app,
    main,
    requestAnimationFrame,
    runNextFrame(frameTime) {
      expect(nextFrame).not.toBeNull();
      nextFrame?.(frameTime);
    }
  };
}

describe("animation step", () => {
  const apps: App[] = [];

  afterEach(() => {
    for (const app of apps.splice(0)) {
      app.dispose();
    }

    vi.doUnmock(APP_MODULE);
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it("clamps oversized animation frames before stepping the app", async () => {
    const { app, main, requestAnimationFrame, runNextFrame } = await importMainWithFakeApp();

    runNextFrame(6000);

    expect(app.step).toHaveBeenCalledWith(main.MAX_FRAME_DT);
    expect(app.renderer.render).toHaveBeenCalledWith(app.scene, app.camera);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
    expect(main.clampFrameDt(-1)).toBe(0);
  });

  it("keeps a clamped sustained movement step within the physics frame budget", async () => {
    const { main } = await importMainWithFakeApp();
    const clampedApp = createSubject();
    const oversizedApp = createSubject();
    apps.push(clampedApp, oversizedApp);
    const initialPosition = [...clampedApp.simulation.player.position] as Vec3;

    pressForward();
    clampedApp.step(main.clampFrameDt(OVERSIZED_DT));
    pressForward();
    oversizedApp.step(OVERSIZED_DT);

    const clampedDistance = horizontalDistance(initialPosition, clampedApp.simulation.player.position);
    const oversizedDistance = horizontalDistance(initialPosition, oversizedApp.simulation.player.position);
    const maxClampedDistance = PLAYER_ACCELERATION * main.MAX_FRAME_DT ** 2;

    expect(clampedDistance).toBeGreaterThan(0);
    expect(clampedDistance).toBeLessThanOrEqual(maxClampedDistance + 1e-9);
    expect(oversizedDistance).toBeGreaterThan(clampedDistance);
    expect(clampedApp.simulation.player.position.every(Number.isFinite)).toBe(true);
    expect(playerIntersectsSolidBlock(clampedApp)).toBe(false);
  });
});
