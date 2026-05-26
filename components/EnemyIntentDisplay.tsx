import React from 'react';
import {
  ChevronsDown,
  ChevronsUp,
  Footprints,
  Gauge,
  Swords,
  TriangleAlert,
} from 'lucide-react';
import { EnemyCharacter, EnemyIntent } from '../types';
import { getIntentPatternLabel } from '../utils/combatPresentation';

interface EnemyIntentDisplayProps {
  enemy?: EnemyCharacter | null;
  intent: EnemyIntent | null;
  variant?: 'strip' | 'panel';
}

const fallbackCategory = (intent: EnemyIntent | null): NonNullable<EnemyIntent['category']> => {
  if (!intent) return 'idle';
  if (intent.category) return intent.category;
  if (intent.damage > 0) return 'attack';
  if (intent.defense > 0) return 'buff';
  return 'idle';
};

const intentConfig = {
  attack: { label: '공격', Icon: Swords },
  buff: { label: '강화', Icon: ChevronsUp },
  debuff: { label: '약화', Icon: ChevronsDown },
  move: { label: '이동', Icon: Footprints },
  idle: { label: '대기', Icon: Gauge },
} as const;

const getActionSummary = (intent: EnemyIntent | null) => {
  if (!intent) return '예고 없음';
  if (intent.damage > 0 && intent.defense > 0) return `피해 ${intent.damage} / 방어 ${intent.defense}`;
  if (intent.damage > 0) return `피해 ${intent.damage}`;
  if (intent.defense > 0) return `방어 ${intent.defense}`;
  return '직접 피해 없음';
};

const EnemyIntentDisplay = ({
  enemy,
  intent,
  variant = 'strip',
}: EnemyIntentDisplayProps): React.JSX.Element => {
  const category = fallbackCategory(intent);
  const { label, Icon } = intentConfig[category];
  const isDanger = intent?.dangerLevel === 'high';
  const patternLabel = getIntentPatternLabel(intent, enemy);
  const rangeLabel = intent?.rangeLabel ?? (category === 'idle' ? '없음' : '플레이어');
  const hitCount = intent?.hitCount ?? (intent?.damage ? 1 : 0);

  return (
    <div className={`enemy-intent-display enemy-intent-display--${variant} intent-${category} ${isDanger ? 'is-danger' : ''}`}>
      <div className="enemy-intent-primary">
        <span className="enemy-intent-icon" aria-hidden="true">
          <Icon size={variant === 'panel' ? 22 : 16} />
        </span>
        <div className="enemy-intent-copy">
          <span className="enemy-intent-label">
            {label}
            {isDanger ? (
              <span className="enemy-intent-danger">
                <TriangleAlert size={12} />
                위험
              </span>
            ) : null}
          </span>
          <strong className="enemy-intent-title">{intent?.description ?? '숨을 고른다'}</strong>
        </div>
      </div>

      <div className="enemy-intent-detail" aria-label="enemy intent details">
        {patternLabel ? <span className="enemy-intent-chip is-pattern">{patternLabel}</span> : null}
        <span className={`enemy-intent-chip is-${category}`}>{getActionSummary(intent)}</span>
        <span className="enemy-intent-chip is-range">범위 {rangeLabel}</span>
        {hitCount > 1 ? <span className="enemy-intent-chip is-count">{hitCount}회</span> : null}
      </div>
    </div>
  );
};

export default EnemyIntentDisplay;
