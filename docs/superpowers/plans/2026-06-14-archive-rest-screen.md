# 아카이브 휴식 화면 — 암실 현상 장면 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 휴식 화면(`RestScreen`)을 아카이브 아트 디렉션의 "암실(현상실)" 다이어제틱 장면으로 전환한다 — 정비 선택지를 현상대 위 폴라로이드로, HP 상태를 "현상값" 트레이로. 보상화면의 검증된 `.archive-*` 어휘를 재사용하고 휴식 고유 물건(현상 트레이·비활성 폴라로이드·미니 권장 도장)만 추가한다.

**Architecture:** `ArchiveSurface`의 `scene` 모드(`rest-camp.png` 딤)로 무대 이원 구조(런 중 화면)를 충족한다. 기존 `rest-*` 레거시 CSS(components-01~07)와 격리하기 위해 루트 클래스를 `.archive-rest-screen`으로 개명한다(보상화면 `f0584fd` 선례 — e2e selector 동시 수정). 휴식 로직(`handleRestChoice`·회복 비율·`recommendedChoice`)은 무변경, 표현만 교체한다.

**Tech Stack:** React 19 + TypeScript, `.archive-*` CSS(components-08-archive.css), 기존 에셋 재활용(`healing-vial.png`·`resourceIconPaths`), CDP e2e 스모크.

---

## 알아둘 코드베이스 사실 (실행 전 필독)

- **e2e 계약**: `scripts/run-e2e-smoke.mjs:531`이 `{ step: 'rest', state: 'REST', selector: '.rest-screen' }`로 휴식을 도달·단언한다. 루트 클래스 개명 시 **이 줄을 같은 작업에서 `.archive-rest-screen`으로 수정**해야 한다(보상화면이 561줄에서 `.archive-reward-screen`으로 한 선례). "selector 유지"를 무비판 답습하지 말 것.
- **팔레트**: §2.2 〈월식 사이안〉이 §3.3 "붉은 안전등"(웜 세피아 1차안 잔재)보다 우선이다(§1 불변규칙 > §3 화면 의도). 암실 광원·강조는 `--archive-accent`(사이안).
- **휴식 로직 무변경**: `healAmount = floor(maxHp*0.4)`, `recommendedChoice`(hp≤60%→heal, else memoryPieces>0→altar, else null), `chooseHeal`의 `!canHeal` deny 가드. 전부 그대로 옮긴다.
- **에셋 재활용 원칙**(`3118a9f`): 신규 이미지 생성 금지. 피사체는 기존 에셋만 — 회복=`assets/items/healing-vial.png`, 제단=`resourceIconPaths.memoryPieces`, 이동=lucide `SkipForward`(사이안 틴트).
- **reducedMotion**: `body.is-reduced-motion`이 CSS 애니를 차단. 카드 낙하(`.archive-card.is-dealt`)·그레인은 기존 가드 재사용 — 신규 keyframe 없음.
- **ArchiveCard**: `interactive` 시 `<button>`이라 `disabled` prop이 `ButtonHTMLAttributes`로 전달된다. 비활성 시각은 CSS(`button.archive-card:disabled`)로 신규 처리.
- **ArchiveSurface 그레인 위 스택**: 직계 자식이 그레인(z-index:1) 위에 보이려면 `position`+`z-index>=2`가 필요. 헤더 트레이에 적용.

## 레이아웃 추론 (2안 중 택1)

- **A "암실 현상대" (선택)**: 상단 = 정비 기록 도장 + HP 현상 트레이 / 중단 = 야영 기록 메모지 / 하단 = 폴라로이드 3장(회복·제단·이동) 가로 배열. 보상 그리드 패턴을 그대로 잇고 현상실 은유를 충족하는 최소 신규 경로.
- **B "건조줄 집게"**: 선택지를 빨랫줄에 집게로 매다는 안. 연출 비용 과다(빨랫줄·집게·흔들림 신규 자산/애니)이고 자유 영역을 초과 → 기각.

**근거(한 줄):** A는 Phase 0 공용 어휘 재사용을 극대화(신규 CSS 3종만)하면서 §3.3의 현상실 의도를 만족한다.

---

## File Structure

**수정**
- `src/styles/components/components-08-archive.css` — 휴식 전용 블록 추가(현상 트레이 `.archive-tray*`, 미니 권장 도장 `.archive-stamp-mini`, 비활성 폴라로이드 `button.archive-card:disabled`). 모바일 블록 앞에 삽입.
- `src/screens/RestScreen.tsx` — 전면 교체(레거시 `rest-*` 마크업 → 아카이브 어휘).
- `scripts/run-e2e-smoke.mjs:531` — selector `.rest-screen` → `.archive-rest-screen`.

