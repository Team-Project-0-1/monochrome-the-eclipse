# 패시브 구현 정의 맵

이 문서는 Google Drive의 `캐릭터 기획 시트지(신버전)`을 기준으로, 현재 `dataUpgrades.ts`에는 존재하지만 전투 엔진 계산 경로에 직접 연결되지 않은 패시브를 구현 가능한 형태로 정리한 내부 작업 문서입니다.

## 출처 우선순위

1. `캐릭터 기획 시트지(신버전)`
   `https://docs.google.com/spreadsheets/d/11g6tq5yz9p9CotDjl7wnbhm2sRwqGeD8TC3ONxBBmrY/edit`
2. 같은 시트의 `상태효과별 피해량/효과 분석` 탭
3. `dataUpgrades.ts`의 현재 ID/명칭/설명
4. `캐릭터 컨셉 기획 초안`
   `https://docs.google.com/document/d/1eFA9q5CnYPZcZOCgEOYm1SMe3wqmHeJZPzv5xCPL4Ds/edit`
   구버전 초안은 수치와 명칭이 신버전과 다를 수 있으므로 의도 확인용으로만 사용한다.

## 현재 상태

- `dataUpgrades.ts`의 캐릭터 패시브는 총 60개다.
- 2026-04-29 기준으로 아래 17개도 `utils/combatLogic.ts`, `store/slices/combatSlice.ts` 전투 계산 경로에 연결했다.
- `MAGE_P_SEAL_EXECUTE`는 신버전 시트의 `5% 대신 10%` 기준을 우선 적용했고, 기존 `dataUpgrades.ts`의 15% 설명도 10%로 정정했다.

## 구현 공통 정리

- 증폭은 시트상 기본 규칙이 `2스택마다 공격력 +1, 기본 상한 10`이다. `WARRIOR_PASSIVE_MAX_AMP_20` 때문에 증폭 부여 시점에서 상한을 컨텍스트 기반으로 계산해야 한다.
- 공명은 `StatusEffectType.RESONANCE + resonanceCountdown` 중심으로 발동시키고, 기존 스킬 데이터 호환을 위해 `temporaryEffects.resonance` 미러를 같이 유지한다.
- `applyAndLogStatus()`는 `state/source/options`를 받도록 확장해 증폭 상한, 공명 지속 시간, 즉시 발동 패시브를 한 경로에서 처리한다.
- 전투당 1회 패시브는 `player.temporaryEffects.<id>Used = { value: true, duration: 999 }` 같은 기존 패턴을 따른다.

## 전사형 구현 패시브

| ID | 이름 | 문서상 정의 | 구현 트리거/처리 |
| --- | --- | --- | --- |
| `WARRIOR_PASSIVE_AMP_GIVES_DEF` | 공방일체 | 증폭으로 추가 방어력을 같이 얻는다. | 증폭 보너스 계산을 `getAmplifyBonus()`로 분리하고, 방어 획득 시 같은 보너스를 방어에 더한다. 우선 `resolvePlayerActions()`의 기본 방어 산출과 `applyAbilityEffect()`의 `defenseGain`에 적용한다. |
| `WARRIOR_PASSIVE_AMP_BONUS_UP` | 초진동 증폭 장치 : E.C.H.O | 증폭으로 얻는 추가 능력치가 1 증가한다. | `floor(AMPLIFY / 2)`가 1 이상일 때 보너스에 +1. 공격/방어 양쪽에서 같은 헬퍼를 사용한다. |
| `WARRIOR_PASSIVE_MAX_AMP_20` | 진동 충전지 | 증폭 상한치가 20까지 증가한다. | `AMPLIFY` 부여 시 기본 상한 10, 보유 시 20으로 clamp. 현재는 상한 clamp가 없으므로 `applyAndLogStatus()` 래퍼에서 처리해야 한다. |
| `WARRIOR_PASSIVE_RESONANCE_DURATION` | 공명 지속 장치 | 적에게 부여된 공명 지속 시간이 3턴으로 늘어난다. | 적에게 `RESONANCE`를 양수 부여할 때 `resonanceCountdown` 기본값을 2가 아니라 3으로 설정한다. 전사 패시브이므로 대상이 enemy인 경우에만 적용한다. |
| `WARRIOR_PASSIVE_SHARE_BLEED_DMG` | 비명 이중주 | 자신의 출혈 피해를 적에게도 전달한다. | `applyDamage()`의 출혈 반응 처리에서 대상이 player이고 `isBleed` 피해가 발생했을 때, 같은 피해량을 enemy에게 고정 피해로 전달한다. 지속 피해 재귀 방지를 위해 전달 피해는 `isBleed: true`, `ignoreDefense: true`로 처리한다. |

