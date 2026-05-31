/**
 * 값을 [min, max] 범위로 제한한다.
 * 코드베이스 전반에 흩어져 있던 중첩 Math.min/Math.max 패턴을 대체한다.
 */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
