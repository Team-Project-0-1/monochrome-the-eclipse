import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { effectConfig, effectIconPaths } from '../../data/dataEffects';
import { CombatEffect as CombatEffectType } from '../../types';
import { assetPath } from '../../utils/assetPath';

interface CombatEffectProps {
  effect: CombatEffectType;
  onComplete: (id: number) => void;
}

const EFFECT_LIFETIME_MS = 950;
const impactIconPath = 'assets/icons/combat/effect-slash-impact.png';
const defenseIconPath = 'assets/icons/combat/effect-shield-flare.png';

const floatMotion = {
  initial: { y: 12, opacity: 0, scale: 0.94 },
  animate: { y: -34, opacity: [0, 1, 1, 0], scale: [0.94, 1.04, 1] },
  transition: { duration: EFFECT_LIFETIME_MS / 1000, ease: 'easeOut' as const, times: [0, 0.16, 0.72, 1] },
};

const CombatEffect: React.FC<CombatEffectProps> = ({ effect, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete(effect.id);
    }, EFFECT_LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [effect.id, onComplete]);

  const renderEffect = (): React.ReactNode => {
    switch (effect.type) {
      case 'damage':
        return (
          <motion.div className="combat-effect-float damage" {...floatMotion}>
            <img className="combat-effect-icon-img is-impact" src={assetPath(impactIconPath)} alt="" />
            -{effect.data.amount}
          </motion.div>
        );
      case 'heal':
        return (
          <motion.div className="combat-effect-float heal" {...floatMotion}>
            <Heart size={16} /> +{effect.data.amount}
          </motion.div>
        );
      case 'defense':
        return (
          <motion.div className="combat-effect-float defense" {...floatMotion}>
            <img className="combat-effect-icon-img is-impact" src={assetPath(defenseIconPath)} alt="" />
            +{effect.data.amount}
          </motion.div>
        );
      case 'status': {
        const config = effectConfig[effect.data.statusType];
        if (!config) return null;
        const iconPath = effectIconPaths[effect.data.statusType];
        const value = effect.data.value;
        const isBuff = value > 0;
        return (
          <motion.div className={`combat-effect-float status ${isBuff ? 'buff' : 'debuff'}`} {...floatMotion}>
            {iconPath ? (
              <img className="combat-effect-icon-img" src={assetPath(iconPath)} alt="" />
            ) : (
              <span className="combat-effect-icon">{config.icon}</span>
            )}
            <span>{config.name} {isBuff ? '+' : ''}{value}</span>
          </motion.div>
        );
      }
      case 'temp_stat': {
        const { stat, value: statValue, duration } = effect.data;
        const isStatBuff = statValue > 0;
        const iconPath = stat === 'attack' ? impactIconPath : defenseIconPath;
        return (
          <motion.div className={`combat-effect-float temp-stat ${isStatBuff ? 'buff' : 'debuff'}`} {...floatMotion}>
            <img className="combat-effect-icon-img is-impact" src={assetPath(iconPath)} alt="" />
            <span>{stat === 'attack' ? '공격' : '방어'} {isStatBuff ? '+' : ''}{statValue} ({duration}턴)</span>
          </motion.div>
        );
      }
      case 'skill':
        return null;
      default:
        return null;
    }
  };

  const renderedEffect = renderEffect();
  if (!renderedEffect) return null;

  return (
    <div className={`combat-effect-layer ${effect.type}`}>
      {renderedEffect}
    </div>
  );
};

export default CombatEffect;
