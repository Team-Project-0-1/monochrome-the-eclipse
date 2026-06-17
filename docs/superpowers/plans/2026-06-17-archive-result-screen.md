# 아카이브 결과 화면 — 사건 종결 보고서 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 결과 화면 컴포넌트(`RunResultScreen` — 승리/게임오버/스테이지클리어 3화면이 공유)를 아카이브 "사건 종결 보고서"로 전환한다. 런 통계를 보고서 양식 위 타자 기록으로, 재시작/메뉴를 보고서 결재란 버튼으로 옮긴다. 통계 카드 그리드 문법만 제거하고, `recordRunEnd` 텔레메트리·재시작 로직·tone 분기는 보존한다.

**Architecture:** `GameOverScreen`/`VictoryScreen`/`StageClearScreen`은 `RunResultScreen`에 `tone` prop만 넘기는 래퍼라, **컴포넌트 하나만 전환하면 3화면 전부 전환**된다. 결과 화면은 현재 `lobby-eclipse` 일식 배경이라 메뉴와 일관되게 `ArchiveSurface`의 `scene`으로 일식을 보존하고, 그 위에 어두운 보고서 패널을 얹는다. tone(victory/stage-clear/defeat)은 도장 색·아이콘으로 구분한다. 통계 파생(`summarizeRunHistory`·패배원인)은 무변경.

**Tech Stack:** React 19 + TypeScript, `.archive-*` CSS, CDP e2e 스모크(엔딩 캡처 신설).

---

## 알아둘 코드베이스 사실

- **3화면 공유 컴포넌트**: `GameOverScreen`(tone=defeat)·`VictoryScreen`(tone=victory)·`StageClearScreen`(tone=stage-clear, secondary 버튼 보유)은 `RunResultScreen`의 얇은 래퍼다. **래퍼 3개는 안 건드리고** `src/components/RunResultScreen.tsx`만 전환한다.
- **로직·통계 무변경**: `summarizeRunHistory`·`thisRun`(lastRun)·`showDefeatCause`·`currentWinrate`·`topDeathStages`·`routeText`·`handlePrimary`/`handleSecondary`(사운드+primaryDisabled 가드) 전부 보존. props 시그니처(`tone`/`title`/`subtitle`/`primaryLabel`/`onPrimary`/`primaryDisabled`/`secondaryLabel`/`onSecondary`) 무변경.
- **e2e 사각지대**: e2e는 GAME_OVER/VICTORY/STAGE_CLEAR를 캡처하지 않는다(followup-backlog A1). Task 3에서 **3 tone 캡처를 e2e에 영구 추가**해 회귀 가드를 신설한다(이벤트 result 선례). 통계가 `metaProgress.runHistory`에 의존하므로 seed에 runHistory + player를 주입한다.
- **루트 selector**: 현재 `RunResultScreen`은 루트에 식별 클래스가 없다(`<main className="relative min-h-screen ...">`). 신규 `.archive-result-screen`을 부여하고, e2e 캡처도 이 selector로 단언한다.
- **tone 강조 = 아카이브 톤 유지**: 기존 `toneClasses`(emerald/yellow/red)는 §2.2 사이안 단색과 충돌. 승/패 구분은 타이틀 텍스트가 전달하므로, 도장은 victory/stage-clear=청록(`--archive-stamp-ink`), defeat=경고 빨강(`#b4513f`)만 예외로. 버튼은 tone 무관 청록(`.archive-buy-btn`, 되돌아가기 동작이라 위험색 불요).
- **타이틀**: 기존 `font-orbitron`(영문 테크체)은 한글 타이틀("이클립스 붕괴"·"실패한 런")에 부적합 → 명조(`--font-family-archive`)로(§2.5 충실).
- **일식 scene**: 메뉴와 동일 `lobby-eclipse` 배경을 `scene`으로. 보고서가 어두운 패널이라 기본 `is-scene` 딤으로 충분(메뉴 같은 완화 불요).

## File Structure

