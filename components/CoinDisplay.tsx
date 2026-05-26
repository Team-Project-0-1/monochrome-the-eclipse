import React from 'react';
import { Coin, CoinFace } from '../types';
import { Check, HelpCircle, Lock, Repeat, Shield, Sparkles, Swords } from 'lucide-react';
import { motion } from 'framer-motion';

interface CoinDisplayProps {
  coin: Coin;
  index: number;
  onClick: ((index: number) => void) | null;
  isUsed?: boolean;
  isSwapTarget?: boolean;
  isSkillTarget?: boolean;
  isSelectedForSkill?: boolean;
}

type CoinStateKey = 'selected' | 'swap' | 'skill' | 'used' | 'idle';

interface CoinStateMeta {
  key: CoinStateKey;
  /** 칩에 그릴 짧은 라벨 (한국어). idle은 칩을 그리지 않음 */
  label: string;
  /** 칩 색 토큰. tokens.css 참조 */
  toneClass: string;
  /** 칩 아이콘 */
  Icon: React.ComponentType<{ size?: number }>;
  /** ring/outline Tailwind 클래스 */
  ringClass: string;
  /** 코인 자체에 입힐 보조 효과 클래스 (애니메이션 등) */
  pulseClass?: string;
  /** 스크린리더용 보조 문구 */
  describe: string;
}

const COIN_STATE_META: Record<CoinStateKey, CoinStateMeta> = {
  selected: {
    key: 'selected',
    label: '확정',
    toneClass: 'coin-state-pill is-selected',
    Icon: Check,
    ringClass: 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-emerald-950',
    describe: '액티브 스킬 적용 대상으로 확정됨',
  },
  swap: {
    key: 'swap',
    label: '교체',
    toneClass: 'coin-state-pill is-swap',
    Icon: Repeat,
    ringClass: 'ring-4 ring-cyan-300',
    pulseClass: 'animate-pulse',
    describe: '예비 동전과 교체할 동전을 선택하는 중',
  },
  skill: {
    key: 'skill',
    label: '선택',
    toneClass: 'coin-state-pill is-skill',
    Icon: Sparkles,
    ringClass: 'ring-4 ring-violet-300 ring-offset-2 ring-offset-violet-950',
    pulseClass: 'animate-pulse-shadow',
    describe: '액티브 스킬 대상 후보',
  },
  used: {
    key: 'used',
    label: '사용 예정',
    toneClass: 'coin-state-pill is-used',
    Icon: Shield,
    ringClass: 'ring-2 ring-amber-300/80',
    describe: '선택한 족보에서 이 턴에 사용 예정',
  },
  idle: {
    key: 'idle',
    label: '',
    toneClass: '',
    Icon: HelpCircle,
    ringClass: '',
    describe: '',
  },
};

const resolveCoinState = (props: Pick<CoinDisplayProps, 'isUsed' | 'isSwapTarget' | 'isSkillTarget' | 'isSelectedForSkill'>): CoinStateMeta => {
  if (props.isSelectedForSkill) return COIN_STATE_META.selected;
  if (props.isSwapTarget) return COIN_STATE_META.swap;
  if (props.isSkillTarget) return COIN_STATE_META.skill;
  if (props.isUsed) return COIN_STATE_META.used;
  return COIN_STATE_META.idle;
};

const CoinDisplay: React.FC<CoinDisplayProps> = ({
  coin,
  index,
  onClick,
  isUsed = false,
  isSwapTarget = false,
  isSkillTarget = false,
  isSelectedForSkill = false,
}) => {
  const isHeads = coin.face === CoinFace.HEADS;
  const isTails = coin.face === CoinFace.TAILS;
  const faceLabel = isHeads ? '앞면' : isTails ? '뒷면' : '미확인';

  // 동전 면 색상은 styles/tokens.css의 `.coin-face` 시맨틱 클래스에서 단일 정의된다.
  // 정책 전환(GDD 노랑/시안 등) 시 tokens.css의 --color-face-* 만 바꾸면 일괄 적용된다.
  const faceClass = isHeads
    ? 'coin-face is-heads'
    : isTails
      ? 'coin-face is-tails'
      : 'coin-face is-unknown';

  const state = resolveCoinState({ isUsed, isSwapTarget, isSkillTarget, isSelectedForSkill });
  const StateIcon = state.Icon;

  const interactiveText = !onClick
    ? '전투 중에는 동전을 직접 뒤집을 수 없습니다. 액티브 스킬, 예비 동전 교체 등을 활용하여 결과를 바꾸세요.'
    : `동전 #${index + 1} - ${faceLabel}`;

  const titleText = coin.locked
    ? `동전 #${index + 1} 잠김`
    : state.key === 'idle'
      ? interactiveText
      : `동전 #${index + 1} · ${faceLabel} · ${state.describe}`;

  const ariaLabel = [
    `슬롯 ${index + 1}`,
    faceLabel,
    coin.locked ? '잠김' : null,
    state.describe || null,
  ].filter(Boolean).join(', ');

  const slotClasses = [
    'coin-display-slot relative text-center flex flex-col items-center',
    isUsed ? 'is-used' : '',
    isSwapTarget ? 'is-swap-target' : '',
    isSkillTarget ? 'is-skill-target' : '',
    isSelectedForSkill ? 'is-selected-for-skill' : '',
    `coin-state-${state.key}`,
  ].filter(Boolean).join(' ');

  const coinClasses = [
    'coin-face-current relative w-full h-full rounded-full border-4 flex items-center justify-center text-white',
    faceClass,
    state.pulseClass ?? '',
    !onClick || coin.locked
      ? 'cursor-help'
      : 'cursor-pointer hover:scale-110 active:scale-100 transition-transform duration-200',
    state.ringClass,
  ].filter(Boolean).join(' ');

  return (
    <div className={slotClasses} data-coin-state={state.key}>
      <div className="relative w-16 h-16">
        <div className="w-16 h-16">
          <motion.div
            key={`${coin.id}-${coin.face ?? 'unknown'}`}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick && !coin.locked ? 0 : -1}
            aria-label={ariaLabel}
            aria-pressed={state.key === 'selected' || undefined}
            onClick={() => onClick && !coin.locked && onClick(index)}
            onKeyDown={(event) => {
              if (!onClick || coin.locked) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick(index);
              }
            }}
            className={coinClasses}
            initial={{ rotateY: 0, scale: 0.96 }}
            animate={{ rotateY: 0, scale: 1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            title={titleText}
          >
            {isHeads ? <Swords size={28} /> : isTails ? <Shield size={28} /> : <HelpCircle size={28} />}
          </motion.div>
        </div>

        <span className="coin-slot-badge" aria-hidden="true">{index + 1}</span>

        {state.key !== 'idle' && (
          <span
            className={state.toneClass}
            aria-hidden="true"
            title={state.describe}
          >
            <StateIcon size={11} />
            <em>{state.label}</em>
          </span>
        )}

        {coin.locked && (
          <div
            className="coin-lock-badge absolute -bottom-1 -right-1 w-5 h-5 border-2 rounded-full flex items-center justify-center z-10"
            title="잠김"
            aria-hidden="true"
          >
            <Lock size={10} className="text-white" />
          </div>
        )}
      </div>
    </div>
  );
};

export default CoinDisplay;
