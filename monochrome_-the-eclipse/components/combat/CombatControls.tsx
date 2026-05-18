import React, { useMemo } from 'react';
import { HelpCircle, Shield, Swords } from 'lucide-react';
import { characterActiveSkills } from '../../dataCharacters';
import { getPlayerAbility } from '../../dataSkills';
import {
  CharacterClass,
  Coin,
  CoinFace,
  DetectedPattern,
  PatternType,
  PlayerCharacter,
} from '../../types';
import {
  faceClass,
  faceLabel,
  patternLabels,
  patternOrder,
  PatternGroup,
} from '../../utils/combatPresentation';
import { assetPath } from '../../utils/assetPath';
import EffectSummary from '../EffectSummary';
import { summarizeAbility } from '../../utils/effectSummary';
import { MAX_RESERVE_COINS } from '../../constants';

const activeSkillIconPaths: Record<CharacterClass, string> = {
  [CharacterClass.WARRIOR]: 'assets/icons/combat/active-warrior-reroll.png',
  [CharacterClass.ROGUE]: 'assets/icons/combat/active-rogue-flip.png',
  [CharacterClass.TANK]: 'assets/icons/combat/active-tank-lock.png',
  [CharacterClass.MAGE]: 'assets/icons/combat/active-mage-swap.png',
};

const patternIconPaths: Record<PatternType, string> = {
  [PatternType.PAIR]: 'assets/icons/combat/pattern-pair.png',
  [PatternType.TRIPLE]: 'assets/icons/combat/pattern-triple.png',
  [PatternType.QUAD]: 'assets/icons/combat/pattern-quad.png',
  [PatternType.PENTA]: 'assets/icons/combat/pattern-penta.png',
  [PatternType.UNIQUE]: 'assets/icons/combat/pattern-unique.png',
  [PatternType.AWAKENING]: 'assets/icons/combat/pattern-awakening.png',
};

