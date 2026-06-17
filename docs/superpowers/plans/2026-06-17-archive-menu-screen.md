# 아카이브 메뉴 화면 — 일식 표지 위 책상 물건 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 메뉴 화면(`MenuScreen`)을 아카이브 아트 디렉션으로 전환하되, 게임 정체성인 일식 배경(`lobby-eclipse.png`)을 무대로 보존한다(사용자 결정 — V-3 일식 유지). 주요 행동(계속하기·새 탐험)을 책상 위 아카이브 물건으로, 상태/옵션을 책상 기록물로 옮긴다. 세로 버튼 스택·대시보드 칩 문법만 제거하고, 표지 로고타입(MONOCHROME / THE ECLIPSE)·옵션 기능(P3-4/5 접근성)·세이브 정보는 보존한다.

**Architecture:** 메뉴는 §1상 "런 밖=책상 텍스처"지만, 사용자가 일식 첫인상을 정체성으로 유지하기로 했으므로 `ArchiveSurface`의 `scene` 모드에 `lobby-eclipse`를 넘긴다(딤+그레인 위 아카이브 물건). 기존 `menu-*` 레거시 CSS(components-03·05)와 격리하기 위해 루트 클래스를 `.archive-menu-screen`으로 개명한다. **e2e가 `.menu-screen`을 관문(381줄 waitForSelector)과 캡처(464줄) 두 곳에서 쓰므로 둘 다 원자적으로 수정**한다. `startGame`/`continueRun`/`resetGame`/옵션 토글·슬라이더·튜토리얼 리셋 로직은 무변경.

**Tech Stack:** React 19 + TypeScript, `.archive-*` CSS(components-08-archive.css), CDP e2e 스모크.

---

## 알아둘 코드베이스 사실 (실행 전 필독)

- **e2e 계약(관문+캡처 2곳)**: `scripts/run-e2e-smoke.mjs:381`이 `waitForSelector(cdp, '.menu-screen', ...)`로 **모든 deep screen seed의 메뉴 도달을 대기**하고, 464줄이 `checkScreen(... 'menu', '.menu-screen', ...)`로 캡처한다. 루트 개명 시 **두 줄 모두** `.archive-menu-screen`으로 수정해야 한다. 381 누락 시 전체 e2e가 타임아웃으로 실패한다(화면 1개가 아니라 전부). → Task 3에서 둘을 한 커밋에 수정 후 즉시 `npm run e2e`로 검증.
- **레거시 CSS 무수정**: 스펙 §Phase 0(line 131). `.menu-*` 규칙(components-03:836~, components-05:223~ 광범위 `.menu-screen *` 포함)은 건드리지 않는다. 루트 개명으로 자연 dead.
- **일식 딤 강도 위험**: `.archive-surface.is-scene`(components-08:25)의 딤은 `linear-gradient(180deg, rgba(4,7,10,0.66), rgba(4,7,10,0.86))`로 **강하다**. 메뉴는 "일식 부각"이 정체성(ac947df)이라 이 기본 딤이 일식을 죽일 수 있다. → Task 1에서 메뉴 전용 약한 딤 오버라이드(`.archive-menu-screen.is-scene`)를 두고, Task 4 캡처에서 일식 가시성을 판정한다. 또 기본 `background-position: center`는 lobby-eclipse 원래 `center 32%`와 달라 일식이 내려올 수 있어 메뉴 전용 position도 조정.
- **메뉴 로직·상태 무변경**: `hasRun` 파생, `startNewGame`/`resumeGame`/`replayTutorial`, `Enter` 키 핸들러(useEffect), `routeStatus`·`runSummary`·`topDeathStage` 파생, `toggleGameOption`/`setGameOption`/`showAudioMix` 전부 그대로 옮긴다.
- **표지 로고 보존**: MONOCHROME / THE ECLIPSE 타이틀은 게임 로고타입(정체성)이라 §2.5 "font-orbitron 중지" 규칙에서 **예외로 유지**한다(표지의 핵심 — 명조로 바꾸면 로고 정체성 손실). 설명문·라벨만 아카이브 톤.
- **옵션 접근성 100% 보존**: 옵션 토글 4개(`aria-pressed`), 튜토리얼 리셋, 사운드 믹스(`aria-expanded`/`aria-controls`/`role=group`/슬라이더 4개 `disabled`/`onChange`)는 P3-4/P3-5에서 공들인 키보드·SR 경로다. **마크업 래퍼만 아카이브로 바꾸고 모든 aria 속성·input·핸들러는 그대로** 옮긴다.
- **data-testid 보존**: `continue-run-button`·`start-run-button`(액션 버튼). 새 마크업에서도 동일 testid 유지(e2e/회귀 의존).
- **메뉴는 자연 진입 캡처**: e2e가 menu를 seed 없이 첫 화면으로 캡처(381→464)하므로 result 같은 사각지대 없음. choice/coinflip류 페이즈도 없다.

