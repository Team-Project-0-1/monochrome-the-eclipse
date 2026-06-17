# 아카이브 이벤트 화면 — 발견된 기록 장면 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이벤트 화면(`EventScreen`)을 아카이브 아트 디렉션의 "발견된 기록" 다이어제틱 장면으로 전환한다 — 시나리오를 책상 위 편지/사진 기록물로, 선택지를 여백의 연필 주석으로, 결과를 기록 위에 찍힌 도장으로. 보상·휴식·상점의 검증된 `.archive-*` 어휘를 재사용하고 이벤트 고유 물건(기록물 본문·연필 주석 선택지·결과 도장)만 추가한다.

**Architecture:** `ArchiveSurface`의 `scene` 모드(이벤트별 `scene.backgroundCss ?? backgroundPath` 딤)로 무대 이원 구조(런 중 화면)를 충족한다. 기존 `event-*` 레거시 CSS(components-03·04)와 격리하기 위해 루트 클래스를 `.archive-event-screen`으로 개명한다(휴식·상점 선례 — e2e selector 동시 수정). 이벤트 데이터·확률 로직·`eventPhase` 상태 기계(`choice`/`coinFlip`/`result`)·`EventCoinFlip`은 무변경, 표현만 교체한다.

**Tech Stack:** React 19 + TypeScript, `.archive-*` CSS(components-08-archive.css), 기존 유틸 재활용(`getEventScenePresentation`·`getEventChoicePresentation`), CDP e2e 스모크.

---

## 알아둘 코드베이스 사실 (실행 전 필독)

- **e2e 계약**: `scripts/run-e2e-smoke.mjs:551`이 `checkScreen(cdp, errors, name, 'event', '.event-screen', ...)`로 이벤트를 단언하고, 550줄이 `eventPhase: 'choice'`로 seed한다. 루트 클래스 개명 시 **551줄 selector를 `.archive-event-screen`으로 수정**해야 한다(휴식·상점 선례). **단 e2e는 `choice` 페이즈만 캡처** — `coinFlip`/`result`는 Task 4 수동 확인으로만 검증된다.
- **레거시 CSS 무수정**: 스펙 §Phase 0(line 131) "기존 components-01~07 수정 금지". `.event-*` 규칙(components-03:1238~, components-04:12~)은 **건드리지 않는다**. 루트 개명으로 마크업이 더는 `.event-screen`/`.event-scene`을 안 달면 자연히 dead가 된다.
- **이벤트 로직·상태 무변경**: `eventPhase`(choice/coinFlip/result) 분기, `handleEventChoice`·`continueEventResult`, `getEventChoicePresentation`(locked/requirementLabel/oddsLabel/riskLabel/rewardLabel), `getEventScenePresentation`, `EventCoinFlip`(targetHeads/onComplete), `eventResultData`·`eventDisplayItems` 전부 그대로 옮긴다.
- **scene 시스템**: `EventScenePresentation` = { className, backgroundPath, mobileBackgroundPath?, backgroundCss?, kicker, location, speaker, line, propLabel }. 배경은 `scene.backgroundCss ?? assetCssUrl(scene.backgroundPath ?? 'assets/backgrounds/event-encounter.png')`로 결정한다(기존 `sceneBackgroundImage` 식 그대로). **모바일 배경 분기(`mobileBackgroundPath`)는 포기** — `ArchiveSurface` `scene` prop이 단일 이미지라 데스크톱 배경으로 통일한다(휴식·상점도 단일, 같은 장면이라 정보 손실 아님).
- **EventCoinFlip 보존**: `coinFlip` 페이즈의 코인 연출은 게임 고유물(§3.4 "건드리지 않음: eventPhase 상태 기계")이라 컴포넌트 내부를 손대지 않는다. 바깥 `Panel`만 `.archive-record`로 감싼다.
- **결과 성공/실패**: `eventResultData.payload`엔 명시적 success 플래그가 없다. 도장은 "결과" 일반 라벨로 찍고, 긍정/부정 색은 `eventDisplayItems`의 숫자 value 부호로만 가른다(기존 `value > 0 ? green : red` 로직 보존).
- **플레이어 스탯 3종**(감각/무기/체력): 선택지 잠금이 class·자원 기반이라 판단 보조 정보다 → 제거하지 않고 기록 하단 작은 꼬리표(`.archive-tag`)로 강등(§3.4 "제거"는 패널-속-패널 구조이지 스탯 정보가 아님).
- **장식 제거**: `event-player-figure`(플레이어 스프라이트/초상)·`event-scene-prop`(propLabel 떠다니는 라벨)은 순수 장식(aria-hidden)이라 제거한다(보상·휴식도 초상 없앰 — 정보 손실 아님).
- **ArchiveSurface 그레인 위 스택**: 직계 자식이 그레인(z-index:1) 위에 보이려면 `position`+`z-index>=2`. 본문 section은 `relative z-10`으로 충족.
- **EffectSummary 없음**: 이벤트는 `EffectSummary`를 안 쓴다(선택지 보상/위험은 `getEventChoicePresentation`의 라벨 문자열). 그대로 둔다.

