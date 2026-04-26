export type IntentAxis = -1 | 0 | 1;

export interface MoveIntent {
  readonly kind: "move";
  readonly forward: IntentAxis;
  readonly right: IntentAxis;
  readonly up: IntentAxis;
  readonly jump: boolean;
}

export interface LookIntent {
  readonly kind: "look";
  readonly yawDelta: number;
  readonly pitchDelta: number;
}

export interface MineIntent {
  readonly kind: "mine";
}

export interface PlaceIntent {
  readonly kind: "place";
}

export interface SelectHotbarIntent {
  readonly kind: "selectHotbar";
  readonly slot: number;
}

export interface ToggleInventoryIntent {
  readonly kind: "toggleInventory";
}

export interface SaveIntent {
  readonly kind: "save";
}

export type ActionIntent =
  | MineIntent
  | PlaceIntent
  | SelectHotbarIntent
  | ToggleInventoryIntent
  | SaveIntent;

export type Intent = MoveIntent | LookIntent | ActionIntent;

export interface IntentFrame {
  readonly move: MoveIntent | null;
  readonly look: LookIntent | null;
  readonly actions: ReadonlyArray<ActionIntent>;
}

const EMPTY_ACTIONS: ReadonlyArray<ActionIntent> = Object.freeze([]);

const MINE_INTENT: MineIntent = Object.freeze({ kind: "mine" });
const PLACE_INTENT: PlaceIntent = Object.freeze({ kind: "place" });
const TOGGLE_INVENTORY_INTENT: ToggleInventoryIntent = Object.freeze({
  kind: "toggleInventory"
});
const SAVE_INTENT: SaveIntent = Object.freeze({ kind: "save" });

export const EMPTY_INTENT_FRAME: IntentFrame = Object.freeze({
  move: null,
  look: null,
  actions: EMPTY_ACTIONS
});

export function moveIntent(
  forward: IntentAxis,
  right: IntentAxis,
  up: IntentAxis,
  jump: boolean
): MoveIntent {
  return Object.freeze({
    kind: "move",
    forward,
    right,
    up,
    jump
  } satisfies MoveIntent);
}

export function lookIntent(yawDelta: number, pitchDelta: number): LookIntent {
  return Object.freeze({
    kind: "look",
    yawDelta,
    pitchDelta
  } satisfies LookIntent);
}

export function mineIntent(): MineIntent {
  return MINE_INTENT;
}

export function placeIntent(): PlaceIntent {
  return PLACE_INTENT;
}

export function selectHotbarIntent(slot: number): SelectHotbarIntent {
  return Object.freeze({
    kind: "selectHotbar",
    slot
  } satisfies SelectHotbarIntent);
}

export function toggleInventoryIntent(): ToggleInventoryIntent {
  return TOGGLE_INVENTORY_INTENT;
}

export function saveIntent(): SaveIntent {
  return SAVE_INTENT;
}
