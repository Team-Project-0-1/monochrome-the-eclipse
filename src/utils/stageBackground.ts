import { assetPath } from './assetPath';
import { clamp } from './math';
import { isStage3PublicSafeMode, stage3PublicSafeBackgroundCss } from './stage3PublicSafeMode';

/**
 * 스테이지 배경 CSS 값 — background-image에 그대로 넣을 수 있는 `url(...)` 또는 그라데이션.
 * 전투 무대(CombatStage)와 탐험 화면이 같은 스테이지 아트를 공유하도록 단일 소스로 둔다
 * (전투↔탐험 세계의 시각적 연속성). stage 3은 공개안전 모드에서 대체 그라데이션을 쓴다.
 */
export const getStageBackgroundCss = (stage: number): string => {
  const resolvedStage = clamp(stage, 1, 3);
  const backgroundPath = resolvedStage === 3
    ? 'assets/backgrounds/combat-stage-3-eclipse-sanctum.png'
    : `assets/backgrounds/combat-stage-${resolvedStage}.webp`;

  return isStage3PublicSafeMode && resolvedStage === 3
    ? stage3PublicSafeBackgroundCss
    : `url("${assetPath(backgroundPath)}")`;
};