## 레이아웃 추론 (2안 중 택1)

- **A "책상 위 편지 + 여백 주석" (선택)**: choice 페이즈 = 좌측 큰 기록물(`.archive-record`: 키커 도장 + 위치 + 제목 + 본문 + 화자 대사) / 우측(lg+) 여백에 연필 주석 선택지(`.archive-margin-note` 세로 목록, 각 확률·요구·보상·위험). 스탯은 기록 하단 꼬리표. result = 기록물 위 큰 도장 + 변동 꼬리표 + 계속. coinFlip = 기록물 안에 EventCoinFlip. 보상·상점의 "본문 + 우측 보조" 2열을 잇는다.
- **B "펼친 사진첩 양면"**: 좌=사진, 우=설명을 책 양면으로. 펼침 애니·바인딩 자산 신규 + 모바일에서 양면이 깨져 1열 강제 → 연출 비용 대비 이득 적어 기각.

**근거(한 줄):** A는 §3.4의 기록물·여백 주석·도장 은유를 충족하면서 신규 CSS를 기록물·연필 주석·결과 도장 3계열로 좁히고 기존 2열 레이아웃 관용구를 잇는다.

---

## File Structure

**수정**
- `src/styles/components/components-08-archive.css` — 이벤트 전용 블록 추가(기록물 `.archive-record*`, 연필 주석 선택지 `.archive-margin-note*`, 결과 도장 `.archive-result-stamp`). 모바일 `@media` 블록 직전에 삽입.
- `src/screens/EventScreen.tsx` — 전면 교체(레거시 `event-*` 마크업 → 아카이브 어휘). 로직·상태·유틸 import 보존.
- `scripts/run-e2e-smoke.mjs:551` — selector `.event-screen` → `.archive-event-screen`.

---

## Task 1: components-08-archive.css — 이벤트 전용 스타일 블록

**Files:**
- Modify: `src/styles/components/components-08-archive.css` (모바일 `@media` 블록 직전에 삽입)

- [ ] **Step 1: 이벤트 블록 추가** — 파일에서 `/* 모바일: 카드 폭 전환 */` 주석 바로 **앞**에 삽입:

