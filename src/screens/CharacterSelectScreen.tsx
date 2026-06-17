import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { CharacterClass, LucideIcon, GameState } from '../types';
import { characterData, characterActiveSkills, characterUnlockHints, getCharacterMaxHp } from '../data/dataCharacters';
import { Zap, Target, ShieldCheck, Ghost, Cpu } from "lucide-react";
import ArchiveSurface from '../components/archive/ArchiveSurface';
import ArchiveStamp from '../components/archive/ArchiveStamp';
import ArchiveCaption from '../components/archive/ArchiveCaption';
import EffectSummary from '../components/EffectSummary';
import SandboxPanel from '../components/dev/SandboxPanel';

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
  const [activeClass, setActiveClass] = useState<CharacterClass>(
    () => characterClasses.find(c => metaProgress.unlockedCharacters.includes(c)) ?? characterClasses[0]
  );

  const [sandboxClass, setSandboxClass] = useState<CharacterClass | null>(null);
  const sandboxActive = showTestMode && testMode && sandboxClass !== null;

  const handleStart = (characterClass: CharacterClass) => {
    if (showTestMode && testMode) {
      setSandboxClass(characterClass);
    } else {
      selectCharacter(characterClass);
    }
  };

  const activeData = characterData[activeClass];
  const activeSkill = characterActiveSkills[activeClass];
  const ActiveIcon = playerClassIcons[activeClass] as LucideIcon;
  const activeUnlocked = isClassUnlocked(activeClass);
  const activeMaxHp = getCharacterMaxHp(activeData.hp, metaProgress.memoryUpgrades.maxHp);

  return (
    // 인사 기록 파일 — 책상 위에서 출정자 한 명을 집어 든다(런 밖 화면, 책상 텍스처).
    <ArchiveSurface className="archive-character-select-screen overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <ArchiveStamp>출정 명단</ArchiveStamp>
            <h1 className="mt-3 text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-family-archive)' }}>캐릭터 선택</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-300">초반 선택에 필요한 역할, 체력, 고유 기술을 먼저 확인하고 탐험을 시작하세요.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showTestMode && (
              <label className="archive-tool-btn cursor-pointer">
                <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} className="sr-only peer" />
                <span className="relative mr-2 h-5 w-9 rounded-full bg-gray-700 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-cyan-600 peer-checked:after:translate-x-4" />
                테스트 모드
              </label>
            )}
            <button type="button" className="archive-tool-btn" onClick={() => setGameState(GameState.MENU)}>메인 메뉴로</button>
          </div>
        </header>

        {sandboxActive ? (
          <SandboxPanel key={sandboxClass!} sandboxClass={sandboxClass!} onBack={() => setSandboxClass(null)} />
        ) : (
        <>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Object.entries(characterData).map(([classType, data]) => {
              const characterClass = classType as CharacterClass;
              const activeSkillEntry = characterActiveSkills[characterClass];
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
                  className={`archive-dossier-card ${isActive ? 'is-active' : ''} ${isUnlocked ? '' : 'is-locked'}`}
                >
                  <img src={data.portraitSrc} alt={`${data.name} 캐릭터 아트`} loading="lazy" decoding="async" />
                  <div className="archive-dossier-body">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="archive-dossier-name">{data.name}</div>
                        <div className="archive-dossier-title">{data.title}</div>
                      </div>
                      {showTestMode && testMode && !metaProgress.unlockedCharacters.includes(characterClass) && (
                        <span className="archive-dossier-chip is-skill">TEST</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="archive-dossier-row">
                        <span className="archive-dossier-chip">HP {getCharacterMaxHp(data.hp, metaProgress.memoryUpgrades.maxHp)}</span>
                        {weapon && <span className="archive-dossier-chip">무기 {weapon}</span>}
                        {signature && <span className="archive-dossier-chip">{signature}</span>}
                        <span className="archive-dossier-chip is-skill">{activeSkillEntry.name}</span>
                      </div>
                      {isUnlocked ? (
                        <EffectSummary text={data.innatePassives[0]} compact hideHeadline chipLimit={3} showCue cueLabel="패시브" />
                      ) : (
                        <p className="archive-dossier-locked">{characterUnlockHints[characterClass] || '잠김'}</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <aside className="flex flex-col gap-4">
            <div className="archive-dossier-detail" data-testid="character-detail-panel">
              <div className="relative h-36">
                <img
                  src={activeData.portraitSrc}
                  alt={`${activeData.name} 캐릭터 아트`}
                  className={`absolute inset-0 h-full w-full object-cover object-[center_22%] ${activeUnlocked ? '' : 'grayscale'}`}
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(6,12,14,0.95), rgba(6,12,14,0.55) 60%, transparent)' }} />
                {!activeUnlocked && <span className="absolute right-3 top-3 archive-dossier-locked">잠김</span>}
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-4">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-300/25 bg-black/55 text-cyan-200">
                    <ActiveIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-xl font-bold leading-tight text-white" style={{ fontFamily: 'var(--font-family-archive)' }}>{activeData.name}</h3>
                    <p className="truncate text-xs text-slate-300">{activeData.title}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div className="archive-dossier-row">
                  <span className="archive-dossier-chip">HP {activeMaxHp}</span>
                  <span className="archive-dossier-chip">무기 {activeData.weapon}</span>
                  <span className="archive-dossier-chip">{activeData.signature}</span>
                </div>
                <div className="rounded-md border border-white/10 bg-black/25 p-2.5">
                  <EffectSummary text={activeData.innatePassives[0]} compact chipLimit={4} showCue cueLabel="패시브" />
                </div>
                <div className="rounded-md border border-white/10 bg-black/25 p-2.5">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-cyan-200">
                    <Cpu size={13} />
                    액티브 · {activeSkill.name}
                  </div>
                  <EffectSummary text={activeSkill.description} compact hideHeadline chipLimit={4} showCue cueLabel="용도" />
                </div>

                {activeUnlocked ? (
                  <button type="button" className="archive-buy-btn" onClick={() => handleStart(activeClass)} data-testid="start-with-character">
                    {showTestMode && testMode ? '이 캐릭터로 시험' : '이 캐릭터로 시작'}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <button type="button" className="archive-buy-btn" disabled data-testid="start-with-character">이 캐릭터로 시작</button>
                    <p className="text-center text-xs font-bold text-red-300">{characterUnlockHints[activeClass] || '잠김'}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 밝은 메모지(archive-note)라 라벨=청록 도장, 본문=어두운 ink 상속(밝은색 클래스 금지) */}
            <div className="archive-note">
              <ArchiveStamp className="archive-stamp-mini mb-2 inline-block">진행 기록</ArchiveStamp>
              <div className="archive-dossier-row">
                <span className="archive-tag">총 플레이 <strong>{metaProgress.totalRuns}</strong></span>
                <span className="archive-tag">최고 스테이지 <strong>{metaProgress.highestStage}</strong></span>
                <span className="archive-tag">수집 에코 <strong>{metaProgress.totalEchoCollected}</strong></span>
                <span className="archive-tag">해금 <strong>{metaProgress.unlockedCharacters.length}/{Object.keys(characterData).length}</strong></span>
              </div>
            </div>

            <div className="archive-note">
              <ArchiveStamp className="archive-stamp-mini mb-2 inline-block">영구 업그레이드</ArchiveStamp>
              <ArchiveCaption sub className="mb-2">탐험 중 '휴식' 노드에서 기억의 제단에 들러 업그레이드할 수 있습니다.</ArchiveCaption>
              <div className="archive-dossier-row">
                <span className="archive-tag">최대 체력 <strong>+{metaProgress.memoryUpgrades.maxHp * 5}</strong> (Lv.{metaProgress.memoryUpgrades.maxHp})</span>
                <span className="archive-tag">공격력 <strong>+{metaProgress.memoryUpgrades.baseAtk}</strong> (Lv.{metaProgress.memoryUpgrades.baseAtk})</span>
                <span className="archive-tag">방어력 <strong>+{metaProgress.memoryUpgrades.baseDef}</strong> (Lv.{metaProgress.memoryUpgrades.baseDef})</span>
              </div>
            </div>
          </aside>
        </div>

        <div className="archive-note mt-6">
          <ArchiveStamp className="archive-stamp-mini mb-3 inline-block">게임 규칙</ArchiveStamp>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="space-y-1">
              <ArchiveCaption><strong>탐험</strong></ArchiveCaption>
              <ArchiveCaption sub>던전의 각 층에서 전투, 상점, 이벤트 등 다양한 노드 중 하나를 선택하여 나아가세요.</ArchiveCaption>
            </div>
            <div className="space-y-1">
              <ArchiveCaption><strong>전투</strong></ArchiveCaption>
              <ArchiveCaption sub>매 턴 5개의 동전으로 만들어지는 족보를 조합해 기술을 사용하고 적의 행동을 예측합니다.</ArchiveCaption>
            </div>
            <div className="space-y-1">
              <ArchiveCaption><strong>성장</strong></ArchiveCaption>
              <ArchiveCaption sub>자원을 모아 기술을 구매하거나 영구 능력치를 강화해 다음 탐험을 더 수월하게 만듭니다.</ArchiveCaption>
            </div>
          </div>
        </div>
        </>
        )}
      </div>
    </ArchiveSurface>
  );
};
