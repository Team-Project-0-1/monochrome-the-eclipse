import React from 'react';
import { PlayerCharacter, EnemyCharacter, StatusEffectType } from '../types';
import { effectConfig, effectIconPaths } from '../data/dataEffects';
import { assetPath } from '../utils/assetPath';

interface EnhancedStatusEffectDisplayProps {
  effects: PlayerCharacter["statusEffects"] | EnemyCharacter["statusEffects"];
}

const EnhancedStatusEffectDisplay: React.FC<EnhancedStatusEffectDisplayProps> = ({ effects }) => {
  const activeEffects = Object.entries(effects).filter(
    (entry): entry is [StatusEffectType, number] => typeof entry[1] === 'number' && entry[1] > 0
  );

  if (activeEffects.length === 0) {
    return <div className="text-xs text-gray-400 italic py-2 text-center">활성 효과 없음</div>;
  }

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-gray-300 mb-1">상태 효과</div>
      <div className="flex flex-wrap gap-2">
        {activeEffects.map(([type, value]) => {
          const config = effectConfig[type as StatusEffectType];
          if (!config) return null;
          const iconPath = effectIconPaths[type as StatusEffectType];
          return (
            <div
              key={type}
              className={`px-2 py-1 rounded-md border text-xs shadow-sm transition-all duration-200 hover:scale-105 ${config.color}`}
              title={config.description}
            >
              <div className="flex items-center gap-1.5">
                {iconPath ? (
                  <img className="status-effect-icon-img" src={assetPath(iconPath)} alt="" loading="lazy" />
                ) : (
                  <span className="text-base">{config.icon}</span>
                )}
                <div className="leading-tight">
                  <div className="font-semibold">{config.name}</div>
                  <div className="flex items-center gap-0.5">
                    <span className="font-bold text-sm">{value}</span>
                    {config.isBuff ? (
                      <span className="text-green-300">↑</span>
                    ) : (
                      <span className="text-red-300">↓</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EnhancedStatusEffectDisplay;