## 레이아웃 추론 (2안 중 택1)

- **A "일식 표지 + 책상 물건" (선택)**: 일식 scene 위, 좌측 = 표지 블록(릴리즈 도장 + MONOCHROME 로고 + 부제 + 한 줄 설명) / 그 아래 = 행동 물건 2장(계속하기=서류철 카드, 새 탐험=새 필름 카드, `ArchiveCard` interactive) + Enter 힌트 / 우측(또는 하단) = 책상 기록물(상태 꼬리표 줄 + 최근 기록 메모지 + 옵션 캐비닛). 기존 정보 구조를 유지하며 칩→아카이브 물건으로 재질만 교체.
- **B "회전식 명함첩"**: 메뉴 항목을 롤로덱스로. 표지 로고를 밀어내고 첫인상이 장치 중심이 됨 + 회전 연출/접근성 비용 → 표지 목적과 충돌해 기각.

**근거(한 줄):** A는 일식 표지 정체성을 지키며 §3.6의 "책상 위 물건" 은유를 충족하고, 옵션 dock의 접근성 마크업을 최소 변경으로 보존한다.

---

## File Structure

**수정**
- `src/styles/components/components-08-archive.css` — 메뉴 전용 블록 추가(일식 딤 완화 `.archive-menu-screen.is-scene`, 행동 물건 카드 `.archive-menu-action`, 책상 dock `.archive-menu-dock`, 옵션 토글 `.archive-menu-toggle`). 모바일 `@media` 직전 삽입.
- `src/screens/MenuScreen.tsx` — 마크업 전면 교체(로직·상태·옵션 핸들러·aria 보존).
- `scripts/run-e2e-smoke.mjs:381,464` — `.menu-screen` → `.archive-menu-screen` (두 곳).

---

## Task 1: components-08-archive.css — 메뉴 전용 스타일 블록

**Files:**
- Modify: `src/styles/components/components-08-archive.css` (모바일 `@media` 블록 직전에 삽입)

- [ ] **Step 1: 메뉴 블록 추가** — `/* 모바일: 카드 폭 전환 */` 주석 바로 **앞**에 삽입:

