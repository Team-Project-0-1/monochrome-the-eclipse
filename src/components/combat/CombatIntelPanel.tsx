import React from 'react';
import { BookOpen, Calculator, Crosshair, Sparkles, X } from 'lucide-react';
import { characterData } from '../../data/dataCharacters';
import { getPlayerAbility } from '../../data/dataSkills';
import {
  CombatPrediction,
  DetectedPattern,
  EnemyCharacter,
  EnemyIntent,
  PlayerCharacter,
} from '../../types';
import { statusLabels } from '../../utils/combatPresentation';
import { summarizeDescription } from '../../utils/effectSummary';
import { CalculationIntel } from './intel/CalculationIntel';
import { EnemyPatternIntel } from './intel/EnemyPatternIntel';
import { PassiveIntel } from './intel/PassiveIntel';
import { PlayerPatternIntel } from './intel/PlayerPatternIntel';
import { getStatusRows } from './intel/_shared';

export type CombatIntelView = 'player' | 'enemy' | 'calc' | 'passives';

interface CombatIntelBarProps {
  player: PlayerCharacter;
  enemy: EnemyCharacter;
  detectedPatterns: DetectedPattern[];
  selectedPatterns: DetectedPattern[];
  prediction: CombatPrediction | null;
  intent: EnemyIntent | null;
  unlockedPatterns: string[];
  activeView: CombatIntelView | null;
  onOpen: (view: CombatIntelView) => void;
  onClose: () => void;
}

const getViewTitle = (view: CombatIntelView) => {
  if (view === 'player') return '내 족보와 효과';
  if (view === 'enemy') return '적 족보와 사용 가능 기술';
  if (view === 'calc') return '피해 계산과 선택 결과';
  return '상태 효과와 패시브';
};

export const CombatIntelBar: React.FC<CombatIntelBarProps> = ({
  player,
  enemy,
  detectedPatterns,
  selectedPatterns,
  prediction,
  intent,
  unlockedPatterns,
  activeView,
  onOpen,
  onClose,
}) => {
  // 예상 피해 / 적 예고 / 다음 행동 cue 는 CombatOutcomeRail/MobileOutcomeSummary에
  // 이미 상시 노출되므로 이 바에서는 제거하여 정보 중복을 해소한다.
  // 본 바는 (1) 시너지/상태 요약, (2) 4개 정보 패널 토글만 담당한다.
  const selectedAbilityNames = selectedPatterns
    .slice(0, 2)
    .map(pattern => getPlayerAbility(player.class, player.acquiredSkills, pattern.type, pattern.face).name);
  const playerStatuses = getStatusRows(player);
  const enemyStatuses = getStatusRows(enemy);
  const playerStatusRows = playerStatuses.slice(0, 3);
  const enemyStatusRows = enemyStatuses.slice(0, 2);
  const passiveCount = (characterData[player.class]?.innatePassives?.length ?? 0) + unlockedPatterns.length;
  const innatePassive = characterData[player.class]?.innatePassives?.[0] ?? null;
  const innatePassiveHeadline = innatePassive ? summarizeDescription(innatePassive).headline : null;
  const activeStatusCount = playerStatuses.length + enemyStatuses.length;
  const synergyHeadline = selectedAbilityNames.length > 0
    ? `${selectedAbilityNames.join(' + ')} · 선택 효과 확인`
    : [
        innatePassiveHeadline ? `고유: ${innatePassiveHeadline}` : `패시브 ${passiveCount}`,
        activeStatusCount > 0 ? `상태 ${activeStatusCount}개 작동` : `사용 가능 족보 ${detectedPatterns.length}`,
      ].join(' · ');
  const synergyTitle = [
    innatePassive ? `고유 패시브: ${innatePassive}` : null,
    activeStatusCount > 0
      ? '상태 수치가 스킬 조건과 피해/방어에 연결됩니다.'
      : '상태가 생기면 이 줄에 즉시 표시됩니다.',
  ].filter(Boolean).join(' ');

  const toggleView = (view: CombatIntelView) => {
    if (activeView === view) {
      onClose();
      return;
    }
    onOpen(view);
  };

  return (
    <>
      <nav className="combat-intel-bar is-condensed" aria-label="전투 정보 요약 및 패널 토글">
        <div className="combat-synergy-strip" aria-label="패시브 및 상태 시너지" title={synergyTitle}>
          <span className="combat-synergy-passive" title={innatePassive ?? '습득한 패시브와 고유 패시브 수'}>
            <b>패시브</b>
            <em>{passiveCount}</em>
          </span>
          {playerStatusRows.map(row => (
            <span key={`player-${row.key}`} className="combat-synergy-token player" title={`내 ${statusLabels[row.key] ?? row.key} ${row.value}`}>
              <b>{statusLabels[row.key] ?? row.key}</b>
              <em>{row.value}</em>
            </span>
          ))}
          {enemyStatusRows.map(row => (
            <span key={`enemy-${row.key}`} className="combat-synergy-token enemy" title={`적 ${statusLabels[row.key] ?? row.key} ${row.value}`}>
              <b>{statusLabels[row.key] ?? row.key}</b>
              <em>{row.value}</em>
            </span>
          ))}
          <strong>{synergyHeadline}</strong>
        </div>
        <div className="combat-intel-buttons">
          <button type="button" className={activeView === 'player' ? 'is-active' : ''} onClick={() => toggleView('player')}>
            <BookOpen size={15} />
            <span>쓸 기술</span>
          </button>
          <button type="button" className={activeView === 'enemy' ? 'is-active' : ''} onClick={() => toggleView('enemy')}>
            <Crosshair size={15} />
            <span>적 읽기</span>
          </button>
          <button type="button" className={activeView === 'calc' ? 'is-active' : ''} onClick={() => toggleView('calc')}>
            <Calculator size={15} />
            <span>결과 계산</span>
          </button>
          <button type="button" className={activeView === 'passives' ? 'is-active' : ''} onClick={() => toggleView('passives')}>
            <Sparkles size={15} />
            <span>패시브/상태</span>
          </button>
        </div>
      </nav>

      {activeView ? (
        <section className={`combat-intel-modal view-${activeView}`} role="dialog" aria-label="전투 정보 상세 패널">
          <header className="combat-intel-modal-head">
            <div>
              <span>전투 정보</span>
              <strong>{getViewTitle(activeView)}</strong>
            </div>
            <button type="button" onClick={onClose} aria-label="전투 정보 닫기">
              <X size={18} />
            </button>
          </header>
          <div className="combat-intel-modal-body">
            {activeView === 'player' ? (
              <PlayerPatternIntel
                player={player}
                detectedPatterns={detectedPatterns}
                selectedPatterns={selectedPatterns}
              />
            ) : null}
            {activeView === 'enemy' ? (
              <EnemyPatternIntel enemy={enemy} intent={intent} />
            ) : null}
            {activeView === 'calc' ? (
              <CalculationIntel
                player={player}
                enemy={enemy}
                selectedPatterns={selectedPatterns}
                prediction={prediction}
                intent={intent}
              />
            ) : null}
            {activeView === 'passives' ? (
              <PassiveIntel player={player} enemy={enemy} unlockedPatterns={unlockedPatterns} />
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );
};
