import { describe, expect, it } from "vitest";

import {
  createPointerLock,
  type PointerLockDocument,
  type PointerLockDocumentEventName,
  type PointerLockLookDeltaEvent,
  type PointerLockTarget
} from "../../src/input/pointerLock";

interface ListenerRecord {
  readonly source: "target" | "document";
  readonly type: string;
  readonly listener: EventListener;
}

class FakeEventSource {
  readonly added: ListenerRecord[] = [];
  readonly removed: ListenerRecord[] = [];
  private readonly listeners = new Map<string, Set<EventListener>>();

  constructor(private readonly source: ListenerRecord["source"]) {}

  addEventListener(type: string, listener: EventListener): void {
    const listenersForType = this.listeners.get(type) ?? new Set<EventListener>();
    listenersForType.add(listener);
    this.listeners.set(type, listenersForType);
    this.added.push({ source: this.source, type, listener });
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
    this.removed.push({ source: this.source, type, listener });
  }

  dispatch(type: string, event: Event): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

class FakePointerLockTarget
  extends FakeEventSource
  implements PointerLockTarget
{
  requestPointerLockCalls = 0;

  constructor() {
    super("target");
  }

  requestPointerLock(): void {
    this.requestPointerLockCalls += 1;
  }
}

class FakePointerLockDocument
  extends FakeEventSource
  implements PointerLockDocument
{
  pointerLockElement: unknown = null;

  constructor() {
    super("document");
  }

  override addEventListener(
    type: PointerLockDocumentEventName,
    listener: EventListener
  ): void {
    super.addEventListener(type, listener);
  }

  override removeEventListener(
    type: PointerLockDocumentEventName,
    listener: EventListener
  ): void {
    super.removeEventListener(type, listener);
  }
}

function syntheticMouseMove(
  movementX: number,
  movementY: number
): Event {
  const event = new Event("mousemove");
  Object.defineProperty(event, "movementX", { value: movementX });
  Object.defineProperty(event, "movementY", { value: movementY });
  return event;
}

function expectRemovedPairs(added: ListenerRecord[], removed: ListenerRecord[]): void {
  expect(removed).toHaveLength(added.length);

  for (const addedRecord of added) {
    expect(
      removed.some(
        (removedRecord) =>
          removedRecord.source === addedRecord.source &&
          removedRecord.type === addedRecord.type &&
          removedRecord.listener === addedRecord.listener
      )
    ).toBe(true);
  }
}

describe("pointer lock adapter", () => {
  it("requests pointer lock when the target is clicked", () => {
    const target = new FakePointerLockTarget();
    const pointerLockDocument = new FakePointerLockDocument();
    const adapter = createPointerLock(target, { document: pointerLockDocument });

    target.dispatch("click", new Event("click"));

    expect(target.requestPointerLockCalls).toBe(1);

    adapter.dispose();
  });

  it("tracks pointer lock state from document changes", () => {
    const target = new FakePointerLockTarget();
    const pointerLockDocument = new FakePointerLockDocument();
    const adapter = createPointerLock(target, { document: pointerLockDocument });

    expect(adapter.isLocked()).toBe(false);

    pointerLockDocument.pointerLockElement = target;
    pointerLockDocument.dispatch(
      "pointerlockchange",
      new Event("pointerlockchange")
    );
    expect(adapter.isLocked()).toBe(true);

    pointerLockDocument.pointerLockElement = null;
    pointerLockDocument.dispatch(
      "pointerlockchange",
      new Event("pointerlockchange")
    );
    expect(adapter.isLocked()).toBe(false);

    adapter.dispose();
  });

  it("emits look-delta events only while locked", () => {
    const target = new FakePointerLockTarget();
    const pointerLockDocument = new FakePointerLockDocument();
    const adapter = createPointerLock(target, { document: pointerLockDocument });
    const emitted: PointerLockLookDeltaEvent[] = [];

    adapter.on((event) => {
      emitted.push(event);
    });

    pointerLockDocument.dispatch("mousemove", syntheticMouseMove(4, -3));

    pointerLockDocument.pointerLockElement = target;
    pointerLockDocument.dispatch(
      "pointerlockchange",
      new Event("pointerlockchange")
    );
    pointerLockDocument.dispatch("mousemove", syntheticMouseMove(7, 2));

    pointerLockDocument.pointerLockElement = null;
    pointerLockDocument.dispatch(
      "pointerlockchange",
      new Event("pointerlockchange")
    );
    pointerLockDocument.dispatch("mousemove", syntheticMouseMove(1, 1));

    expect(emitted).toEqual([{ type: "look-delta", movementX: 7, movementY: 2 }]);

    adapter.dispose();
  });

  it("removes every listener it added on dispose", () => {
    const target = new FakePointerLockTarget();
    const pointerLockDocument = new FakePointerLockDocument();
    const adapter = createPointerLock(target, { document: pointerLockDocument });
    const added = [...target.added, ...pointerLockDocument.added];

    adapter.dispose();

    expectRemovedPairs(added, [...target.removed, ...pointerLockDocument.removed]);
    expect(target.listenerCount("click")).toBe(0);
    expect(pointerLockDocument.listenerCount("pointerlockchange")).toBe(0);
    expect(pointerLockDocument.listenerCount("mousemove")).toBe(0);
  });
});