```css
/* --- 메뉴(일식 표지): scene 기본 딤이 강해 일식 정체성을 죽이므로 메뉴 전용으로 완화. --- */
.archive-menu-screen.is-scene {
  background:
    radial-gradient(ellipse 150% 130% at 50% 28%, transparent 42%, var(--archive-desk-edge) 100%),
    linear-gradient(180deg, rgba(4, 7, 10, 0.32), rgba(4, 7, 10, 0.6)),
    var(--archive-scene-image, none),
    var(--archive-desk);
  background-size: auto, auto, cover, auto;
  background-position: center, center, center 32%, center;
}

/* --- 행동 물건 카드 (계속하기=서류철 / 새 탐험=새 필름) --- */
.archive-menu-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 0.9rem 1.1rem;
  font-family: var(--font-family-archive);
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--archive-ink);
  background: linear-gradient(168deg, var(--archive-paper) 0%, var(--archive-paper-shade) 100%);
  border: 1px solid rgba(20, 33, 31, 0.35);
  border-radius: 3px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.archive-menu-action:hover { transform: translateY(-3px); box-shadow: 0 16px 34px rgba(0, 0, 0, 0.55); }
.archive-menu-action:focus-visible { outline: 2px solid var(--archive-accent); outline-offset: 2px; }
.archive-menu-action.is-primary {
  color: var(--archive-paper);
  background: var(--archive-stamp-ink);
  border-color: var(--archive-stamp-ink);
}

/* --- 책상 dock (상태·기록·옵션 캐비닛) — 어두운 기록판 --- */
.archive-menu-dock {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(6, 12, 14, 0.72);
  border: 1px solid rgba(114, 239, 255, 0.2);
  border-radius: 4px;
  backdrop-filter: blur(3px);
  color: var(--archive-paper);
}

/* --- 옵션 토글 (on=청록 도장 채움) --- */
.archive-menu-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  min-height: 2.5rem;
  padding: 0 0.6rem;
  font-family: var(--font-family-archive);
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--archive-paper);
  background: rgba(6, 12, 14, 0.5);
  border: 1px solid rgba(114, 239, 255, 0.22);
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}
.archive-menu-toggle[aria-pressed='true'] {
  background: var(--archive-accent);
  color: #04222b;
  border-color: var(--archive-accent);
}
.archive-menu-toggle:hover { background: rgba(12, 22, 26, 0.78); }
.archive-menu-toggle:focus-visible { outline: 2px solid var(--archive-accent); outline-offset: 2px; }
/* 손글 .archive-menu-toggle은 Tailwind 뒤 cascade라 justify-content:center가 .justify-between을 이긴다.
   양끝 정렬이 필요한 버튼(튜토리얼)은 이 변형으로 명시 — Tailwind 의존 금지. */
.archive-menu-toggle.is-spread { justify-content: space-between; }

```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add src/styles/components/components-08-archive.css
git commit -m "feat(archive): 메뉴 일식 딤 완화·행동 물건·dock·옵션 토글 스타일 (Phase 2)"
```

---

## Task 2: MenuScreen.tsx 아카이브 전환

**Files:**
- Modify: `src/screens/MenuScreen.tsx` (마크업 전면 교체, 로직·상태·옵션 핸들러·aria 보존)

- [ ] **Step 1: import 정리 + 전체 교체** — `src/screens/MenuScreen.tsx` 전체를 아래로. (로직 블록 25~100행은 그대로 유지, return만 교체하고 import에 archive 컴포넌트 추가·`ActionButton` 제거.)

```tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Eye, Gauge, HelpCircle, Keyboard, SlidersHorizontal, Volume2, Zap } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import ArchiveSurface from '../components/archive/ArchiveSurface';
import ArchiveStamp from '../components/archive/ArchiveStamp';
import { assetCssUrl } from '../utils/assetPath';
import { playUiSound } from '../utils/sound';
import { summarizeRunHistory } from '../utils/runStats';
import { GameState } from '../types';
import { APP_RELEASE_LABEL, APP_RELEASE_SCOPE } from '../constants';

const optionButtons = [
  { key: 'reducedMotion' as const, label: '모션', icon: Gauge },
  { key: 'highContrast' as const, label: '대비', icon: Eye },
  { key: 'largeText' as const, label: '큰 글자', icon: Zap },
  { key: 'soundEnabled' as const, label: '사운드', icon: Volume2 },
];

const audioSliders = [
  { key: 'masterVolume' as const, label: '전체' },
  { key: 'musicVolume' as const, label: '음악' },
  { key: 'sfxVolume' as const, label: '효과음' },
  { key: 'voiceVolume' as const, label: '대사' },
];