**수정**
- `src/styles/components/components-08-archive.css` — 보고서 패널 `.archive-report*`, 경고 도장 `.archive-stamp.is-warn`. 모바일 `@media` 직전.
- `src/components/RunResultScreen.tsx` — 마크업 전면 교체(로직·props·통계 보존).
- `scripts/run-e2e-smoke.mjs` — 엔딩 3 tone 캡처 추가.

**무수정**
- `src/screens/{GameOver,Victory,StageClear}Screen.tsx` — 래퍼 그대로.

---

## Task 1: components-08-archive.css — 보고서 블록

**Files:**
- Modify: `src/styles/components/components-08-archive.css` (모바일 `@media` 직전)

- [ ] **Step 1: 보고서 블록 추가** — `/* 모바일: 카드 폭 전환 */` 바로 앞에 삽입:

```css
/* --- 결과(사건 종결 보고서): 일식 위 어두운 보고서 패널 + 타자 통계. --- */
.archive-report {
  position: relative;
  z-index: 2;
  padding: 1.2rem 1.3rem;
  background: rgba(6, 12, 14, 0.82);
  border: 1px solid rgba(114, 239, 255, 0.22);
  border-radius: 4px;
  backdrop-filter: blur(3px);
  color: var(--archive-paper);
  font-family: var(--font-family-archive);
}
.archive-report-runner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(114, 239, 255, 0.16);
}
.archive-report-portrait {
  width: 5rem;
  height: 5rem;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 4px;
  border: 1px solid rgba(114, 239, 255, 0.22);
  background: rgba(6, 12, 14, 0.6);
}
.archive-report-portrait > img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
.archive-report-runner-name { font-size: 1.4rem; font-weight: 700; color: #eef3f4; }
.archive-report-runner-sub { font-size: 0.85rem; color: rgba(201, 211, 214, 0.75); }
/* 타자 통계 줄 */
.archive-report-line {
  margin-top: 0.9rem;
  font-size: 0.82rem;
  line-height: 1.6;
  color: rgba(201, 211, 214, 0.88);
}
.archive-report-line strong { color: var(--archive-paper); font-weight: 700; }
.archive-report-label {
  font-size: 0.64rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--archive-accent);
}

/* 경고(패배) 도장 변형 */
.archive-stamp.is-warn { color: #d98a78; border-color: #b4513f; }

/* 게임오버 = "빛에 타버린 필름"(§3.9 장면 구분) — 보고서 위 흰빛 번짐 오버레이.
   그레인(z-index:1) 위, 콘텐츠(z-10) 아래. pointer 통과. */
.archive-result-screen.is-defeat::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    radial-gradient(ellipse 55% 40% at 50% 26%, rgba(255, 248, 236, 0.26), transparent 62%),
    radial-gradient(circle at 50% 24%, rgba(255, 252, 245, 0.4), transparent 12%);
  mix-blend-mode: screen;
}

/* 모바일: 카드 폭 전환 */
```

- [ ] **Step 2: typecheck** — Run: `npm run typecheck` → 에러 없음.
- [ ] **Step 3: Commit** — `git add ... && git commit -m "feat(archive): 결과 보고서 패널·경고 도장 스타일 (Phase 2)"`

---

## Task 2: RunResultScreen.tsx 아카이브 전환

**Files:**
- Modify: `src/components/RunResultScreen.tsx`

- [ ] **Step 1: 전체 교체** — 전체 파일을 아래로:

