import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { playerSkillUnlocks } from '../../data/dataSkills';
import EffectSummary from '../EffectSummary';
import { summarizeDescription } from '../../utils/effectSummary';

const SkillReplacementModal: React.FC = () => {
    const player = useGameStore(state => state.player);
    const skillReplacementState = useGameStore(state => state.skillReplacementState);
    const setSkillReplacementState = useGameStore(state => state.setSkillReplacementState);
    const executeSkillReplacement = useGameStore(state => state.executeSkillReplacement);

    if (!skillReplacementState?.isModalOpen || !player) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4"
            style={{ zIndex: 'var(--z-modal-top)' }}
        >
            <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border border-yellow-500 bg-gray-800 p-6 shadow-xl">
                <h3 className="text-xl font-bold text-yellow-400 mb-4">기술 슬롯 가득 참</h3>
                <p className="text-gray-300 mb-4">새로운 기술 '{skillReplacementState.newSkill.name}'을(를) 배우려면 기존 기술 하나를 잊어야 합니다.</p>
                <div className="skill-replacement-new mb-4 rounded-md border border-yellow-300/20 bg-yellow-950/20 p-3">
                    <div className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-yellow-100/70">새 기술</div>
                    <strong className="text-yellow-100">{skillReplacementState.newSkill.name}</strong>
                    <EffectSummary
                      summary={summarizeDescription(skillReplacementState.newSkill.description)}
                      compact
                      hideHeadline
                      chipLimit={4}
                      showCue
                      cueLabel="얻는 역할"
                      showDetail="details"
                      detailLabel="상세"
                      className="skill-replacement-summary mt-2"
                    />
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto mb-4 pr-2">
                    {player.acquiredSkills.map(skillId => {
                        const skillDef = playerSkillUnlocks[player.class]?.[skillId];
                        if (!skillDef) return null;
                        return (
                            <div key={skillId} className="rounded-md bg-gray-700 p-2 transition-colors hover:bg-red-800/70">
                                <div className="flex items-start justify-between gap-3">
                                    <p className="font-semibold">{skillDef.name}</p>
                                    <button
                                      type="button"
                                      onClick={() => executeSkillReplacement(skillId)}
                                      className="shrink-0 rounded-md bg-red-500/80 px-2 py-1 text-xs font-bold text-white hover:bg-red-400"
                                    >
                                      잊기
                                    </button>
                                </div>
                                <EffectSummary
                                  summary={summarizeDescription(skillDef.description)}
                                  compact
                                  hideHeadline
                                  chipLimit={4}
                                  showCue
                                  cueLabel="잊으면 잃는 역할"
                                  showDetail="details"
                                  detailLabel="상세"
                                  className="skill-replacement-summary"
                                />
                            </div>
                        )
                    })}
                </div>
                <div className="text-center">
                    <button onClick={() => setSkillReplacementState(null)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">취소</button>
                </div>
            </div>
        </div>
    );
};

export default SkillReplacementModal;