```css
/* --- 이벤트(발견된 기록): 책상 위 편지/사진 기록물. scene 딤 위 인화지 본문. --- */
.archive-record {
  position: relative;
  z-index: 2;
  padding: 1.5rem 1.6rem;
  background:
    linear-gradient(172deg, var(--archive-note-bg-a), var(--archive-note-bg-b));
  border: 1px solid rgba(20, 33, 31, 0.4);
  border-radius: 3px;
  color: var(--archive-ink);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.5);
  font-family: var(--font-family-archive);
}
.archive-record-location {
  margin-top: 0.6rem;
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--archive-ink-soft);
}
.archive-record-title {
  margin-top: 0.3rem;
  font-size: 1.7rem;
  font-weight: 700;
  line-height: 1.15;
  color: var(--archive-ink);
}
.archive-record-body {
  margin-top: 0.9rem;
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--archive-ink);
}
/* 화자 대사 = 사진 뒷면에 쓴 글(들여쓴 손글씨 톤) */
.archive-record-dialogue {
  margin-top: 1.1rem;
  padding-left: 0.9rem;
  border-left: 2px solid var(--archive-stamp-ink);
}
.archive-record-dialogue span {
  display: block;
  font-size: 0.66rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--archive-stamp-ink);
}
.archive-record-dialogue strong { font-weight: 700; font-style: italic; }
/* 기록 하단 스탯 꼬리표 줄 */
.archive-record-stats {
  margin-top: 1.2rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

/* --- 여백의 연필 주석 = 선택지. 가벼운 손글씨 톤(폴라로이드보다 약함). --- */
.archive-margin-notes {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.archive-margin-note {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.7rem 0.85rem;
  font-family: var(--font-family-archive);
  color: var(--archive-paper);
  background: rgba(6, 12, 14, 0.55);
  border: 1px solid rgba(114, 239, 255, 0.22);
  border-left: 3px solid var(--archive-accent);
  border-radius: 2px;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}
.archive-margin-note:hover { background: rgba(12, 22, 26, 0.78); border-left-color: #a8f6ff; }
.archive-margin-note:focus-visible { outline: 2px solid var(--archive-accent); outline-offset: 2px; }
.archive-margin-note:disabled {
  cursor: not-allowed;
  opacity: 0.5;
  border-left-color: var(--archive-ink-soft);
}
.archive-margin-note-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.6rem;
}
.archive-margin-note-text { font-size: 1rem; font-weight: 700; }
.archive-margin-note-odds {
  flex-shrink: 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--archive-accent);
}
.archive-margin-note-req {
  margin-top: 0.3rem;
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  color: rgba(201, 211, 214, 0.8);
}
.archive-margin-note:disabled .archive-margin-note-req { color: #e2a0a0; }
.archive-margin-note-meta {
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.9rem;
  font-size: 0.72rem;
  color: rgba(201, 211, 214, 0.75);
}

/* --- 결과 도장 — 기록 위에 찍힌 큰 스탬프 --- */
.archive-result-stamp {
  display: inline-block;
  margin: 0 auto;
  padding: 0.4rem 1.4rem;
  font-family: var(--font-family-archive);
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--archive-stamp-ink);
  border: 3px solid var(--archive-stamp-ink);
  border-radius: 4px;
  transform: rotate(-4deg);
}

/* --- 코인플립 프레임 — EventCoinFlip은 어두운 배경 전제(밝은 텍스트/코인)라
       밝은 인화지(.archive-record) 대신 어두운 박스 위에 둬 대비를 보존한다. --- */
.archive-coinflip-frame {
  position: relative;
  z-index: 2;
  padding: 1.4rem 1.5rem;
  background: rgba(6, 12, 14, 0.82);
  border: 1px solid rgba(114, 239, 255, 0.25);
  border-radius: 4px;
  color: var(--archive-paper);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.55);
}

```

- [ ] **Step 2: typecheck (CSS는 빌드 검증)**

Run: `npm run typecheck`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add src/styles/components/components-08-archive.css
git commit -m "feat(archive): 이벤트 기록물·연필 주석 선택지·결과 도장 스타일 (Phase 2)"
```

---

## Task 2: EventScreen.tsx 아카이브 전환

**Files:**
- Modify: `src/screens/EventScreen.tsx` (마크업 전면 교체, 로직·유틸 import 보존)

- [ ] **Step 1: 전체 교체** — `src/screens/EventScreen.tsx` 전체를 아래로:

```tsx
import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import EventCoinFlip from '../components/EventCoinFlip';
import ArchiveSurface from '../components/archive/ArchiveSurface';
import ArchiveStamp from '../components/archive/ArchiveStamp';
import { assetCssUrl } from '../utils/assetPath';
import { getEventChoicePresentation } from '../utils/eventPresentation';
import { getEventScenePresentation } from '../utils/eventScenes';
import { playGameSfx, playUiSound } from '../utils/sound';

