import { createApp } from "./app";

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
  const dt = (frameTime - lastFrameTime) / 1000;
  lastFrameTime = frameTime;

  app.step(dt);
  app.renderer.render(app.scene, app.camera);

  window.requestAnimationFrame(animate);
}

resize();
window.addEventListener("resize", resize);
window.requestAnimationFrame(animate);