## 도적형 구현 패시브

| ID | 이름 | 문서상 정의 | 구현 트리거/처리 |
| --- | --- | --- | --- |
| `ROGUE_P_HUNT_FLOW` | 사냥의 흐름 | 추적이 6 이상이면 다음 턴 뒷면 1개를 앞면으로 바꾼다. 전투당 1회. | `END_OF_TURN` 또는 `processCharacterEndOfTurn()` 후 추적이 6 이상이면 `huntFlowQueued`를 저장하고, `setupNextTurn()`에서 생성된 player coin 중 뒷면 1개를 앞면으로 변경한다. 이후 `huntFlowUsed`를 저장한다. |
| `ROGUE_P_DUAL_WIELD` | 쌍권총 마스터 | 앞으로 추적을 2번 발동하고, 수치를 6 잃는다. | `processCharacterEndOfTurn()`의 추적 피해 처리에서 player가 보유 시 추적 피해를 2회 적용하고 감소량을 6으로 바꾼다. 이미 존재하는 `doublePursuitDamageAndModifiedLoss` 임시효과가 있으면 임시효과 쪽을 우선 적용한다. 추후 대체/변경 필요. |

## 반격형 구현 패시브

| ID | 이름 | 문서상 정의 | 구현 트리거/처리 |
| --- | --- | --- | --- |
| `TANK_P_ABSORB_DEFENSE` | 방어 흡수 | 상대방의 방어를 파괴할 경우 방어를 3 얻는다. | `applyDamage()`에서 비고정 피해가 대상의 유효 방어를 초과해 HP 피해를 냈고 대상의 방어가 1 이상이었다면 player에게 방어 3을 부여한다. 현재 방어가 실제로 차감되지 않는 계산 구조라, 먼저 방어 소비 모델을 명확히 해야 한다. 추후 대체/변경 필요. |
| `TANK_P_SHATTER_DEF` | 불어오는 돌풍 | 분쇄를 1 잃을 때마다 다음 턴 방어를 3 얻는다. | enemy의 `SHATTER`가 end-of-turn decay로 1 감소할 때 player에게 `gainDefenseNextTurn` 3을 누적한다. player 자신에게 걸린 분쇄 감소까지 포함할지는 시트 문맥상 불명확하므로 enemy 분쇄만 우선 적용한다. |
| `TANK_P_CHAIN_HEAL` | 구속복 | 10 이상의 봉인을 5턴 이상 유지하면 추가 방어 5를 얻는다. 전투당 1회. | 반격형 봉인 빌드는 self-seal을 쓰므로 player의 `SEAL >= 10` 연속 턴 수를 추적한다. 5턴 도달 시 방어 5를 즉시 부여하고 `chainHealUsed`를 저장한다. 이름은 회복처럼 보이지만 신버전 시트 효과는 방어 획득이다. |

## 저주형 구현 패시브