export const MenuScreen = () => {
  const startGame = useGameStore(state => state.startGame);
  const continueRun = useGameStore(state => state.continueRun);
  const resetGame = useGameStore(state => state.resetGame);
  const player = useGameStore(state => state.player);
  const gameState = useGameStore(state => state.gameState);
  const resumeGameState = useGameStore(state => state.resumeGameState);
  const pendingCombatReward = useGameStore(state => state.pendingCombatReward);
  const currentEvent = useGameStore(state => state.currentEvent);
  const enemy = useGameStore(state => state.enemy);
  const stageNodes = useGameStore(state => state.stageNodes);
  const currentStage = useGameStore(state => state.currentStage);
  const currentTurn = useGameStore(state => state.currentTurn);
  const gameOptions = useGameStore(state => state.gameOptions);
  const setGameOption = useGameStore(state => state.setGameOption);
  const toggleGameOption = useGameStore(state => state.toggleGameOption);
  const resetTutorial = useGameStore(state => state.resetTutorial);
  const metaProgress = useGameStore(state => state.metaProgress);
  const [showAudioMix, setShowAudioMix] = useState(false);

  const hasRun = Boolean(
    player &&
    player.currentHp > 0 &&
    gameState !== GameState.GAME_OVER &&
    gameState !== GameState.VICTORY &&
    (
      resumeGameState === GameState.STAGE_CLEAR ||
      resumeGameState === GameState.MEMORY_ALTAR ||
      pendingCombatReward ||
      currentEvent ||
      (enemy && enemy.currentHp > 0) ||
      stageNodes.length > 0
    ),
  );
  // 신규 상태에서 SCOPE로 폴백하면 '범위' 카드와 글자까지 같아진다(V-3). 진행 중에는 위치를, 신규에는 제3의 값을 보여 세 카드를 구별.
  const routeStatus = hasRun ? `${currentStage}층 / ${currentTurn}턴` : '진입 전';
  // 로비는 캐릭터 선택 전이라 전체(overall) 승률을 쓴다. totalRuns(사망만 카운트)는 의미가 달라 의도적으로 쓰지 않는다.
  const runSummary = useMemo(() => summarizeRunHistory(metaProgress.runHistory), [metaProgress.runHistory]);
  const topDeathStage = useMemo(() => {
    const ranked = Object.entries(runSummary.deathsByStage)
      .map(([stage, count]) => ({ stage: Number(stage), count: Number(count) }))
      .sort((a, b) => b.count - a.count || a.stage - b.stage);
    return ranked.length > 0 ? ranked[0].stage : null;
  }, [runSummary.deathsByStage]);

  const startNewGame = useCallback(() => {
    playUiSound(gameOptions.soundEnabled, 'confirm');
    resetGame(false);
    startGame();
  }, [gameOptions.soundEnabled, resetGame, startGame]);

  const resumeGame = useCallback(() => {
    playUiSound(gameOptions.soundEnabled, 'confirm');
    continueRun();
  }, [continueRun, gameOptions.soundEnabled]);

  const replayTutorial = useCallback(() => {
    playUiSound(gameOptions.soundEnabled, 'confirm');
    resetTutorial();
  }, [gameOptions.soundEnabled, resetTutorial]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        if (hasRun) {
          resumeGame();
          return;
        }

        startNewGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasRun, resumeGame, startNewGame]);

  return (
    // 일식 표지 — 책상 위에서 다음 기록을 펼친다. 일식 무대는 정체성이라 scene으로 보존(사용자 결정).
    <ArchiveSurface scene={assetCssUrl('assets/backgrounds/lobby-eclipse.png')} className="archive-menu-screen overflow-hidden px-4 py-6 sm:p-8">
      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-3rem)] max-w-5xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* 표지 블록 — 로고타입은 정체성이라 유지 */}
        <section className="flex flex-col justify-center">
          <ArchiveStamp className="self-start">
            <span className="inline-flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5" />{APP_RELEASE_LABEL}</span>
          </ArchiveStamp>
          <h1 className="font-orbitron mt-4 text-[clamp(2.65rem,8.8vw,7.5rem)] font-black leading-none text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.55)]">
            MONOCHROME
          </h1>
          <p className="font-orbitron mt-2 text-xl font-bold text-gray-300 drop-shadow-md md:text-3xl">
            THE ECLIPSE
          </p>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-gray-200 sm:text-base">
            동전의 앞면과 뒷면으로 전투를 읽는 공개 프로토타입입니다.
            현재 범위는 {APP_RELEASE_SCOPE}이며, 경로를 고르고 자원을 확보해 중심부로 진입하세요.
          </p>

          {/* 행동 물건 — 서류철(이어하기) / 새 필름(새 탐험) */}
          <div className="mt-7 flex flex-col gap-3 sm:max-w-md">
            {hasRun ? (
              <button type="button" className="archive-menu-action is-primary" onClick={resumeGame} data-testid="continue-run-button">
                <span>계속하기 — 진행 중인 기록</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            ) : null}
            <button
              type="button"
              className={`archive-menu-action ${hasRun ? '' : 'is-primary'}`}
              onClick={startNewGame}
              data-testid="start-run-button"
            >
              <span>새 탐험 — 새 필름을 끼운다</span>
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <Keyboard className="h-4 w-4" />
              Enter · {hasRun ? '계속하기' : '새 탐험'}
            </div>
          </div>
        </section>

        {/* 책상 dock — 상태 꼬리표 + 최근 기록 + 옵션 캐비닛 */}
        <section className="archive-menu-dock">
          <div className="flex flex-wrap gap-2">
            {[
              ['진행', hasRun ? '저장됨' : '대기'],
              ['경로', routeStatus],
              ['모드', '동전 전투'],
              ['범위', APP_RELEASE_SCOPE],
            ].map(([label, value]) => (
              <span key={label} className="archive-tag">{label} <strong>{value}</strong></span>
            ))}
          </div>

          {runSummary.total > 0 ? (
            <div className="archive-note text-xs leading-relaxed">
              <span className="archive-tray-label">최근 기록</span>
              <div className="mt-1">최근 {runSummary.total}런 · 승률 {runSummary.overall.winrate}% ({runSummary.overall.wins}승 {runSummary.overall.losses}패)
              {topDeathStage !== null ? ` · 최다 사망 ${topDeathStage}스테이지` : ''}</div>
            </div>
          ) : null}

          <div>
            <div className="archive-tray-label mb-2 inline-flex items-center gap-2"><Eye className="h-4 w-4" />옵션</div>
            <div className="grid grid-cols-2 gap-2">
              {optionButtons.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    const willEnable = !gameOptions[key];
                    if (key === 'soundEnabled') {
                      if (willEnable) playUiSound(true, 'select');
                    } else {
                      playUiSound(gameOptions.soundEnabled, 'select');
                    }
                    toggleGameOption(key);
                  }}
                  aria-pressed={gameOptions[key]}
                  className="archive-menu-toggle"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={replayTutorial}
              className="archive-menu-toggle is-spread mt-3 w-full"
              title="모든 화면의 튜토리얼 코치마크를 다시 표시합니다."
            >
              <span className="inline-flex items-center gap-2"><HelpCircle className="h-4 w-4 text-cyan-200" />튜토리얼 다시 보기</span>
              <span className="text-[10px] font-semibold text-slate-400">전 화면</span>
            </button>

            <div className="mt-3 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => setShowAudioMix(value => !value)}
                aria-expanded={showAudioMix}
                aria-controls="menu-audio-mix-panel"
                className="flex w-full items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-100"
              >
                <span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />사운드 믹스</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showAudioMix ? 'rotate-180' : ''}`} />
              </button>
              {showAudioMix ? (
                <div id="menu-audio-mix-panel" className="mt-2 grid gap-2" role="group" aria-label="사운드 믹스">
                  {audioSliders.map(({ key, label }) => (
                    <label key={key} className="grid grid-cols-[3.75rem_minmax(0,1fr)_2.5rem] items-center gap-2 text-xs font-bold text-slate-300">
                      <span>{label}</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={gameOptions[key]}
                        disabled={!gameOptions.soundEnabled}
                        onChange={(event) => setGameOption(key, Number(event.target.value))}
                        className="h-2 w-full accent-cyan-200 disabled:opacity-40"
                      />
                      <span className="text-right text-slate-400">{Math.round(gameOptions[key] * 100)}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </ArchiveSurface>
  );
};
```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: 에러 없음. (미사용이 된 `ActionButton` import가 안 남았는지 확인.)

