import { describe, expect, it } from "vitest";

import {
  createMouseAdapter,
  type MouseAdapterEventSource
} from "../../src/input/mouse";
import {
  lookIntent,
  mineIntent,
  placeIntent,
  type Intent
} from "../../src/input/intents";

class FakeMouseEventSource implements MouseAdapterEventSource {
  private readonly listeners = new Map<string, Set<EventListener>>();

  addEventListener(type: string, listener: EventListener): void {
    const listenersForType = this.listeners.get(type) ?? new Set<EventListener>();
    listenersForType.add(listener);
    this.listeners.set(type, listenersForType);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, event: Event): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

function syntheticMouseEvent(
  type: string,
  init: Partial<Pick<MouseEvent, "button" | "movementX" | "movementY">>
): Event {
  const event = new Event(type);

  if (init.button !== undefined) {
    Object.defineProperty(event, "button", { value: init.button });
  }
  if (init.movementX !== undefined) {
    Object.defineProperty(event, "movementX", { value: init.movementX });
  }
  if (init.movementY !== undefined) {
    Object.defineProperty(event, "movementY", { value: init.movementY });
  }

  return event;
}

describe("mouse input adapter", () => {
  it("emits look intents from movement deltas", () => {
    const source = new FakeMouseEventSource();
    const emitted: Intent[] = [];
    createMouseAdapter(source, (intent) => {
      emitted.push(intent);
    });

    source.emit(
      "mousemove",
      syntheticMouseEvent("mousemove", { movementX: 4, movementY: -3 })
    );

    expect(emitted).toEqual([lookIntent(4, -3)]);
  });

  it("emits mine and place intents from mouse buttons", () => {
    const source = new FakeMouseEventSource();
    const emitted: Intent[] = [];
    createMouseAdapter(source, (intent) => {
      emitted.push(intent);
    });

    source.emit("mousedown", syntheticMouseEvent("mousedown", { button: 0 }));
    source.emit("mouseup", syntheticMouseEvent("mouseup", { button: 2 }));

    expect(emitted).toEqual([mineIntent(), placeIntent()]);
  });

  it("supports pulling queued intents", () => {
    const source = new FakeMouseEventSource();
    const adapter = createMouseAdapter(source);

    source.emit(
      "mousemove",
      syntheticMouseEvent("mousemove", { movementX: -2, movementY: 5 })
    );
    source.emit("mousedown", syntheticMouseEvent("mousedown", { button: 0 }));

    expect(adapter.drain()).toEqual([lookIntent(-2, 5), mineIntent()]);
    expect(adapter.drain()).toEqual([]);
  });

  it("removes listeners when disposed", () => {
    const source = new FakeMouseEventSource();
    const emitted: Intent[] = [];
    const adapter = createMouseAdapter(source, (intent) => {
      emitted.push(intent);
    });

    adapter.dispose();
    source.emit(
      "mousemove",
      syntheticMouseEvent("mousemove", { movementX: 1, movementY: 1 })
    );
    source.emit("mousedown", syntheticMouseEvent("mousedown", { button: 0 }));

    expect(emitted).toEqual([]);
  });
});
