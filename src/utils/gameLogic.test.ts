import { describe, it, expect } from 'vitest';
import {
  createSeededRandom,
  detectPatterns,
  generateCoins,
  getConnectedRouteNodeIndices,
  getAvailableRouteNodeIndices,
  isRouteNodeAvailable,
  type RoutePathStep,
} from './gameLogic';
import { CoinFace, PatternType } from '../types';
import { makeCoins, H, T } from '../test/fixtures';

const draw = (rng: () => number, n: number): number[] =>
  Array.from({ length: n }, () => rng());

describe('createSeededRandom', () => {
  it('produces an identical sequence for the same seed', () => {
    const a = draw(createSeededRandom('seed-42'), 10);
    const b = draw(createSeededRandom('seed-42'), 10);
    expect(b).toEqual(a);
  });

  it('produces different sequences for different seeds', () => {
    const a = draw(createSeededRandom('alpha'), 10);
    const b = draw(createSeededRandom('beta'), 10);
    expect(b).not.toEqual(a);
  });

  it('treats numeric and string seeds consistently (same hash input)', () => {
    const a = draw(createSeededRandom(123), 5);
    const b = draw(createSeededRandom('123'), 5);
    expect(b).toEqual(a);
  });

  it('returns values in the [0, 1) range', () => {
    const rng = createSeededRandom('range-check');
    for (const v of draw(rng, 50)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('detectPatterns', () => {
  it('detects a single PAIR from two adjacent matching faces', () => {
    const patterns = detectPatterns(makeCoins([H, H, T, H, T]));
    const pairs = patterns.filter((p) => p.type === PatternType.PAIR);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].face).toBe(CoinFace.HEADS);
    expect(pairs[0].indices).toEqual([0, 1]);
  });

  it('emits overlapping sub-patterns for a triple run (2 PAIR + 1 TRIPLE)', () => {
    // A run of 3 identical faces yields PAIR at [0,1], PAIR at [1,2], TRIPLE at [0,1,2].
    const patterns = detectPatterns(makeCoins([H, H, H, T, T]));
    const types = patterns.map((p) => p.type).sort();
    expect(types).toEqual(
      [PatternType.PAIR, PatternType.PAIR, PatternType.TRIPLE, PatternType.PAIR].sort(),
    );
    expect(patterns.filter((p) => p.type === PatternType.PAIR)).toHaveLength(3);
    expect(patterns.filter((p) => p.type === PatternType.TRIPLE)).toHaveLength(1);
  });

  it('detects a PENTA (plus all nested QUAD/TRIPLE/PAIR) for five identical faces', () => {
    const patterns = detectPatterns(makeCoins([H, H, H, H, H]));
    expect(patterns.filter((p) => p.type === PatternType.PENTA)).toHaveLength(1);
    expect(patterns.filter((p) => p.type === PatternType.QUAD)).toHaveLength(2);
    expect(patterns.filter((p) => p.type === PatternType.TRIPLE)).toHaveLength(3);
    expect(patterns.filter((p) => p.type === PatternType.PAIR)).toHaveLength(4);
    // 5 identical heads is NOT alternating, so no AWAKENING.
    expect(patterns.some((p) => p.type === PatternType.AWAKENING)).toBe(false);
  });

  it('detects a UNIQUE when exactly one face of a kind exists', () => {
    // Four heads + one lone tail -> the single tail is UNIQUE.
    const patterns = detectPatterns(makeCoins([H, H, H, H, T]));
    const uniques = patterns.filter((p) => p.type === PatternType.UNIQUE);
    expect(uniques).toHaveLength(1);
    expect(uniques[0].face).toBe(CoinFace.TAILS);
    expect(uniques[0].indices).toEqual([4]);
  });

  it('detects AWAKENING for a fully alternating 5-coin board', () => {
    const patterns = detectPatterns(makeCoins([H, T, H, T, H]));
    const awakening = patterns.filter((p) => p.type === PatternType.AWAKENING);
    expect(awakening).toHaveLength(1);
    expect(awakening[0].count).toBe(5);
    expect(awakening[0].indices).toEqual([0, 1, 2, 3, 4]);
  });

  it('reports no patterns for an alternating 4-coin board with balanced faces', () => {
    // Length 4 (AWAKENING requires length 5), no adjacent dupes (no PAIR),
    // 2 of each face (no UNIQUE) -> empty.
    const patterns = detectPatterns(makeCoins([H, T, H, T]));
    expect(patterns).toEqual([]);
  });

  it('sorts patterns by descending count (largest pattern first)', () => {
    const patterns = detectPatterns(makeCoins([H, H, H, T, T]));
    const counts = patterns.map((p) => p.count);
    const sortedDesc = [...counts].sort((a, b) => b - a);
    expect(counts).toEqual(sortedDesc);
    expect(patterns[0].type).toBe(PatternType.TRIPLE);
  });
});

describe('getConnectedRouteNodeIndices', () => {
  it('returns the node itself plus both neighbours for a middle node', () => {
    expect(getConnectedRouteNodeIndices(1, 3)).toEqual([0, 1, 2]);
  });

  it('clamps to the left edge', () => {
    expect(getConnectedRouteNodeIndices(0, 3)).toEqual([0, 1]);
  });

  it('clamps to the right edge', () => {
    expect(getConnectedRouteNodeIndices(2, 3)).toEqual([1, 2]);
  });

  it('returns an empty array when there are no nodes', () => {
    expect(getConnectedRouteNodeIndices(0, 0)).toEqual([]);
  });
});

describe('getAvailableRouteNodeIndices', () => {
  it('exposes every node on the opening turn', () => {
    expect(getAvailableRouteNodeIndices(1, [], 3)).toEqual([0, 1, 2]);
  });

  it('restricts to nodes connected to the previous turn step', () => {
    const path: RoutePathStep[] = [{ turn: 1, nodeIndex: 0, nodeId: '1-0' }];
    // Came from node 0 on turn 1 -> turn 2 may reach nodes adjacent to 0.
    expect(getAvailableRouteNodeIndices(2, path, 3)).toEqual([0, 1]);
  });

  it('uses the step matching the immediately previous turn', () => {
    const path: RoutePathStep[] = [
      { turn: 1, nodeIndex: 0, nodeId: '1-0' },
      { turn: 2, nodeIndex: 2, nodeId: '2-2' },
    ];
    // Previous turn (2) ended on node 2 -> turn 3 reaches nodes 1 and 2.
    expect(getAvailableRouteNodeIndices(3, path, 3)).toEqual([1, 2]);
  });
});

describe('isRouteNodeAvailable', () => {
  const path: RoutePathStep[] = [{ turn: 1, nodeIndex: 0, nodeId: '1-0' }];

  it('is true for a connected node', () => {
    expect(isRouteNodeAvailable(2, 1, path, 3)).toBe(true);
  });

  it('is false for an unreachable node', () => {
    expect(isRouteNodeAvailable(2, 2, path, 3)).toBe(false);
  });
});

describe('generateCoins', () => {
  it('returns exactly the requested number of coins', () => {
    expect(generateCoins(5)).toHaveLength(5);
    expect(generateCoins(3)).toHaveLength(3);
  });

  it('produces coins that are unlocked and carry a valid CoinFace', () => {
    for (const coin of generateCoins(20)) {
      expect(coin.locked).toBe(false);
      expect([CoinFace.HEADS, CoinFace.TAILS]).toContain(coin.face);
    }
  });
});
