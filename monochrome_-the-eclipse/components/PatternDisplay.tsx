import React, { useMemo } from 'react';
import { DetectedPattern, PatternType, CoinFace, CharacterClass } from '../types';
import { getPlayerAbility } from '../data/dataSkills';
import { CheckCircle, PlusCircle, XCircle } from 'lucide-react';
import EffectSummary from './EffectSummary';
import { summarizeAbility } from '../utils/effectSummary';

interface PatternDisplayProps {
  patterns: DetectedPattern[];
  onPatternGroupClick: (type: PatternType, face: CoinFace | undefined) => void;
  selectedPatterns: DetectedPattern[];
  playerClass: CharacterClass;
  usedCoinIndices: number[];
  acquiredSkills: string[];
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

const PatternDisplay: React.FC<PatternDisplayProps> = ({ patterns, onPatternGroupClick, selectedPatterns, playerClass, usedCoinIndices, acquiredSkills }) => {
    
  const groupedPatterns = useMemo(() => {
    const groups: { [key: string]: {
        type: PatternType;
        face?: CoinFace;
        abilityDef: any;
        allInstances: DetectedPattern[];
    } } = {};

    patterns.forEach(p => {
        const key = `${p.type}-${p.face || 'special'}`;
        if (!groups[key]) {
            const abilityDef = getPlayerAbility(playerClass, acquiredSkills, p.type, p.face);
            groups[key] = {
                type: p.type,
                face: p.face,
                abilityDef,
                allInstances: [],
            };
        }
        groups[key].allInstances.push(p);
    });
    
    return Object.values(groups).sort((a,b) => {
        const aFirstInstance = a.allInstances[0];
        const bFirstInstance = b.allInstances[0];
        if (bFirstInstance.count !== aFirstInstance.count) return bFirstInstance.count - aFirstInstance.count;
        return (a.abilityDef.name || "").localeCompare(b.abilityDef.name || "");
    });
  }, [patterns, playerClass, acquiredSkills]);

  return (
    <div className="flex flex-col h-full">
      <div className="space-y-2 flex-grow overflow-y-auto pr-2">
        {groupedPatterns.map((group) => {
          const { type, face, abilityDef, allInstances } = group;
          const key = `${type}-${face || 'special'}`;

          const selectedInstances = selectedPatterns.filter(p => p.type === type && p.face === face);
          const numSelected = selectedInstances.length;

          // An instance is available if it's not already selected and none of its coins conflict with ANY selected pattern.
          const isNextAvailable = allInstances.some(p => 
            !selectedPatterns.some(sp => sp.id === p.id) && 
            !p.indices.some(idx => usedCoinIndices.includes(idx))
          );
          
          const isDisabled = numSelected === 0 && !isNextAvailable;
          const isMaxedOut = numSelected >= 2 || (numSelected > 0 && !isNextAvailable);

          const patternTypeName = patternTypeNames[type] || type;
          const faceName = face ? `(${coinFaceNames[face]})` : "(특수)";
          
          let buttonText = abilityDef.name;
          if (isMaxedOut) buttonText = "선택 해제";
          else if (numSelected > 0) buttonText = "추가 선택";
          
          let ButtonIcon = PlusCircle;
          if(isMaxedOut) ButtonIcon = XCircle;
          else if (numSelected > 0) ButtonIcon = CheckCircle;
          
          return (
            <div key={key} className="relative">
              <button
                onClick={() => onPatternGroupClick(type, face)}
                disabled={isDisabled}
                className={`group w-full p-3 rounded-lg border-2 transition-all duration-200 text-left relative
                            ${numSelected > 0 ? "bg-blue-600 text-white border-blue-500 shadow-lg ring-2 ring-yellow-400 scale-105" 
                                        : isDisabled 
                                        ? "bg-gray-800 text-gray-500 border-gray-700 opacity-60 cursor-not-allowed"
                                        : "bg-gray-700 text-gray-200 border-gray-600 hover:border-blue-400 hover:bg-gray-600"}`}
              >
                <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm">{abilityDef.name}</span>
                        <span className="text-xs opacity-75">
                          {patternTypeName} {faceName}
                        </span>
                      </div>
                      <EffectSummary
                        summary={summarizeAbility(abilityDef)}
                        compact
                        hideHeadline
                        chipLimit={4}
                        className="pattern-display-summary"
                      />
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                        isMaxedOut ? 'bg-red-500' : numSelected > 0 ? 'bg-blue-500' : 'bg-gray-600'
                    }`}>
                        <ButtonIcon size={16} />
                        <span className="text-xs font-semibold">{buttonText}</span>
                    </div>
                </div>
                {numSelected > 0 && (
                  <div className="absolute top-1 right-1 w-6 h-6 bg-yellow-400 text-black rounded-full flex items-center justify-center font-bold text-sm border-2 border-gray-800">
                    {numSelected}
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
      {groupedPatterns.length === 0 && (
        <div className="text-center py-6 text-gray-400 bg-gray-700 rounded-lg flex-grow flex flex-col justify-center items-center">
          <div className="text-3xl mb-2">🎲</div>
          <div className="font-semibold">사용 가능한 패턴이 없습니다</div>
          <div className="text-sm mt-1">동전을 다시 굴려보세요</div>
        </div>
      )}
    </div>
  );
};

export default PatternDisplay;