```tsx
import React from 'react';
import { ArrowRight, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import ArchiveSurface from './archive/ArchiveSurface';
import ArchiveStamp from './archive/ArchiveStamp';
import { assetCssUrl, assetPath } from '../utils/assetPath';
import { playUiSound } from '../utils/sound';
import { MAX_RESERVE_COINS } from '../constants';
import { resourceIconPaths } from '../utils/resourceAssets';
import { summarizeRunHistory } from '../utils/runStats';
import { formatTier } from '../utils/combatPresentation';
import type { EnemyCharacter } from '../types';

const deathCauseLabels: Record<'combat' | 'event', string> = {
  combat: '전투',
  event: '사건',
};

interface RunResultScreenProps {
  tone: 'stage-clear' | 'victory' | 'defeat';
  title: string;
  subtitle: string;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

const toneMeta: Record<RunResultScreenProps['tone'], { eyebrow: string; icon: React.ElementType; warn: boolean }> = {
  'stage-clear': { eyebrow: '층 확보', icon: Trophy, warn: false },
  victory: { eyebrow: '이클립스 종결', icon: Sparkles, warn: false },
  defeat: { eyebrow: '런 종료', icon: RotateCcw, warn: true },
};

const RunResultScreen: React.FC<RunResultScreenProps> = ({
  tone,
  title,
  subtitle,
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  secondaryLabel,
  onSecondary,
}) => {
  const player = useGameStore(state => state.player);
  const resources = useGameStore(state => state.resources);
  const reserveCoins = useGameStore(state => state.reserveCoins);
  const currentStage = useGameStore(state => state.currentStage);
  const currentTurn = useGameStore(state => state.currentTurn);
  const path = useGameStore(state => state.path);
  const metaProgress = useGameStore(state => state.metaProgress);
  const gameOptions = useGameStore(state => state.gameOptions);
  const meta = toneMeta[tone];
  const Icon = meta.icon;

  const routeText = path.length > 0
    ? path.slice(-5).map(step => `${step.turn}-${step.nodeIndex + 1}`).join(' / ')
    : '기록 없음';

  const summary = React.useMemo(() => summarizeRunHistory(metaProgress.runHistory), [metaProgress.runHistory]);
  const thisRun = summary.lastRun;
  const showDefeatCause = tone === 'defeat' && thisRun?.outcome === 'death';

  const currentWinrate = player ? summary.winrateByCharacter[player.class] : undefined;
  const topDeathStages = React.useMemo(
    () => Object.entries(summary.deathsByStage)
      .map(([stage, count]): { stage: number; count: number } => ({ stage: Number(stage), count: Number(count) }))
      .sort((a, b) => b.count - a.count || a.stage - b.stage)
      .slice(0, 3),
    [summary.deathsByStage],
  );

  const handlePrimary = () => {
    if (primaryDisabled) {
      playUiSound(gameOptions.soundEnabled, 'deny');
      return;
    }
    playUiSound(gameOptions.soundEnabled, tone === 'defeat' ? 'deny' : 'confirm');
    onPrimary();
  };

  const handleSecondary = () => {
    playUiSound(gameOptions.soundEnabled, 'select');
    onSecondary?.();
  };

  return (
    // 사건 종결 보고서 — 일식 위에서 이번 런을 정산한다(일식 정체성 보존, 메뉴와 일관).
    // defeat=빛에 타버린 필름(§3.9 장면 구분): is-defeat가 흰빛 번짐 오버레이를 켠다.
    <ArchiveSurface scene={assetCssUrl('assets/backgrounds/lobby-eclipse.png')} className={`archive-result-screen overflow-y-auto p-4 sm:p-6 ${tone === 'defeat' ? 'is-defeat' : ''}`}>
      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl items-center gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0">
          <ArchiveStamp className={meta.warn ? 'is-warn' : ''}>
            <span className="inline-flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" />{meta.eyebrow}</span>
          </ArchiveStamp>
          <h1 className="mt-4 text-[clamp(2.4rem,7vw,5.5rem)] font-bold leading-none text-white drop-shadow-[0_3px_7px_rgba(0,0,0,0.65)]" style={{ fontFamily: 'var(--font-family-archive)' }}>
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">{subtitle}</p>

          {/* 결재란 — 보고서 하단 행동 */}
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" className="archive-buy-btn" style={{ width: 'auto', minWidth: '9rem', marginTop: 0 }} disabled={primaryDisabled} onClick={handlePrimary}>
              {primaryLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
            {secondaryLabel && onSecondary ? (
              <button type="button" className="archive-tool-btn" onClick={handleSecondary}>{secondaryLabel}</button>
            ) : null}
          </div>
        </div>

        {/* 사건 종결 보고서 — 어두운 양식 + 타자 통계 */}
        <div className="archive-report">
          <div className="archive-report-runner">
            <div className="archive-report-portrait">
              {player?.portraitSrc ? (
                <img src={assetPath(player.portraitSrc)} alt="" loading="lazy" decoding="async" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-black text-white/40">?</div>
              )}
            </div>
            <div className="min-w-0">
              <div className="archive-report-label">Runner</div>
              <div className="archive-report-runner-name truncate">{player?.name ?? '기록 없음'}</div>
              <div className="archive-report-runner-sub truncate">{player?.weapon ?? '무기 미기록'}</div>
            </div>
          </div>

          <div className="archive-dossier-row mt-4">
            <span className="archive-tag">HP <strong>{player ? `${player.currentHp}/${player.maxHp}` : '-'}</strong></span>
            <span className="archive-tag"><img src={assetPath(resourceIconPaths.echoRemnants)} alt="" loading="lazy" />에코 <strong>{resources.echoRemnants}</strong></span>
            <span className="archive-tag"><img src={assetPath(resourceIconPaths.senseFragments)} alt="" loading="lazy" />감각 <strong>{resources.senseFragments}</strong></span>
            <span className="archive-tag"><img src={assetPath(resourceIconPaths.memoryPieces)} alt="" loading="lazy" />기억 <strong>{resources.memoryPieces}</strong></span>
          </div>

          <p className="archive-report-line">
            <span className="archive-report-label">런 기록</span><br />
            스테이지 {currentStage} · {currentTurn}층 · 최근 경로: {routeText}<br />
            예비 동전 {reserveCoins.length}/{MAX_RESERVE_COINS} · 최고 도달 층 {metaProgress.highestStage} · 누적 에코 {metaProgress.totalEchoCollected}
            {showDefeatCause ? (
              <>
                <br />패배 원인: <strong>{thisRun?.deathCause ? deathCauseLabels[thisRun.deathCause] : '미상'}</strong>
                {thisRun?.lastEnemyName ? (
                  <> · 마지막 적: <strong>{thisRun.lastEnemyName}</strong>{thisRun.lastEnemyTier ? ` (${formatTier(thisRun.lastEnemyTier as EnemyCharacter['tier'])})` : ''}</>
                ) : null}
              </>
            ) : null}
          </p>

          {summary.total > 0 ? (
            <p className="archive-report-line">
              <span className="archive-report-label">최근 기록 (최대 {summary.total}런)</span><br />
              {currentWinrate ? (
                <>이 캐릭터 승률: <strong>{currentWinrate.winrate}%</strong> ({currentWinrate.wins}승 {currentWinrate.losses}패)</>
              ) : (
                <>이 캐릭터의 최근 기록이 없습니다.</>
              )}
              {topDeathStages.length > 0 ? (
                <><br />최다 사망 스테이지: {topDeathStages.map(item => `${item.stage}스테이지 (${item.count})`).join(' · ')}</>
              ) : null}
            </p>
          ) : null}
        </div>
      </section>
    </ArchiveSurface>
  );
};

export default RunResultScreen;
```

