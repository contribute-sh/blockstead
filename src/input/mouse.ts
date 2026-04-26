import { lookIntent, mineIntent, placeIntent, type Intent } from "./intents";

export interface MouseAdapterEventSource {
  addEventListener(
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions | boolean
  ): void;
  removeEventListener(
    type: string,
    listener: EventListener,
    options?: EventListenerOptions | boolean
  ): void;
}

export type MouseIntentSubscriber = (intent: Intent) => void;

export interface MouseAdapter {
  subscribe(subscriber: MouseIntentSubscriber): () => void;
  drain(): Intent[];
  dispose(): void;
}

type MouseButtonEvent = Partial<Pick<MouseEvent, "button">>;
type MouseMoveEvent = Partial<Pick<MouseEvent, "movementX" | "movementY">>;
type MouseEventName = "mousemove" | "mousedown" | "mouseup";

export function createMouseAdapter(
  source: MouseAdapterEventSource,
  subscriber?: MouseIntentSubscriber
): MouseAdapter {
  const subscribers = new Set<MouseIntentSubscriber>();
  const queue: Intent[] = [];
  let disposed = false;

  if (subscriber !== undefined) {
    subscribers.add(subscriber);
  }

  function emit(intent: Intent): void {
    if (disposed) {
      return;
    }

    queue.push(intent);
    for (const currentSubscriber of subscribers) {
      currentSubscriber(intent);
    }
  }

  const handleMouseMove: EventListener = (event) => {
    const { movementX = 0, movementY = 0 } = event as MouseMoveEvent;
    emit(lookIntent(movementX, movementY));
  };

  const handleButton: EventListener = (event) => {
    const { button } = event as MouseButtonEvent;

    if (button === 0) {
      emit(mineIntent());
    } else if (button === 2) {
      emit(placeIntent());
    }
  };

  const listeners: ReadonlyArray<readonly [MouseEventName, EventListener]> = [
    ["mousemove", handleMouseMove],
    ["mousedown", handleButton],
    ["mouseup", handleButton]
  ];

  for (const [type, listener] of listeners) {
    source.addEventListener(type, listener);
  }

  return {
    subscribe(nextSubscriber: MouseIntentSubscriber): () => void {
      if (disposed) {
        return () => undefined;
      }

      subscribers.add(nextSubscriber);
      return () => {
        subscribers.delete(nextSubscriber);
      };
    },
    drain(): Intent[] {
      return queue.splice(0, queue.length);
    },
    dispose(): void {
      if (disposed) {
        return;
      }

      disposed = true;
      for (const [type, listener] of listeners) {
        source.removeEventListener(type, listener);
      }
      subscribers.clear();
    }
  };
}
