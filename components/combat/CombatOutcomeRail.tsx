import React from 'react';
import { AlertTriangle, ArrowRight, HeartPulse, Shield, Swords, Target } from 'lucide-react';
import { CombatPrediction, DetectedPattern, EnemyCharacter, EnemyIntent, PlayerCharacter } from '../../types';
import {
  faceClass,
  faceLabel,
  getIntentPatternLabel,
  patternLabels,
} from '../../utils/combatPresentation';
import { getPlayerAbility } from '../../data/dataSkills';

interface CombatOutcomeRailProps {
  player: PlayerCharacter;
  enemy: EnemyCharacter;
  selectedPatterns: DetectedPattern[];
  prediction: CombatPrediction | null;
  intent: EnemyIntent | null;
}

type OutcomeTone = 'empty' | 'safe' | 'trade' | 'danger' | 'lethal';

const summarizeSelection = (player: PlayerCharacter, selectedPatterns: DetectedPattern[]) => {
  if (selectedPatterns.length === 0) {
    return {
      label: '선택 대기',
      detail: '밝은 족보 1개를 고르세요',
      tone: 'empty' as OutcomeTone,
      faceClassName: '',
    };
  }

  const firstPattern = selectedPatterns[0];
  const firstAbility = getPlayerAbility(
    player.class,
    player.acquiredSkills,
    firstPattern.type,
    firstPattern.face,
  );
  const extraCount = selectedPatterns.length - 1;

  return {
    label: firstAbility.name,
    detail: extraCount > 0
      ? `${patternLabels[firstPattern.type]} ${faceLabel(firstPattern.face)} 외 ${extraCount}`
      : `${patternLabels[firstPattern.type]} ${faceLabel(firstPattern.face)}`,
    tone: 'safe' as OutcomeTone,
    faceClassName: faceClass(firstPattern.face),
  };
};

const summarizeIntent = (intent: EnemyIntent | null, enemy: EnemyCharacter) => {
  const patternLabel = getIntentPatternLabel(intent, enemy);

  if (!intent) {
    return {
      label: '행동 대기',
      detail: '예고 없음',
      tone: 'empty' as OutcomeTone,
    };
  }

  if (intent.damage > 0) {
    return {
      label: `반격 ${intent.damage}`,
      detail: patternLabel ?? intent.description,
      tone: intent.dangerLevel === 'high' ? 'danger' as OutcomeTone : 'trade' as OutcomeTone,
    };
  }

  if (intent.defense > 0) {
    return {
      label: `방어 ${intent.defense}`,
      detail: patternLabel ?? intent.description,
      tone: 'safe' as OutcomeTone,
    };
  }

  return {
    label: intent.description || '대기',
    detail: patternLabel ?? intent.rangeLabel ?? '위협 낮음',
    tone: 'empty' as OutcomeTone,
  };
};

const getOutcomeSummary = (
  player: PlayerCharacter,
  enemy: EnemyCharacter,
  selectedPatterns: DetectedPattern[],
  prediction: CombatPrediction | null,
): { label: string; detail: string; tone: OutcomeTone } => {
  if (selectedPatterns.length === 0 || !prediction) {
    return {
      label: '결과 미정',
      detail: '족보 선택 후 교전 결과가 계산됩니다',
      tone: 'empty',
    };
  }

  if (prediction.damageToEnemy >= enemy.currentHp) {
    return {
      label: '처치 가능',
      detail: `적 HP ${enemy.currentHp} -> 0`,
      tone: 'lethal',
    };
  }

  if (prediction.damageToPlayer >= player.currentHp) {
    return {
      label: '사망 위험',
      detail: `내 HP ${player.currentHp} -> 0`,
      tone: 'danger',
    };
  }

  if (prediction.damageToPlayer === 0 && prediction.damageToEnemy > 0) {
    return {
      label: '무피해 이득',
      detail: `적에게 ${prediction.damageToEnemy}`,
      tone: 'safe',
    };
  }

  if (prediction.damageToPlayer > prediction.damageToEnemy) {
    return {
      label: '손해 교환',
      detail: `내가 ${prediction.damageToPlayer - prediction.damageToEnemy} 더 받음`,
      tone: 'danger',
    };
  }

  if (prediction.damageToEnemy > prediction.damageToPlayer) {
    return {
      label: '유리 교환',
      detail: `적이 ${prediction.damageToEnemy - prediction.damageToPlayer} 더 받음`,
      tone: 'safe',
    };
  }

  return {
    label: '동등 교환',
    detail: '피해량이 비슷합니다',
    tone: 'trade',
  };
};