> 보존 확인: props 시그니처·`summarizeRunHistory`·`thisRun`/`showDefeatCause`·`currentWinrate`/`topDeathStages`·`handlePrimary`/`handleSecondary`(primaryDisabled·사운드)·tone 분기 전부 무변경. 통계는 카드 그리드→타자 보고서 줄로, 자원은 archive-tag로, 버튼은 결재란으로. `Panel`/`ActionButton`/`HeartPulse` 제거. `toneClasses`(emerald/yellow/red) → `toneMeta`(eyebrow/icon/warn)로 축소.

- [ ] **Step 2: typecheck** — `npm run typecheck` → 에러 없음. (미사용: `Panel`/`ActionButton`/`HeartPulse` 제거 확인.)
- [ ] **Step 3: Commit** — `git commit -m "feat(archive): 결과 화면 다이어제틱 전환 — 사건 종결 보고서 (Phase 2)"`

---

## Task 3: e2e 엔딩 캡처 추가 + 검증

**Files:**
- Modify: `scripts/run-e2e-smoke.mjs` (deepScreens 또는 별도 블록에 3 tone 추가)

- [ ] **Step 1: 엔딩 3 tone 캡처 추가** — `deepScreens` 배열의 `reward` 항목 뒤(또는 deepScreens 루프 뒤)에, GAME_OVER/VICTORY/STAGE_CLEAR를 seed하는 캡처를 추가한다. 통계가 runHistory에 의존하므로 seed에 주입. deepScreens 배열에 아래 3개를 추가:

