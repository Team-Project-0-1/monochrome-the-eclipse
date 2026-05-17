# Stage 3 PRD

Last updated: 2026-05-18
Primary source: Google Drive `몬스터 컨셉` (`1xqQ_aFtUzEnwangtwOhpGUdFg83zhx3M4G0c-Kcj9XI`, viewed 2026-05-18)
Related sources: `기획서` (`1Ta50Zudk34_6qBi4sP3TjQVoPq7Su8cnQpqUBsXRbf8`), `몬스터 AI 시스템` (`1WRq8mGZEnvvga1LcEk2CRKrxXypFhq0ljx3mh9TryxI`)

## Status

Stage 3 is now implemented as a playable prototype layer. It unlocks after Stage 2, uses the existing 15-turn exploration route, adds three normal monsters, one miniboss, one boss, and ends with a `비기` 3-choice reward draft before the victory flow.

This remains Prototype v0.1 scope. It proves a complete 1-3 stage run, but it is not a paid 1.0 claim, and it does not imply final balance, final event writing, final enemy art, or commercial asset approval.

## Product Goal

Stage 3 should feel like the first complete run climax: the player has already learned coin patterns, rewards, route pressure, and enemy intent, then faces enemies that combine 공명, 봉인, 저주, 표식, 출혈, 증폭, and 반격 into crisis turns.

## Source-Derived Structure

| Area | Stage 3 requirement | Runtime implementation |
| --- | --- | --- |
| Gate loop | Two normal combats before boss pressure, then boss reward/growth | Existing route system keeps normal, miniboss, and boss beats across the 15-turn stage |
| Encounter pressure | Gate 3 target enemy count 8, field max 3 | Current engine is single-enemy combat, so the numbers are preserved as content pressure targets rather than simultaneous field count |
| Normal monsters | 3 Stage 3 normal monsters | `괴멸 증폭기`, `장의 사육자`, `심연 관측체` |
| Miniboss | 1 Stage 3 miniboss | `성육의 사도` |
| Boss | 1 Stage 3 boss | `월식의 성가대` |
| Intent UI | Icon/category, danger, range/target, readable action bundle | Existing enemy intent metadata is generated for every Stage 3 pattern |
| Reward | Gate 3 boss victory grants `비기`: 3 options, choose 1 | `섬광 절단`, `무채 장막`, `공명핵` reward choices |

## Monster Roster

| Runtime key | Name | Role | Core pressure |
| --- | --- | --- | --- |
| `annihilationAmplifier` | 괴멸 증폭기 | 증폭/공명 | 증폭을 쌓은 뒤 공명 폭발과 방어 붕괴를 만든다 |
| `fleshCultivator` | 장의 사육자 | 표식/출혈 | 표식 4 이상부터 출혈과 다단 공격을 압박한다 |
| `abyssObserver` | 심연 관측체 | 저주/봉인 | 저주를 쌓고 봉인으로 동전 선택을 제한한다 |
| `apostleOfFlesh` | 성육의 사도 | 반격/증폭 | 피해를 받을수록 증폭하고 반격을 공격력으로 전환한다 |
| `eclipseChoir` | 월식의 성가대 | 공명/봉인/저주 | 총 디버프를 피해로 바꾸고 체력 50% 이하에서 모든 공격에 공명을 더한다 |

## Acceptance Criteria

- `stageData[3]` has a real combat pool, miniboss, boss, and event pool.
- Every Stage 3 monster and pattern in `content/stage3/stage3-content-template.json` has a matching runtime key in `dataMonsters.ts`.
- `npm run check:stage3-content -- --strict` passes with no TBD markers.
- Boss victory offers exactly three `비기` reward choices and applies the selected reward before entering the victory flow.
- Public metadata describes a 1-3 stage prototype, not a complete paid release.

## Non-Goals

- No simultaneous multi-enemy battlefield is added in this pass.
- Generated prototype monster/background art is included, but no paid-release asset provenance approval is implied.
- No paid Early Access or 1.0 release claim is made.
- No external playtest or balance certification is implied by implementation.

## Verification

Run from `monochrome_-the-eclipse`:

```powershell
npm run check:stage3-content -- --strict
npm run prototype:check
```