---

## Task 1: components-08-archive.css — 휴식 전용 스타일 블록

**Files:**
- Modify: `src/styles/components/components-08-archive.css` (모바일 `@media` 블록 직전에 삽입)

- [ ] **Step 1: 휴식 블록 추가** — `/* 모바일: 카드 폭 전환 */` 주석 바로 앞에 삽입:

```css
/* --- 휴식(암실): 현상 트레이 = HP 상태. scene 딤 위에 직접 놓이므로 밝은 텍스트. --- */
.archive-tray {
  position: relative;
  z-index: 2; /* 그레인 위 */
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 9rem;
  padding: 0.5rem 0.75rem;
  background: rgba(6, 12, 14, 0.6);
  border: 1px solid rgba(114, 239, 255, 0.25);
  border-radius: 3px;
  color: var(--archive-paper);
  font-family: var(--font-family-archive);
}
.archive-tray-label {
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--archive-accent);
}
.archive-tray strong { font-size: 1.4rem; font-weight: 700; line-height: 1; }
.archive-tray strong small { font-size: 0.8rem; color: rgba(201, 211, 214, 0.7); }
.archive-tray-gauge {
  height: 0.3rem;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 99px;
  overflow: hidden;
}
.archive-tray-gauge > i {
  display: block;
  height: 100%;
  background: var(--archive-accent);
}

/* --- 미니 권장 도장 (캡션 옆 소형 스탬프) --- */
.archive-stamp-mini {
  margin-left: 0.4rem;
  padding: 0.1rem 0.4rem;
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  border-width: 1.5px;
  vertical-align: middle;
}

/* --- 비활성 폴라로이드 (회복 불가 등) — 물리 반응·반사 스윕 제거 --- */
button.archive-card:disabled { cursor: not-allowed; opacity: 0.55; filter: grayscale(0.3); }
button.archive-card:disabled:hover,
button.archive-card:disabled:focus-visible {
  transform: none;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.08) inset,
    0 10px 24px rgba(0, 0, 0, 0.55),
    0 2px 6px rgba(0, 0, 0, 0.4);
}
button.archive-card:disabled::after { display: none; }

```

- [ ] **Step 2: typecheck (CSS는 빌드 검증)**

Run: `npm run typecheck`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add src/styles/components/components-08-archive.css
git commit -m "feat(archive): 휴식 현상 트레이·미니 도장·비활성 폴라로이드 스타일 (Phase 2)"
```

---

## Task 2: RestScreen.tsx 아카이브 전환

**Files:**
- Modify: `src/screens/RestScreen.tsx` (전면 교체)

- [ ] **Step 1: 화면 교체** — `src/screens/RestScreen.tsx` 전체를 아래로:

```tsx
import React from 'react';
import { SkipForward } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import ArchiveSurface from '../components/archive/ArchiveSurface';
import ArchiveCard from '../components/archive/ArchiveCard';
import ArchiveStamp from '../components/archive/ArchiveStamp';
import ArchiveCaption from '../components/archive/ArchiveCaption';
import { assetCssUrl, assetPath } from '../utils/assetPath';
import { resourceIconPaths } from '../utils/resourceAssets';
import { playGameSfx, playUiSound } from '../utils/sound';

// 휴식 선택지 = 암실 현상대 위 폴라로이드. 손으로 놓은 기울기(균일하면 그리드로 보인다).
const CARD_TILTS = [-1.3, 0.8, -0.5];