const OutcomeNode: React.FC<{
  icon: React.ReactNode;
  kicker: string;
  label: string;
  detail: string;
  tone: OutcomeTone;
  className?: string;
}> = ({ icon, kicker, label, detail, tone, className = '' }) => (
  <article className={`combat-outcome-node tone-${tone} ${className}`}>
    <span className="combat-outcome-node-icon" aria-hidden="true">{icon}</span>
    <span className="combat-outcome-node-copy">
      <small>{kicker}</small>
      <strong>{label}</strong>
      <em>{detail}</em>
    </span>
  </article>
);

export const CombatOutcomeRail: React.FC<CombatOutcomeRailProps> = ({
  player,
  enemy,
  selectedPatterns,
  prediction,
  intent,
}) => {
  const selection = summarizeSelection(player, selectedPatterns);
  const enemyIntent = summarizeIntent(intent, enemy);
  const outcome = getOutcomeSummary(player, enemy, selectedPatterns, prediction);
  const damageToEnemy = prediction?.damageToEnemy ?? 0;
  const damageToPlayer = prediction?.damageToPlayer ?? 0;
  const playerHpAfter = prediction ? Math.max(0, player.currentHp - damageToPlayer) : player.currentHp;
  const enemyHpAfter = prediction ? Math.max(0, enemy.currentHp - damageToEnemy) : enemy.currentHp;

  return (
    <section className={`combat-outcome-rail tone-${outcome.tone} ${selectedPatterns.length > 0 ? 'is-ready' : 'is-empty'}`} aria-label="turn outcome preview">
      <header className="combat-outcome-head">
        <div>
          <span>턴 예측</span>
          <strong>{outcome.label}</strong>
        </div>
        <p>{outcome.detail}</p>
      </header>

      <div className="combat-outcome-track">
        <OutcomeNode
          icon={<Target size={18} />}
          kicker="내 선택"
          label={selection.label}
          detail={selection.detail}
          tone={selection.tone}
          className={selection.faceClassName}
        />
        <ArrowRight className="combat-outcome-arrow" size={18} aria-hidden="true" />
        <OutcomeNode
          icon={<Swords size={18} />}
          kicker="적에게"
          label={`피해 ${damageToEnemy}`}
          detail={`${enemy.currentHp} -> ${enemyHpAfter}`}
          tone={damageToEnemy > 0 ? 'safe' : 'empty'}
        />
        <ArrowRight className="combat-outcome-arrow" size={18} aria-hidden="true" />
        <OutcomeNode
          icon={enemyIntent.tone === 'danger' ? <AlertTriangle size={18} /> : <Shield size={18} />}
          kicker="적 반응"
          label={enemyIntent.label}
          detail={enemyIntent.detail}
          tone={enemyIntent.tone}
        />
        <ArrowRight className="combat-outcome-arrow" size={18} aria-hidden="true" />
        <OutcomeNode
          icon={<HeartPulse size={18} />}
          kicker="내 HP"
          label={`${player.currentHp} -> ${playerHpAfter}`}
          detail={damageToPlayer > 0 ? `받는 피해 ${damageToPlayer}` : '피해 없음'}
          tone={damageToPlayer >= player.currentHp && damageToPlayer > 0 ? 'danger' : damageToPlayer > 0 ? 'trade' : 'safe'}
        />
      </div>
    </section>
  );
};
