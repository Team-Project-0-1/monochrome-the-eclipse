import React from 'react';
import { AlertTriangle, HeartPulse, Shield, Swords, Target } from 'lucide-react';
import { getPlayerAbility } from '../../data/dataSkills';
import {
  CombatPrediction,
  DetectedPattern,
  EnemyCharacter,
  EnemyIntent,
  PlayerCharacter,
} from '../../types';
import { faceClass, faceLabel, getIntentPatternLabel, patternLabels } from '../../utils/combatPresentation';

type MobileOutcomeTone = 'empty' | 'safe' | 'trade' | 'danger' | 'lethal';

interface CombatMobileOutcomeSummaryProps {
  player: PlayerCharacter;
  enemy: EnemyCharacter;
  selectedPatterns: DetectedPattern[];
  prediction: CombatPrediction | null;
  intent: EnemyIntent | null;
}

const summarizeSelection = (player: PlayerCharacter, selectedPatterns: DetectedPattern[]) => {
  if (selectedPatterns.length === 0) {
    return {
      label: '족보 대기',
      detail: '선택 필요',
      className: '',
    };
  }

  const firstPattern = selectedPatterns[0];
  const firstAbility = getPlayerAbility(
    player.class,
    player.acquiredSkills,
    firstPattern.type,
    firstPattern.face,
  );

  return {
    label: firstAbility.name,
    detail: `${patternLabels[firstPattern.type]} ${faceLabel(firstPattern.face)}${selectedPatterns.length > 1 ? ` +${selectedPatterns.length - 1}` : ''}`,
    className: faceClass(firstPattern.face),
  };
};

const summarizeIntent = (intent: EnemyIntent | null, enemy: EnemyCharacter) => {
  const patternLabel = getIntentPatternLabel(intent, enemy);

  if (!intent) {
    return {
      label: '대기',
      detail: '예고 없음',
      tone: 'empty' as MobileOutcomeTone,
      icon: <Shield size={15} />,
    };
  }

  if (intent.damage > 0) {
    return {
      label: `반격 ${intent.damage}`,
      detail: patternLabel ?? intent.description,
      tone: intent.dangerLevel === 'high' ? 'danger' as MobileOutcomeTone : 'trade' as MobileOutcomeTone,
      icon: intent.dangerLevel === 'high' ? <AlertTriangle size={15} /> : <Swords size={15} />,
    };
  }

  if (intent.defense > 0) {
    return {
      label: `방어 ${intent.defense}`,
      detail: patternLabel ?? intent.description,
      tone: 'safe' as MobileOutcomeTone,
      icon: <Shield size={15} />,
    };
  }

  return {
    label: intent.description || '대기',
    detail: patternLabel ?? intent.rangeLabel ?? '패턴 없음',
    tone: 'empty' as MobileOutcomeTone,
    icon: <Shield size={15} />,
  };
};

const summarizeOutcome = (
  player: PlayerCharacter,
  enemy: EnemyCharacter,
  selectedPatterns: DetectedPattern[],
  prediction: CombatPrediction | null,
) => {
  if (selectedPatterns.length === 0 || !prediction) {
    return {
      label: '결과 대기',
      detail: '족보를 고르면 계산됩니다',
      tone: 'empty' as MobileOutcomeTone,
    };
  }

  if (prediction.damageToEnemy >= enemy.currentHp) {
    return {
      label: '처치 가능',
      detail: `적 HP ${enemy.currentHp} -> 0`,
      tone: 'lethal' as MobileOutcomeTone,
    };
  }

  if (prediction.damageToPlayer >= player.currentHp) {
    return {
      label: '위험',
      detail: `내 HP ${player.currentHp} -> 0`,
      tone: 'danger' as MobileOutcomeTone,
    };
  }

  if (prediction.damageToPlayer === 0 && prediction.damageToEnemy > 0) {
    return {
      label: '무피해 이득',
      detail: `적에게 ${prediction.damageToEnemy}`,
      tone: 'safe' as MobileOutcomeTone,
    };
  }

  if (prediction.damageToPlayer > prediction.damageToEnemy) {
    return {
      label: '손해 교환',
      detail: `내가 ${prediction.damageToPlayer - prediction.damageToEnemy} 더 받음`,
      tone: 'danger' as MobileOutcomeTone,
    };
  }

  if (prediction.damageToEnemy > prediction.damageToPlayer) {
    return {
      label: '유리 교환',
      detail: `적이 ${prediction.damageToEnemy - prediction.damageToPlayer} 더 받음`,
      tone: 'safe' as MobileOutcomeTone,
    };
  }

  return {
    label: '동등 교환',
    detail: '피해량이 비슷합니다',
    tone: 'trade' as MobileOutcomeTone,
  };
};

export const CombatMobileOutcomeSummary: React.FC<CombatMobileOutcomeSummaryProps> = ({
  player,
  enemy,
  selectedPatterns,
  prediction,
  intent,
}) => {
  const selection = summarizeSelection(player, selectedPatterns);
  const enemyIntent = summarizeIntent(intent, enemy);
  const outcome = summarizeOutcome(player, enemy, selectedPatterns, prediction);
  const damageToEnemy = prediction?.damageToEnemy ?? 0;
  const damageToPlayer = prediction?.damageToPlayer ?? 0;
  const playerHpAfter = prediction ? Math.max(0, player.currentHp - damageToPlayer) : player.currentHp;

  return (
    <section className={`combat-mobile-outcome tone-${outcome.tone} ${selectedPatterns.length > 0 ? 'is-ready' : 'is-empty'}`} aria-label="mobile turn outcome preview">
      <header className="combat-mobile-outcome-head">
        <div>
          <span>턴 예측</span>
          <strong>{outcome.label}</strong>
          <em>{outcome.detail}</em>
        </div>
        <b className={`combat-mobile-threat tone-${enemyIntent.tone}`}>
          {enemyIntent.icon}
          <span>
            <strong>{enemyIntent.label}</strong>
            <small>{enemyIntent.detail}</small>
          </span>
        </b>
      </header>

      {selectedPatterns.length > 0 ? (
        <div className="combat-mobile-outcome-grid">
          <span className={selection.className}>
            <small><Target size={13} />내 선택</small>
            <strong>{selection.label}</strong>
            <em>{selection.detail}</em>
          </span>
          <span>
            <small><Swords size={13} />적에게</small>
            <strong>{damageToEnemy}</strong>
            <em>{enemy.currentHp}{' -> '}{Math.max(0, enemy.currentHp - damageToEnemy)}</em>
          </span>
          <span className={damageToPlayer > 0 ? 'tone-trade' : 'tone-safe'}>
            <small><HeartPulse size={13} />내 HP</small>
            <strong>{player.currentHp}{' -> '}{playerHpAfter}</strong>
            <em>{damageToPlayer > 0 ? `피해 ${damageToPlayer}` : '피해 없음'}</em>
          </span>
        </div>
      ) : null}
    </section>
  );
};