- [ ] **Step 3: Commit**

```bash
git add src/screens/MenuScreen.tsx
git commit -m "feat(archive): 메뉴 화면 다이어제틱 전환 — 일식 표지 위 책상 물건 (Phase 2)"
```

---

## Task 3: e2e selector 갱신(2곳) + 전체 검증

**Files:**
- Modify: `scripts/run-e2e-smoke.mjs:381,464`

- [ ] **Step 1: selector 갱신(두 곳)** —

381줄 찾기: `  await waitForSelector(cdp, '.menu-screen', { timeout: 8000 });`
381줄 교체: `  await waitForSelector(cdp, '.archive-menu-screen', { timeout: 8000 });`

464줄 찾기: `    await checkScreen(cdp, errors, name, 'menu', '.menu-screen', overflows, screenshots);`
464줄 교체: `    await checkScreen(cdp, errors, name, 'menu', '.archive-menu-screen', overflows, screenshots);`

> ⚠️ 두 줄 모두 바꾼다. 381(관문)을 놓치면 모든 화면 seed가 메뉴 대기에서 타임아웃 → 전체 e2e 실패.

- [ ] **Step 2: 전체 체크**

Run: `npm run check`
Expected: 통과(테스트·typecheck·build·dist 예산·e2e 훅 누출).

