import { describe, expect, it } from 'vitest';

import { createRng, hashStringToSeed, nextFloat, nextInt, type Rng } from '../../src/sim/random';

function take(rng: Rng, count: number): number[] {
  return Array.from({ length: count }, () => rng.next());
}

describe('random utilities', () => {
  it('produces identical sequences for identical seeds', () => {
    const first = createRng(12345);
    const second = createRng(12345);

    expect(take(first, 50)).toEqual(take(second, 50));
  });

  it('diverges quickly for different seeds', () => {
    const first = take(createRng(12345), 5);
    const second = take(createRng(54321), 5);

    expect(first).not.toEqual(second);
  });

  it('keeps nextInt within [min, max)', () => {
    const rng = createRng(99);
    const minInclusive = -3;
    const maxExclusive = 7;

    for (let index = 0; index < 200; index += 1) {
      const value = nextInt(rng, minInclusive, maxExclusive);

      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(minInclusive);
      expect(value).toBeLessThan(maxExclusive);
    }
  });

  it('keeps nextFloat within [0, 1)', () => {
    const rng = createRng(100);

    for (let index = 0; index < 200; index += 1) {
      const value = nextFloat(rng);

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('hashes strings to stable, distinct fixture seeds', () => {
    const strings = ['', 'world', 'World', 'blockstead', 'seed:42'];
    const seeds = strings.map((value) => hashStringToSeed(value));

    expect(strings.map((value) => hashStringToSeed(value))).toEqual(seeds);
    expect(new Set(seeds).size).toBe(strings.length);
  });

  it('resumes the same sequence after snapshotting and restoring state', () => {
    const rng = createRng(9001);
    take(rng, 3);

    const snapshot = rng.state;
    const expected = take(rng, 5);
    const restored = createRng(0);
    restored.state = snapshot;

    expect(take(restored, 5)).toEqual(expected);
  });
});
