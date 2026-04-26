import { describe, expect, it } from "vitest";

import { createHotbarKeysAdapter } from "../../src/input/hotbarKeys";
import { selectHotbarIntent, type SelectHotbarIntent } from "../../src/input/intents";
import type {
  KeyboardEventLike,
  KeyboardEventListener,
  KeyboardEventName,
  KeyboardEventSource
} from "../../src/input/keyboard";

interface HotbarKeyboardEventLike extends KeyboardEventLike {
  readonly ctrlKey?: boolean;
  readonly shiftKey?: boolean;
  readonly altKey?: boolean;
  readonly metaKey?: boolean;
}

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

  dispatch(type: KeyboardEventName, event: HotbarKeyboardEventLike): void {
    for (const listener of this.listeners[type]) {
      listener(event);
    }
  }

  listenerCount(type: KeyboardEventName): number {
    return this.listeners[type].length;
  }
}

function createSubscribedAdapter(hotbarSize = 9): {
  readonly source: FakeKeyboardEventSource;
  readonly emitted: SelectHotbarIntent[];
} {
  const source = new FakeKeyboardEventSource();
  const adapter = createHotbarKeysAdapter(source, { hotbarSize });
  const emitted: SelectHotbarIntent[] = [];

  adapter.subscribe((intent) => {
    emitted.push(intent);
  });

  return { source, emitted };
}

describe("hotbar keys adapter", () => {
  it("emits Digit1 and Digit5 as zero-indexed hotbar slots", () => {
    const { source, emitted } = createSubscribedAdapter();

    source.dispatch("keydown", { code: "Digit1" });
    source.dispatch("keydown", { code: "Digit5" });

    expect(emitted).toEqual([selectHotbarIntent(0), selectHotbarIntent(4)]);
  });

  it("drops digit slots beyond the configured hotbar size", () => {
    const { source, emitted } = createSubscribedAdapter(4);

    source.dispatch("keydown", { code: "Digit4" });
    source.dispatch("keydown", { code: "Digit5" });

    expect(emitted).toEqual([selectHotbarIntent(3)]);
  });

  it("emits once for repeated keydowns until the matching keyup", () => {
    const { source, emitted } = createSubscribedAdapter();

    source.dispatch("keydown", { code: "Digit2" });
    source.dispatch("keydown", { code: "Digit2" });
    source.dispatch("keydown", { code: "Digit2" });
    source.dispatch("keyup", { code: "Digit2" });
    source.dispatch("keydown", { code: "Digit2" });

    expect(emitted).toEqual([selectHotbarIntent(1), selectHotbarIntent(1)]);
  });

  it("ignores native repeat keydown events", () => {
    const { source, emitted } = createSubscribedAdapter();

    source.dispatch("keydown", { code: "Digit3", repeat: true });

    expect(emitted).toEqual([]);
  });

  it("ignores keydown events with modifiers held", () => {
    const { source, emitted } = createSubscribedAdapter();

    source.dispatch("keydown", { code: "Digit1", ctrlKey: true });
    source.dispatch("keydown", { code: "Digit2", shiftKey: true });
    source.dispatch("keydown", { code: "Digit3", altKey: true });
    source.dispatch("keydown", { code: "Digit4", metaKey: true });

    expect(emitted).toEqual([]);
  });

  it("ignores non-digit keys", () => {
    const { source, emitted } = createSubscribedAdapter();

    source.dispatch("keydown", { code: "Digit0" });
    source.dispatch("keydown", { code: "KeyQ" });
    source.dispatch("keydown", { key: "1" });

    expect(emitted).toEqual([]);
  });

  it("emits intents to multiple subscribers", () => {
    const source = new FakeKeyboardEventSource();
    const adapter = createHotbarKeysAdapter(source, { hotbarSize: 9 });
    const first: SelectHotbarIntent[] = [];
    const second: SelectHotbarIntent[] = [];

    adapter.subscribe((intent) => {
      first.push(intent);
    });
    adapter.subscribe((intent) => {
      second.push(intent);
    });

    source.dispatch("keydown", { code: "Digit9" });

    expect(first).toEqual([selectHotbarIntent(8)]);
    expect(second).toEqual([selectHotbarIntent(8)]);
  });

  it("stops sending intents to unsubscribed listeners", () => {
    const source = new FakeKeyboardEventSource();
    const adapter = createHotbarKeysAdapter(source, { hotbarSize: 9 });
    const emitted: SelectHotbarIntent[] = [];
    const unsubscribe = adapter.subscribe((intent) => {
      emitted.push(intent);
    });

    source.dispatch("keydown", { code: "Digit1" });
    unsubscribe();
    source.dispatch("keydown", { code: "Digit2" });

    expect(emitted).toEqual([selectHotbarIntent(0)]);
  });

  it("removes keydown and keyup listeners on dispose", () => {
    const source = new FakeKeyboardEventSource();
    const adapter = createHotbarKeysAdapter(source, { hotbarSize: 9 });
    const emitted: SelectHotbarIntent[] = [];

    adapter.subscribe((intent) => {
      emitted.push(intent);
    });

    expect(source.listenerCount("keydown")).toBe(1);
    expect(source.listenerCount("keyup")).toBe(1);

    adapter.dispose();
    source.dispatch("keydown", { code: "Digit1" });
    source.dispatch("keyup", { code: "Digit1" });

    expect(source.listenerCount("keydown")).toBe(0);
    expect(source.listenerCount("keyup")).toBe(0);
    expect(emitted).toEqual([]);
  });

  it("rejects non-positive integer hotbar sizes", () => {
    const source = new FakeKeyboardEventSource();

    expect(() => createHotbarKeysAdapter(source, { hotbarSize: 0 })).toThrow(
      "Hotbar size must be a positive integer."
    );
    expect(() => createHotbarKeysAdapter(source, { hotbarSize: 1.5 })).toThrow(
      "Hotbar size must be a positive integer."
    );
  });
});
