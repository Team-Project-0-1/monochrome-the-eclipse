# 탐험화면 개선 — 기능색 + 위계 (2026-06-10)

## 배경 / 문제

탐험화면은 2026-06-05(bd8d9eb)에 배경 아트·글래스 패널·호버 상세로 재설계됐다.
그 위에서 두 가지를 다듬는다.

**근본 원인 (기능색이 약했던 진짜 이유):** 노드 카드 색이 **노드 타입이 아니라
카드 위치(`:nth-child`)** 로 결정되고 있었다. `components-05.css`에서:
- 전역 `.route-node-card`(607) = 슬롯1 붉은 배경, `:nth-child(2)`(614) = 금색, `:nth-child(3)`(620) = 청록
- exploration 스코프 `:nth-child(2/3)`(682/686) 도 동일하게 위치 기반 배경
- 테두리도 위치 기반(343–347 올-레드 + 614/620 nth-child)

→ 슬롯1의 상점(안전)이 붉게(위험), 슬롯3의 전투(위험)가 청록(안전)으로 **오신호**.
`nodePresentation.ts`의 타입별 Tailwind 색은 이 `!important` 위치 규칙에 덮여 죽은 픽셀.
게다가 팔레트가 red/fuchsia/emerald/amber/orange/white/slate **7색**으로 퍼져 기획 의도
(cyan/red/gold 3색)에서 드리프트.

## 색 매핑 — 신호등 위험 의미론 (사용자 결정)

단일 축(위험↔안전)으로 색조를 정렬한다. 색조=위험 카테고리, 아이콘·라벨·`RatingMeter`
핍=구체 내용/강도(역할 분담).

| 노드 | hue | 의미 |
|------|-----|------|
| COMBAT / MINIBOSS / BOSS | **red** (강도 램프) | 위험 — 테두리·글로우 단계 상승 |
| EVENT | **gold/amber** | 유의·예측불가 ("?") |
| SHOP + REST | **cyan** | 안전한 준비(보급·회복) |
| UNKNOWN | **slate(중립)** | 정보 없음 |

- 색 7→3 수렴해도 난도 신호 안 잃음(핍+라벨이 강도 표현).
- 보스 흰색/검정 예외 제거 → red 최강도(테두리 불투명·글로우만 상승).
- 상점·휴식 동일 cyan = "안전 옵션" 묶음, 아이콘(ShoppingBag/Coffee)이 구분.

## 설계

### §1. 기능색 시스템 (탈위치화)
- `NodeSelection.tsx`: 카드(`motion.button`)에 `data-node-type={node.type}` 부여.
- `components-05.css`:
  - 위치 규칙 **삭제**: 343–347 그룹의 `.route-node-card` 한 줄, 전역 nth-child(614/620),
    exploration nth-child(682/686), 전역 607의 배경(구조 속성 min-height/padding은 유지).
  - **타입 규칙 신설**(특이도 0,3,0 — nth-child와 동률이므로 *추가*가 아니라 *교체*):
    `.exploration-screen .route-node-card[data-node-type="…"]` 로 배경+테두리.
    red 계열은 COMBAT<MINIBOSS<BOSS 강도 램프(테두리 알파+box-shadow 글로우).
  - 색은 `--cr-red/--cr-gold/--cr-cyan` + slate 토큰화된 리터럴 재사용.
- `nodePresentation.ts`: `className/lineClassName/iconClassName`을 새 팔레트로 정리
  (하단 하이라인·아이콘 틴트는 cr가 안 덮는 live 픽셀이므로 반드시 갱신; className은 일관성/폴백).

### §2. 위계 — 선택 보드를 주인공으로
상단 히어로(`exploration-route-hero`)를 **삭제가 아니라 강등**(압력 텍스트는 의사결정 정보라 유지):
- 제목·패딩 축소(CSS `.exploration-route-hero h1` 2.35rem→~1.5rem, 패딩↓).
- 3칸 스탯(층/위협/무기) → 한 줄 컴팩트 인라인 스트립.
- "현재 압력" 박스 카드 → 얇은 인라인 한 줄.
- 긴 설명 1줄 압축.
- 시선이 3장 카드에 먼저 닿게 무게중심 이동.

## 범위 밖 (후속 반복)
미니맵(이미 `.exploration-screen .mini-map-panel` 글래스 처리됨 — 큰 불일치 아님), 모바일
레이아웃 정밀화, 모션/상호작용, 글래스 WCAG 정식 재감사.

## 검증
- `npm run check`(252 테스트 + typecheck + build) PASS.
- **순열 재캡처**(advisor 함정 #3): 전투를 슬롯3, 휴식을 슬롯1에 배치해 재캡처 →
  "전투가 그 자리에서도 red, 휴식이 그 자리에서도 cyan"임을 확인해야 탈위치화 증명.
  (현재 캡처는 타입이 슬롯에 고정돼 위치/타입 구분 불가.)
- 데스크톱 평상시·혼합·호버 + 모바일 시각 확인, 회귀(다른 화면 색) 0.