export const EventScreen = () => {
  const currentEvent = useGameStore(state => state.currentEvent);
  const player = useGameStore(state => state.player);
  const eventPhase = useGameStore(state => state.eventPhase);
  const eventResultData = useGameStore(state => state.eventResultData);
  const eventDisplayItems = useGameStore(state => state.eventDisplayItems);
  const resources = useGameStore(state => state.resources);
  const handleEventChoice = useGameStore(state => state.handleEventChoice);
  const continueEventResult = useGameStore(state => state.continueEventResult);
  const gameOptions = useGameStore(state => state.gameOptions);

  if (!currentEvent || !player) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">이벤트 로딩 중...</div>;
  }

  const scene = getEventScenePresentation(currentEvent.id);
  const sceneBackgroundImage = scene.backgroundCss ?? assetCssUrl(scene.backgroundPath ?? 'assets/backgrounds/event-encounter.png');

  const continueFromResult = () => {
    playUiSound(gameOptions.soundEnabled, 'confirm');
    continueEventResult();
  };

  return (
    // 발견된 기록 — 책상 위 편지/사진 한 장 위에서 다음 선택을 읽는다(런 중 화면, 슬더스 문법).
    <ArchiveSurface scene={sceneBackgroundImage} className="archive-event-screen p-4 sm:p-6">
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] max-w-4xl flex-col justify-center gap-5">
        {eventPhase === 'choice' && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            {/* 발견된 기록물 — 편지/사진 본문 */}
            <article className="archive-record">
              <ArchiveStamp>{scene.kicker}</ArchiveStamp>
              <div className="archive-record-location">{scene.location}</div>
              <h1 className="archive-record-title">{currentEvent.title}</h1>
              <p className="archive-record-body">{currentEvent.description}</p>
              <div className="archive-record-dialogue">
                <span>{scene.speaker}</span>
                <strong>{scene.line}</strong>
              </div>
              <div className="archive-record-stats">
                <span className="archive-tag">감각 <strong>{player.signature ?? '감각 동기'}</strong></span>
                <span className="archive-tag">무기 <strong>{player.weapon ?? '무기'}</strong></span>
                <span className="archive-tag">체력 <strong>{player.currentHp}/{player.maxHp}</strong></span>
              </div>
            </article>

            {/* 여백의 연필 주석 — 선택지 */}
            <div className="archive-margin-notes" role="group" aria-label="선택지">
              {currentEvent.choices.map((choice, index) => {
                const preview = getEventChoicePresentation(choice, player.class, resources);
                return (
                  <button
                    key={`${choice.text}-${index}`}
                    type="button"
                    className="archive-margin-note"
                    disabled={preview.locked}
                    onClick={() => {
                      playUiSound(gameOptions.soundEnabled, 'confirm');
                      playGameSfx(gameOptions.soundEnabled, 'eventChoice');
                      handleEventChoice(choice);
                    }}
                  >
                    <span className="archive-margin-note-head">
                      <span className="archive-margin-note-text">{choice.text}</span>
                      <span className="archive-margin-note-odds">{preview.oddsLabel}</span>
                    </span>
                    {preview.requirementLabel && (
                      <span className="archive-margin-note-req">
                        {preview.locked ? '잠김 · ' : '조건 · '}{preview.requirementLabel}
                      </span>
                    )}
                    <span className="archive-margin-note-meta">
                      <span>보상 · {preview.rewardLabel}</span>
                      <span>위험 · {preview.riskLabel}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {eventPhase === 'coinFlip' && eventResultData?.type === 'coinFlipSetup' && (
          // EventCoinFlip은 밝은 텍스트/코인 전제 → 밝은 인화지가 아니라 어두운 frame 위에 둔다.
          <div className="archive-coinflip-frame mx-auto w-full max-w-2xl text-center">
            <div className="archive-tray-label">{scene.kicker} · {scene.location}</div>
            <div className="mt-4">
              <EventCoinFlip targetHeads={eventResultData.payload.targetHeads} onComplete={eventResultData.payload.onComplete} />
            </div>
          </div>
        )}

        {eventPhase === 'result' && eventResultData?.payload && (
          <article className="archive-record mx-auto w-full max-w-2xl text-center">
            <span className="archive-result-stamp">결과</span>
            <div className="archive-record-location mt-3">{scene.kicker} · {scene.location}</div>
            <p className="archive-record-body whitespace-pre-wrap">
              {String(eventResultData.payload.baseMessage || '결과가 발생했습니다.')}
            </p>
            {eventDisplayItems.length > 0 && (
              <div className="archive-record-stats justify-center">
                {eventDisplayItems.map(({ label, value }) => {
                  const isNum = typeof value === 'number';
                  const isString = typeof value === 'string';
                  if (!isNum && !isString) return null;
                  const isPositive = isNum && value > 0;
                  return (
                    <span key={label} className="archive-tag">
                      {label} <strong style={{ color: isNum ? (isPositive ? '#3f9d57' : '#b4513f') : undefined }}>
                        {isPositive ? '+' : ''}{String(value)}
                      </strong>
                    </span>
                  );
                })}
              </div>
            )}
            {/* 밝은 인화지 위라 ghost(밝은 글씨) 대신 청록 배경 버튼으로 대비·강조 확보 */}
            <button type="button" className="archive-buy-btn mx-auto mt-6" style={{ maxWidth: '12rem' }} onClick={continueFromResult}>
              계속
              <ArrowRight className="h-4 w-4" />
            </button>
          </article>
        )}
      </section>
    </ArchiveSurface>
  );
};
```

> 보존 확인: `eventPhase` 3분기·`handleEventChoice`·`continueEventResult`·`getEventChoicePresentation`(locked/odds/req/reward/risk)·`EventCoinFlip`(targetHeads/onComplete)·`eventDisplayItems` 부호 색·사운드 훅 전부 무변경. 정보 손실 없음 — 시나리오는 기록물 본문으로, 선택지 메타는 연필 주석으로, 스탯은 꼬리표로, 결과는 도장+변동으로 이동. `event-player-figure`/`event-scene-prop` 장식만 제거. 레거시 `event-*` 클래스 전부 제거(Task 3에서 e2e selector만 갱신).

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: 에러 없음. (미사용 import 육안 확인 — ① 제거된 옛 import: `AlertTriangle`/`Dice5`/`Lock`/`RadioTower`/`Sparkles`/`ActionButton`/`Panel`, ② **새로 안 쓰게 된 것**: `ArchiveCaption`(본문은 raw `<p className="archive-record-body">`)·`assetPath`(figure 제거로 배경 `assetCssUrl`만 사용) — 위 import 블록에서 이미 뺐는지 확인. tsconfig에 `noUnusedLocals`가 없어 typecheck가 못 잡는다.)

- [ ] **Step 3: Commit**

```bash
git add src/screens/EventScreen.tsx
git commit -m "feat(archive): 이벤트 화면 다이어제틱 전환 — 발견된 기록 (Phase 2)"
```

---

## Task 3: e2e selector 갱신 + 전체 검증

**Files:**
- Modify: `scripts/run-e2e-smoke.mjs:551`

- [ ] **Step 1: selector 갱신** — 551줄:

찾기: `    await checkScreen(cdp, errors, name, 'event', '.event-screen', overflows, screenshots);`
교체: `    await checkScreen(cdp, errors, name, 'event', '.archive-event-screen', overflows, screenshots);`

- [ ] **Step 2: 전체 체크**

Run: `npm run check`
Expected: 통과(테스트·typecheck·build·dist 예산·e2e 훅 누출 검사).

- [ ] **Step 3: Commit**

```bash
git add scripts/run-e2e-smoke.mjs
git commit -m "test(e2e): 이벤트 스모크 selector를 .archive-event-screen으로 갱신"
```

---

## Task 4: 검증 + 게이트 제출

- [ ] **Step 1: e2e + 스크린샷 (choice 페이즈)**

Run: `npm run e2e`
Expected: `"ok": true`. `output/e2e/desktop-event.png`·`mobile-event.png` 생성 — 딤 처리된 이벤트 장면 + 기록물(키커 도장·제목·본문·화자 대사·스탯 꼬리표) + 연필 주석 선택지.

- [ ] **Step 2: result 페이즈 — 머지 전 headless 캡처 필수** (e2e choice 캡처가 전혀 안 건드리는 신규 CSS)

`result`는 자체 신규 CSS(`.archive-result-stamp`·중앙정렬 record·displayItems·청록 계속 버튼)라 choice 캡처로 검증 0. setState 페이로드가 순수 데이터(함수 없음)라 headless CDP로 머지 전 캡처 가능(메모리 `reference-headless-screenshot-cdp`). dev 빌드 정적 서빙 후 `window.__gameStore.setState`로 토글하고 캡처:

```js
window.__gameStore.setState({ gameState: 'EVENT', currentEvent: window.__eventData.event_supplies, eventPhase: 'result', eventResultData: { type: 'result', payload: { baseMessage: '보급품을 확보했다.' } }, eventDisplayItems: [{ label: '에코', value: 12 }, { label: '체력', value: -5 }] })
```
확인: 결과 도장(회전 스탬프) + 변동 꼬리표(에코 +12 초록 / 체력 −5 빨강) + 청록 "계속" 버튼이 밝은 인화지 위에서 모두 대비 확보. **이 캡처를 통과해야 머지** — dev 수동으로 미루지 말 것.

- [ ] **Step 3: coinFlip 페이즈 — 머지 전 dev 대비 확인** (onComplete가 함수라 headless 부적합)

`npm run dev` → 실제 이벤트에서 확률 선택지 클릭 → coinFlip 진입. `EventCoinFlip`(밝은 `text-yellow-300`/`text-gray-300`·어두운 코인)이 어두운 `.archive-coinflip-frame` 위에서 정상 대비로 보이는지 확인. reducedMotion ON에서 그레인 정지 확인.

- [ ] **Step 4: 게이트 제출 (사람)**

`output/e2e/desktop-event.png`·`mobile-event.png`를 사용자에게 제시하고 육안 승인 요청. 거부 시: 토큰/레이아웃만 조정 후 재캡처(로직 무변경 유지).

---

## Self-Review (작성자 체크)

**1. 스펙 커버리지:** §3.4 장면(발견된 기록=scene 딤) ✅ Task 2 / 만지는 물건(기록물 본문·연필 주석 선택지·결과 도장) ✅ Task 1·2 / 제거(패널-속-패널 구조) ✅ Task 2(Panel 제거, 단일 article) / 건드리지 않음(이벤트 데이터·확률·eventPhase·EventCoinFlip) ✅ 무변경 / §2.2 한랭 사이안(`--archive-accent`·`--archive-stamp-ink`) ✅ / §2.5 정보 손실 금지(시나리오·선택지 메타·스탯·결과 변동 전부 다이어제틱 보존) ✅.

**2. 플레이스홀더 스캔:** 전 단계 실제 코드. "적절히" 류 없음 ✅.

**3. 타입/이름 일관성:** `.archive-record`/`.archive-record-location`/`.archive-record-title`/`.archive-record-body`/`.archive-record-dialogue`/`.archive-record-stats`/`.archive-margin-notes`/`.archive-margin-note`(+head/text/odds/req/meta)/`.archive-result-stamp`/`.archive-coinflip-frame`(Task 1) = Task 2 사용처 일치 ✅. coinFlip은 어두운 frame(밝은 EventCoinFlip 대비 보존), result 계속 버튼은 `.archive-buy-btn`(밝은 인화지 대비) — 페이즈별 배경 명도에 맞춘 버튼/컨테이너 선택 ✅. `getEventChoicePresentation` 반환 키(locked/requirementLabel/oddsLabel/riskLabel/rewardLabel) = Task 2 사용 일치 ✅. e2e selector `.archive-event-screen`(Task 3) = Task 2 루트 클래스 일치 ✅.

**알려진 잔여 위험:**
- 모바일 배경 분기(`mobileBackgroundPath`) 포기 — 데스크톱 배경 통일. 일부 이벤트가 모바일 전용 배경을 갖고 있었다면 그 차이만 사라진다(같은 장면, 정보 손실 아님).
- `coinFlip`/`result`는 e2e 미캡처 → Task 4 Step 2 수동 필수. 건너뛰면 두 페이즈 회귀가 자동 검출 안 됨.
- `archive-record-dialogue strong`이 italic — 한글 명조(Gowun Batang)에서 기울임이 어색하면 Task 1에서 `font-style: normal`로(게이트 캡처 판정).
- 연필 주석 선택지를 `<button>`(키보드 접근)로 둠 — 카드가 아니라 리스트 항목이라 폴라로이드 `dealt` 연출 없음(의도: 여백 주석은 가벼움).
