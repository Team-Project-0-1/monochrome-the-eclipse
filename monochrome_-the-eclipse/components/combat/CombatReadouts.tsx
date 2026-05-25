import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Info, Shield, Swords, Target, X } from 'lucide-react';
import {
  Coin,
  CoinFace,
  CombatLogMessage,
  CombatPrediction,
  DetectedPattern,
  EnemyCharacter,
  EnemyIntent,
  PlayerCharacter,
} from '../../types';
import {
  CombatResultBanner,
  faceClass,
  faceLabel,
  getIntentPatternLabel,
  patternLabels,
} from '../../utils/combatPresentation';
import { getPlayerAbility } from '../../data/dataSkills';
import EffectSummary from '../EffectSummary';
import { summarizeAbility, type EffectSummary as EffectSummaryData } from '../../utils/effectSummary';

export const CombatTicker: React.FC<{ messages: CombatLogMessage[] }> = ({ messages }) => {
  const recent = messages.slice(-3);
  const latest = recent[recent.length - 1];
  const earlier = recent.slice(0, -1);

  return (
    <div className={`combat-log-ticker ${latest?.type ?? 'system'}`} aria-live="polite">
      <span className="combat-log-label">최근 결과</span>
      {latest ? (
        <>
          <p key={latest.id} className={`combat-log-line primary ${latest.type}`}>
            {latest.message}
          </p>
          {earlier.map(message => (
            <p key={message.id} className={`combat-log-line secondary ${message.type}`}>
              {message.message}
            </p>
          ))}
        </>
      ) : <p className="combat-log-line primary system">전투 시작</p>}
    </div>
  );
};

interface CombatDecisionSummaryProps {
  player: PlayerCharacter;
  enemy: EnemyCharacter;
  selectedPatterns: DetectedPattern[];
  prediction: CombatPrediction | null;
  intent: EnemyIntent | null;
}

