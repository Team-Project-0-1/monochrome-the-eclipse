import React from 'react';
import { CoinFace, EnemyCharacter, EnemyIntent, PatternType } from '../types';
import { monsterData, monsterPatterns } from '../data/dataMonsters';
import { Swords, Shield, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import EffectSummary from './EffectSummary';
import { summarizeAbility } from '../utils/effectSummary';
import EnemyIntentDisplay from './EnemyIntentDisplay';

interface EnemyActionPanelProps {
  enemy: EnemyCharacter | null;
  intent: EnemyIntent | null;
}

const patternTypeNames: { [key in PatternType]: string } = {
  [PatternType.PAIR]: "2연",
  [PatternType.TRIPLE]: "3연",
  [PatternType.QUAD]: "4연",
  [PatternType.PENTA]: "5연",
  [PatternType.UNIQUE]: "유일",
  [PatternType.AWAKENING]: "각성",
};
const coinFaceNames: { [key in CoinFace]: string } = {
  [CoinFace.HEADS]: "앞면",
  [CoinFace.TAILS]: "뒷면",
};

// FIX: Changed component from React.FC to a standard function component to resolve framer-motion prop type errors.
const EnemyActionPanel = ({ enemy, intent }: EnemyActionPanelProps): React.JSX.Element | null => {
  if (!enemy || !intent) return null;

  const coins = enemy.coins || [];
  const usedCoinIndices = intent.sourceCoinIndices || [];
  const allPossibleSkillKeys = monsterData[enemy.key]?.patterns || [];

  return (
    <div className="bg-gray-800 p-4 rounded-lg border-2 border-red-900/50 h-full flex flex-col">
      <h3 className="text-center font-bold text-red-400 mb-3 flex items-center justify-center gap-2 flex-shrink-0">
        <Eye className="w-5 h-5" />
        적의 행동
      </h3>

      <motion.div 
        className="enemy-action-intent-card p-3 mb-4 bg-gray-900/50 rounded-md border border-gray-700 flex-shrink-0"
        animate={{
            borderColor: ["rgba(220, 38, 38, 0.5)", "rgba(252, 165, 165, 0.7)", "rgba(220, 38, 38, 0.5)"],
            boxShadow: ["0 0 5px rgba(220, 38, 38, 0.3)", "0 0 15px rgba(252, 165, 165, 0.5)", "0 0 5px rgba(220, 38, 38, 0.3)"],
        }}
        transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
        }}
      >
        <EnemyIntentDisplay enemy={enemy} intent={intent} variant="panel" />
      </motion.div>

      <div className="flex justify-center gap-3 mb-4 flex-shrink-0">
        {coins.map((coin, index) => {
          const isUsed = usedCoinIndices.includes(index);
          return (
            <div key={coin.id} className="relative text-center flex flex-col items-center">
              <div className="relative w-16 h-16">
                 <div
                    className={`relative w-full h-full rounded-full border-4 flex items-center justify-center font-bold text-xl shadow-md transition-transform hover:scale-110 ${
                    coin.face === CoinFace.HEADS
                        ? "bg-red-500 border-red-300 text-white"
                        : "bg-blue-500 border-blue-300 text-white"
                    } ${isUsed ? "ring-4 ring-yellow-400 ring-offset-2 ring-offset-gray-800" : ""}`}
                >
                    {coin.face === CoinFace.HEADS ? (
                    <Swords size={28} />
                    ) : (
                    <Shield size={28} />
                    )}
                 </div>
              </div>
              <span className="text-xs text-gray-400 mt-1">#{index + 1}</span>
            </div>
          );
        })}
      </div>
      <div className="flex-grow min-h-0 overflow-y-auto pr-2 space-y-2">
        <h4 className="text-sm font-bold text-gray-400 mb-2 text-center">보유한 기술</h4>
        {allPossibleSkillKeys.length > 0 ? (
          allPossibleSkillKeys.map((skillKey) => {
            const skillDef = monsterPatterns[skillKey];
            if (!skillDef) return null;

            const isUsed = intent.sourcePatternKeys.includes(skillKey);
            const isDetected = enemy.detectedPatterns.some(p => p.type === skillDef.type && (!skillDef.face || p.face === skillDef.face));

            const patternTypeName = patternTypeNames[skillDef.type];
            const faceName = skillDef.face ? `(${coinFaceNames[skillDef.face]})` : '';
            
            return (
              <div
                key={skillKey}
                className={`p-3 rounded-lg border-2 transition-all ${
                  isUsed
                    ? 'bg-red-900/40 border-yellow-400 shadow-lg'
                    : isDetected
                    ? 'bg-gray-700/80 border-gray-600'
                    : 'bg-gray-800 border-gray-700 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold ${isDetected ? 'text-gray-100' : 'text-gray-500'}`}>
                    {skillDef.name}
                    </span>
                    <span className={`text-xs ${isDetected ? 'text-gray-400' : 'text-gray-600'}`}>
                    {patternTypeName} {faceName}
                    </span>
                </div>
                <EffectSummary
                  summary={summarizeAbility(skillDef)}
                  compact
                  chipLimit={4}
                  showDetail="details"
                  className={`enemy-action-effect-summary ${isDetected ? '' : 'is-muted'}`}
                />
              </div>
            );
          })
        ) : (
          <p className="text-center text-gray-500 text-sm py-4">
            기술 없음
          </p>
        )}
      </div>
    </div>
  );
};

export default EnemyActionPanel;
