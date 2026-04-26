import { describe, expect, it } from "vitest";

import {
  createKeyboardAdapter,
  type KeyboardEventLike,
  type KeyboardEventListener,
  type KeyboardEventName,
  type KeyboardEventSource
} from "../../src/input/keyboard";
import { moveIntent, selectHotbarIntent, type Intent } from "../../src/input/intents";

class FakeKeyboardEventSource implements KeyboardEventSource {
  private readonly listeners: Record<KeyboardEventName, KeyboardEventListener[]> = {
    keydown: [],
    keyup: []
  };

  addEventListener(type: KeyboardEventName, listener: KeyboardEventListener): void {
    this.listeners[type].push(listener);
  }

  removeEventListener(type: KeyboardEventName, listener: KeyboardEventListener): void {
    this.listeners[type] = this.listeners[type].filter((candidate) => candidate !== listener);
  }

  dispatch(type: KeyboardEventName, event: KeyboardEventLike): void {
    for (const listener of this.listeners[type]) {
      listener(event);
    }
  }

  listenerCount(type: KeyboardEventName): number {
    return this.listeners[type].length;
  }
}

describe("keyboard adapter", () => {
  it("emits deterministic movement intents from key state changes", () => {
    const source = new FakeKeyboardEventSource();
    const adapter = createKeyboardAdapter(source);
    const emitted: Intent[] = [];

    adapter.subscribe((intent) => {
      emitted.push(intent);
    });

    source.dispatch("keydown", { code: "KeyW" });
    source.dispatch("keydown", { code: "KeyD" });
    source.dispatch("keydown", { code: "KeyS" });
    source.dispatch("keyup", { code: "KeyW" });
    source.dispatch("keyup", { code: "KeyD" });

    expect(emitted).toEqual([
      moveIntent(1, 0, 0, false),
      moveIntent(1, 1, 0, false),
      moveIntent(0, 1, 0, false),
      moveIntent(-1, 1, 0, false),
      moveIntent(-1, 0, 0, false)
    ]);
    expect(adapter.drain()).toEqual(emitted);
  });

  it("emits jump movement and hotbar select intents", () => {
    const source = new FakeKeyboardEventSource();
    const adapter = createKeyboardAdapter(source);

    source.dispatch("keydown", { code: "Space" });
    source.dispatch("keydown", { code: "Digit4" });
    source.dispatch("keyup", { code: "Space" });

    expect(adapter.drain()).toEqual([
      moveIntent(0, 0, 0, true),
      selectHotbarIntent(3),
      moveIntent(0, 0, 0, false)
    ]);
  });

  it("supports custom key bindings", () => {
    const source = new FakeKeyboardEventSource();
    const adapter = createKeyboardAdapter(source, {
      bindings: {
        KeyQ: { kind: "move", direction: "left" },
        Digit0: { kind: "selectHotbar", slot: 8 }
      }
    });

    source.dispatch("keydown", { code: "KeyQ" });
    source.dispatch("keydown", { code: "Digit0" });

    expect(adapter.drain()).toEqual([moveIntent(0, -1, 0, false), selectHotbarIntent(8)]);
  });

  it("removes listeners and stops emissions on dispose", () => {
    const source = new FakeKeyboardEventSource();
    const adapter = createKeyboardAdapter(source);

    expect(source.listenerCount("keydown")).toBe(1);
    expect(source.listenerCount("keyup")).toBe(1);

    adapter.dispose();
    source.dispatch("keydown", { code: "KeyW" });
    source.dispatch("keydown", { code: "Digit1" });

    expect(source.listenerCount("keydown")).toBe(0);
    expect(source.listenerCount("keyup")).toBe(0);
    expect(adapter.drain()).toEqual([]);
  });
});
