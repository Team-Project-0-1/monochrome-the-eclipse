import React, { useState, useMemo } from 'react';
import { PlayerCharacter, SkillUpgradeDefinition, PatternUpgradeDefinition, PatternType, CoinFace, StatusEffectType, LucideIcon } from '../types';
import { playerSkillUnlocks, playerAbilities } from '../data/dataSkills';
import { patternUpgrades } from '../data/dataUpgrades';
import { MAX_SKILLS } from '../constants';
import { X, Trash2, Zap, Droplet, Shield, Ghost, BookOpen, Star } from 'lucide-react';
import EffectSummary from './EffectSummary';
import { summarizeDescription } from '../utils/effectSummary';
import { assetPath } from '../utils/assetPath';
import { patternIconPaths } from '../utils/progressionAssets';
import { faceClass, faceLabel, patternLabels } from '../utils/combatPresentation';

interface InventoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerCharacter;
  unlockedPatterns: string[];
  onForgetSkill: (skillId: string) => void;
}

const synergyTypes: { type: StatusEffectType; name: string; icon: LucideIcon }[] = [
    { type: StatusEffectType.AMPLIFY, name: '증폭/공명', icon: Zap },
    { type: StatusEffectType.BLEED, name: '출혈/표식', icon: Droplet },
    { type: StatusEffectType.SHATTER, name: '분쇄/반격', icon: Shield },
    { type: StatusEffectType.CURSE, name: '저주/봉인', icon: Ghost },
];


interface DisplaySkill {
    id: string;
    name: string;
    description: string;
    replaces: { type: PatternType; face?: CoinFace };
    isBase: boolean;
    effect: (...args: any[]) => any;
}