| ID | 이름 | 문서상 정의 | 구현 트리거/처리 |
| --- | --- | --- | --- |
| `MAGE_P_CURSE_NUKE` | 강림 | 자신의 저주가 20 이상이면 저주*2 피해를 주고 모든 저주를 잃는다. 전투당 1회. | `PLAYER_TURN_START`에서 저주 피해/감소 처리 후 현재 self `CURSE >= 20`이면 enemy에게 고정 피해 `CURSE * 2`, self `CURSE` 전부 제거, `curseNukeUsed` 저장. |
| `MAGE_P_SEAL_EXECUTE` | 나태의 낫 | 의지 절단의 처형 기준 강화. | 신버전 시트 Row 160의 `5% 대신, 10%` 기준으로 구현했다. 기존 `dataUpgrades.ts`의 15% 설명은 10%로 정정했다. |
| `MAGE_P_SEAL_DEFENSE` | 강제 방어 명령 | 상대 봉인이 10 이상이면 즉시 상대 동전을 전부 뒷면으로 바꾼다. 전투당 1회. | enemy `SEAL >= 10`이 된 시점 또는 `PLAYER_TURN_START`에서 enemy coins를 모두 `TAILS`로 바꾸고 locked 여부는 유지하지 않는다. 즉시성 때문에 status 적용 래퍼에서 검사하는 편이 가장 자연스럽다. |
| `MAGE_P_RESONANCE_DURATION` | 만성 두통 | 현재 공명 수치가 3 이상 유지 시, 공명 발동 효과를 1턴 연장한다. | self `RESONANCE >= 3`일 때 `resonanceCountdown`을 +1 하거나, 양수 부여 시 기본 countdown을 3으로 설정한다. 전사 공명 지속과 다르게 대상은 self다. |
| `MAGE_P_SELF_HATE` | 자기 혐오 | 현재 공명이 6 이상이면 즉시 자신의 공명을 잃고 자신과 상대에게 6 피해. | self `RESONANCE >= 6` 검사 후 self resonance 제거, player/enemy 양쪽에 고정 피해 6. `즉시` 문구 때문에 status 적용 래퍼 또는 `PLAYER_TURN_START`에서 검사한다. 전투당 1회 제한은 문서에 없으므로 제한하지 않는다. |
| `MAGE_P_RESONANCE_SHIELD` | 무책임한 방벽 | 피격 시 흡수하는 공명 수치가 10% 증가한다. | `resonanceAsShield`, `resonanceShieldAndDrain` 피격 흡수 경로를 추가하고, 흡수 가능량을 `공명 + ceil(공명 * 0.1)`로 계산한다. 반올림 정책은 추후 대체/변경 필요. |
| `MAGE_P_RESONANCE_RECOIL` | 반복되는 자책 | 공명 피해의 절반 만큼 다시 공명을 부여한다. | `processStartOfTurnStatusEffects()`에서 resonance 폭발 피해가 발생한 직후, 피해량의 절반을 같은 대상에게 `RESONANCE`로 재부여한다. 자기 공명 빌드 기준이므로 self resonance 폭발에 우선 적용한다. |

## 추가 확인된 출처 메모

- `상태효과별 피해량/효과 분석` 탭 기준:
  - 증폭: 수치 2마다 공격력 +1, 기본 상한 10.
  - 추적: 턴 종료 시 수치만큼 피해 1회, 이후 수치 3 감소.
  - 반격: 피격 시 수치만큼 피해를 돌려주고 수치 전부 소모.
  - 저주: 턴 시작 시 수치만큼 피해, 이후 수치 1 감소.
  - 공명: 부여 후 2턴 뒤 누적 수치만큼 고정 피해, 발동 후 초기화.
  - 출혈: 피격 시 최대 체력 5% 기반 피해, 발동 후 수치 1 감소.
  - 분쇄/봉인: 각각 방어/공격 15% 감소, 턴마다 수치 1 감소.
- `카드/패시브 용어 기획` 기준:
  - 패시브 속성은 공격/방어/주문으로 분류된다.
  - 보상 등급은 일반/희귀/고유 구조이며, 보스는 고유 보상 100% 방향이다.

## 구현 반영 메모

- 구현 파일: `utils/combatLogic.ts`, `store/slices/combatSlice.ts`, `dataUpgrades.ts`.
- 검증: `npm run validate:passives` 14개 시나리오 통과. `npm run check`는 타입체크, 패시브 검증, 프로덕션 빌드를 순서대로 실행한다.
- `TANK_P_ABSORB_DEFENSE`는 현재 방어가 실제로 차감되는 모델이 아니므로, "대상의 유효 방어를 초과해 HP 피해를 냈고 원래 방어가 있었다"를 방어 파괴로 판정한다. 추후 대체/변경 필요.
- `ROGUE_P_DUAL_WIELD`는 이미 스킬 임시효과 `doublePursuitDamageAndModifiedLoss`가 켜져 있으면 해당 스킬 효과를 우선한다. 추후 대체/변경 필요.
- `MAGE_P_RESONANCE_SHIELD`의 10% 증가는 `ceil(공명 * 0.1)`로 처리했다. 시트에 반올림 정책이 추가되면 추후 대체/변경 필요.
