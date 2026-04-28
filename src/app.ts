import * as THREE from "three";

import { applyActionFeedback } from "./app/actionFeedback";
import { createHud, toggleCraftingPanel, updateHud, type HudElements } from "./app/hud";
import {
  createInputController,
  nextFrameIntents,
  type InputController
} from "./app/inputController";
import { getLocalStorage, restoreSavedGame, saveGame } from "./app/persistence";
import { applyPlayerPose, createPlayerCamera } from "./render/camera";
import { createScene } from "./render/scene";
import { createWorldRenderer, type WorldRenderer } from "./render/worldRenderer";
import { BlockId, getBlockDefinition } from "./sim/blocks";
import { resolveCraft } from "./sim/craftAction";
import { createHotbar, type Hotbar } from "./sim/hotbar";
import { addItem, selectHotbarSlot } from "./sim/inventory";
import { createSimulation, type Simulation } from "./sim/simulation";

export interface AppRenderer {
  readonly domElement: HTMLCanvasElement;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  setSize(width: number, height: number, updateStyle?: boolean): void;
}

export interface App {
  readonly element: HTMLElement;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: AppRenderer;
  readonly simulation: Simulation;
  step(dt: number): void;
  dispose(): void;
}

export type RendererFactory = (canvas?: HTMLCanvasElement) => AppRenderer;

export interface CreateAppOptions {
  readonly canvas?: HTMLCanvasElement;
  readonly rendererFactory?: RendererFactory;
}

const CAMERA_EYE_HEIGHT = 1.62;

const createRenderer: RendererFactory = (canvas) =>
  new THREE.WebGLRenderer({
    antialias: true,
    canvas
  });

export function createApp(options: CreateAppOptions = {}): App {
  const element = createAppElement();
  const scene = createScene();
  const camera = createPlayerCamera();
  const renderer = (options.rendererFactory ?? createRenderer)(options.canvas);
  const simulation = createSimulation({ seed: 1337 });
  const storage = getLocalStorage();
  const loaded = restoreSavedGame(simulation, storage);
  const worldRenderer = createWorldRenderer(scene, simulation.world);
  const hotbar = createHotbar(9);
  const hud = createHud(simulation, hotbar);
  const input = createInputController(renderer.domElement, {
    onToggleCrafting: () => toggleCraftingPanel(hud),
    onSave: () => saveGame(simulation, storage, hud.saveStatus)
  });

  renderer.domElement.dataset.testid = "canvas-host";
  renderer.domElement.tabIndex = 0;
  renderer.domElement.style.display = "block";
  element.append(renderer.domElement, hud.root);

  if (loaded) {
    hud.saveStatus.setStatus("loaded", "local save");
    hud.worldStatus.textContent = "Loaded saved world";
  } else {
    seedStarterInventory(simulation);
  }

  hud.craftingPanel.onCraft((recipeId) => {
    const result = resolveCraft(simulation.inventory, recipeId);

    if (result.ok) {
      simulation.inventory = selectHotbarSlot(result.inventory, simulation.selectedHotbarSlot);
      hud.worldStatus.textContent = `Crafted ${getBlockDefinition(result.output.item).name}`;
    } else {
      hud.worldStatus.textContent = "Missing recipe inputs";
    }

    updateHud(hud, simulation, selectedHotbar(hotbar, simulation));
  });

  worldRenderer.sync();
  updateCamera(camera, simulation);
  updateHud(hud, simulation, selectedHotbar(hotbar, simulation));

  return {
    element,
    scene,
    camera,
    renderer,
    simulation,
    step(dt: number): void {
      stepApp(simulation, worldRenderer, hud, hotbar, input, camera, dt);
    },
    dispose(): void {
      input.dispose();
      worldRenderer.dispose();
    }
  };
}

function createAppElement(): HTMLElement {
  const element = document.createElement("div");

  element.style.position = "fixed";
  element.style.inset = "0";
  element.style.overflow = "hidden";
  element.style.background = "#111827";

  return element;
}

function stepApp(
  simulation: Simulation,
  worldRenderer: WorldRenderer,
  hud: HudElements,
  hotbar: Hotbar,
  input: InputController,
  camera: THREE.PerspectiveCamera,
  dt: number
): void {
  const frame = nextFrameIntents(input);
  const beforeInventory = simulation.inventory;

  simulation.step(frame, dt);
  applyActionFeedback(simulation, hud, frame.actions, beforeInventory);
  worldRenderer.sync();
  updateCamera(camera, simulation);
  updateHud(hud, simulation, selectedHotbar(hotbar, simulation));
}

function updateCamera(camera: THREE.PerspectiveCamera, simulation: Simulation): void {
  applyPlayerPose(camera, {
    position: [
      simulation.player.position[0],
      simulation.player.position[1] + CAMERA_EYE_HEIGHT,
      simulation.player.position[2]
    ],
    yaw: simulation.player.yaw,
    pitch: simulation.player.pitch
  });
}

function selectedHotbar(hotbar: Hotbar, simulation: Simulation): Hotbar {
  return {
    ...hotbar,
    selected: simulation.selectedHotbarSlot
  };
}

function seedStarterInventory(simulation: Simulation): void {
  simulation.inventory = addItem(simulation.inventory, BlockId.WOOD, 2).inventory;
  simulation.inventory = addItem(simulation.inventory, BlockId.DIRT, 6).inventory;
  simulation.inventory = selectHotbarSlot(simulation.inventory, 0);
  simulation.selectedHotbarSlot = simulation.inventory.selectedHotbarSlot;
  simulation.player = {
    ...simulation.player,
    selectedHotbarSlot: simulation.selectedHotbarSlot
  };
}