```js
      { step: 'game-over', state: 'GAME_OVER', selector: '.archive-result-screen' },
      { step: 'victory', state: 'VICTORY', selector: '.archive-result-screen' },
      { step: 'stage-clear', state: 'STAGE_CLEAR', selector: '.archive-result-screen' },
```

> deepScreens 루프가 `resetToMenu→seedRun→setGameState({gameState: state})`로 각 화면에 도달한다(531줄 패턴). GAME_OVER/VICTORY/STAGE_CLEAR는 seedRun이 만든 player/resources/path로 보고서가 렌더되고, runHistory가 비어도 `summary.total>0` 가드로 "최근 기록" 블록만 생략될 뿐 화면은 정상 렌더된다(패배원인도 `showDefeatCause` 가드). selector `.archive-result-screen` 공유.

- [ ] **Step 2: 전체 체크 + e2e** —

Run: `npm run check` → 통과.
Run: `npm run e2e` → `"ok": true`. `output/e2e/desktop-game-over.png`·`desktop-victory.png`·`desktop-stage-clear.png`(+mobile) 생성.

- [ ] **Step 3: Commit** — `git commit -m "test(e2e): 결과 화면 3 tone(게임오버·승리·층돌파) 캡처 추가 — 엔딩 사각지대 가드"`

---

## Task 4: 게이트 제출

- [ ] **Step 1: 스크린샷 확인** — 3 tone(`desktop-game-over`·`victory`·`stage-clear`): 일식 위 보고서 가독성, tone 도장 색(victory/clear 청록·defeat 빨강), 타이틀 명조, 통계 타자 줄, 결재란 버튼. defeat의 빨강 도장으로 패배 구분.
- [ ] **Step 2: 게이트 제출 (사람)** — 사용자 육안 승인.

---

## Self-Review

**1. 스펙 커버리지:** §3.9 장면(사건 종결 보고서, 일식 무대) ✅ / 만지는 물건(보고서 타자 통계·결재란 버튼) ✅ / 제거(통계 카드 그리드) ✅ / 건드리지 않음(recordRunEnd·재시작 로직) ✅ 무변경 / §2.2 사이안(+defeat 경고 빨강 예외) ✅ / 3화면 공유 컴포넌트 단일 전환 ✅.

**2. 플레이스홀더 스캔:** 실제 코드 ✅.

**3. 타입/이름 일관성:** `.archive-report`(+runner/portrait/runner-name/runner-sub/line/label)·`.archive-stamp.is-warn`(Task 1) = Task 2 일치 ✅. props 시그니처·`toneMeta` 키 = 래퍼 3개가 넘기는 tone과 일치 ✅. e2e selector `.archive-result-screen` = Task 2 루트 일치 ✅. `.archive-tag`/`.archive-buy-btn`/`.archive-tool-btn`/`.archive-dossier-row` 재사용 ✅.

**알려진 잔여 위험:**
- defeat의 "타버린 필름" 은유는 빨강 도장으로만 표현(별도 번짐 효과 없음) — §3.9 "빛에 타버린 필름"의 최소 해석. 게이트에서 더 필요하면 defeat 전용 오버레이 추가.
- e2e seed의 runHistory가 비어 "최근 기록" 블록이 안 보일 수 있음(`summary.total>0` 가드) — 캡처에 그 블록이 없어도 정상(가드 동작). 패배원인도 동일.
- 일식 기본 is-scene 딤(강함) 위 보고서 — 보고서가 어두운 패널이라 가독 OK, 일식은 배경으로 은은. victory에서 일식이 더 보이면 좋겠으나 tone별 딤 분기는 과설계라 생략.
- 타이틀 명조 `clamp` 크기는 기존 orbitron과 동일 비율 — 한글 명조가 더 크게 보일 수 있어 캡처 확인.