const InventoryPanel: React.FC<InventoryPanelProps> = ({ isOpen, onClose, player, unlockedPatterns, onForgetSkill }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'passive'>('active');
  const [sortBy, setSortBy] = useState<'default' | 'name' | 'pattern'>('default');
  const [filterType, setFilterType] = useState<'all' | 'attack' | 'defense'>('all');
  const [filterSynergy, setFilterSynergy] = useState<StatusEffectType | 'all'>('all');

  const currentSkills = useMemo((): DisplaySkill[] => {
    const classAbilities = playerAbilities[player.class];
    if (!classAbilities) return [];

    const acquiredDefs = player.acquiredSkills
      .map(id => playerSkillUnlocks[player.class]?.[id])
      .filter((def): def is SkillUpgradeDefinition => !!def);
      
    const replacedSlots = new Set(acquiredDefs.map(def => `${def.replaces.type}-${def.replaces.face}`));

    const baseSkills: DisplaySkill[] = [];
    for (const patternTypeStr in classAbilities) {
      const patternType = patternTypeStr as PatternType;
      const patternsForType = classAbilities[patternType];
      
      for (const faceStr in patternsForType) {
        const face = faceStr as CoinFace;
        const abilityDef = (patternsForType as any)[face];
        if (abilityDef && abilityDef.name) {
          const slotKey = `${patternType}-${face}`;
          if (!replacedSlots.has(slotKey)) {
            baseSkills.push({
              ...(abilityDef as any),
              id: `base-${patternType}-${face}`,
              replaces: { type: patternType, face: face },
              isBase: true,
            });
          }
        }
      }
    }
    
    const allSkills: DisplaySkill[] = [
        ...baseSkills, 
        ...acquiredDefs.map(skill => ({...skill, isBase: false}))
    ];

    return allSkills;
  }, [player.class, player.acquiredSkills]);

  const passiveSkills = useMemo(() => {
    const classPassives = patternUpgrades[player.class];
    if (!classPassives) return [];
    
    return unlockedPatterns
        .map(id => classPassives[id])
        .filter((def): def is PatternUpgradeDefinition => !!def);
  }, [player.class, unlockedPatterns]);

  const filteredAndSortedSkills = useMemo(() => {
    let skills = [...currentSkills];

    if (filterType !== 'all') {
      skills = skills.filter(skill => {
        const desc = skill.description.toLowerCase();
        const summary = summarizeDescription(skill.description);
        const isAttack = desc.includes('피해') || desc.includes('공격') || summary.chips.some(chip => chip.tone === 'damage');
        const isDefense = desc.includes('방어') || summary.chips.some(chip => chip.tone === 'defense');
        if (filterType === 'attack') return isAttack;
        if (filterType === 'defense') return isDefense;
        return false;
      });
    }
    
    if (filterSynergy !== 'all') {
        skills = skills.filter(skill => {
            const desc = (skill.description + skill.name).toLowerCase();
            let keywords: string[] = [];
            switch(filterSynergy) {
                case StatusEffectType.AMPLIFY: keywords = ['증폭', '공명']; break;
                case StatusEffectType.BLEED: keywords = ['출혈', '표식']; break;
                case StatusEffectType.SHATTER: keywords = ['분쇄', '반격']; break;
                case StatusEffectType.CURSE: keywords = ['저주', '봉인']; break;
            }
            return keywords.some(kw => desc.includes(kw));
        });
    }

    if (sortBy === 'name') {
      skills.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'pattern') {
      const patternOrder = [PatternType.PAIR, PatternType.TRIPLE, PatternType.QUAD, PatternType.PENTA, PatternType.UNIQUE, PatternType.AWAKENING];
      skills.sort((a, b) => {
          const aIndex = patternOrder.indexOf(a.replaces.type);
          const bIndex = patternOrder.indexOf(b.replaces.type);
          if (aIndex !== bIndex) return aIndex - bIndex;
          const aFace = a.replaces.face || '';
          const bFace = b.replaces.face || '';
          if (aFace !== bFace) return aFace.localeCompare(bFace);
          return a.name.localeCompare(b.name);
      });
    } else { // default sort
       const patternOrder = [PatternType.PAIR, PatternType.TRIPLE, PatternType.QUAD, PatternType.PENTA, PatternType.UNIQUE, PatternType.AWAKENING];
       skills.sort((a, b) => {
          const aIndex = patternOrder.indexOf(a.replaces.type);
          const bIndex = patternOrder.indexOf(b.replaces.type);
          if (aIndex !== bIndex) return aIndex - bIndex;
          const aFace = a.replaces.face || '';
          const bFace = b.replaces.face || '';
          if (aFace !== bFace) return aFace.localeCompare(bFace);
          if(a.isBase !== b.isBase) return a.isBase ? -1 : 1;
          return a.name.localeCompare(b.name);
       });
    }

    return skills;
  }, [currentSkills, sortBy, filterType, filterSynergy, player]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-[100] p-4">
      <div className="inventory-modal-frame bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-4xl h-[90vh] flex flex-col border-2 border-cyan-500/50" data-testid="inventory-modal">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <div>
            <h2 className="text-3xl font-bold text-cyan-300">능력 목록</h2>
            <p className="inventory-modal-subtitle">먼저 판단 문구와 태그를 보고, 자세한 설명은 필요할 때만 펼치세요.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700" aria-label="인벤토리 닫기" data-testid="close-inventory-button">
            <X className="w-7 h-7 text-white" />
          </button>
        </div>
        
        <div className="flex border-b border-gray-700 mb-4 flex-shrink-0">
            <button
                onClick={() => setActiveTab('active')}
                className={`px-4 py-2 text-lg font-bold flex items-center gap-2 ${activeTab === 'active' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}
            >
                <BookOpen className="w-5 h-5" />
                액티브 기술
            </button>
            <button
                onClick={() => setActiveTab('passive')}
                className={`px-4 py-2 text-lg font-bold flex items-center gap-2 ${activeTab === 'passive' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}
            >
                <Star className="w-5 h-5" />
                패시브 강화
            </button>
        </div>

        {activeTab === 'active' && (
        <>
            <div className="inventory-filter-panel mb-4 p-4 bg-gray-900/50 rounded-lg flex-shrink-0 border border-gray-700">
                <div className="inventory-filter-row flex flex-col sm:flex-row flex-wrap items-center gap-x-6 gap-y-3">
                    <div className="inventory-count font-bold text-lg text-yellow-400 mb-2 sm:mb-0">
                        습득한 기술: {player.acquiredSkills.length} / {MAX_SKILLS}
                    </div>
                    <div className="inventory-filter-group flex items-center gap-2 flex-wrap">
                        <span className="inventory-filter-label text-sm font-semibold text-gray-400">정렬:</span>
                        <button onClick={() => setSortBy('default')} className={`px-2 py-1 text-xs rounded ${sortBy === 'default' ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>기본</button>
                        <button onClick={() => setSortBy('name')} className={`px-2 py-1 text-xs rounded ${sortBy === 'name' ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>이름</button>
                        <button onClick={() => setSortBy('pattern')} className={`px-2 py-1 text-xs rounded ${sortBy === 'pattern' ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>족보</button>
                    </div>
                    <div className="inventory-filter-group flex items-center gap-2 flex-wrap">
                        <span className="inventory-filter-label text-sm font-semibold text-gray-400">타입:</span>
                        <button onClick={() => setFilterType('all')} className={`px-2 py-1 text-xs rounded ${filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>전체</button>
                        <button onClick={() => setFilterType('attack')} className={`px-2 py-1 text-xs rounded ${filterType === 'attack' ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>공격</button>
                        <button onClick={() => setFilterType('defense')} className={`px-2 py-1 text-xs rounded ${filterType === 'defense' ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>방어</button>
                    </div>
                    <div className="inventory-filter-group flex items-center gap-2 flex-wrap">
                        <span className="inventory-filter-label text-sm font-semibold text-gray-400">시너지:</span>
                        <button onClick={() => setFilterSynergy('all')} className={`px-2 py-1 text-xs rounded ${filterSynergy === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>전체</button>
                        {synergyTypes.map(syn => {
                            const Icon = syn.icon;
                            return (
                                <button key={syn.type} onClick={() => setFilterSynergy(syn.type)} className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${filterSynergy === syn.type ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>
                                    <Icon className="w-3 h-3"/>
                                    {syn.name}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div className="inventory-list-scroll inventory-skill-grid flex-grow overflow-y-auto pr-2">
              {filteredAndSortedSkills.map(skill => {
                const isBaseSkill = skill.isBase;
                const baseAbility = isBaseSkill ? null : playerAbilities[player.class]?.[skill.replaces.type]?.[skill.replaces.face as CoinFace];
                const summary = summarizeDescription(skill.description);
                const slotLabel = `${patternLabels[skill.replaces.type]} · ${faceLabel(skill.replaces.face)}`;
                const slotClass = faceClass(skill.replaces.face);

                return (
                  <article key={skill.id} className={`inventory-skill-card group ${isBaseSkill ? 'is-base' : 'is-upgrade'} ${slotClass}`}>
                    <div className="inventory-skill-topline">
                        <div className="inventory-skill-pattern">
                            <span className="inventory-pattern-icon" aria-hidden="true">
                              <img src={assetPath(patternIconPaths[skill.replaces.type])} alt="" loading="lazy" />
                            </span>
                            <div className="min-w-0">
                              <span className="inventory-slot-badge">{slotLabel}</span>
                              <h4 className="inventory-skill-title">{skill.name}</h4>
                            </div>
                        </div>
                        {!isBaseSkill && (
                          <button 
                              onClick={() => onForgetSkill(skill.id)}
                              className="inventory-forget-button"
                              title="이 기술을 잊습니다."
                              aria-label={`${skill.name} 잊기`}
                          >
                              <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                    </div>
                    <div className="inventory-skill-origin">
                      {isBaseSkill ? '기본 기술 슬롯' : `교체됨: ${baseAbility?.name || '알 수 없음'}`}
                    </div>
                    <EffectSummary
                      summary={summary}
                      hideHeadline
                      chipLimit={5}
                      showCue
                      cueLabel="판단"
                      showDetail="details"
                      detailLabel="상세"
                      className="inventory-effect-summary"
                    />
                  </article>
                );
              })}
              {filteredAndSortedSkills.length === 0 && (
                <div className="text-center text-gray-400 py-20 flex flex-col items-center justify-center h-full">
                  <p className="text-xl mb-2">조건에 맞는 기술이 없습니다.</p>
                  <p>필터를 조정하거나 상점에서 새로운 기술을 습득하세요.</p>
                </div>
              )}
            </div>
        </>
        )}
        {activeTab === 'passive' && (
            <div className="inventory-list-scroll inventory-passive-grid flex-grow overflow-y-auto pr-2">
              {passiveSkills.map(skill => (
                <article key={skill.id} className="inventory-passive-card">
                  <div className="inventory-passive-eyebrow">
                    <Star className="h-3.5 w-3.5" />
                    패시브 강화
                  </div>
                  <h4 className="inventory-passive-title">{skill.name}</h4>
                  <EffectSummary
                    summary={summarizeDescription(skill.description)}
                    hideHeadline
                    chipLimit={5}
                    showCue
                    cueLabel="역할"
                    showDetail="details"
                    detailLabel="상세"
                    className="inventory-effect-summary"
                  />
                </article>
              ))}
              {passiveSkills.length === 0 && (
                <div className="text-center text-gray-400 py-20 flex flex-col items-center justify-center h-full">
                  <p className="text-xl mb-2">활성화된 패시브 강화가 없습니다.</p>
                  <p>상점의 '족보 강화' 메뉴에서 구매할 수 있습니다.</p>
                </div>
              )}
            </div>
        )}
      </div>
    </div>
  );
};

export default InventoryPanel;