- [ ] **Step 3: e2e 즉시 검증 (관문 회귀 차단)**

Run: `npm run e2e`
Expected: `"ok": true`. 메뉴뿐 아니라 **전체 10화면이 green** — 381 관문이 새 selector로 정상 동작함을 확인(여기서 깨지면 selector 누락).

- [ ] **Step 4: Commit**

```bash
git add scripts/run-e2e-smoke.mjs
git commit -m "test(e2e): 메뉴 selector를 .archive-menu-screen으로 갱신 (관문 381 + 캡처 464)"
```

---

## Task 4: 검증 + 게이트 제출

- [ ] **Step 1: 스크린샷 확인 (일식 가시성 핵심)**

`output/e2e/desktop-menu.png`·`mobile-menu.png` 확인 — **일식이 메뉴 전용 약한 딤 아래에서 정체성으로 보이는지**(V-3 보존)가 1차 판정. MONOCHROME 로고 가독성 + 행동 물건(서류철/새 필름) + 책상 dock(상태·기록·옵션) 정상 배치. 일식이 너무 묻히면 Task 1의 `.archive-menu-screen.is-scene` 딤 알파를 더 낮춘다.

- [ ] **Step 2: 옵션 기능 수동 확인** (P3-4/5 회귀 방지)

`npm run dev` → 메뉴: 옵션 토글 4개(클릭 시 aria-pressed 반전·청록 채움), 튜토리얼 리셋, 사운드 믹스 펼침(aria-expanded) + 슬라이더 4개(사운드 OFF 시 disabled, 값 변경 시 % 갱신), Enter 키(계속/새 탐험), reducedMotion ON에서 그레인 정지 확인.

- [ ] **Step 3: 게이트 제출 (사람)**

`output/e2e/desktop-menu.png`·`mobile-menu.png`를 사용자에게 제시하고 육안 승인 요청. 특히 일식 첫인상 보존 여부. 거부 시: 딤/레이아웃만 조정 후 재캡처(로직 무변경 유지).

---

## Self-Review (작성자 체크)

**1. 스펙 커버리지:** §3.6 장면(서고 책상 — 단 사용자 결정으로 일식 무대 보존) ✅ Task 2 / 만지는 물건(행동=서류철·필름 물건, 옵션=캐비닛 dock) ✅ Task 1·2 / 제거(세로 버튼 스택·대시보드 칩) ✅ Task 2 / 건드리지 않음(continueRun·startGame·세이브 정보·옵션 기능) ✅ 무변경 / §2.2 사이안 ✅ / 표지 로고 예외 보존 ✅ / 일식 정체성(V-3) ✅ 메뉴 전용 딤 완화.

**2. 플레이스홀더 스캔:** 전 단계 실제 코드. "적절히" 류 없음 ✅.

**3. 타입/이름 일관성:** `.archive-menu-screen.is-scene`/`.archive-menu-action`(+is-primary)/`.archive-menu-dock`/`.archive-menu-toggle`(Task 1) = Task 2 사용처 일치 ✅. `data-testid`(continue-run-button·start-run-button) 보존 ✅. 옵션 핸들러(toggleGameOption·setGameOption·showAudioMix)·aria 전부 보존 ✅. e2e selector 2곳(381·464) = Task 2 루트 클래스 일치 ✅.

**알려진 잔여 위험:**
- 일식 딤 강도는 캡처로만 판정 가능 — Task 4 Step 1이 1차 게이트. 기본 is-scene 딤(0.66~0.86)을 메뉴 전용 0.32~0.6으로 낮췄으나 더 조정 필요할 수 있음.
- 로고타입 `font-orbitron` 유지는 §2.5 예외(표지 정체성). 다른 아카이브 화면과 서체가 다르지만 의도.
- 옵션 토글을 `.archive-menu-toggle`로 통일(기존 4토글 + 튜토리얼 + 슬라이더 래퍼). 사운드 믹스 토글 버튼(`aria-expanded`)은 기존 텍스트 버튼 유지(캐비닛 헤더라 도장 토글 아님).
- dock가 lg+에서 우측, 모바일에서 하단(grid 1열). 옵션 그리드는 `grid-cols-2` 고정 — 좁은 폭에서 토글 라벨 줄바꿈은 캡처 확인.
