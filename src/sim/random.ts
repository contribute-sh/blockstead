export interface Rng {
  // State is public and mutable so save data can snapshot and restore sequences.
  state: number;
  next(): number;
  nextFloat(): number;
  nextInt(minInclusive: number, maxExclusive: number): number;
}

const UINT32_RANGE = 0x100000000;
const MULBERRY32_INCREMENT = 0x6d2b79f5;
const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function createRng(seed: number): Rng {
  return {
    state: seed >>> 0,
    next(): number {
      this.state = (this.state + MULBERRY32_INCREMENT) >>> 0;

      let value = this.state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

      return (value ^ (value >>> 14)) >>> 0;
    },
    nextFloat(): number {
      return nextFloat(this);
    },
    nextInt(minInclusive: number, maxExclusive: number): number {
      return nextInt(this, minInclusive, maxExclusive);
    }
  };
}

export function nextFloat(rng: Rng): number {
  return rng.next() / UINT32_RANGE;
}

export function nextInt(rng: Rng, minInclusive: number, maxExclusive: number): number {
  if (!Number.isSafeInteger(minInclusive) || !Number.isSafeInteger(maxExclusive)) {
    throw new RangeError("nextInt bounds must be safe integers");
  }

  if (maxExclusive <= minInclusive) {
    throw new RangeError("nextInt maxExclusive must be greater than minInclusive");
  }

  return minInclusive + Math.floor(nextFloat(rng) * (maxExclusive - minInclusive));
}

export function hashStringToSeed(s: string): number {
  let hash = FNV_OFFSET_BASIS;

  for (let index = 0; index < s.length; index += 1) {
    hash ^= s.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }

  return hash >>> 0;
}
