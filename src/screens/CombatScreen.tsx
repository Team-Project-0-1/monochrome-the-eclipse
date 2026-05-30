import React from 'react';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';
import { ArrowRight, RotateCcw, X } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import CoinDisplay from '../components/CoinDisplay';
import { ActiveSkillPill, PatternRail, ReserveCoinStrip } from '../components/combat/CombatControls';
import { CombatIntelBar, type CombatIntelView } from '../components/combat/CombatIntelPanel';
import { CombatMobileHud } from '../components/combat/CombatMobileHud';
import { CombatTicker, FocusBanner } from '../components/combat/CombatReadouts';
import { CombatOutcomeRail } from '../components/combat/CombatOutcomeRail';
import { CombatStage } from '../components/combat/CombatStage';
import { useCombatEffectTimeline } from '../hooks/useCombatEffectTimeline';
import { playGameSfx, playUiSound } from '../utils/sound';
import { characterActiveSkills } from '../data/dataCharacters';
import { summarizeAbility } from '../utils/effectSummary';

const mobileHudQuery = '(max-width: 767px)';

const isMobileHudViewport = () => (
  typeof window !== 'undefined' && window.matchMedia(mobileHudQuery).matches
);

const useMobileCombatHud = () => {
  const [isMobileHud, setIsMobileHud] = React.useState(isMobileHudViewport);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(mobileHudQuery);
    const update = () => setIsMobileHud(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return isMobileHud;
};

export const CombatScreen: React.FC = () => {
  const player = useGameStore(state => state.player);
  const enemy = useGameStore(state => state.enemy);
  const playerCoins = useGameStore(state => state.playerCoins);
  const reserveCoins = useGameStore(state => state.reserveCoins);
  const detectedPatterns = useGameStore(state => state.detectedPatterns);
  const selectedPatterns = useGameStore(state => state.selectedPatterns);
  const usedCoinIndices = useGameStore(state => state.usedCoinIndices);
  const combatPrediction = useGameStore(state => state.combatPrediction);
  const enemyIntent = useGameStore(state => state.enemyIntent);
  const combatLog = useGameStore(state => state.combatLog);
  const combatEffects = useGameStore(state => state.combatEffects);
  const removeCombatEffect = useGameStore(state => state.removeCombatEffect);
  const flipAllCoins = useGameStore(state => state.flipAllCoins);
  const flipCoin = useGameStore(state => state.flipCoin);
  const flipReserveCoin = useGameStore(state => state.flipReserveCoin);
  const togglePattern = useGameStore(state => state.togglePattern);
  const executeTurn = useGameStore(state => state.executeTurn);
  const swapState = useGameStore(state => state.swapState);
  const initiateSwap = useGameStore(state => state.initiateSwap);
  const cancelSwap = useGameStore(state => state.cancelSwap);
  const completeSwap = useGameStore(state => state.completeSwap);
  const testMode = useGameStore(state => state.testMode);
  const activeSkillState = useGameStore(state => state.activeSkillState);
  const useActiveSkill = useGameStore(state => state.useActiveSkill);
  const handleActiveSkillCoinClick = useGameStore(state => state.handleActiveSkillCoinClick);
  const cancelActiveSkill = useGameStore(state => state.cancelActiveSkill);
  const gameOptions = useGameStore(state => state.gameOptions);
  const currentStage = useGameStore(state => state.currentStage);
  const unlockedPatterns = useGameStore(state => state.unlockedPatterns);
  const [activeIntelView, setActiveIntelView] = React.useState<CombatIntelView | null>(null);
  const [activeSkillNotice, setActiveSkillNotice] = React.useState<{
    label: string;
    title: string;
    detail: string;
    description: string;
  } | null>(null);
  const isMobileHud = useMobileCombatHud();
  const isSkillTargetingMode = activeSkillState.phase !== 'idle';
  const isSwapMode = swapState.phase !== 'idle';
  const isFocusMode = isSkillTargetingMode || isSwapMode;

  const screenShakeControls = useAnimation();
  const screenFlashControls = useAnimation();
  const { presentedEffects, resultBanner, edgePulse } = useCombatEffectTimeline({
    combatEffects,
    screenShakeControls,
    screenFlashControls,
    reducedMotion: gameOptions.reducedMotion,
  });

  React.useEffect(() => {
    if (!activeSkillNotice || isFocusMode) return;

    const timer = window.setTimeout(() => setActiveSkillNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [activeSkillNotice, isFocusMode]);

  if (!player || !enemy) {
    return <div className="combat-loading">Loading Combat...</div>;
  }

  const canExecute = selectedPatterns.length > 0 && !isFocusMode;
  const disabledByFocus = isFocusMode;
  const devTestMode = import.meta.env.DEV && testMode;
  const activeSkill = characterActiveSkills[player.class];
  const activeSkillSummary = activeSkill ? summarizeAbility(activeSkill) : null;
  const focusDetail = isSkillTargetingMode && activeSkill && activeSkillSummary
    ? {
        label: '액티브 사용 중',
        title: activeSkill.name,
        detail: activeSkillSummary.cue,
        description: activeSkillSummary.detail,
      }
    : activeSkillNotice;
  const focusText = isFocusMode
    ? getFocusPrompt()
    : activeSkillNotice
      ? '액티브 효과가 적용되었습니다'
      : null;

  const onCoinClick = (index: number) => {
    playUiSound(gameOptions.soundEnabled, 'select');
    playGameSfx(gameOptions.soundEnabled, 'coinFlip');

    if (swapState.phase === 'revealed') {
      completeSwap(index);
      return;
    }

    if (isSkillTargetingMode) {
      handleActiveSkillCoinClick(index);
      return;
    }

    if (devTestMode) {
      flipCoin(index);
    }
  };

  function getFocusPrompt() {
    if (swapState.phase === 'revealed') return '교체할 내 동전을 선택하세요.';

    switch (activeSkillState.phase) {
      case 'rogue_flip':
        return '뒤집을 동전을 선택하세요.';
      case 'tank_swap_1':
        return '첫 번째 교환 동전을 선택하세요.';
      case 'tank_swap_2':
        return '두 번째 교환 동전을 선택하세요.';
      case 'mage_lock':
        return '고정할 동전을 선택하세요.';
      default:
        return null;
    }
  }

  const cancelFocus = () => {
    playUiSound(gameOptions.soundEnabled, 'deny');

    if (swapState.phase !== 'idle') {
      cancelSwap();
      return;
    }

    cancelActiveSkill();
  };

  const handleExecuteTurn = () => {
    if (!canExecute) {
      playUiSound(gameOptions.soundEnabled, 'deny');
      return;
    }

    playUiSound(gameOptions.soundEnabled, 'execute');
    playGameSfx(gameOptions.soundEnabled, selectedPatterns.length > 1 ? 'combatSkill' : 'combatAttack');
    executeTurn();
  };

  const handleUseActiveSkill = () => {
    if (activeSkill && activeSkillSummary) {
      setActiveSkillNotice({
        label: '액티브 상세',
        title: activeSkill.name,
        detail: activeSkillSummary.cue,
        description: activeSkillSummary.detail,
      });
    }

    playGameSfx(gameOptions.soundEnabled, 'combatSkill');
    useActiveSkill();
  };

  const handleTogglePattern = (type: Parameters<typeof togglePattern>[0], face?: Parameters<typeof togglePattern>[1]) => {
    playGameSfx(gameOptions.soundEnabled, 'patternLock');
    togglePattern(type, face);
  };

  const handleFlipAllCoins = () => {
    playGameSfx(gameOptions.soundEnabled, 'coinClash');
    flipAllCoins();
  };

  const handleFlipReserveCoin = (index: number) => {
    playGameSfx(gameOptions.soundEnabled, 'coinFlip');
    flipReserveCoin(index);
  };

  const handleInitiateSwap = (index: number) => {
    playGameSfx(gameOptions.soundEnabled, 'coinClash');
    initiateSwap(index);
  };

  return (
    <div className="combat-screen">
      <motion.div
        className="combat-flash"
        animate={screenFlashControls}
        initial={{ opacity: 0 }}
      />

      {/* reducedMotion 전용 비-공간적 피격 피드백: 화면 가장자리 펄스(key로 매 피격 재생). */}
      {edgePulse && (
        <div
          key={edgePulse.id}
          className={`combat-edge-pulse is-${edgePulse.tone}`}
          aria-hidden="true"
        />
      )}

      <AnimatePresence>
        {isFocusMode || activeSkillNotice ? (
          <FocusBanner
            text={focusText}
            detail={focusDetail}
            revealedFace={swapState.revealedFace}
            variant={isFocusMode ? 'focus' : 'notice'}
            buttonLabel={isFocusMode ? '취소' : '닫기'}
            onCancel={() => {
              if (isFocusMode) {
                cancelFocus();
              }
              setActiveSkillNotice(null);
            }}
          />
        ) : null}
      </AnimatePresence>

      <CombatIntelBar
        player={player}
        enemy={enemy}
        detectedPatterns={detectedPatterns}
        selectedPatterns={selectedPatterns}
        prediction={combatPrediction}
        intent={enemyIntent}
        unlockedPatterns={unlockedPatterns}
        activeView={activeIntelView}
        onOpen={setActiveIntelView}
        onClose={() => setActiveIntelView(null)}
      />

      <motion.div className={`combat-camera ${presentedEffects.length > 0 ? 'is-resolving' : ''}`} animate={screenShakeControls}>
        <CombatStage
          player={player}
          enemy={enemy}
          intent={enemyIntent}
          resultBanner={resultBanner}
          combatEffects={presentedEffects}
          removeCombatEffect={removeCombatEffect}
          currentStage={currentStage}
        />

        {isMobileHud ? (
          <CombatMobileHud
            player={player}
            enemy={enemy}
            playerCoins={playerCoins}
            reserveCoins={reserveCoins}
            detectedPatterns={detectedPatterns}
            selectedPatterns={selectedPatterns}
            usedCoinIndices={usedCoinIndices}
            prediction={combatPrediction}
            intent={enemyIntent}
            combatLog={combatLog}
            canExecute={canExecute}
            isFocusMode={isFocusMode}
            isSkillTargetingMode={isSkillTargetingMode}
            isSwapMode={isSwapMode}
            activeSkillState={activeSkillState}
            swapState={swapState}
            disabledByFocus={disabledByFocus}
            devTestMode={devTestMode}
            onCoinClick={onCoinClick}
            onUseActiveSkill={handleUseActiveSkill}
            onFlipAllCoins={handleFlipAllCoins}
            onFlipReserveCoin={handleFlipReserveCoin}
            onInitiateSwap={handleInitiateSwap}
            onCancelFocus={cancelFocus}
            onTogglePattern={handleTogglePattern}
            onExecuteTurn={handleExecuteTurn}
          />
        ) : (
          <div className={`combat-bottom-hud combat-card-hand ${isFocusMode ? 'is-focus' : ''}`}>
            <CombatOutcomeRail
              player={player}
              enemy={enemy}
              selectedPatterns={selectedPatterns}
              prediction={combatPrediction}
              intent={enemyIntent}
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
                      <ActiveSkillPill player={player} disabled={disabledByFocus} onClick={handleUseActiveSkill} />
                    ) : null}
                    {devTestMode ? (
                      <button type="button" className="combat-tool-button" onClick={handleFlipAllCoins} title="전체 동전 다시 굴리기">
                        <RotateCcw size={17} />
                        <span>리롤</span>
                      </button>
                    ) : null}
                    {isFocusMode ? (
                      <button type="button" className="combat-cancel-button" onClick={cancelFocus}>
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
                    onFlip={handleFlipReserveCoin}
                    onSwap={handleInitiateSwap}
                  />
                </div>
              </div>

              <PatternRail
                patterns={detectedPatterns}
                selectedPatterns={selectedPatterns}
                usedCoinIndices={usedCoinIndices}
                player={player}
                onToggle={disabledByFocus ? () => undefined : handleTogglePattern}
              />
            </div>

            <div className="combat-command-strip">
              <div className="combat-command-row">
                <CombatTicker messages={combatLog} />
                <button type="button" className="combat-execute-button" disabled={!canExecute} onClick={handleExecuteTurn} data-testid="combat-execute-button">
                  <span>실행</span>
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
