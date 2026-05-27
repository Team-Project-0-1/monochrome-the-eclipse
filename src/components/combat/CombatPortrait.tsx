import React from 'react';
import { motion } from 'framer-motion';
import { PlayerCharacter, EnemyCharacter } from '../../types';

export type PortraitAnimationState = 'idle' | 'attack' | 'hurt' | 'death';

interface CombatPortraitProps {
  character: PlayerCharacter | EnemyCharacter;
  isPlayer?: boolean;
  subdued?: boolean;
  animationState?: PortraitAnimationState;
  healthPercentage?: number;
}

const frameGradients = {
  player: 'from-cyan-500/30 via-blue-500/20 to-transparent',
  enemy: 'from-red-500/30 via-rose-500/10 to-transparent',
};

const CombatPortrait: React.FC<CombatPortraitProps> = ({
  character,
  isPlayer = false,
  subdued = false,
  animationState = 'idle',
  healthPercentage = 1
}) => {
  if (!character.sprite) return null;

  // 애니메이션 상태별 설정
  const getAnimationVariants = () => {
    const baseVariants = {
      idle: {
        x: 0,
        y: 0,
        scale: 1,
        rotate: 0,
        filter: 'brightness(1) saturate(1)',
        transition: { duration: 0.3, ease: 'easeOut' }
      },
      attack: {
        x: isPlayer ? 8 : -8,
        y: -4,
        scale: 1.1,
        rotate: isPlayer ? 3 : -3,
        filter: 'brightness(1.2) saturate(1.3)',
        transition: { duration: 0.2, ease: 'easeOut' }
      },
      hurt: {
        x: [0, isPlayer ? -6 : 6, 0],
        y: [0, 2, 0],
        scale: [1, 0.95, 1],
        rotate: [0, isPlayer ? -2 : 2, 0],
        filter: 'brightness(1.5) saturate(0.7) hue-rotate(10deg)',
        transition: { duration: 0.4, ease: 'easeInOut' }
      },
      death: {
        x: 0,
        y: 8,
        scale: 0.9,
        rotate: isPlayer ? -15 : 15,
        filter: 'brightness(0.3) saturate(0.2) grayscale(0.8)',
        transition: { duration: 0.8, ease: 'easeOut' }
      }
    };

    // 체력이 낮을 때 기본 상태도 어둡게
    if (healthPercentage < 0.3 && animationState === 'idle') {
      baseVariants.idle.filter = 'brightness(0.8) saturate(0.8)';
    }

    return baseVariants;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{
        opacity: subdued ? 0.4 : (animationState === 'death' ? 0.6 : 1),
        y: 0
      }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative flex justify-center w-full"
    >
      <div className={`relative overflow-visible rounded-2xl border border-white/10 bg-slate-900/70 shadow-2xl shadow-black/40 w-full`}>
        <div className={`absolute inset-0 bg-gradient-to-tr ${isPlayer ? frameGradients.player : frameGradients.enemy} rounded-2xl`} />

        {/* Character Type Label */}
        <div className="absolute top-2 left-2 right-2 z-20 text-center">
          <div className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-300/80 bg-black/40 rounded px-2 py-1 backdrop-blur-sm">
            {isPlayer ? 'PLAYER' : 'ENEMY'}
          </div>
        </div>

        {/* Character Image Container - 정사각형 유지하되 여유 공간 확보 */}
        <div className="relative z-10 aspect-square p-6 pt-10 pb-12 flex items-center justify-center">
          <motion.img
            src={character.sprite}
            alt={`${character.name} portrait`}
            className={`w-full h-full object-contain drop-shadow-[0_15px_35px_rgba(15,23,42,0.65)] ${!isPlayer ? 'scale-x-[-1]' : ''}`}
            animate={getAnimationVariants()[animationState]}
          />
        </div>

        {/* Character Name */}
        <div className="absolute bottom-2 left-2 right-2 z-20 text-center">
          <div className="text-xs font-semibold text-white bg-black/60 rounded px-2 py-1 backdrop-blur-sm">
            {character.name}
          </div>
        </div>

        {/* Battle stance indicator */}
        {isPlayer && (
          <div className="absolute top-1/2 right-1 transform -translate-y-1/2 z-30">
            <div className="w-2 h-8 bg-cyan-400/60 rounded-full animate-pulse"></div>
          </div>
        )}
        {!isPlayer && (
          <div className="absolute top-1/2 left-1 transform -translate-y-1/2 z-30">
            <div className="w-2 h-8 bg-red-400/60 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CombatPortrait;
