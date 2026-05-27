import React from 'react';
import { DetectedPattern, PlayerCharacter } from '../../../types';
import { getPlayerAbility } from '../../../data/dataSkills';
import { faceClass, faceLabel, patternLabels } from '../../../utils/combatPresentation';
import { assetPath } from '../../../utils/assetPath';
import { summarizeAbility } from '../../../utils/effectSummary';
import EffectSummary from '../../EffectSummary';
import { formatCoinIndices, patternFaces, patternIconPaths, patternTypes } from './_shared';

interface PlayerPatternIntelProps {
  player: PlayerCharacter;
  detectedPatterns: DetectedPattern[];
  selectedPatterns: DetectedPattern[];
}

export const PlayerPatternIntel: React.FC<PlayerPatternIntelProps> = ({
  player,
  detectedPatterns,
  selectedPatterns,
}) => (
  <div className="combat-intel-stack">
    <div className="combat-intel-note player-cue">
      <span>다음 행동</span>
      <b>{selectedPatterns.length > 0 ? '선택한 기술의 태그를 확인하고 실행' : '밝게 표시된 족보부터 선택'}</b>
      <small>원문은 필요할 때만 펼칩니다.</small>
    </div>
    <div className="combat-intel-grid player-patterns">
      {patternTypes.flatMap(type => patternFaces.map(face => {
        const ability = getPlayerAbility(player.class, player.acquiredSkills, type, face);
        const matches = detectedPatterns.filter(pattern => pattern.type === type && pattern.face === face);
        const selected = selectedPatterns.filter(pattern => pattern.type === type && pattern.face === face);
        const bestMatch = selected[0] ?? matches[0];
        const statusClass = selected.length > 0 ? 'is-selected' : matches.length > 0 ? 'is-ready' : '';

        return (
          <article key={`${type}-${face}`} className={`combat-intel-row ${faceClass(face)} ${statusClass}`} title={ability.description}>
            <img src={assetPath(patternIconPaths[type])} alt="" loading="lazy" aria-hidden="true" />
            <div className="combat-intel-row-main">
              <div className="combat-intel-row-title">
                <span>{patternLabels[type]} {faceLabel(face)}</span>
                <strong>{ability.name}</strong>
              </div>
              <EffectSummary
                summary={summarizeAbility(ability)}
                compact
                chipLimit={4}
                showCue
                cueLabel="판단"
                showDetail="details"
              />
            </div>
            <div className="combat-intel-tags">
              {selected.length > 0 ? <b>선택 {selected.length}</b> : null}
              {matches.length > 0 ? <span>가능 {matches.length}</span> : <span>미충족</span>}
              <em>{formatCoinIndices(bestMatch?.indices ?? [])}</em>
            </div>
          </article>
        );
      }))}
    </div>
  </div>
);
