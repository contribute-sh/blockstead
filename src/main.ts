import { createApp } from "./app";

export const MAX_FRAME_DT = 1 / 30;

export function clampFrameDt(dt: number): number {
  return Number.isFinite(dt) ? Math.min(Math.max(0, dt), MAX_FRAME_DT) : 0;
}

const mount = document.querySelector<HTMLElement>("#app");

if (mount === null) {
  throw new Error("Missing #app mount point");
}

const app = createApp();

mount.appendChild(app.element);

let lastFrameTime = performance.now();

function resize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;

  app.camera.aspect = width / height;
  app.camera.updateProjectionMatrix();
  app.renderer.setSize(width, height);
}

function animate(frameTime: DOMHighResTimeStamp): void {
  const dt = clampFrameDt((frameTime - lastFrameTime) / 1000);
  lastFrameTime = frameTime;

  app.step(dt);
  app.renderer.render(app.scene, app.camera);

  window.requestAnimationFrame(animate);
}

resize();
window.addEventListener("resize", resize);
window.requestAnimationFrame(animate);
