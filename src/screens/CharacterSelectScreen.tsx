import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { CharacterClass, LucideIcon, GameState } from '../types';
import { characterData, characterActiveSkills, characterUnlockHints, getCharacterMaxHp } from '../data/dataCharacters';
import { Zap, Target, ShieldCheck, Ghost, Layers, BrainCircuit, BookOpen, Map, Swords, ArrowUpCircle, Cpu } from "lucide-react";
import GameShell from '../components/ui/GameShell';
import ScreenHeader from '../components/ui/ScreenHeader';
import Panel from '../components/ui/Panel';
import ActionButton from '../components/ui/ActionButton';
import EffectSummary from '../components/EffectSummary';

const playerClassIcons: { [key in CharacterClass]: LucideIcon } = {
  [CharacterClass.WARRIOR]: Zap,
  [CharacterClass.ROGUE]: Target,
  [CharacterClass.TANK]: ShieldCheck,
  [CharacterClass.MAGE]: Ghost,
};

export const CharacterSelectScreen = () => {
    const selectCharacter = useGameStore(state => state.selectCharacter);
    const setGameState = useGameStore(state => state.setGameState);
    const metaProgress = useGameStore(state => state.metaProgress);
    const testMode = useGameStore(state => state.testMode);
    const setTestMode = useGameStore(state => state.setTestMode);
    const showTestMode = import.meta.env.DEV;

    const characterClasses = Object.keys(characterData) as CharacterClass[];
    const isClassUnlocked = (characterClass: CharacterClass) =>
        (showTestMode && testMode) || metaProgress.unlockedCharacters.includes(characterClass);

    // 미리보기 중인 캐릭터는 화면 한정 임시 상태이므로 스토어가 아닌 로컬 state로 둔다.
    // hover/focus/click이 이 값만 바꾸고, 실제 출정은 별도 버튼이 담당한다(클릭=즉시시작 분리).
    const [activeClass, setActiveClass] = useState<CharacterClass>(
        () => characterClasses.find(c => metaProgress.unlockedCharacters.includes(c)) ?? characterClasses[0]
    );

    const activeData = characterData[activeClass];
    const activeSkill = characterActiveSkills[activeClass];
    const ActiveIcon = playerClassIcons[activeClass] as LucideIcon;
    const activeUnlocked = isClassUnlocked(activeClass);
    const activeMaxHp = getCharacterMaxHp(activeData.hp, metaProgress.memoryUpgrades.maxHp);

    return (
        <GameShell className="character-select-screen" contentClassName="character-select-content max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
            <ScreenHeader
                eyebrow="출정 명단"
                title="캐릭터 선택"
                subtitle="초반 선택에 필요한 역할, 체력, 고유 기술을 먼저 확인하고 탐험을 시작하세요."
                actions={
                    <>
                        {showTestMode && (
                            <label className="inline-flex min-h-11 items-center rounded-lg border border-white/10 bg-white/5 px-3 text-sm font-medium text-gray-200">
                                <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} className="sr-only peer" />
                                <span className="relative mr-3 h-6 w-11 rounded-full bg-gray-700 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-cyan-600 peer-checked:after:translate-x-5" />
                                테스트 모드
                            </label>
                        )}
                        <ActionButton onClick={() => setGameState(GameState.MENU)} variant="ghost">메인 메뉴로</ActionButton>
                    </>
                }
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {Object.entries(characterData).map(([classType, data]) => {
                        const characterClass = classType as CharacterClass;
                        const TypedIcon = playerClassIcons[characterClass] as LucideIcon;
                        const activeSkill = characterActiveSkills[characterClass];
                        const isUnlocked = isClassUnlocked(characterClass);
                        const isActive = activeClass === characterClass;
                        const weapon = 'weapon' in data ? data.weapon : undefined;
                        const signature = 'signature' in data ? data.signature : undefined;

                        return (
                            <button
                                key={classType}
                                type="button"
                                onClick={() => setActiveClass(characterClass)}
                                onMouseEnter={() => setActiveClass(characterClass)}
                                onFocus={() => setActiveClass(characterClass)}
                                aria-pressed={isActive}
                                data-testid={`character-card-${characterClass.toLowerCase()}`}
                                className={`character-class-card group relative min-h-[280px] overflow-hidden rounded-lg border text-left shadow-xl transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300
                                    ${isUnlocked ? "bg-gray-900" : "bg-gray-800 opacity-70"}
                                    ${isActive
                                        ? "-translate-y-0.5 border-cyan-300 ring-2 ring-cyan-300/70 shadow-cyan-950/30"
                                        : isUnlocked
                                            ? "border-white/12 hover:-translate-y-0.5 hover:border-cyan-300/70 hover:shadow-cyan-950/30"
                                            : "border-gray-700"}`}
                            >
                                <img
                                    src={data.portraitSrc}
                                    alt={`${data.name} 캐릭터 아트`}
                                    className={`absolute inset-0 h-full w-full object-cover object-[center_24%] transition-transform duration-500 ${isUnlocked ? 'group-hover:scale-105' : 'grayscale'}`}
                                    loading="lazy"
                                    decoding="async"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/62 to-black/20" />
                                <div className="relative flex h-full min-h-[280px] flex-col justify-between p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-black/50 text-cyan-200">
                                                <TypedIcon className="h-6 w-6" />
                                            </div>
                                            <h3 className="text-2xl font-black text-white">{data.name}</h3>
                                            <p className="mt-1 text-sm text-gray-300">{data.title}</p>
                                        </div>
                                        {showTestMode && testMode && !metaProgress.unlockedCharacters.includes(characterClass) && (
                                            <span className="rounded-full bg-yellow-400 px-2 py-1 text-xs font-black text-black">TEST</span>
                                        )}
                                    </div>

                                    <div className="mt-6 space-y-3">
                                        <div className="flex flex-wrap gap-2 text-xs font-bold">
                                            <span className="rounded-md bg-white/10 px-2 py-1 text-gray-100">HP {getCharacterMaxHp(data.hp, metaProgress.memoryUpgrades.maxHp)}</span>
                                            {weapon && <span className="rounded-md bg-white/10 px-2 py-1 text-gray-100">무기 {weapon}</span>}
                                            {signature && <span className="rounded-md bg-white/10 px-2 py-1 text-gray-100">{signature}</span>}
                                            <span className="rounded-md bg-cyan-400/15 px-2 py-1 text-cyan-200">{activeSkill.name}</span>
                                        </div>
                                        {isUnlocked ? (
                                            <div className="space-y-2 text-sm text-gray-200">
                                                <EffectSummary text={data.innatePassives[0]} compact hideHeadline chipLimit={3} showCue cueLabel="패시브" />
                                                <div className="hidden border-t border-white/10 pt-2 text-xs text-gray-300 sm:block">
                                                    <div className="mb-1 flex items-center gap-1 font-bold text-cyan-200">
                                                        <Cpu size={13} />
                                                        액티브 스킬
                                                    </div>
                                                    <EffectSummary text={activeSkill.description} compact hideHeadline chipLimit={3} showCue cueLabel="용도" />
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm font-bold text-red-300">{characterUnlockHints[characterClass] || "잠김"}</p>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <aside className="flex flex-col gap-4">
                    <Panel className="overflow-hidden p-0" tone="cyan" data-testid="character-detail-panel">
                        <div className="relative h-36">
                            <img
                                src={activeData.portraitSrc}
                                alt={`${activeData.name} 캐릭터 아트`}
                                className={`absolute inset-0 h-full w-full object-cover object-[center_22%] ${activeUnlocked ? '' : 'grayscale'}`}
                                loading="lazy"
                                decoding="async"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/75 to-transparent" />
                            {!activeUnlocked && (
                                <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2 py-1 text-xs font-black text-red-300">잠김</span>
                            )}
                            <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-4">
                                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/55 text-cyan-200">
                                    <ActiveIcon className="h-5 w-5" />
                                </span>
                                <div className="min-w-0">
                                    <h3 className="truncate text-xl font-black leading-tight text-white">{activeData.name}</h3>
                                    <p className="truncate text-xs text-gray-300">{activeData.title}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 p-4">
                            <div className="flex flex-wrap gap-2 text-xs font-bold">
                                <span className="rounded-md bg-white/10 px-2 py-1 text-gray-100">HP {activeMaxHp}</span>
                                <span className="rounded-md bg-white/10 px-2 py-1 text-gray-100">무기 {activeData.weapon}</span>
                                <span className="rounded-md bg-white/10 px-2 py-1 text-gray-100">{activeData.signature}</span>
                            </div>

                            <div className="rounded-md border border-white/10 bg-black/20 p-2.5">
                                <EffectSummary text={activeData.innatePassives[0]} compact chipLimit={4} showCue cueLabel="패시브" />
                            </div>

                            <div className="rounded-md border border-white/10 bg-black/20 p-2.5">
                                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-cyan-200">
                                    <Cpu size={13} />
                                    액티브 · {activeSkill.name}
                                </div>
                                <EffectSummary text={activeSkill.description} compact hideHeadline chipLimit={4} showCue cueLabel="용도" />
                            </div>

                            {activeUnlocked ? (
                                <ActionButton
                                    variant="primary"
                                    className="w-full"
                                    onClick={() => selectCharacter(activeClass)}
                                    data-testid="start-with-character"
                                >
                                    이 캐릭터로 시작
                                </ActionButton>
                            ) : (
                                <div className="space-y-2">
                                    <ActionButton variant="primary" className="w-full" disabled data-testid="start-with-character">
                                        이 캐릭터로 시작
                                    </ActionButton>
                                    <p className="text-center text-xs font-bold text-red-300">
                                        {characterUnlockHints[activeClass] || "잠김"}
                                    </p>
                                </div>
                            )}
                        </div>
                    </Panel>

                    <Panel className="p-4">
                        <h3 className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3 text-lg font-bold text-gray-100">
                            <Layers className="h-5 w-5 text-gray-300"/>진행 상황
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-400">총 플레이:</span><span className="font-bold text-white">{metaProgress.totalRuns} 회</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">최고 스테이지:</span><span className="font-bold text-white">{metaProgress.highestStage}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">총 수집 에코:</span><span className="font-bold text-white">{metaProgress.totalEchoCollected}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">해금된 캐릭터:</span><span className="font-bold text-white">{metaProgress.unlockedCharacters.length} / {Object.keys(characterData).length}</span></div>
                        </div>
                    </Panel>

                    <Panel className="p-4" tone="cyan">
                        <h3 className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3 text-lg font-bold text-gray-100">
                            <BrainCircuit className="h-5 w-5 text-cyan-200"/>영구 업그레이드
                        </h3>
                        <div className="space-y-2 text-sm">
                            <p className="text-xs text-gray-400">탐험 중 '휴식' 노드에서 기억의 제단에 들러 업그레이드할 수 있습니다.</p>
                            <div className="flex justify-between rounded-md bg-white/[0.07] p-2"><span className="text-gray-300">최대 체력 증가</span><span className="font-bold text-green-300">+{metaProgress.memoryUpgrades.maxHp * 5} (Lv.{metaProgress.memoryUpgrades.maxHp})</span></div>
                            <div className="flex justify-between rounded-md bg-white/[0.07] p-2"><span className="text-gray-300">기본 공격력 증가</span><span className="font-bold text-red-300">+{metaProgress.memoryUpgrades.baseAtk} (Lv.{metaProgress.memoryUpgrades.baseAtk})</span></div>
                            <div className="flex justify-between rounded-md bg-white/[0.07] p-2"><span className="text-gray-300">기본 방어력 증가</span><span className="font-bold text-blue-300">+{metaProgress.memoryUpgrades.baseDef} (Lv.{metaProgress.memoryUpgrades.baseDef})</span></div>
                        </div>
                    </Panel>
                </aside>
            </div>

            <Panel className="mt-6 p-5 lg:p-6">
                <h3 className="mb-4 flex items-center gap-2 border-b border-white/10 pb-3 text-xl font-bold text-gray-100">
                    <BookOpen className="h-5 w-5 text-gray-300"/>
                    게임 규칙
                </h3>
                <div className="grid grid-cols-1 gap-5 text-sm text-gray-300 md:grid-cols-3">
                    <div className="space-y-2">
                        <h4 className="flex items-center gap-2 font-semibold text-white"><Map size={18} className="text-yellow-300" /> 탐험</h4>
                        <p className="text-gray-400">던전의 각 층에서 전투, 상점, 이벤트 등 다양한 노드 중 하나를 선택하여 나아가세요.</p>
                    </div>
                    <div className="space-y-2">
                        <h4 className="flex items-center gap-2 font-semibold text-white"><Swords size={18} className="text-red-300" /> 전투</h4>
                        <p className="text-gray-400">매 턴 5개의 동전으로 만들어지는 족보를 조합해 기술을 사용하고 적의 행동을 예측합니다.</p>
                    </div>
                    <div className="space-y-2">
                        <h4 className="flex items-center gap-2 font-semibold text-white"><ArrowUpCircle size={18} className="text-green-300" /> 성장</h4>
                        <p className="text-gray-400">자원을 모아 기술을 구매하거나 영구 능력치를 강화해 다음 탐험을 더 수월하게 만듭니다.</p>
                    </div>
                </div>
            </Panel>
        </GameShell>
    );
};
