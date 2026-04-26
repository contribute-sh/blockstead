export type PointerLockDocumentEventName = "pointerlockchange" | "mousemove";

export interface PointerLockDocument {
  readonly pointerLockElement: unknown;
  addEventListener(type: PointerLockDocumentEventName, listener: EventListener): void;
  removeEventListener(type: PointerLockDocumentEventName, listener: EventListener): void;
}

export interface PointerLockTarget {
  readonly ownerDocument?: PointerLockDocument;
  requestPointerLock(): void | Promise<void>;
  addEventListener(type: "click", listener: EventListener): void;
  removeEventListener(type: "click", listener: EventListener): void;
}

export interface PointerLockLookDeltaEvent {
  readonly type: "look-delta";
  readonly movementX: number;
  readonly movementY: number;
}

export type PointerLockLookDeltaHandler = (
  event: PointerLockLookDeltaEvent
) => void;

export interface PointerLockOptions {
  readonly document?: PointerLockDocument;
  readonly emit?: PointerLockLookDeltaHandler;
}

export interface PointerLockAdapter {
  isLocked(): boolean;
  on(handler: PointerLockLookDeltaHandler): () => void;
  off(handler: PointerLockLookDeltaHandler): void;
  dispose(): void;
}

type MouseMovementEvent = Partial<Pick<MouseEvent, "movementX" | "movementY">>;

function defaultDocument(): PointerLockDocument | undefined {
  return typeof document === "undefined" ? undefined : document;
}

function isPointerLockDocument(
  value: PointerLockOptions | PointerLockDocument
): value is PointerLockDocument {
  return "addEventListener" in value && "removeEventListener" in value;
}

export function createPointerLock(
  target: PointerLockTarget,
  optionsOrDocument: PointerLockOptions | PointerLockDocument = {}
): PointerLockAdapter {
  const options = isPointerLockDocument(optionsOrDocument)
    ? { document: optionsOrDocument }
    : optionsOrDocument;
  const pointerLockDocument =
    options.document ?? target.ownerDocument ?? defaultDocument();

  if (pointerLockDocument === undefined) {
    throw new Error("createPointerLock requires a document");
  }

  const subscribers = new Set<PointerLockLookDeltaHandler>();
  let disposed = false;
  let locked = pointerLockDocument.pointerLockElement === target;

  function emit(event: PointerLockLookDeltaEvent): void {
    if (disposed) {
      return;
    }

    options.emit?.(event);
    for (const subscriber of subscribers) {
      subscriber(event);
    }
  }

  const handleClick: EventListener = () => {
    if (!disposed) {
      void target.requestPointerLock();
    }
  };

  const handlePointerLockChange: EventListener = () => {
    locked = pointerLockDocument.pointerLockElement === target;
  };

  const handleMouseMove: EventListener = (event) => {
    if (!locked) {
      return;
    }

    const { movementX = 0, movementY = 0 } = event as MouseMovementEvent;
    emit({ type: "look-delta", movementX, movementY });
  };

  const targetListeners: ReadonlyArray<readonly ["click", EventListener]> = [
    ["click", handleClick]
  ];
  const documentListeners: ReadonlyArray<
    readonly [PointerLockDocumentEventName, EventListener]
  > = [
    ["pointerlockchange", handlePointerLockChange],
    ["mousemove", handleMouseMove]
  ];

  for (const [type, listener] of targetListeners) {
    target.addEventListener(type, listener);
  }
  for (const [type, listener] of documentListeners) {
    pointerLockDocument.addEventListener(type, listener);
  }

  return {
    isLocked() {
      return locked;
    },
    on(handler) {
      if (disposed) {
        return () => undefined;
      }

      subscribers.add(handler);
      return () => {
        subscribers.delete(handler);
      };
    },
    off(handler) {
      subscribers.delete(handler);
    },
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      for (const [type, listener] of targetListeners) {
        target.removeEventListener(type, listener);
      }
      for (const [type, listener] of documentListeners) {
        pointerLockDocument.removeEventListener(type, listener);
      }
      subscribers.clear();
      locked = false;
    }
  };
}
