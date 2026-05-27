import React, { useMemo, useEffect } from 'react';
import { PlayerCharacter, EnemyCharacter, StatusEffectType, LucideIcon, CharacterClass, CombatPrediction } from '../types';
import HealthBar from './HealthBar';
import EnhancedStatusEffectDisplay from './EnhancedStatusEffectDisplay';
import { Heart, Swords, Shield, AlertTriangle, Zap, Target, ShieldCheck, Ghost, Star, Skull, Square } from 'lucide-react';
import { motion, useAnimation } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { assetPath } from '../utils/assetPath';

interface CharacterStatusProps {
  character: PlayerCharacter | EnemyCharacter;
  isPlayer?: boolean;
  prediction?: CombatPrediction | null;
}

const playerIcons: { [key in CharacterClass]: LucideIcon } = {
  [CharacterClass.WARRIOR]: Zap,
  [CharacterClass.ROGUE]: Target,
  [CharacterClass.TANK]: ShieldCheck,
  [CharacterClass.MAGE]: Ghost,
};

const monsterIcons: { [key: string]: LucideIcon } = {
  marauder1: Swords,
  marauder2: Shield,
  infectedDog: Skull,
  marauderLeader: Star,
  lumenReaper: Ghost,
  shadowWraith: Ghost,
  doppelganger: Square,
  unpleasantCube: Square,
  entity162: Skull,
  chimera: Star,
};

const CharacterStatus = ({ character, isPlayer = false, prediction }: CharacterStatusProps): React.JSX.Element => {
  const hitCount = useGameStore(state => isPlayer ? state.playerHit : state.enemyHit);
  const flashControls = useAnimation();
  const shakeControls = useAnimation();

  useEffect(() => {
    // Only trigger if hitCount actually changes and is not the initial render
    if (hitCount > 0) {
      // More intense flash for both player and enemy
      flashControls.start({
        backgroundColor: ["rgba(255, 80, 80, 0.6)", "rgba(255, 80, 80, 0)"],
        transition: { duration: 0.5, ease: "easeOut" }
      });

      // Add a shake animation only for the player character
      if (isPlayer) {
        shakeControls.start({
          x: [0, -8, 8, -8, 8, -5, 5, 0],
          transition: { type: "spring", stiffness: 1000, damping: 15, duration: 0.4 }
        });
      }
    }
  }, [hitCount, flashControls, shakeControls, isPlayer]);

  const getIcon = () => {
    if (isPlayer) {
      const pc = character as PlayerCharacter;
      return playerIcons[pc.class] || Heart;
    } else {
      const ec = character as EnemyCharacter;
      return monsterIcons[ec.key] || Skull;
    }
  };

  const Icon = getIcon();
  const portraitSrc = 'portraitSrc' in character && character.portraitSrc ? assetPath(character.portraitSrc) : undefined;
  const weapon = isPlayer && 'weapon' in character ? character.weapon : undefined;
  const signature = isPlayer && 'signature' in character ? character.signature : undefined;

  const temporaryDefense = Number(character.temporaryDefense) || 0;

  const containerClass = isPlayer
    ? "bg-gray-800/90 border-blue-700/50 text-blue-100"
    : "bg-gray-800/90 border-red-700/50 text-red-100";

  const iconBgClass = isPlayer ? "bg-blue-900" : "bg-red-900";

  const predictedDamage = isPlayer ? prediction?.damageToPlayer : prediction?.damageToEnemy;

  return (
    <motion.div
      animate={shakeControls}
      className={`entity-status-card p-4 rounded-lg border shadow-xl ${containerClass} relative backdrop-blur-sm`}
    >
       <motion.div
        className="absolute inset-0 rounded-lg pointer-events-none z-0"
        animate={flashControls}
      />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`h-14 w-14 overflow-hidden rounded-md ${iconBgClass} shadow-md ring-1 ring-white/10`}>
              {portraitSrc ? (
                <img src={portraitSrc} alt="" className="h-full w-full object-cover object-center" loading="lazy" decoding="async" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-xl font-orbitron">{character.name}</h3>
              {"title" in character && character.title && (
                <p className="text-xs opacity-80 font-medium">
                  {character.title}
                </p>
              )}
              {weapon && (
                <p className="text-xs font-medium text-cyan-200/90">
                  무기: {weapon}
                </p>
              )}
              {signature && (
                <p className="text-xs font-medium text-gray-300">
                  {signature}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
             <div className="flex flex-col items-center px-2 py-1 rounded-md bg-black/20">
                <div className="flex items-center gap-1 text-xs text-red-300 opacity-80"><Swords size={12}/>공격</div>
                <div className="font-bold text-lg font-orbitron">{character.baseAtk}</div>
             </div>
             <div className="flex flex-col items-center px-2 py-1 rounded-md bg-black/20">
                <div className="flex items-center gap-1 text-xs text-blue-300 opacity-80"><Shield size={12}/>방어</div>
                <div className="font-bold text-lg font-orbitron">{character.baseDef}</div>
             </div>
          </div>
        </div>

        <div className="mb-4">
          <HealthBar
            current={character.currentHp}
            max={character.maxHp}
            temporaryDefense={temporaryDefense}
            predictedDamage={predictedDamage}
            isPlayer={isPlayer}
          />
        </div>

        <div className="min-h-[4rem]">
          <EnhancedStatusEffectDisplay effects={character.statusEffects} />
        </div>
      </div>
    </motion.div>
  );
};

export default CharacterStatus;
