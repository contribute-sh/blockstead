import type { SaveStatusIndicator } from "../hud/saveStatus";
import { selectHotbarSlot } from "../sim/inventory";
import { SAVE_VERSION, type SaveState } from "../sim/save";
import { loadFromStorage, saveToStorage } from "../sim/saveStorage";
import type { Simulation } from "../sim/simulation";

const SAVE_KEY = "blockstead:mvp-save";

export function getLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function restoreSavedGame(simulation: Simulation, storage: Storage | null): boolean {
  if (storage === null) {
    return false;
  }

  const loaded = loadFromStorage(SAVE_KEY, storage);

  if (!loaded.ok) {
    return false;
  }

  const selectedHotbarSlot = Math.trunc(loaded.state.hotbar.selected);

  simulation.inventory = selectHotbarSlot(
    {
      slots: loaded.state.inventory.slots.map((slot) =>
        slot === null ? null : { id: slot.block, count: slot.count }
      ),
      selectedHotbarSlot
    },
    selectedHotbarSlot
  );
  simulation.selectedHotbarSlot = simulation.inventory.selectedHotbarSlot;
  simulation.player = {
    ...simulation.player,
    position: [
      loaded.state.player.position[0],
      loaded.state.player.position[1],
      loaded.state.player.position[2]
    ],
    yaw: loaded.state.player.orientation.yaw,
    pitch: loaded.state.player.orientation.pitch,
    selectedHotbarSlot: simulation.selectedHotbarSlot
  };

  return true;
}

export function saveGame(
  simulation: Simulation,
  storage: Storage | null,
  saveStatus: SaveStatusIndicator
): void {
  if (storage === null) {
    saveStatus.setStatus("error", "localStorage unavailable");
    return;
  }

  saveStatus.setStatus("saving");

  const result = saveToStorage(SAVE_KEY, snapshotGame(simulation), storage);

  if (result.ok) {
    saveStatus.setStatus("saved", "local save");
  } else {
    saveStatus.setStatus("error", "localStorage quota exceeded");
  }
}

function snapshotGame(simulation: Simulation): SaveState {
  return {
    version: SAVE_VERSION,
    seed: simulation.seed,
    mutations: [],
    player: {
      position: [
        simulation.player.position[0],
        simulation.player.position[1],
        simulation.player.position[2]
      ],
      orientation: {
        yaw: simulation.player.yaw,
        pitch: simulation.player.pitch
      }
    },
    inventory: {
      slots: simulation.inventory.slots.map((slot) =>
        slot === null
          ? null
          : {
              block: slot.id,
              count: slot.count
            }
      )
    },
    hotbar: {
      selected: simulation.selectedHotbarSlot
    }
  };
}
