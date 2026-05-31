import React from 'react';
import { ArrowRight, RotateCcw, X } from 'lucide-react';
import CoinDisplay from '../CoinDisplay';
import { ActiveSkillPill, PatternRail, ReserveCoinStrip } from './CombatControls';
import { CombatTicker } from './CombatReadouts';
import { CombatOutcomeRail } from './CombatOutcomeRail';
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

interface CombatDesktopHudProps {
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

export const CombatDesktopHud: React.FC<CombatDesktopHudProps> = ({
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
  return (
    <div className={`combat-bottom-hud combat-card-hand ${isFocusMode ? 'is-focus' : ''}`}>
      <CombatOutcomeRail
        player={player}
        enemy={enemy}
        selectedPatterns={selectedPatterns}
        prediction={prediction}
        intent={intent}
      />

      <div className="combat-player-tools">
        <div className="combat-player-control-row">
          <div className={`combat-coin-row ${isFocusMode ? 'is-targeting' : ''}`}>
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

          <div className="combat-adjust-tools" aria-label="동전 조정 도구">
            <div className="combat-action-row combat-adjust-row">
              {!isFocusMode ? (
                <ActiveSkillPill player={player} disabled={disabledByFocus} onClick={onUseActiveSkill} />
              ) : null}
              {devTestMode ? (
                <button type="button" className="combat-tool-button" onClick={onFlipAllCoins} title="전체 동전 다시 굴리기">
                  <RotateCcw size={17} />
                  <span>리롤</span>
                </button>
              ) : null}
              {isFocusMode ? (
                <button type="button" className="combat-cancel-button" onClick={onCancelFocus}>
                  <X size={17} />
                  <span>취소</span>
                </button>
              ) : null}
            </div>

            <ReserveCoinStrip
              reserveCoins={reserveCoins}
              isSwapping={isSwapMode}
              selectedIndex={swapState.reserveCoinIndex}
              revealedFace={swapState.revealedFace}
              testMode={devTestMode}
              onFlip={onFlipReserveCoin}
              onSwap={onInitiateSwap}
            />
          </div>
        </div>

        <PatternRail
          patterns={detectedPatterns}
          selectedPatterns={selectedPatterns}
          usedCoinIndices={usedCoinIndices}
          player={player}
          onToggle={disabledByFocus ? () => undefined : onTogglePattern}
        />
      </div>

      <div className="combat-command-strip">
        <div className="combat-command-row">
          <CombatTicker messages={combatLog} />
          <button type="button" className="combat-execute-button" disabled={!canExecute} onClick={onExecuteTurn} data-testid="combat-execute-button">
            <span>실행</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
