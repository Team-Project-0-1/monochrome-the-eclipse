import React, { useState } from 'react';
import { UserRoundSearch } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import RunStatusModal from '../components/RunStatusModal';
import ArchiveSurface from '../components/archive/ArchiveSurface';
import ArchiveCard from '../components/archive/ArchiveCard';
import ArchiveStamp from '../components/archive/ArchiveStamp';
import ArchiveCaption from '../components/archive/ArchiveCaption';
import { assetPath } from '../utils/assetPath';
import { playGameSfx, playUiSound } from '../utils/sound';
import { playerSkillUnlocks } from '../data/dataSkills';
import { patternUpgrades } from '../data/dataUpgrades';
import { getRewardIconPath, resourceIconPaths } from '../utils/resourceAssets';
import { getStageBackgroundCss } from '../utils/stageBackground';
import { PatternType } from '../types';
import EffectSummary from '../components/EffectSummary';
import { summarizeDescription } from '../utils/effectSummary';
import type { CombatRewardChoice } from '../utils/combatRewards';

const getRewardChoiceCue = (choice: CombatRewardChoice) => {
  if (choice.secretTechniqueId) return '월식 보스 보상: 비기 3개 중 1개를 확정';
  if (choice.skillId) return '기술 슬롯을 바꿔 전투 선택지 확장';
  if (choice.passiveId) return '자동 효과를 추가해 빌드 강화';
  if (choice.rewards.reserveCoin) return '다음 전투의 동전 사고를 줄이기';
  if ((choice.rewards.memoryPieces ?? 0) > 0) return '영구 성장 자원 확보';
  if ((choice.rewards.senseFragments ?? 0) > 0) return '족보 강화 재료 확보';
  return '자원을 고르게 챙기는 안정 선택';
};

const rewardEntryLabel = (key: string) =>
  key === 'echoRemnants' ? '에코'
    : key === 'senseFragments' ? '감각'
      : key === 'memoryPieces' ? '기억'
        : '예비 동전';

// 사진별 기울기 — 손으로 책상에 놓은 느낌(균일하면 그리드로 보인다).
const CARD_TILTS = [-1.4, 0.9, -0.6];

// 사진 피사체는 전부 기존 에셋 재활용 — 스킬은 차지하는 패턴 아이콘, 비기는 각성 패턴.
const patternIconPaths: Record<PatternType, string> = {
  [PatternType.PAIR]: 'assets/icons/combat/pattern-pair.png',
  [PatternType.TRIPLE]: 'assets/icons/combat/pattern-triple.png',
  [PatternType.QUAD]: 'assets/icons/combat/pattern-quad.png',
  [PatternType.PENTA]: 'assets/icons/combat/pattern-penta.png',
  [PatternType.UNIQUE]: 'assets/icons/combat/pattern-unique.png',
  [PatternType.AWAKENING]: 'assets/icons/combat/pattern-awakening.png',
};

