# 아카이브 캐릭터 선택 화면 — 인사 기록 파일 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 캐릭터 선택 화면(`CharacterSelectScreen`)을 아카이브 아트 디렉션의 "인사 기록 파일"(수배 사진풍 인물 카드)로 전환한다. 카드를 사진+타자 프로필+도장의 기록 파일로, 우측 패널을 집어 든 파일·책상 기록물로 옮긴다. 게임패널 칩 문법만 제거하고, 캐릭터 데이터·선택 로직·`data-testid`·testMode/SandboxPanel(DEV)은 보존한다.

**Architecture:** 캐릭터 선택은 런 밖 화면이라 `ArchiveSurface`를 `scene` 없이(책상 텍스처) 쓴다. `GameShell`(단순 `bg-gray-950`+그라데이션 셸)을 `ArchiveSurface`로 대체하고 루트 클래스를 `.archive-character-select-screen`으로 개명한다. **e2e가 루트 클래스가 아니라 `data-testid`(`character-card-warrior`·`start-with-character`)로 단언하므로 e2e 스크립트 수정은 불필요** — 대신 모든 `data-testid`를 그대로 유지한다. `selectCharacter`·`setActiveClass`·testMode·`SandboxPanel` 분기는 무변경.

**Tech Stack:** React 19 + TypeScript, `.archive-*` CSS(components-08-archive.css), 기존 `EffectSummary`·캐릭터 데이터, CDP e2e 스모크.

---

## 알아둘 코드베이스 사실 (실행 전 필독)

- **e2e 계약(data-testid 의존)**: `scripts/run-e2e-smoke.mjs:467`이 `'[data-testid="character-card-warrior"]'`로 캡처, 469줄이 그 카드 클릭, 470줄이 `'[data-testid="start-with-character"]:not([disabled])'` 클릭으로 EXPLORATION 진입을 검증한다(P2-2 두 단계 동선). **루트 클래스는 안 쓰므로 e2e 수정 없음.** 단 `character-card-{class}`(소문자)·`character-detail-panel`·`start-with-character` data-testid를 **새 마크업에서도 동일하게** 유지해야 한다. 빠진 disabled 가드도 보존(`:not([disabled])` 의존).
- **레거시 CSS 무수정**: `.character-select-screen *`(components-05:239 광범위)·`.character-class-card`(519~) 등은 건드리지 않는다. 루트 개명으로 자연 dead.
- **캐릭터 로직·상태 무변경**: `selectCharacter`·`handleStart`(testMode 분기)·`setActiveClass`(hover/focus/click 미리보기)·`isClassUnlocked`·`getCharacterMaxHp`·`activeData`/`activeSkill` 파생·`sandboxClass`/`sandboxActive` 전부 그대로 옮긴다.
- **testMode/SandboxPanel 보존**: `showTestMode`(DEV) 토글 체크박스와 `sandboxActive` 시 `<SandboxPanel>` 분기는 게임 밸런스 도구다. **SandboxPanel은 손대지 않고**(아카이브 전환 범위 밖), 토글 체크박스는 기능 유지(스타일만 아카이브 톤 허용).
- **EffectSummary 보존**: 카드/상세의 패시브·액티브 요약은 `EffectSummary`가 담당(`text`/`compact`/`chipLimit`/`showCue`/`cueLabel`). 래퍼만 아카이브로, 인자 무변경.
- **카드 = 이미 수배 사진풍에 근접**: 기존 카드는 포트레이트 풀블리드 배경 + 좌측 어둠 그라데이션 + 텍스트 오버레이라 §3.7 "사진+프로필"에 이미 가깝다. "제거"는 칩(`bg-white/10 rounded-md`)의 게임패널 문법 → 타자 프로필·도장으로 교체. 구조(포트레이트+오버레이)는 유지하고 재질만 입힌다.
- **런 밖 = 책상 텍스처**: `ArchiveSurface`에 `scene`을 주지 않으면 desk-surface.jpg 책상 텍스처가 무대(메뉴의 일식 예외와 달리 여기는 기본 책상).
- **잠금 상태**: `isUnlocked=false`면 포트레이트 grayscale + 잠금 힌트(`characterUnlockHints`). 시작 버튼 disabled. 보존.

## 레이아웃 추론 (2안 중 택1)

- **A "책상 위 펼친 인사 파일" (선택)**: 상단 = 도장(출정 명단) + 도구(테스트 모드 토글·메인 메뉴) / 본문 좌측 = 인물 기록 카드 그리드 2×2(`.archive-dossier-card`: 포트레이트 사진 + 타자 프로필 + 클립/도장) / 우측 = 집어 든 파일(`.archive-dossier-detail`: 큰 사진 + 프로필 + 패시브/액티브 + 출정 도장 버튼) + 책상 기록물(진행 상황·영구 업그레이드 = `.archive-note`+`.archive-tag`) / 하단 = 규칙 메모(`.archive-note` 3열). 기존 2열+하단 구조를 유지하고 재질만 교체.
- **B "회전 인덱스 카드"**: 카드를 색인 캐비닛 서랍으로. §3.8(제단)과 은유 충돌 + 4캐릭터 한눈 비교(V-2 보존 가치)를 깨 기각.

