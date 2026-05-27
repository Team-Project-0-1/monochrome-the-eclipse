import React from 'react';
import { ArrowRight, ChevronDown, RotateCcw, X } from 'lucide-react';
import CoinDisplay from '../CoinDisplay';
import { ActiveSkillPill, PatternRail, ReserveCoinStrip } from './CombatControls';
import { CombatMobileOutcomeSummary } from './CombatMobileOutcomeSummary';
import { CombatTicker } from './CombatReadouts';
import {
  ActiveSkillState,
  Coin,
  CoinFace,
  CombatLogMessage,
  CombatPrediction,
  DetectedPattern,
  EnemyCharacter,
  EnemyIntent,
  PatternType,
  PlayerCharacter,
} from '../../types';

interface CombatMobileHudProps {
  player: PlayerCharacter;
  enemy: EnemyCharacter;
  playerCoins: Coin[];
  reserveCoins: Coin[];
  detectedPatterns: DetectedPattern[];
  selectedPatterns: DetectedPattern[];
  usedCoinIndices: number[];
  prediction: CombatPrediction | null;
  intent: EnemyIntent | null;
  combatLog: CombatLogMessage[];
  canExecute: boolean;
  isFocusMode: boolean;
  isSkillTargetingMode: boolean;
  isSwapMode: boolean;
  activeSkillState: ActiveSkillState;
  swapState: {
    phase: 'idle' | 'revealed';
    reserveCoinIndex: number | null;
    revealedFace: CoinFace | null;
  };
  disabledByFocus: boolean;
  devTestMode: boolean;
  onCoinClick: (index: number) => void;
  onUseActiveSkill: () => void;
  onFlipAllCoins: () => void;
  onFlipReserveCoin: (index: number) => void;
  onInitiateSwap: (index: number) => void;
  onCancelFocus: () => void;
  onTogglePattern: (type: PatternType, face?: CoinFace) => void;
  onExecuteTurn: () => void;
}

const getPatternDrawerLabel = (selectedPatterns: DetectedPattern[], detectedPatterns: DetectedPattern[]) => {
  if (selectedPatterns.length > 0) {
    return `${selectedPatterns.length}개 선택`;
  }

  if (detectedPatterns.length > 0) {
    return `${detectedPatterns.length}개 후보`;
  }

  return '후보 없음';
};

export const CombatMobileHud: React.FC<CombatMobileHudProps> = ({
  player,
  enemy,
  playerCoins,
  reserveCoins,
  detectedPatterns,
  selectedPatterns,
  usedCoinIndices,
  prediction,
  intent,
  combatLog,
  canExecute,
  isFocusMode,
  isSkillTargetingMode,
  isSwapMode,
  activeSkillState,
  swapState,
  disabledByFocus,
  devTestMode,
  onCoinClick,
  onUseActiveSkill,
  onFlipAllCoins,
  onFlipReserveCoin,
  onInitiateSwap,
  onCancelFocus,
  onTogglePattern,
  onExecuteTurn,
}) => {
  const [patternsOpen, setPatternsOpen] = React.useState(false);

  const handleTogglePattern = (type: PatternType, face?: CoinFace) => {
    onTogglePattern(type, face);
  };

  return (
    <section className={`combat-mobile-hud ${isFocusMode ? 'is-focus' : ''}`} aria-label="모바일 전투 컨트롤">
      <CombatMobileOutcomeSummary
        player={player}
        enemy={enemy}
        selectedPatterns={selectedPatterns}
        prediction={prediction}
        intent={intent}
      />

      <div className="combat-mobile-coin-panel">
        <div className={`combat-coin-row combat-mobile-coin-row ${isFocusMode ? 'is-targeting' : ''}`}>
          {playerCoins.map((coin, index) => (
            <CoinDisplay
              key={coin.id}
              coin={coin}
              index={index}
              onClick={isFocusMode || devTestMode ? () => onCoinClick(index) : null}
              isUsed={usedCoinIndices.includes(index)}
              isSwapTarget={swapState.phase === 'revealed'}
              isSkillTarget={isSkillTargetingMode && !activeSkillState.selection.includes(index)}
              isSelectedForSkill={activeSkillState.selection.includes(index)}
            />
          ))}
        </div>

        <div className="combat-mobile-tool-row" aria-label="모바일 동전 도구">
          {!isFocusMode ? (
            <ActiveSkillPill player={player} disabled={disabledByFocus} onClick={onUseActiveSkill} />
          ) : null}
          <ReserveCoinStrip
            reserveCoins={reserveCoins}
            isSwapping={isSwapMode}
            selectedIndex={swapState.reserveCoinIndex}
            revealedFace={swapState.revealedFace}
            testMode={devTestMode}
            onFlip={onFlipReserveCoin}
            onSwap={onInitiateSwap}
          />
          {devTestMode ? (
            <button type="button" className="combat-tool-button combat-mobile-icon-button" onClick={onFlipAllCoins} title="전체 동전 다시 굴리기">
              <RotateCcw size={16} />
              <span>리롤</span>
            </button>
          ) : null}
          {isFocusMode ? (
            <button type="button" className="combat-cancel-button combat-mobile-icon-button" onClick={onCancelFocus}>
              <X size={16} />
              <span>취소</span>
            </button>
          ) : null}
        </div>
      </div>

      {patternsOpen ? (
        <div className="combat-mobile-pattern-drawer is-open">
        <button
          type="button"
          className="combat-mobile-drawer-toggle"
          aria-expanded={patternsOpen}
          onClick={() => setPatternsOpen(false)}
        >
          <span>족보</span>
          <strong>{getPatternDrawerLabel(selectedPatterns, detectedPatterns)}</strong>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
          <PatternRail
            patterns={detectedPatterns}
            selectedPatterns={selectedPatterns}
            usedCoinIndices={usedCoinIndices}
            player={player}
            onToggle={disabledByFocus ? () => undefined : handleTogglePattern}
          />
        </div>
      ) : null}

      <div className="combat-command-strip combat-mobile-command-strip">
        <div className="combat-command-row">
          <CombatTicker messages={combatLog} />
          <button
            type="button"
            className="combat-mobile-pattern-inline"
            aria-expanded={patternsOpen}
            onClick={() => setPatternsOpen(open => !open)}
          >
            <span>족보</span>
            <strong>{selectedPatterns.length || detectedPatterns.length}</strong>
          </button>
          <button type="button" className="combat-execute-button" disabled={!canExecute} onClick={onExecuteTurn} data-testid="combat-execute-button">
            <span>실행</span>
            <ArrowRight size={19} />
          </button>
        </div>
      </div>
    </section>
  );
};
