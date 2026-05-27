import React from 'react';
import {
  CoinFace,
  EnemyCharacter,
  PatternType,
  PlayerCharacter,
  StatusEffectType,
} from '../../../types';
import { statusLabels } from '../../../utils/combatPresentation';

// CombatIntelPanel 4개 view가 공유하는 상수와 헬퍼.
// 한 곳에서 변경하면 4개 view가 동시에 반영된다.

export const patternTypes = [
  PatternType.PAIR,
  PatternType.TRIPLE,
  PatternType.QUAD,
  PatternType.PENTA,
  PatternType.UNIQUE,
  PatternType.AWAKENING,
];

export const patternFaces = [CoinFace.HEADS, CoinFace.TAILS];

export const patternIconPaths: Record<PatternType, string> = {
  [PatternType.PAIR]: 'assets/icons/combat/pattern-pair.png',
  [PatternType.TRIPLE]: 'assets/icons/combat/pattern-triple.png',
  [PatternType.QUAD]: 'assets/icons/combat/pattern-quad.png',
  [PatternType.PENTA]: 'assets/icons/combat/pattern-penta.png',
  [PatternType.UNIQUE]: 'assets/icons/combat/pattern-unique.png',
  [PatternType.AWAKENING]: 'assets/icons/combat/pattern-awakening.png',
};

export const formatCoinIndices = (indices: number[]) => (
  indices.length > 0 ? indices.map(index => `#${index + 1}`).join(' ') : '-'
);

export const getStatusRows = (character: PlayerCharacter | EnemyCharacter) => (
  Object.entries(character.statusEffects)
    .map(([key, value]) => ({ key: key as StatusEffectType, value }))
    .filter((entry): entry is { key: StatusEffectType; value: number } => (
      typeof entry.value === 'number' && entry.value !== 0
    ))
);

export const getEffectiveDefense = (attack: number, damage: number) => Math.max(0, attack - damage);

export const StatusStrip: React.FC<{
  rows: { key: StatusEffectType; value: number }[];
  emptyText: string;
}> = ({ rows, emptyText }) => {
  if (rows.length === 0) {
    return <p className="combat-intel-empty">{emptyText}</p>;
  }

  return (
    <div className="combat-status-intel-strip">
      {rows.map(row => (
        <span key={row.key}>
          <b>{statusLabels[row.key] ?? row.key}</b>
          <em>{row.value}</em>
        </span>
      ))}
    </div>
  );
};