const summarizeSelectedPatterns = (player: PlayerCharacter, patterns: DetectedPattern[]) => {
  if (patterns.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  return patterns
    .map(pattern => {
      const key = `${pattern.type}-${pattern.face ?? 'mixed'}`;
      if (seen.has(key)) return null;
      seen.add(key);
      const ability = getPlayerAbility(player.class, player.acquiredSkills, pattern.type, pattern.face);
      return {
        key,
        label: `${patternLabels[pattern.type]} ${faceLabel(pattern.face)}`,
        name: ability.name,
        face: pattern.face,
        summary: summarizeAbility(ability),
      };
    })
    .filter((item): item is NonNullable<typeof item> & { summary: EffectSummaryData } => Boolean(item));
};

export const CombatDecisionSummary: React.FC<CombatDecisionSummaryProps> = ({
  player,
  enemy,
  selectedPatterns,
  prediction,
  intent,
}) => {
  const selected = summarizeSelectedPatterns(player, selectedPatterns);
  const enemyPatternLabel = getIntentPatternLabel(intent, enemy);
  const enemyAction = intent?.damage
    ? `공격 ${intent.damage}`
    : intent?.defense
      ? `방어 ${intent.defense}`
      : intent?.description ?? '대기';

  return (
    <aside className={`combat-decision-summary ${selectedPatterns.length > 0 ? 'is-ready' : 'is-empty'}`} aria-label="combat decision summary">
      <div className="combat-decision-main">
        <span>다음 행동</span>
        {selected.length > 0 ? (
          <div className="combat-decision-tags">
            {selected.slice(0, 3).map(item => (
              <b key={item.key} className={faceClass(item.face)}>
                <EffectSummary summary={item.summary} compact hideHeadline chipLimit={2} />
                <em>{item.name}</em>
                <small>{item.label}</small>
              </b>
            ))}
            {selected.length > 3 ? <b>+{selected.length - 3}</b> : null}
          </div>
        ) : (
          <strong>밝은 족보를 선택하세요</strong>
        )}
      </div>

      <div className="combat-decision-vs">
        <span>적 예고</span>
        <strong>{enemyPatternLabel ? `${enemyPatternLabel} / ${enemyAction}` : enemyAction}</strong>
      </div>

      <div className="combat-decision-numbers">
        <span>
          <small>적에게</small>
          <b className={prediction && prediction.damageToEnemy > 0 ? 'is-good' : ''}>
            {prediction ? prediction.damageToEnemy : 0}
          </b>
        </span>
        <span>
          <small>내가 받음</small>
          <b className={prediction && prediction.damageToPlayer > 0 ? 'is-danger' : ''}>
            {prediction ? prediction.damageToPlayer : 0}
          </b>
        </span>
        <span>
          <small>내 공/방</small>
          <b>{prediction ? `${prediction.player.attack.total}/${prediction.player.defense.total}` : '0/0'}</b>
        </span>
        <span>
          <small>적 공/방</small>
          <b>{prediction ? `${prediction.enemy.attack.total}/${prediction.enemy.defense.total}` : '0/0'}</b>
        </span>
      </div>
    </aside>
  );
};

interface ClashComparisonProps {
  selectedPatterns: DetectedPattern[];
  prediction: CombatPrediction | null;
  intent: EnemyIntent | null;
  enemy: EnemyCharacter;
}

export const ClashComparison: React.FC<ClashComparisonProps> = ({
  selectedPatterns,
  prediction,
  intent,
  enemy,
}) => {
  const playerAttack = prediction?.player.attack.total ?? 0;
  const playerDefense = prediction?.player.defense.total ?? 0;
  const enemyAttack = prediction?.enemy.attack.total ?? intent?.damage ?? 0;
  const enemyDefense = prediction?.enemy.defense.total ?? intent?.defense ?? 0;
  const sourceIndices = intent?.sourceCoinIndices ?? [];
  const enemySourceCoins = sourceIndices
    .map(index => enemy.coins[index])
    .filter((coin): coin is Coin => Boolean(coin));
  const enemyPatternLabel = getIntentPatternLabel(intent, enemy);
  const enemyPatternFace = intent?.sourcePatternFace ?? enemySourceCoins[0]?.face;
  const enemyCoinLabel = sourceIndices.length > 0 ? sourceIndices.map(index => `#${index + 1}`).join(' ') : null;
  const enemySourceCoinsForTokens = enemyPatternLabel ? [] : enemySourceCoins;
  const damageToEnemy = prediction?.damageToEnemy ?? 0;
  const damageToPlayer = prediction?.damageToPlayer ?? 0;

  return (
    <div className="combat-clash-compare" aria-label="내 조합과 적 조합 비교">
      <div className="combat-clash-side player">
        <div className="combat-clash-head">
          <span>내 선택</span>
          <strong>{selectedPatterns.length}</strong>
        </div>
        <div className="combat-clash-patterns">
          {selectedPatterns.length > 0 ? selectedPatterns.slice(0, 3).map(pattern => (
            <span key={pattern.id} className={`combat-clash-token ${faceClass(pattern.face)}`}>
              {patternLabels[pattern.type]} {faceLabel(pattern.face)}
            </span>
          )) : <span className="combat-clash-token is-empty">조합 대기</span>}
        </div>
        <div className="combat-clash-stats">
          <span>공 {playerAttack}</span>
          <span>방 {playerDefense}</span>
        </div>
      </div>

      <div className="combat-clash-vs">
        <Target size={20} />
        <span>VS</span>
        <div className="combat-clash-damage-preview" aria-label="예상 피해">
          <small>예상 피해</small>
          {damageToEnemy > 0 ? <b className="player">적 -{damageToEnemy}</b> : null}
          {damageToPlayer > 0 ? <b className="enemy">나 -{damageToPlayer}</b> : null}
          {damageToEnemy <= 0 && damageToPlayer <= 0 ? <b>피해 없음</b> : null}
        </div>
      </div>

      <div className="combat-clash-side enemy">
        <div className="combat-clash-head">
          <span>적 예측</span>
          <strong>{enemyPatternLabel ?? enemySourceCoins.length}</strong>
        </div>
        <div className="combat-clash-patterns">
          {enemyPatternLabel ? (
            <span className={`combat-clash-token ${faceClass(enemyPatternFace)}`}>
              {enemyPatternFace === CoinFace.HEADS ? <Swords size={13} /> : <Shield size={13} />}
              {enemyPatternLabel}
            </span>
          ) : null}
          {enemyCoinLabel ? <span className="combat-clash-token is-empty">{enemyCoinLabel}</span> : null}
          {enemySourceCoinsForTokens.length > 0 ? enemySourceCoinsForTokens.slice(0, 4).map((coin, index) => (
            <span key={`${coin.id}-${index}`} className={`combat-clash-token ${faceClass(coin.face)}`}>
              {coin.face === CoinFace.HEADS ? <Swords size={13} /> : <Shield size={13} />}
              {faceLabel(coin.face)}
            </span>
          )) : <span className="combat-clash-token is-empty">{intent?.description ?? '행동 대기'}</span>}
        </div>
        <div className="combat-clash-stats">
          <span>공 {enemyAttack}</span>
          <span>방 {enemyDefense}</span>
        </div>
      </div>
    </div>
  );
};

export const ResultBanner: React.FC<{ banner: CombatResultBanner | null }> = ({ banner }) => (
  <AnimatePresence mode="wait">
    {banner ? (
      <motion.div
        key={banner.id}
        className={`combat-result-banner ${banner.tone}`}
        initial={{ opacity: 0, y: -10, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.96 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <strong>{banner.title}</strong>
        <span>{banner.detail}</span>
      </motion.div>
    ) : null}
  </AnimatePresence>
);

interface FocusBannerProps {
  text: string | null;
  detail?: {
    label: string;
    title: string;
    detail: string;
    description: string;
  } | null;
  revealedFace: CoinFace | null;
  variant?: 'focus' | 'notice';
  buttonLabel?: string;
  onCancel: () => void;
}

export const FocusBanner: React.FC<FocusBannerProps> = ({
  text,
  detail,
  revealedFace,
  variant = 'focus',
  buttonLabel = '취소',
  onCancel,
}) => {
  if (!text) return null;

  return (
    <motion.div
      className={`combat-focus-banner is-${variant}`}
      initial={{ opacity: 0, x: '-50%', y: -20 }}
      animate={{ opacity: 1, x: '-50%', y: 0 }}
      exit={{ opacity: 0, x: '-50%', y: -20 }}
    >
      <Info size={18} />
      <span>{text}</span>
      {detail ? (
        <span className="combat-focus-detail">
          <small>{detail.label}</small>
          <strong>{detail.title}</strong>
          <em title={detail.description}>{detail.detail}</em>
        </span>
      ) : null}
      {revealedFace ? <b>{faceLabel(revealedFace)}</b> : null}
      <button type="button" onClick={onCancel} aria-label={buttonLabel}>
        <X size={16} />
      </button>
    </motion.div>
  );
};
