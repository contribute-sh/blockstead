import * as THREE from "three";

export interface AppRenderer {
  readonly domElement: HTMLCanvasElement;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  setSize(width: number, height: number, updateStyle?: boolean): void;
}

export interface App {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: AppRenderer;
  step(dt: number): void;
}

export type RendererFactory = (canvas?: HTMLCanvasElement) => AppRenderer;

export interface CreateAppOptions {
  readonly canvas?: HTMLCanvasElement;
  readonly rendererFactory?: RendererFactory;
}

const createRenderer: RendererFactory = (canvas) =>
  new THREE.WebGLRenderer({
    antialias: true,
    canvas
  });

export function createApp(options: CreateAppOptions = {}): App {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1000);
  const renderer = (options.rendererFactory ?? createRenderer)(options.canvas);

  camera.position.set(0, 1.6, 5);

  return {
    scene,
    camera,
    renderer,
    step(dt: number): void {
      void dt;
    }
  };
}