export const CombatRewardScreen = () => {
  const pendingCombatReward = useGameStore(state => state.pendingCombatReward);
  const claimCombatReward = useGameStore(state => state.claimCombatReward);
  const gameOptions = useGameStore(state => state.gameOptions);
  const player = useGameStore(state => state.player);
  const currentStage = useGameStore(state => state.currentStage);
  const [isRunStatusOpen, setIsRunStatusOpen] = useState(false);

  if (!pendingCombatReward) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        보상 데이터를 불러오는 중...
      </main>
    );
  }

  const claimReward = (choiceId: string) => {
    playUiSound(gameOptions.soundEnabled, 'confirm');
    playGameSfx(gameOptions.soundEnabled, 'rewardItem');
    claimCombatReward(choiceId);
  };

  return (
    // 전투가 끝난 그 장면 위에서 기록을 고른다 — 화면 전환으로 세계를 떠나지 않는다(슬더스 문법).
    <ArchiveSurface scene={getStageBackgroundCss(currentStage)} className="archive-reward-screen overflow-hidden p-4 sm:p-6">
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl flex-col justify-center gap-6">
        {/* 책상 위 기록 도장 — 배지/타이틀/설명문의 다이어제틱 대체물 */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <ArchiveStamp>「{pendingCombatReward.enemyName}」의 기록 — 하나를 보관한다</ArchiveStamp>
          <button
            type="button"
            className="archive-tool-btn"
            onClick={() => {
              playUiSound(gameOptions.soundEnabled, 'select');
              setIsRunStatusOpen(true);
            }}
          >
            <UserRoundSearch className="h-4 w-4" />
            현재 상태
          </button>
        </header>

        {/* 책상 위에 떨어진 사진 3장 */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pendingCombatReward.choices.map((choice, index) => {
            const rewardEntries = Object.entries(choice.rewards).filter(([, value]) => value);
            const skillReward = choice.skillId && player
              ? playerSkillUnlocks[player.class]?.[choice.skillId]
              : null;
            const passiveReward = choice.passiveId && player
              ? patternUpgrades[player.class]?.[choice.passiveId]
              : null;
            // 피사체 우선순위: 스킬 패턴 > 비기(각성) > 패시브(강화 결정) > 자원 > 기억 조각.
            const subjectIconPath = skillReward
              ? patternIconPaths[skillReward.replaces.type as PatternType]
              : choice.secretTechniqueId
                ? patternIconPaths[PatternType.AWAKENING]
                : choice.passiveId
                  ? 'assets/items/amplify-crystal.png'
                  : (rewardEntries.length > 0 ? getRewardIconPath(rewardEntries[0][0]) : undefined)
                    ?? resourceIconPaths.memoryPieces;

            return (
              <div key={choice.id} className="group relative">
                <ArchiveCard
                  interactive
                  dealt
                  tilt={CARD_TILTS[index % CARD_TILTS.length]}
                  data-testid={`reward-photo-${index}`}
                  aria-label={`${choice.label} — ${getRewardChoiceCue(choice)}`}
                  onClick={() => claimReward(choice.id)}
                  className="w-full"
                >
                  <div className="archive-photo-frame">
                    <img src={assetPath(subjectIconPath)} alt="" loading="lazy" />
                  </div>
                  <ArchiveCaption>
                    <strong>{choice.label}</strong>
                  </ArchiveCaption>
                  <ArchiveCaption sub>{getRewardChoiceCue(choice)}</ArchiveCaption>
                  {rewardEntries.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {rewardEntries.map(([key, value]) => {
                        const iconPath = getRewardIconPath(key);
                        return (
                          <span key={key} className="archive-tag">
                            {iconPath && <img src={assetPath(iconPath)} alt="" loading="lazy" />}
                            {rewardEntryLabel(key)} {typeof value === 'boolean' ? '+1' : `+${value}`}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </ArchiveCard>

                {/* 끼워진 메모지 — 스킬/패시브 상세는 호버/포커스 시에만(평시 장면 유지) */}
                {(skillReward || passiveReward) && (
                  <div className="archive-note pointer-events-none absolute left-2 right-2 top-full z-20 mt-2 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
                    {skillReward && (
                      <>
                        <strong>기술 · {skillReward.name}</strong>
                        <EffectSummary
                          summary={summarizeDescription(skillReward.description)}
                          compact
                          hideHeadline
                          chipLimit={4}
                          showCue
                          cueLabel="판단"
                        />
                      </>
                    )}
                    {passiveReward && (
                      <>
                        <strong>패시브 · {passiveReward.name}</strong>
                        <EffectSummary
                          summary={summarizeDescription(passiveReward.description)}
                          compact
                          hideHeadline
                          chipLimit={4}
                          showCue
                          cueLabel="역할"
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 책상 모서리 메모지로 강등된 팁 */}
        <aside className="archive-note max-w-md self-end">
          보상은 자동 지급되지 않는다. 체력이 넉넉하면 성장 자원을, 다음 전투가 불안하면
          즉시 전투력을 보강할 기록을 보관할 것.
        </aside>
      </section>

      <RunStatusModal isOpen={isRunStatusOpen} onClose={() => setIsRunStatusOpen(false)} />
    </ArchiveSurface>
  );
};