**근거(한 줄):** A는 §3.7의 수배 파일 은유를 충족하며 기존 카드 구조(포트레이트+오버레이)와 4카드 비교 동선(V-2)을 보존하고, data-testid 위치를 안전하게 유지한다.

---

## File Structure

**수정**
- `src/styles/components/components-08-archive.css` — 캐릭터 전용 블록 추가(인물 카드 `.archive-dossier-card*`, 집어 든 파일 `.archive-dossier-detail`, 출정 도장 버튼은 기존 `.archive-buy-btn` 재사용). 모바일 `@media` 직전 삽입.
- `src/screens/CharacterSelectScreen.tsx` — 마크업 전면 교체(로직·data-testid·testMode/Sandbox 보존).

**무수정**
- `scripts/run-e2e-smoke.mjs` — data-testid 의존이라 변경 없음(검증만).

---

## Task 1: components-08-archive.css — 캐릭터 전용 스타일 블록

**Files:**
- Modify: `src/styles/components/components-08-archive.css` (모바일 `@media` 블록 직전에 삽입)

- [ ] **Step 1: 캐릭터 블록 추가** — `/* 모바일: 카드 폭 전환 */` 주석 바로 **앞**에 삽입:

```css
/* --- 캐릭터 선택(인사 기록): 인물 카드 = 포트레이트 사진 + 타자 프로필. 책상 텍스처 위. --- */
.archive-dossier-card {
  position: relative;
  display: block;
  width: 100%;
  min-height: 17rem;
  text-align: left;
  overflow: hidden;
  border: 1px solid rgba(20, 33, 31, 0.5);
  border-radius: 3px;
  background: var(--archive-frame-bottom, #14211f);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
}
.archive-dossier-card > img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 24%;
  filter: grayscale(0.55) contrast(1.06);
}
.archive-dossier-card.is-locked > img { filter: grayscale(1) brightness(0.7); }
/* 좌측 어둠 → 타자 프로필 가독 */
.archive-dossier-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(94deg, rgba(6, 12, 14, 0.92) 0%, rgba(6, 12, 14, 0.62) 48%, rgba(6, 12, 14, 0.12) 100%);
}
.archive-dossier-card:hover { transform: translateY(-3px); border-color: var(--archive-accent); }
.archive-dossier-card.is-active {
  transform: translateY(-3px);
  border-color: var(--archive-accent);
  box-shadow: 0 0 0 2px var(--archive-accent), 0 16px 34px rgba(0, 0, 0, 0.55);
}
.archive-dossier-card:focus-visible { outline: 2px solid var(--archive-accent); outline-offset: 2px; }
.archive-dossier-body {
  position: relative;
  z-index: 1;
  display: flex;
  height: 100%;
  min-height: 17rem;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.1rem;
  font-family: var(--font-family-archive);
  color: var(--archive-paper);
}
.archive-dossier-name { font-size: 1.5rem; font-weight: 700; line-height: 1.1; color: #eef3f4; }
.archive-dossier-title { margin-top: 0.15rem; font-size: 0.8rem; color: rgba(201, 211, 214, 0.8); }
/* 타자 프로필 꼬리표 줄 (HP/무기/시그니처/스킬) */
.archive-dossier-row { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.archive-dossier-chip {
  font-family: var(--font-family-archive);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.18rem 0.45rem;
  border-radius: 2px;
  background: rgba(6, 12, 14, 0.55);
  border: 1px solid rgba(114, 239, 255, 0.22);
  color: var(--archive-paper);
}
.archive-dossier-chip.is-skill { color: #04222b; background: var(--archive-accent); border-color: var(--archive-accent); }
.archive-dossier-locked { font-size: 0.85rem; font-weight: 700; color: #e2a0a0; }

/* --- 집어 든 파일 (우측 상세) — 책상 위 펼친 한 장 --- */
.archive-dossier-detail {
  position: relative;
  z-index: 2;
  overflow: hidden;
  border: 1px solid rgba(114, 239, 255, 0.25);
  border-radius: 4px;
  background: rgba(6, 12, 14, 0.72);
  backdrop-filter: blur(3px);
  color: var(--archive-paper);
}

```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add src/styles/components/components-08-archive.css
git commit -m "feat(archive): 캐릭터 인물 카드·집어 든 파일 스타일 (Phase 2)"
```

---

## Task 2: CharacterSelectScreen.tsx 아카이브 전환

**Files:**
- Modify: `src/screens/CharacterSelectScreen.tsx` (마크업 전면 교체, 로직·data-testid·testMode/Sandbox 보존)

- [ ] **Step 1: import 정리 + 마크업 교체** — 로직 블록(20~55행: hooks·파생·handleStart)은 **그대로 유지**하고, import와 return만 교체. 아래는 전체 파일:

```tsx
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
            <h1 className="mt-3 font-archive text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-family-archive)' }}>캐릭터 선택</h1>
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
                {!activeUnlocked && <span className="absolute right-3 top-3 archive-dossier-chip is-locked" style={{ color: '#e2a0a0' }}>잠김</span>}
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
```

> 보존 확인: `selectCharacter`·`handleStart`(testMode 분기)·`setActiveClass`(hover/focus/click)·`SandboxPanel` 분기·`isClassUnlocked`·잠금 가드·data-testid 3종(`character-card-*`·`character-detail-panel`·`start-with-character`) 전부 무변경. 정보 손실 없음 — 카드 칩→타자 도장 꼬리표, 패널→책상 기록물(archive-note+tag). `GameShell`/`ScreenHeader`/`Panel`/`ActionButton` 게임패널 문법 제거. 레거시 `character-*` 클래스 전부 제거.

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: 에러 없음. (미사용이 된 import — `Layers`/`BrainCircuit`/`BookOpen`/`Map`/`Swords`/`ArrowUpCircle`/`GameShell`/`ScreenHeader`/`Panel`/`ActionButton` — 가 새 코드에 안 남았는지 확인.)

- [ ] **Step 3: Commit**

```bash
git add src/screens/CharacterSelectScreen.tsx
git commit -m "feat(archive): 캐릭터 선택 화면 다이어제틱 전환 — 인사 기록 파일 (Phase 2)"
```

---

## Task 3: 전체 검증 + 게이트 제출 (e2e 스크립트 무변경)

- [ ] **Step 1: 전체 체크**

Run: `npm run check`
Expected: 통과(테스트·typecheck·build·dist 예산·e2e 훅 누출).

- [ ] **Step 2: e2e + 스크린샷**

Run: `npm run e2e`
Expected: `"ok": true`. **e2e가 `character-card-warrior` 클릭 → `start-with-character` 클릭으로 EXPLORATION 진입에 성공**(data-testid 보존 확인 — 빠지면 여기서 클릭 실패). `output/e2e/desktop-character.png`·`mobile-character.png` 생성 — 책상 위 인물 카드 4장(수배 사진+타자 프로필) + 집어 든 파일 + 책상 기록물.

- [ ] **Step 3: testMode/Sandbox 수동 확인** (DEV 전용, e2e는 비-testMode)

`npm run dev` → 캐릭터 선택: 테스트 모드 토글 ON → 잠긴 캐릭터도 선택 가능 + 카드 'TEST' 도장 + 선택 시 SandboxPanel 진입(밸런스 도구 정상). 토글 OFF에서 잠금 카드 grayscale + 시작 버튼 disabled 확인.

- [ ] **Step 4: 게이트 제출 (사람)**

`output/e2e/desktop-character.png`·`mobile-character.png`를 사용자에게 제시하고 육안 승인 요청. 거부 시: 토큰/레이아웃만 조정 후 재캡처(로직 무변경 유지).

---

## Self-Review (작성자 체크)

**1. 스펙 커버리지:** §3.7 장면(인사 기록 파일=책상 텍스처) ✅ Task 2 / 만지는 물건(사진+타자 프로필+도장 카드, 집어 든 파일) ✅ Task 1·2 / 제거(카드 게임패널 칩 문법) ✅ Task 2 / 건드리지 않음(캐릭터 데이터·선택 로직·data-testid) ✅ 무변경 / §2.2 사이안 ✅ / 4카드 비교(V-2) 보존 ✅ / testMode·Sandbox(DEV 도구) 보존 ✅.

**2. 플레이스홀더 스캔:** 전 단계 실제 코드. "적절히" 류 없음 ✅.

**3. 타입/이름 일관성:** `.archive-dossier-card`(+is-active/is-locked)/`.archive-dossier-body`/`.archive-dossier-name`/`.archive-dossier-title`/`.archive-dossier-row`/`.archive-dossier-chip`(+is-skill)/`.archive-dossier-locked`/`.archive-dossier-detail`(Task 1) = Task 2 사용처 일치 ✅. data-testid(`character-card-${lower}`·`character-detail-panel`·`start-with-character`) = 원본과 일치 ✅. `EffectSummary` `text` prop 사용(원본과 동일) ✅. 출정 버튼 `.archive-buy-btn` 재사용(기존 정의) ✅.

**알려진 잔여 위험:**
- 카드 포트레이트가 `.archive-dossier-card::after` 좌측 어둠 위에 타자 프로필 — 포트레이트 우측이 밝으면 우상단 TEST 도장이 묻힐 수 있음(캡처 판정).
- 시작 버튼 `.archive-buy-btn`은 `width:100%`라 상세 패널 폭에 맞음(상점 선례). disabled 시 회색(기존 규칙).
- 진행/업그레이드/규칙을 `.archive-note`(밝은 메모지)로 — 책상 위 밝은 종이라 본문 어두운 텍스트(`text-slate-300/400`)가 밝은 배경에서 대비 부족할 수 있음. archive-note는 `--archive-ink`(어두움)가 기본이므로 slate 대신 기본색 상속 확인, 안 되면 캡처서 조정.
- `font-archive` 클래스가 없어 인라인 `style={{ fontFamily: 'var(--font-family-archive)' }}`로 명조 적용(타이틀·이름). Tailwind 유틸 없음 — 의도.
