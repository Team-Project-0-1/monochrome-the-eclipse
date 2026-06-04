# 허브 화면 시각 재구성 (Hub Visual Redesign)

- 날짜: 2026-06-05
- 상태: 승인됨 (사용자 "추천안대로 끝까지 진행")
- 근거 스크린샷: `output/e2e/desktop-*.png` (e2e 캡처)

## 문제

게임이 "이중인격":
- **게임다운 화면(이미 좋음)**: Menu(풀블리드 일식 배경 + 큰 타이틀), Combat(`combat-camera`+`CombatStage` 스프라이트+하단 카드패 HUD, 펼침형 `CombatIntelBar` 점진 공개).
- **웹앱 같은 화면(문제)**: Exploration(최악 — 배경 이미지 0, 순수 검정 대시보드), Shop/Event/Rest/Altar(배경이 `0.9+` 감광막에 덮임, 불투명 `bg-gray-900/950` 패널 + 산문).

원인(코드 확인): 공통 셸 부재 → 화면마다 배경+감광 재발명. `GameShell`은 CharacterSelect만 사용하며 자체적으로 `0.82→0.98` 무거운 그라데이션을 하드코딩. `Panel`은 전부 불투명.

## 목표

허브 화면을 Combat/Menu 수준 몰입감으로:
1. 통합 셸 — 풀블리드 배경 + 얇은 스크림(`~0.10→0.65`, exploration의 `0.92→1.0` 금지)
2. 글래스 패널 — 배경이 비치게 (`bg-gray-950/40 + backdrop-blur`)
3. 점진적 공개 — 산문/플레이버 접고 핵심은 아이콘·칩, 상세는 호버/우클릭 (combat IntelBar 패턴 전파). **삭제 아님(전투 정보는 필수)**
4. 상호작용 — 호버 툴팁 보편화(`KeywordTooltip` 재사용), 우클릭 상세(`onContextMenu`+`preventDefault`)
5. 시각적 강조 — 선택지(노드/구매)에 스포트라이트, 잠긴 항목 디밍

## 접근: 수직 슬라이스 → 전파

탐험(Exploration) 1화면을 먼저 새 표준으로 완성 → before/after 검증 → 동일 패턴을 shop/rest/event/altar(+character-select)로 전파.

### 재사용 프리미티브
- **P①** `GameShell`: `backgroundImage?`, `scrim?: 'none'|'light'|'medium'|'heavy'` 추가. 기본값은 기존 동작 보존(CharacterSelect 무영향).
- **P②** `Panel`: `variant?: 'solid'|'glass'`. glass = 반투명+blur+`border-white/10`. `data-card-tone` 유지.
- **P③** `utils/stageBackground.ts`: combat의 stage 배경 결정 로직(`clamp(stage,1,3)` + stage3 public-safe 폴백) 추출 → combat·exploration 공유.
- **P④** 호버/우클릭 상세 컨벤션(`KeywordTooltip` 기반).

### 탐험 구체 변경
1. 루트를 `<GameShell className="exploration-screen" backgroundImage={stageBg} scrim="light">`로 (루트 클래스·셀렉터 유지).
2. route-hero → 컴팩트 글래스 바(스테이지명·층 progress·위협 칩). 긴 설명문은 "?" 호버로.
3. NodeSelection = 주인공: 카드 확대·스포트라이트, 상시 텍스트 최소화(아이콘+이름+핵심1줄), 상세는 호버 툴팁/우클릭. 잠긴 노드 디밍.
4. "경로 해석" 플레이버 패널 → 힌트 툴팁으로 흡수. 미니맵/캐릭터 패널 글래스화·축소.

## 제약 (회귀 방지)
- `.exploration-screen` 루트 클래스 + 모든 `data-testid`(`route-node-*`, `open-inventory-button` 등) 보존 → e2e 통과.
- 가로 오버플로 0 (1280 / 390). 세로는 ~720 목표(보너스).
- Vitest 238개 green(로직 레벨이라 레이아웃 무관해야 함), `npm run check` 통과.
- 스테이지3 `stage3PublicSafeBackgroundCss` 폴백 유지.
- 우클릭은 네이티브 메뉴/다이얼로그 트리거 금지(`preventDefault`).

## 단계
- **Phase 1**: 프리미티브 P①~④ + 탐험 재구성 + CSS. 검증(typecheck/test/e2e 재캡처, 시각 before/after).
- **Phase 2**: shop/rest/event/altar(+character-select) 전파. 공유 CSS는 P1에서 확정해 충돌 최소화.
- **Phase 3**: 최종 검증 — `npm run check` + e2e 전 화면 재캡처 + 별도 reviewer/verifier 에이전트(자기승인 금지).

## 검증 방법
- `npm run e2e` → `output/e2e/*.png` before/after 비교.
- `npm run check`(text-integrity·stage·typecheck·test:run·passives·release-assets·build·dist).
