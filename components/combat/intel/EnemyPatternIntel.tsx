import React from 'react';
import { EnemyCharacter, EnemyIntent } from '../../../types';
import { getMonsterPhase, monsterData, monsterPatterns } from '../../../data/dataMonsters';
import { faceClass, faceLabel, patternLabels } from '../../../utils/combatPresentation';
import { assetPath } from '../../../utils/assetPath';
import { summarizeAbility } from '../../../utils/effectSummary';
import EffectSummary from '../../EffectSummary';
import { formatCoinIndices, patternIconPaths } from './_shared';

interface EnemyPatternIntelProps {
  enemy: EnemyCharacter;
  intent: EnemyIntent | null;
}

export const EnemyPatternIntel: React.FC<EnemyPatternIntelProps> = ({ enemy, intent }) => {
  const enemyDef = monsterData[enemy.key];
  const phase = getMonsterPhase(enemy);
  const phaseSkillKeys = phase?.patterns ?? [];
  const skillKeys = enemyDef?.patterns ?? [];
  const sourceKeys = new Set(intent?.sourcePatternKeys ?? []);

  return (
    <div className="combat-intel-stack">
      {phase ? (
        <div className="combat-intel-note">
          <span>현재 페이즈</span>
          <b>{phase.label}</b>
        </div>
      ) : null}
      <div className="combat-intel-grid enemy-patterns">
        {skillKeys.map(key => {
          const skill = monsterPatterns[key];
          if (!skill) return null;
          const matches = enemy.detectedPatterns.filter(pattern => (
            pattern.type === skill.type && (!skill.face || pattern.face === skill.face)
          ));
          const isIntent = sourceKeys.has(key);
          const isPhasePreferred = phaseSkillKeys.includes(key);
          const bestMatch = isIntent
            ? enemy.detectedPatterns.find(pattern => intent?.sourceCoinIndices?.every(index => pattern.indices.includes(index)))
            : matches[0];
          const statusClass = isIntent ? 'is-selected' : matches.length > 0 ? 'is-ready' : '';

          return (
            <article key={key} className={`combat-intel-row ${faceClass(skill.face)} ${statusClass}`} title={skill.description}>
              <img src={assetPath(patternIconPaths[skill.type])} alt="" loading="lazy" aria-hidden="true" />
              <div className="combat-intel-row-main">
                <div className="combat-intel-row-title">
                  <span>{patternLabels[skill.type]} {faceLabel(skill.face)}</span>
                  <strong>{skill.name}</strong>
                </div>
                <EffectSummary summary={summarizeAbility(skill)} compact chipLimit={4} showDetail="details" />
              </div>
              <div className="combat-intel-tags">
                {isIntent ? <b>예고</b> : null}
                {isPhasePreferred ? <b>페이즈</b> : null}
                {matches.length > 0 ? <span>가능</span> : <span>미충족</span>}
                <em>{formatCoinIndices(bestMatch?.indices ?? [])}</em>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
