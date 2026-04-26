import { BlockId } from "./blocks";

export const MAX_STACK_SIZE = 64;
export const HOTBAR_SLOT_COUNT = 9;
export const SLOT_COUNT = 36;

export interface InventorySlot {
  readonly id: BlockId;
  readonly count: number;
}

export interface Inventory {
  readonly slots: ReadonlyArray<InventorySlot | null>;
  readonly selectedHotbarSlot: number;
}

export interface AddItemResult {
  readonly inventory: Inventory;
  readonly remainder: number;
}

export interface RemoveItemResult {
  readonly inventory: Inventory;
  readonly removed: number;
}

function normalizeCount(count: number): number {
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}

function cloneSlots(slots: ReadonlyArray<InventorySlot | null>): Array<InventorySlot | null> {
  return slots.map((slot) => (slot === null ? null : { id: slot.id, count: slot.count }));
}

function cloneInventory(inventory: Inventory, slots = cloneSlots(inventory.slots)): Inventory {
  return {
    slots,
    selectedHotbarSlot: inventory.selectedHotbarSlot
  };
}

function isValidSlotIndex(inventory: Inventory, index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < inventory.slots.length;
}

function clampHotbarSlot(hotbarIndex: number, slotCount: number): number {
  const maxHotbarSlot = Math.max(0, Math.min(HOTBAR_SLOT_COUNT, slotCount) - 1);

  if (!Number.isFinite(hotbarIndex)) {
    return 0;
  }

  return Math.min(maxHotbarSlot, Math.max(0, Math.trunc(hotbarIndex)));
}

export function createInventory(slotCount = SLOT_COUNT): Inventory {
  const normalizedSlotCount = normalizeCount(slotCount);

  return {
    slots: Array.from({ length: normalizedSlotCount }, () => null),
    selectedHotbarSlot: 0
  };
}

export function addItem(inventory: Inventory, id: BlockId, count: number): AddItemResult {
  const slots = cloneSlots(inventory.slots);
  let remainder = normalizeCount(count);

  for (let index = 0; index < slots.length && remainder > 0; index += 1) {
    const slot = slots[index];

    if (slot === null || slot.id !== id || slot.count >= MAX_STACK_SIZE) {
      continue;
    }

    const added = Math.min(MAX_STACK_SIZE - slot.count, remainder);
    slots[index] = { id, count: slot.count + added };
    remainder -= added;
  }

  for (let index = 0; index < slots.length && remainder > 0; index += 1) {
    if (slots[index] !== null) {
      continue;
    }

    const added = Math.min(MAX_STACK_SIZE, remainder);
    slots[index] = { id, count: added };
    remainder -= added;
  }

  return {
    inventory: cloneInventory(inventory, slots),
    remainder
  };
}

export function removeItem(inventory: Inventory, id: BlockId, count: number): RemoveItemResult {
  const slots = cloneSlots(inventory.slots);
  let remaining = normalizeCount(count);
  let removed = 0;

  for (let index = 0; index < slots.length && remaining > 0; index += 1) {
    const slot = slots[index];

    if (slot === null || slot.id !== id) {
      continue;
    }

    const removedFromSlot = Math.min(slot.count, remaining);
    const nextCount = slot.count - removedFromSlot;
    slots[index] = nextCount > 0 ? { id, count: nextCount } : null;
    removed += removedFromSlot;
    remaining -= removedFromSlot;
  }

  return {
    inventory: cloneInventory(inventory, slots),
    removed
  };
}

export function moveSlot(inventory: Inventory, fromIndex: number, toIndex: number): Inventory {
  const slots = cloneSlots(inventory.slots);

  if (!isValidSlotIndex(inventory, fromIndex) || !isValidSlotIndex(inventory, toIndex) || fromIndex === toIndex) {
    return cloneInventory(inventory, slots);
  }

  const source = slots[fromIndex];
  const target = slots[toIndex];

  if (source !== null && target !== null && source.id === target.id && target.count < MAX_STACK_SIZE) {
    const moved = Math.min(MAX_STACK_SIZE - target.count, source.count);
    slots[toIndex] = { id: target.id, count: target.count + moved };
    slots[fromIndex] = source.count === moved ? null : { id: source.id, count: source.count - moved };
  } else {
    slots[fromIndex] = target;
    slots[toIndex] = source;
  }

  return cloneInventory(inventory, slots);
}

export function selectHotbarSlot(inventory: Inventory, hotbarIndex: number): Inventory {
  return {
    slots: cloneSlots(inventory.slots),
    selectedHotbarSlot: clampHotbarSlot(hotbarIndex, inventory.slots.length)
  };
}
