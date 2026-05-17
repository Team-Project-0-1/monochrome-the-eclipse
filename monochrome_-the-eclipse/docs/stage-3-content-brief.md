# Stage 3 Content Brief

Last updated: 2026-05-18
Primary source: Google Drive `몬스터 컨셉` (`1xqQ_aFtUzEnwangtwOhpGUdFg83zhx3M4G0c-Kcj9XI`, viewed 2026-05-18)

## Prototype Boundary

Prototype v0.1 now publicly covers Stage 1 through Stage 3. The correct public framing is:

```text
1-3층 공개 프로토타입 / 최종 밸런스와 상업 권리 검토는 별도
```

Avoid copy that says or implies:

```text
상업판 1.0 완성
모든 최종 에셋 확정
밸런스 검증 완료
유료 출시 준비 완료
```

## Gate Contract

| Beat | Content contract | Current repo action |
| --- | --- | --- |
| Normal combat | Stage 3 enemy pressure starts with 공명, 표식/출혈, 저주/봉인 archetypes. | `annihilationAmplifier`, `fleshCultivator`, `abyssObserver` added to `stageData[3].combatPool`. |
| Miniboss | Mid-stage check combines 반격 and 증폭. | `apostleOfFlesh` added as Stage 3 miniboss. |
| Boss combat | Final stage check combines 공명, 봉인, 저주, and total debuff punishment. | `eclipseChoir` added as Stage 3 boss with two phase priority sets. |
| Exclusive events | Stage 3 route events should express 공명 중계, 장의 배양, 월식 성역 pressure without reusing common event scenes. | `event_stage3_resonance_relay`, `event_stage3_flesh_vat`, `event_stage3_eclipse_sanctuary` added to the Stage 3 event pool with generated backgrounds. |
| Generated assets | Stage 3 monsters and backgrounds should not reuse Stage 1-2 visual assets. | Five monster portrait/spritesheet pairs and four Stage 3 backgrounds are connected under `public/assets/monsters/stage3-generated/` and `public/assets/backgrounds/`. |
| Reward | Offer 3 `비기` options and let the player choose 1. | Boss reward screen returns `섬광 절단`, `무채 장막`, `공명핵`. |
| Victory | The prototype run can conclude after Stage 3 boss reward. | Existing final-stage victory flow now triggers after `eclipseChoir`. |

The source still lists Gate 3 pressure as 8 total enemies and field maximum 3. The current prototype engine supports one enemy at a time, so those values are tracked in the content template as pressure targets rather than simultaneous combat implementation.

## Monster Implementation Notes

| Monster | Runtime patterns | Passives implemented |
| --- | --- | --- |
| 괴멸 증폭기 | `왜곡 송출`, `멸망 공명`, `증폭 방송` | `파열 음파`, `광역 간섭`, `붕괴 진동` |
| 장의 사육자 | `도축 갈고리`, `살점 뜯기`, `사육 준비` | `도축 본능`, `신선한 고기`, `갈고리 회수` |
| 심연 관측체 | `응시`, `정신 침식`, `닫힌 눈` | `공허 주시`, `정신 붕괴`, `심연 메아리` |
| 성육의 사도 | `육편 난타`, `진화 압살`, `재생 조직`, `불완전 탈피` | `적응 진화`, `육체 반사`, `비틀린 재생` |
| 월식의 성가대 | `불협 화음`, `침식 합장`, `붕괴 성가`, `월식 개막`, `침묵의 기도`, `검은 성역` | `메아리 증식`, `부정 찬가`, `종말 예고`, `월식 현상` |

## Validation

The Stage 3 input surface is `content/stage3/stage3-content-template.json`.

Validation rules:

- No `__STAGE3_TBD__` marker may remain.
- Source document must be `몬스터 컨셉`.
- Stage 3 runtime keys must be present in `dataMonsters.ts`.
- Stage 3 runtime pools must be present in `dataStages.ts`.
- Stage 3 event IDs and generated background paths must be present in `dataEvents.ts` and `utils/eventScenes.ts`.
- Stage 3 generated monster/background PNG files must exist in `public/assets`.
- `secretTechniqueRewardTemplates` must contain exactly 3 ready options.

Run:

```powershell
npm run check:stage3-content -- --strict
```
