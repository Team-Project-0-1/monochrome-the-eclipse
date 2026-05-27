import React from 'react';
import {
  CombatPrediction,
  DetectedPattern,
  EnemyCharacter,
  EnemyIntent,
  PlayerCharacter,
} from '../../../types';
import { getPlayerAbility } from '../../../data/dataSkills';
import { faceClass, faceLabel, getIntentPatternLabel, patternLabels } from '../../../utils/combatPresentation';
import { assetPath } from '../../../utils/assetPath';
import { summarizeAbility } from '../../../utils/effectSummary';
import EffectSummary from '../../EffectSummary';
import { formatCoinIndices, getEffectiveDefense, patternIconPaths } from './_shared';

interface CalculationIntelProps {
  player: PlayerCharacter;
  enemy: EnemyCharacter;
  selectedPatterns: DetectedPattern[];
  prediction: CombatPrediction | null;
  intent: EnemyIntent | null;
}

export const CalculationIntel: React.FC<CalculationIntelProps> = ({
  player,
  enemy,
  selectedPatterns,
  prediction,
  intent,
}) => {
  const playerAttack = prediction?.player.attack.total ?? 0;
  const playerDefense = prediction?.player.defense.total ?? 0;
  const enemyAttack = prediction?.enemy.attack.total ?? intent?.damage ?? 0;
  const enemyDefense = getEffectiveDefense(playerAttack, prediction?.damageToEnemy ?? 0);
  const selectedRows = selectedPatterns.map(pattern => ({
    pattern,
    ability: getPlayerAbility(player.class, player.acquiredSkills, pattern.type, pattern.face),
  }));

  return (
    <div className="combat-intel-calc">
      <div className="combat-calc-scoreboard">
        <div>
          <span>내 공격</span>
          <b>{playerAttack}</b>
          <small>적 방어 {enemyDefense}</small>
        </div>
        <div className="is-result">
          <span>적 피해</span>
          <b>{prediction?.damageToEnemy ?? 0}</b>
          <small>max(0, 공격 - 방어)</small>
        </div>
        <div>
          <span>적 공격</span>
          <b>{enemyAttack}</b>
          <small>내 방어 {playerDefense}</small>
        </div>
        <div className="is-result enemy">
          <span>받는 피해</span>
          <b>{prediction?.damageToPlayer ?? 0}</b>
          <small>예고 기술 기준</small>
        </div>
      </div>

      <div className="combat-intel-split">
        <section>
          <h3>선택한 족보</h3>
          {selectedRows.length > 0 ? selectedRows.map(({ pattern, ability }) => (
            <article key={pattern.id} className={`combat-intel-row compact ${faceClass(pattern.face)}`} title={ability.description}>
              <img src={assetPath(patternIconPaths[pattern.type])} alt="" loading="lazy" aria-hidden="true" />
              <div className="combat-intel-row-main">
                <div className="combat-intel-row-title">
                  <span>{patternLabels[pattern.type]} {faceLabel(pattern.face)} · {formatCoinIndices(pattern.indices)}</span>
                  <strong>{ability.name}</strong>
                </div>
                <EffectSummary summary={summarizeAbility(ability)} compact chipLimit={3} showCue cueLabel="판단" showDetail="details" />
              </div>
            </article>
          )) : <p className="combat-intel-empty">아직 선택한 족보가 없습니다.</p>}
        </section>
        <section>
          <h3>적 예고</h3>
          <article className="combat-intel-note danger">
            <span>{getIntentPatternLabel(intent, enemy) ?? '패턴 없음'}</span>
            <b>{intent?.description ?? '대기'}</b>
            <small>공격 {intent?.damage ?? 0} / 방어 {intent?.defense ?? 0}</small>
          </article>
        </section>
      </div>
    </div>
  );
};
