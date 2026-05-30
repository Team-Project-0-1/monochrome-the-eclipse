import { describe, it, expect } from 'vitest';
import { getNodePresentation, getNodeTypeCounts } from './nodePresentation';
import { NodeType, CharacterClass, StageNode } from '../types';
import { makePlayer } from '../test/fixtures';

const node = (type: NodeType): StageNode => ({ type, id: `n-${type}` });

describe('getNodePresentation risk/reward mapping', () => {
  it.each([
    [NodeType.REST, 1, 1],
    [NodeType.SHOP, 1, 2],
    [NodeType.COMBAT, 2, 2],
    [NodeType.EVENT, 3, 3],
    [NodeType.MINIBOSS, 4, 4],
    [NodeType.BOSS, 5, 5],
  ])('maps %s to riskLevel %i / rewardLevel %i', (type, risk, reward) => {
    const presentation = getNodePresentation(node(type), 0);
    expect(presentation.riskLevel).toBe(risk);
    expect(presentation.rewardLevel).toBe(reward);
  });

  it('reports UNKNOWN nodes as level 0 with "불명" risk/reward (no "?" literal)', () => {
    const presentation = getNodePresentation(node(NodeType.UNKNOWN), 0);
    expect(presentation.riskLevel).toBe(0);
    expect(presentation.rewardLevel).toBe(0);
    expect(presentation.risk).toBe('불명');
    expect(presentation.reward).toBe('불명');
    expect(presentation.label).toBe('미확인');
  });
});

describe('getNodePresentation route + sense hints', () => {
  it('cycles routeName/routeHint by index % 4', () => {
    const first = getNodePresentation(node(NodeType.COMBAT), 0);
    const fifth = getNodePresentation(node(NodeType.COMBAT), 4);
    expect(first.routeName).toBe('정면 돌파');
    expect(first.routeHint).toBe('빠른 충돌');
    // index 4 wraps back to slot 0.
    expect(fifth.routeName).toBe('정면 돌파');
    expect(fifth.routeHint).toBe('빠른 충돌');

    const second = getNodePresentation(node(NodeType.COMBAT), 1);
    expect(second.routeName).toBe('측면 추적');
    expect(second.routeHint).toBe('보상 탐색');
  });

  it('falls back to the generic sense hint when no player is supplied', () => {
    const presentation = getNodePresentation(node(NodeType.COMBAT), 0, null);
    expect(presentation.senseHint).toBe('감각 동기화: 경로 정보를 더 확인해야 합니다.');
  });

  it('prefixes the class-specific sense hint with the player signature', () => {
    const player = makePlayer({ class: CharacterClass.ROGUE, signature: '추적 감각' });
    const presentation = getNodePresentation(node(NodeType.REST), 0, player);
    expect(presentation.senseHint).toBe('추적 감각: 위협의 잔향이 옅습니다. 다음 추적 전에 숨을 고를 수 있습니다.');
  });

  it('uses the default signature prefix when the player has none', () => {
    const player = makePlayer({ class: CharacterClass.WARRIOR, signature: undefined });
    const presentation = getNodePresentation(node(NodeType.SHOP), 0, player);
    expect(presentation.senseHint.startsWith('감각 동기화: ')).toBe(true);
  });
});

describe('getNodeTypeCounts', () => {
  it('tallies node occurrences by type', () => {
    const counts = getNodeTypeCounts([
      node(NodeType.COMBAT),
      node(NodeType.COMBAT),
      node(NodeType.SHOP),
    ]);
    expect(counts[NodeType.COMBAT]).toBe(2);
    expect(counts[NodeType.SHOP]).toBe(1);
    expect(counts[NodeType.BOSS]).toBeUndefined();
  });

  it('returns an empty object for no nodes', () => {
    expect(getNodeTypeCounts([])).toEqual({});
  });
});
