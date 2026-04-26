export const BlockId = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  WOOD: 4,
  PLANKS: 5,
  STICK: 6,
  COAL: 7,
  TORCH: 8,
  COAL_ORE: 9
} as const;

export type BlockId = (typeof BlockId)[keyof typeof BlockId];

export interface BlockDefinition {
  readonly id: BlockId;
  readonly name: string;
  readonly solid: boolean;
  readonly mineable: boolean;
}

export const BLOCK_REGISTRY = {
  [BlockId.AIR]: {
    id: BlockId.AIR,
    name: "Air",
    solid: false,
    mineable: false
  },
  [BlockId.GRASS]: {
    id: BlockId.GRASS,
    name: "Grass",
    solid: true,
    mineable: true
  },
  [BlockId.DIRT]: {
    id: BlockId.DIRT,
    name: "Dirt",
    solid: true,
    mineable: true
  },
  [BlockId.STONE]: {
    id: BlockId.STONE,
    name: "Stone",
    solid: true,
    mineable: true
  },
  [BlockId.WOOD]: {
    id: BlockId.WOOD,
    name: "Wood",
    solid: true,
    mineable: true
  },
  [BlockId.PLANKS]: {
    id: BlockId.PLANKS,
    name: "Planks",
    solid: true,
    mineable: true
  },
  [BlockId.STICK]: {
    id: BlockId.STICK,
    name: "Stick",
    solid: false,
    mineable: false
  },
  [BlockId.COAL]: {
    id: BlockId.COAL,
    name: "Coal",
    solid: true,
    mineable: true
  },
  [BlockId.TORCH]: {
    id: BlockId.TORCH,
    name: "Torch",
    solid: false,
    mineable: true
  },
  [BlockId.COAL_ORE]: {
    id: BlockId.COAL_ORE,
    name: "Coal Ore",
    solid: true,
    mineable: true
  }
} as const satisfies Readonly<Record<BlockId, BlockDefinition>>;

export function getBlockDefinition(id: BlockId): BlockDefinition {
  const definition = BLOCK_REGISTRY[id];

  if (definition === undefined) {
    throw new Error(`Unknown block id: ${id}`);
  }

  return definition;
}
