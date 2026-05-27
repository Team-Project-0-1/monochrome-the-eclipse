import React from 'react';
import { motion } from 'framer-motion';
import { Swords } from 'lucide-react';

interface HealthBarProps {
  current: number;
  max: number;
  temporaryDefense?: number;
  predictedDamage?: number;
  isPlayer?: boolean;
}

/**
 * HP 색상은 디자인 토큰(`--color-tone-*`)을 참조한다.
 * 전투 무대의 `CombatOverheadVitals`와 동일한 임계값/색상을 공유하기 위한 단일 정의.
 *
 * 임계값:
 *   > 60% : safe (초록)
 *   30~60% : trade (호박)
 *   < 30% : danger (적)
 */
const resolveHpColor = (percentage: number): string => {
  if (percentage > 60) return 'var(--color-tone-safe)';
  if (percentage > 30) return 'var(--color-tone-trade)';
  return 'var(--color-tone-danger)';
};

const HealthBar = ({
  current,
  max,
  temporaryDefense = 0,
  predictedDamage = 0,
  isPlayer = false,
}: HealthBarProps): React.JSX.Element => {
  const currentHp = Math.max(0, current);
  const healthPercentage = max > 0 ? (currentHp / max) * 100 : 0;
  const defensePercentage = max > 0 ? (Math.min(max, temporaryDefense) / max) * 100 : 0;

  const damageAfterDefense = Math.max(0, predictedDamage - temporaryDefense);
  const predictedHp = Math.max(0, currentHp - damageAfterDefense);
  const predictedPercentage = max > 0 ? (predictedHp / max) * 100 : 0;

  const hpColor = resolveHpColor(healthPercentage);
  const sideToneClass = isPlayer ? 'text-blue-100' : 'text-red-100';
  const trackBgClass = isPlayer ? 'bg-blue-900/70' : 'bg-red-900/70';

  return (
    <div className="w-full" data-side={isPlayer ? 'player' : 'enemy'}>
      <div className={`flex items-baseline justify-between mb-1 ${sideToneClass}`}>
        <span className="text-xs font-medium">체력</span>
        <div className="text-right">
          <span className="text-sm font-bold font-orbitron tracking-wider">
            {currentHp}/{max}
          </span>
          {temporaryDefense > 0 && (
            <span className="text-xs ml-1" style={{ color: 'var(--color-face-tails)' }}>
              (+{temporaryDefense})
            </span>
          )}
        </div>
      </div>
      <div
        className={`w-full ${trackBgClass} rounded-full h-4 relative overflow-hidden shadow-inner border border-black/20`}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={currentHp}
        aria-label={`${isPlayer ? '플레이어' : '적'} 체력 ${currentHp} / ${max}`}
      >
        {/* 예측 체력 배경 (피격 시 깎일 위치) */}
        <motion.div
          className="absolute top-0 left-0 h-full rounded-l-full"
          style={{ backgroundColor: 'var(--color-tone-danger-soft)' }}
          initial={false}
          animate={{ width: `${predictedPercentage}%` }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        />

        {/* 현재 체력 */}
        <motion.div
          className="h-full relative rounded-l-full"
          style={{ backgroundColor: hpColor }}
          animate={{ width: `${healthPercentage}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        >
          <div className="absolute inset-0 bg-white/10" />
        </motion.div>

        {/* 임시 방어 (오버레이) */}
        {defensePercentage > 0 && (
          <motion.div
            className="absolute top-0 left-0 h-full rounded-l-full pointer-events-none border-r-2"
            style={{
              backgroundColor: 'var(--color-face-tails-soft)',
              borderRightColor: 'var(--color-face-tails)',
            }}
            initial={false}
            animate={{ width: `${defensePercentage}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </motion.div>
        )}

        {/* 예측 피해 표시 */}
        {damageAfterDefense > 0 && (
          <motion.div
            key={predictedDamage}
            className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center gap-1 text-sm font-bold"
            style={{
              textShadow: '0 1px 2px rgba(0,0,0,0.8)',
              color: 'var(--color-tone-danger)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Swords size={14} />
            <span>-{damageAfterDefense}</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default HealthBar;