export const RestScreen = () => {
  const player = useGameStore(state => state.player);
  const resources = useGameStore(state => state.resources);
  const handleRestChoice = useGameStore(state => state.handleRestChoice);
  const proceedToNextTurn = useGameStore(state => state.proceedToNextTurn);
  const gameOptions = useGameStore(state => state.gameOptions);

  if (!player) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        휴식 지점 로딩 중...
      </main>
    );
  }

  const healAmount = Math.floor(player.maxHp * 0.4);
  const healedHp = Math.min(player.maxHp, player.currentHp + healAmount);
  const missingHp = Math.max(0, player.maxHp - player.currentHp);
  const canHeal = missingHp > 0;
  // 회복량(maxHp*0.4)이 상한에 잘리지 않는 60% 이하에서 회복 권장, 그 외엔 영구 성장(제단) 권장.
  const recommendedChoice: 'heal' | 'altar' | null =
    canHeal && player.currentHp / player.maxHp <= 0.6
      ? 'heal'
      : resources.memoryPieces > 0
        ? 'altar'
        : null;
  const hpPct = Math.round((player.currentHp / player.maxHp) * 100);

  const chooseHeal = () => {
    if (!canHeal) {
      playUiSound(gameOptions.soundEnabled, 'deny');
      return;
    }
    playUiSound(gameOptions.soundEnabled, 'confirm');
    playGameSfx(gameOptions.soundEnabled, 'restHeal');
    handleRestChoice('heal');
  };

  const chooseAltar = () => {
    playUiSound(gameOptions.soundEnabled, 'confirm');
    handleRestChoice('memory_altar');
  };

  const skipRest = () => {
    playUiSound(gameOptions.soundEnabled, 'select');
    proceedToNextTurn();
  };

  return (
    // 암실(현상실) — 야영 장면 위에서 다음 한 수를 현상한다(런 중 화면, 슬더스 문법).
    <ArchiveSurface scene={assetCssUrl('assets/backgrounds/rest-camp.png')} className="archive-rest-screen overflow-hidden p-4 sm:p-6">
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] max-w-4xl flex-col justify-center gap-6">
        {/* 정비 기록 도장 + 현상값 트레이 — 키커/타이틀/설명문/HP 카드의 다이어제틱 대체물 */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <ArchiveStamp>안전 공명대 — 정비 기록</ArchiveStamp>
          <div className="archive-tray" role="img" aria-label={`체력 ${player.currentHp}/${player.maxHp}`}>
            <span className="archive-tray-label">현상값 · 체력</span>
            <strong>{player.currentHp}<small>/{player.maxHp}</small></strong>
            <div className="archive-tray-gauge"><i style={{ width: `${hpPct}%` }} /></div>
          </div>
        </header>

        {/* 야영 기록 대사 — 책상 모서리 메모지 */}
        <aside className="archive-note max-w-xl self-start">
          "동전은 멈췄을 때 더 크게 울린다. 지금은 선택을 미룰 수 있는 몇 안 되는 순간이다."
        </aside>

        {/* 현상대 위 폴라로이드 — 정비 선택지 3장 */}
        <div className="grid gap-5 sm:grid-cols-3">
          {/* 회복 */}
          <ArchiveCard
            interactive
            dealt
            tilt={CARD_TILTS[0]}
            disabled={!canHeal}
            aria-label={canHeal ? `체력 회복 — ${player.currentHp}에서 ${healedHp}로 현상` : '체력 회복 — 이미 최대 체력'}
            onClick={chooseHeal}
          >
            <div className="archive-photo-frame">
              <img src={assetPath('assets/items/healing-vial.png')} alt="" loading="lazy" />
            </div>
            <ArchiveCaption>
              <strong>체력 회복</strong>
              {recommendedChoice === 'heal' && <ArchiveStamp className="archive-stamp-mini">권장</ArchiveStamp>}
            </ArchiveCaption>
            <ArchiveCaption sub>{canHeal ? `${player.currentHp} → ${healedHp} HP 현상` : '이미 최대 체력입니다'}</ArchiveCaption>
          </ArchiveCard>

          {/* 기억의 제단 */}
          <ArchiveCard
            interactive
            dealt
            tilt={CARD_TILTS[1]}
            aria-label={`기억의 제단 — 기억 조각 ${resources.memoryPieces}개 보유`}
            onClick={chooseAltar}
          >
            <div className="archive-photo-frame">
              <img src={assetPath(resourceIconPaths.memoryPieces)} alt="" loading="lazy" />
            </div>
            <ArchiveCaption>
              <strong>기억의 제단</strong>
              {recommendedChoice === 'altar' && <ArchiveStamp className="archive-stamp-mini">권장</ArchiveStamp>}
            </ArchiveCaption>
            <ArchiveCaption sub>영구 성장 — 다음 싸움의 기준을 새긴다</ArchiveCaption>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="archive-tag">
                <img src={assetPath(resourceIconPaths.memoryPieces)} alt="" loading="lazy" />
                기억 {resources.memoryPieces}
              </span>
            </div>
          </ArchiveCard>

          {/* 정비 없이 이동 */}
          <ArchiveCard
            interactive
            dealt
            tilt={CARD_TILTS[2]}
            aria-label="정비 없이 이동 — 다음 경로로 바로 진행"
            onClick={skipRest}
          >
            <div className="archive-photo-frame">
              <SkipForward className="h-12 w-12" style={{ color: 'var(--archive-accent)' }} />
            </div>
            <ArchiveCaption>
              <strong>정비 없이 이동</strong>
            </ArchiveCaption>
            <ArchiveCaption sub>다음 경로로 바로 진행</ArchiveCaption>
          </ArchiveCard>
        </div>
      </section>
    </ArchiveSurface>
  );
};
```

> 보존 확인: `handleRestChoice('heal'|'memory_altar')`·`proceedToNextTurn`·`!canHeal` deny 가드·`recommendedChoice`·사운드 훅 전부 무변경. 정보 손실 없음 — HP는 현상 트레이로, 권장은 미니 도장으로, 회복 불가는 disabled 카드+캡션으로 이동. 레거시 `rest-*` 클래스 전부 제거(누구도 참조 안 함 — Task 3에서 e2e selector만 갱신).

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: 에러 없음. (미사용이 된 import — `ArrowRight`/`Bed`/`HeartPulse`/`Landmark`/`Moon`/`ActionButton` — 가 새 코드에 남지 않았는지 육안 확인. tsconfig에 `noUnusedLocals`가 없어 typecheck가 못 잡는다.)

- [ ] **Step 3: Commit**

```bash
git add src/screens/RestScreen.tsx
git commit -m "feat(archive): 휴식 화면 다이어제틱 전환 — 암실 현상대 폴라로이드 (Phase 2)"
```

---

## Task 3: e2e selector 갱신 + 전체 검증

**Files:**
- Modify: `scripts/run-e2e-smoke.mjs:531`

- [ ] **Step 1: selector 갱신** — 531줄:

찾기: `      { step: 'rest', state: 'REST', selector: '.rest-screen' },`
교체: `      { step: 'rest', state: 'REST', selector: '.archive-rest-screen' },`

- [ ] **Step 2: 전체 체크**

Run: `npm run check`
Expected: 통과(테스트·typecheck·build·dist 예산·e2e 훅 누출 검사).

- [ ] **Step 3: Commit**

```bash
git add scripts/run-e2e-smoke.mjs
git commit -m "test(e2e): 휴식 스모크 selector를 .archive-rest-screen으로 갱신"
```

---

## Task 4: 검증 + 게이트 제출

- [ ] **Step 1: e2e + 스크린샷**

Run: `npm run e2e`
Expected: `"ok": true`. `output/e2e/desktop-rest.png`·`output/e2e/mobile-rest.png` 생성 — 딤 처리된 야영 장면 + 도장 헤더 + 현상값 트레이 + 폴라로이드 3장.

- [ ] **Step 2: reducedMotion 수동 확인**

`npm run dev` → 옵션 reducedMotion ON → REST 진입: 폴라로이드 낙하·그레인 시프트가 생략되고 즉시 표시되는지 확인.

- [ ] **Step 3: 게이트 제출 (사람)**

`output/e2e/desktop-rest.png`·`mobile-rest.png`를 사용자에게 제시하고 육안 승인 요청. 거부 시: 토큰/레이아웃만 조정 후 재캡처(로직 무변경 유지).

---

## Self-Review (작성자 체크)

**1. 스펙 커버리지:** §3.3 장면(암실=scene 딤) ✅ Task 2 / 만지는 물건(폴라로이드 선택지·HP 현상값) ✅ Task 1·2 / 제거(선택지 폼 UI 문법) ✅ Task 2 / 건드리지 않음(휴식 로직) ✅ 무변경 / §2.2 한랭 사이안(붉은 안전등 기각) ✅ / §2.5 정보 손실 금지(HP·권장·회복불가 전부 다이어제틱 보존) ✅.

**2. 플레이스홀더 스캔:** 전 단계 실제 코드. "적절히" 류 없음 ✅.

**3. 타입/이름 일관성:** `.archive-tray`/`.archive-tray-label`/`.archive-tray-gauge`/`.archive-stamp-mini`(Task 1) = Task 2 사용처 일치 ✅. `ArchiveCard`의 `interactive`/`dealt`/`tilt`/`disabled`(기존 props) = Task 2 사용 일치 ✅. e2e selector `.archive-rest-screen`(Task 3) = Task 2 루트 클래스 일치 ✅.

**알려진 잔여 위험:**
- `ArchiveCaption`(`<p>`) 안에 `ArchiveStamp`(`<span>`) 중첩 — 유효(인라인). 권장 도장 정렬이 어색하면 캡션을 flex로(자유 영역, 게이트 캡처에서 판정).
- 플레이어 초상(`rest-actor`) 제거 — 이름은 정비 화면 필수 정보 아님(보상화면도 초상 없음). 정보 손실 아님.
- 모바일에서 헤더(도장+트레이) 줄바꿈은 `flex-wrap`으로 처리. 캡처에서 겹침 확인.