const usePatternGroups = (patterns: DetectedPattern[]) => {
  return useMemo(() => {
    const map = new Map<string, PatternGroup>();

    patterns.forEach(pattern => {
      const key = `${pattern.type}-${pattern.face ?? 'none'}`;
      const existing = map.get(key);
      if (existing) {
        existing.patterns.push(pattern);
      } else {
        map.set(key, { type: pattern.type, face: pattern.face, patterns: [pattern] });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const byType = patternOrder[a.type] - patternOrder[b.type];
      if (byType !== 0) return byType;
      return faceLabel(a.face).localeCompare(faceLabel(b.face));
    });
  }, [patterns]);
};

interface PatternRailProps {
  patterns: DetectedPattern[];
  selectedPatterns: DetectedPattern[];
  usedCoinIndices: number[];
  player: PlayerCharacter;
  onToggle: (type: PatternType, face?: CoinFace) => void;
}

export const PatternRail: React.FC<PatternRailProps> = ({
  patterns,
  selectedPatterns,
  usedCoinIndices,
  player,
  onToggle,
}) => {
  const groups = usePatternGroups(patterns);
  const selectedIds = useMemo(() => new Set(selectedPatterns.map(pattern => pattern.id)), [selectedPatterns]);
  const selectedUsedIndices = useMemo(() => new Set(selectedPatterns.flatMap(pattern => pattern.indices)), [selectedPatterns]);
  const [inspectedPatternKey, setInspectedPatternKey] = React.useState<string | null>(null);
  const inspectionTimer = React.useRef<number | null>(null);
  const suppressNextClick = React.useRef(false);

  const clearInspectionTimer = () => {
    if (inspectionTimer.current !== null) {
      window.clearTimeout(inspectionTimer.current);
      inspectionTimer.current = null;
    }
  };

  if (groups.length === 0) {
    return (
      <div className="combat-pattern-empty">
        조합 없음
      </div>
    );
  }

  return (
    <div className="combat-pattern-rail" aria-label="available patterns">
      {groups.map(group => {
        const groupKey = `${group.type}-${group.face ?? 'none'}`;
        const selectedCount = selectedPatterns.filter(pattern => pattern.type === group.type && pattern.face === group.face).length;
        const isAvailable = group.patterns.some(pattern => (
          !selectedIds.has(pattern.id) &&
          !pattern.indices.some(index => selectedUsedIndices.has(index))
        ));
        const disabled = selectedCount === 0 && !isAvailable;
        const ability = getPlayerAbility(player.class, player.acquiredSkills, group.type, group.face);
        const summary = summarizeAbility(ability);
        const selectedClass = selectedCount > 0 ? 'is-selected' : '';
        const cappedClass = selectedCount >= 2 || (selectedCount > 0 && !isAvailable) ? 'is-capped' : '';
        const detailId = `combat-pattern-detail-${groupKey}`;
        const isInspecting = inspectedPatternKey === groupKey;

        return (
          <button
            key={groupKey}
            type="button"
            className={`combat-pattern-chip ${faceClass(group.face)} ${selectedClass} ${cappedClass}`}
            disabled={disabled}
            aria-pressed={selectedCount > 0}
            aria-describedby={detailId}
            onClick={(event) => {
              if (suppressNextClick.current) {
                event.preventDefault();
                suppressNextClick.current = false;
                return;
              }

              onToggle(group.type, group.face);
            }}
            onMouseEnter={() => setInspectedPatternKey(groupKey)}
            onMouseLeave={() => setInspectedPatternKey(current => current === groupKey ? null : current)}
            onFocus={() => setInspectedPatternKey(groupKey)}
            onBlur={() => setInspectedPatternKey(current => current === groupKey ? null : current)}
            onPointerDown={(event) => {
              if (event.pointerType === 'mouse') return;
              clearInspectionTimer();
              suppressNextClick.current = false;
              inspectionTimer.current = window.setTimeout(() => {
                suppressNextClick.current = true;
                setInspectedPatternKey(groupKey);
              }, 420);
            }}
            onPointerUp={clearInspectionTimer}
            onPointerCancel={clearInspectionTimer}
            title={ability.description}
            data-testid={`combat-pattern-${group.type.toLowerCase()}-${group.face?.toLowerCase() ?? 'mixed'}`}
          >
            <span className="combat-card-topline">
              <span className="combat-card-corner">{patternLabels[group.type]}</span>
              <span className="combat-card-face">
                {faceLabel(group.face)}
                {selectedCount > 0 ? <small>선택 {selectedCount}</small> : null}
              </span>
            </span>
            <span className="combat-pattern-art">
              <img
                className="combat-pattern-icon-img"
                src={assetPath(patternIconPaths[group.type])}
                alt=""
                loading="lazy"
                aria-hidden="true"
              />
            </span>
            <span className="combat-pattern-text">
              <EffectSummary summary={summary} compact hideHeadline chipLimit={3} showCue cueLabel="역할" className="combat-pattern-summary" />
              <strong>{ability.name}</strong>
              <span>{selectedCount > 0 ? `선택 ${selectedCount}` : `후보 ${group.patterns.length}`}</span>
            </span>
            <span id={detailId} className={`combat-pattern-detail ${isInspecting ? 'is-open' : ''}`} role="tooltip">
              <span>상세 효과</span>
              <strong>{ability.name}</strong>
              <em>{summary.detail}</em>
            </span>
          </button>
        );
      })}
      {usedCoinIndices.length > 0 ? <span className="combat-used-count">{usedCoinIndices.length}개 사용 예정</span> : null}
    </div>
  );
};

interface ActiveSkillPillProps {
  player: PlayerCharacter;
  disabled: boolean;
  onClick: () => void;
}

export const ActiveSkillPill: React.FC<ActiveSkillPillProps> = ({ player, disabled, onClick }) => {
  const skill = characterActiveSkills[player.class];
  const [showDetail, setShowDetail] = React.useState(false);
  const detailTimer = React.useRef<number | null>(null);
  const suppressNextClick = React.useRef(false);
  if (!skill) return null;

  const onCooldown = player.activeSkillCooldown > 0;
  const isDisabled = disabled || onCooldown;
  const summary = summarizeAbility(skill);

  const clearDetailTimer = () => {
    if (detailTimer.current !== null) {
      window.clearTimeout(detailTimer.current);
      detailTimer.current = null;
    }
  };

  return (
    <button
      type="button"
      className="combat-active-skill"
      disabled={isDisabled}
      onClick={(event) => {
        if (suppressNextClick.current) {
          event.preventDefault();
          suppressNextClick.current = false;
          return;
        }

        onClick();
      }}
      onMouseEnter={() => setShowDetail(true)}
      onMouseLeave={() => setShowDetail(false)}
      onFocus={() => setShowDetail(true)}
      onBlur={() => setShowDetail(false)}
      onPointerDown={(event) => {
        if (event.pointerType === 'mouse') return;
        clearDetailTimer();
        suppressNextClick.current = false;
        detailTimer.current = window.setTimeout(() => {
          suppressNextClick.current = true;
          setShowDetail(true);
        }, 420);
      }}
      onPointerUp={clearDetailTimer}
      onPointerCancel={clearDetailTimer}
      title={skill.description}
    >
      <img
        className="combat-active-skill-img"
        src={assetPath(activeSkillIconPaths[player.class])}
        alt=""
        loading="lazy"
        aria-hidden="true"
      />
      <span className="combat-active-skill-copy">
        <strong>{skill.name}</strong>
        <EffectSummary text={skill.description} compact hideHeadline chipLimit={2} showCue cueLabel="용도" />
      </span>
      <b>{onCooldown ? `쿨 ${player.activeSkillCooldown}` : 'OK'}</b>
      <span className={`combat-active-skill-detail ${showDetail ? 'is-open' : ''}`} role="tooltip">
        <span>액티브 상세</span>
        <strong>{skill.name}</strong>
        <em>{summary.detail}</em>
      </span>
    </button>
  );
};

interface ReserveCoinStripProps {
  reserveCoins: Coin[];
  isSwapping: boolean;
  selectedIndex: number | null;
  revealedFace?: CoinFace | null;
  testMode: boolean;
  onFlip: (index: number) => void;
  onSwap: (index: number) => void;
}

export const ReserveCoinStrip: React.FC<ReserveCoinStripProps> = ({
  reserveCoins,
  isSwapping,
  selectedIndex,
  revealedFace,
  testMode,
  onFlip,
  onSwap,
}) => {
  const [pendingIndex, setPendingIndex] = React.useState(0);

  React.useEffect(() => {
    if (selectedIndex !== null) {
      setPendingIndex(selectedIndex);
      return;
    }

    if (pendingIndex >= reserveCoins.length) {
      setPendingIndex(Math.max(0, reserveCoins.length - 1));
    }
  }, [pendingIndex, reserveCoins.length, selectedIndex]);

  if (reserveCoins.length === 0) {
    return <div className="combat-reserve-empty">행운 없음</div>;
  }

  const activeIndex = selectedIndex ?? pendingIndex;
  const canSwap = activeIndex >= 0 && activeIndex < reserveCoins.length && !isSwapping;

  return (
    <div className="combat-reserve-control">
      <div className="combat-reserve-head">
        <span>행운</span>
        <b>{reserveCoins.length}/{MAX_RESERVE_COINS}</b>
      </div>
      <div className="combat-reserve-strip" aria-label="reserve coins">
        {reserveCoins.map((coin, index) => {
          const isActive = activeIndex === index;
          const shownFace = selectedIndex === index && revealedFace ? revealedFace : coin.face;
          const isHeads = shownFace === CoinFace.HEADS;
          const isTails = shownFace === CoinFace.TAILS;

          return (
          <button
            key={coin.id}
            type="button"
            className={`combat-reserve-slot ${faceClass(shownFace)} ${isActive ? 'is-selected' : ''} ${selectedIndex === index ? 'is-revealed' : ''}`}
            disabled={isSwapping}
            onClick={() => setPendingIndex(index)}
            title={`행운 동전 ${index + 1}${shownFace ? `: ${faceLabel(shownFace)}` : ''}`}
          >
            <small>{index + 1}</small>
            <span className="combat-reserve-face">
              {shownFace === null ? <HelpCircle size={15} /> : isHeads ? <Swords size={15} /> : isTails ? <Shield size={15} /> : <HelpCircle size={15} />}
            </span>
          </button>
          );
        })}
      </div>
      <button type="button" className="combat-swap-button combat-reserve-action" disabled={!canSwap} onClick={() => onSwap(activeIndex)}>
        {isSwapping ? '대상' : '교체'}
      </button>
      {testMode ? (
        <button type="button" className="combat-reserve-debug" disabled={isSwapping} onClick={() => onFlip(activeIndex)}>
          뒤집기
        </button>
      ) : null}
    </div>
  );
};
