import {
  MonsterData,
  PatternType,
  CoinFace,
  StatusEffectType,
  EnemyCharacter,
  PlayerCharacter,
  MonsterPatternDefinition,
  AbilityEffect,
  MonsterPhaseDefinition,
} from "../types";
import { assetPath } from "../utils/assetPath";
import { isStage3PublicSafeMode } from "../utils/stage3PublicSafeMode";

const monsterSpriteAnimations = { idle: 0, attack: 1, skill: 2, death: 3 };
const stage3GeneratedAssetPath = (path: string): string | undefined => (
    isStage3PublicSafeMode ? undefined : assetPath(path)
);

export const getMonsterPhase = (enemy: EnemyCharacter): MonsterPhaseDefinition | null => {
    const phases = monsterData[enemy.key]?.phases ?? [];
    if (phases.length === 0) return null;

    const hpRatio = enemy.maxHp > 0 ? enemy.currentHp / enemy.maxHp : 1;
    const turn = Number(enemy.temporaryEffects?.combatTurn?.value ?? 1);

    return phases.filter((phase) => (
        (phase.hpBelow === undefined || hpRatio <= phase.hpBelow) &&
        (phase.turnFrom === undefined || turn >= phase.turnFrom)
    )).sort((a, b) => {
        const hpA = a.hpBelow ?? 1;
        const hpB = b.hpBelow ?? 1;
        if (hpA !== hpB) return hpA - hpB;
        return (b.turnFrom ?? 0) - (a.turnFrom ?? 0);
    })[0] ?? null;
};

// --- MONSTER DEFINITIONS ---
// This data structure defines the core stats and available skills for each monster.
export const monsterData: MonsterData = {
    // Stage 1 Monsters
    marauder1: {
        name: "약탈자1", // 도적형 (Rogue)
        hp: 30,
        baseAtk: 0,
        baseDef: 0,
        patterns: ["MARAUDER1_PURSUE", "MARAUDER1_MANGLE", "MARAUDER1_SHARPEN"],
        tier: "normal",
        assetKey: "marauder1",
        portraitSrc: assetPath("assets/monsters/portraits/001_looter1.png"),
        spriteSheetSrc: assetPath("assets/monsters/sprites/001_looter1-spritesheet.png"),
        spriteFrameSize: 256,
        spriteAnimations: monsterSpriteAnimations,
        passives: ["PASSIVE_MARAUDER1_CRUEL_INTERIOR"]
    },
    marauder2: {
        name: "약탈자2", // 전사형 (Warrior)
        hp: 35,
        baseAtk: 0,
        baseDef: 0,
        patterns: ["MARAUDER2_SWING", "MARAUDER2_JUGGERNAUT", "MARAUDER2_CHARGE"],
        tier: "normal",
        assetKey: "marauder2",
        portraitSrc: assetPath("assets/monsters/portraits/002_looter2.png"),
        spriteSheetSrc: assetPath("assets/monsters/sprites/002_looter2-spritesheet.png"),
        spriteFrameSize: 256,
        spriteAnimations: monsterSpriteAnimations,
        passives: ["PASSIVE_MARAUDER2_MUSCLE_GROWTH"]
    },
    infectedDog: {
        name: "감염된 들개", // 마법형 (Mage)
        hp: 24,
        baseAtk: 0,
        baseDef: 0,
        patterns: ["INFECTEDDOG_BITE", "INFECTEDDOG_NECKBITE", "INFECTEDDOG_PUS"],
        tier: "normal",
        assetKey: "infectedDog",
        portraitSrc: assetPath("assets/monsters/portraits/003_wild_dog.png"),
        spriteSheetSrc: assetPath("assets/monsters/sprites/003_wild_dog-spritesheet.png"),
        spriteFrameSize: 256,
        spriteAnimations: monsterSpriteAnimations,
    },
    // Stage 1 Miniboss
    marauderLeader: {
        name: "약탈자 리더", // 방어형 (Tank)
        hp: 45,
        baseAtk: 0,
        baseDef: 0,
        patterns: ["LEADER_QUESTION", "LEADER_DEMAND", "LEADER_WAIT", "LEADER_STAY"],
        tier: "miniboss",
        assetKey: "marauderLeader",
        portraitSrc: assetPath("assets/monsters/portraits/004_looter_leader.png"),
        spriteSheetSrc: assetPath("assets/monsters/sprites/004_looter_leader-spritesheet.png"),
        spriteFrameSize: 256,
        spriteAnimations: monsterSpriteAnimations,
        passives: ["PASSIVE_LEADER_HARD_SKIN"]
    },
    // Stage 1 Boss
    lumenReaper: {
        name: "루멘 리퍼", // 마법형 (Mage)
        hp: 50,
        baseAtk: 0,
        baseDef: 0,
        patterns: [
            "LUMENREAPER_EROSION_SCYTHE",
            "LUMENREAPER_SHADOW_STRIKE",
            "LUMENREAPER_NIGHT_PLUNDER",
            "LUMENREAPER_STEALTH",
            "LUMENREAPER_SHADOW_SHROUD"
        ],
        tier: "boss",
        assetKey: "lumenReaper",
        portraitSrc: assetPath("assets/monsters/portraits/005_lumen_reaper.png"),
        spriteSheetSrc: assetPath("assets/monsters/sprites/005_lumen_reaper-spritesheet.png"),
        spriteFrameSize: 256,
        spriteAnimations: monsterSpriteAnimations,
        passives: [
            "PASSIVE_REAPER_FLOWING_DARKNESS",
            "PASSIVE_REAPER_AMBUSH",
            "PASSIVE_REAPER_VITAL_STRIKE"
        ],
    },
    // Stage 2 Monsters
    shadowWraith: {
        name: "그림자 망령",
        hp: 75,
        baseAtk: 9,
        baseDef: 0,
        patterns: ["SHADOWWRAITH_ROAR", "SHADOWWRAITH_SCREAM"],
        tier: "normal",
        assetKey: "shadowWraith",
        portraitSrc: assetPath("assets/monsters/portraits/006_shadow_wraith-transparent.png"),
        spriteSheetSrc: assetPath("assets/monsters/sprites/006_shadow_wraith-spritesheet-transparent.png"),
        spriteFrameSize: 256,
        spriteAnimations: monsterSpriteAnimations,
        passives: ["PASSIVE_SHADOWWRAITH_EARDRUM_BREAK"],
    },
    doppelganger: {
        name: "도플갱어",
        hp: 95,
        baseAtk: 5,
        baseDef: 5,
        patterns: ["DOPPELGANGER_IMITATE", "DOPPELGANGER_REPEATED_MIMICRY"],
        tier: "normal",
        assetKey: "doppelganger",
        portraitSrc: assetPath("assets/monsters/portraits/007_doppelganger-transparent.png"),
        spriteSheetSrc: assetPath("assets/monsters/sprites/007_doppelganger-spritesheet-transparent.png"),
        spriteFrameSize: 256,
        spriteAnimations: monsterSpriteAnimations,
        passives: ["PASSIVE_DOPPELGANGER_AFTERIMAGE"],
    },
    unpleasantCube: {
        name: "불쾌한 큐브",
        hp: 85,
        baseAtk: 2,
        baseDef: 8,
        patterns: ["UNPLEASANTCUBE_WHIP", "UNPLEASANTCUBE_DEFENSIVE_STANCE"],
        tier: "normal",
        assetKey: "unpleasantCube",
        portraitSrc: assetPath("assets/monsters/stage2-generated/unpleasant_cube_portrait.png"),
        spriteSheetSrc: assetPath("assets/monsters/stage2-generated/unpleasant_cube_spritesheet.png"),
        spriteFrameSize: 256,
        spriteAnimations: monsterSpriteAnimations,
        passives: ["PASSIVE_UNPLEASANTCUBE_BIND"],
    },
    subject162: {
        name: "개체번호 162",
        hp: 100,
        baseAtk: 1,
        baseDef: 9,
        patterns: ["SUBJECT162_OPEN_MOUTH", "SUBJECT162_DAMAGE_DELUSION", "SUBJECT162_PSYCHOTIC_WAVE"],
        tier: "miniboss",
        assetKey: "subject162",
        portraitSrc: assetPath("assets/monsters/stage2-generated/subject_162_portrait.png"),
        spriteSheetSrc: assetPath("assets/monsters/stage2-generated/subject_162_spritesheet.png"),
        spriteFrameSize: 256,
        spriteAnimations: monsterSpriteAnimations,
        passives: ["PASSIVE_SUBJECT162_DISGUST"],
    },
    chimera: {
        name: "키메라",
        hp: 220,
        baseAtk: 10,
        baseDef: 8,
        patterns: [
            "CHIMERA_FIERCE_ROAR",
            "CHIMERA_THORN_TENTACLE",
            "CHIMERA_SHARP_CHARGE",
            "CHIMERA_MERCILESS_PREDATION",
            "CHIMERA_THORN_SKIN",
        ],
        tier: "boss",
        assetKey: "chimera",
        portraitSrc: assetPath("assets/monsters/portraits/010_chimera-transparent.png"),
        spriteSheetSrc: assetPath("assets/monsters/sprites/010_chimera-spritesheet-transparent.png"),
        spriteFrameSize: 256,
        spriteAnimations: monsterSpriteAnimations,
        phases: [
            {
                id: "chimera_bloodied",
                label: "2페이즈: 찢어진 몸",
                hpBelow: 0.5,
                patterns: [
                    "CHIMERA_FIERCE_ROAR",
                    "CHIMERA_THORN_TENTACLE",
                    "CHIMERA_SHARP_CHARGE",
                ],
            },
            {
                id: "chimera_last_hunger",
                label: "3페이즈: 마지막 포식",
                hpBelow: 0.3,
                patterns: [
                    "CHIMERA_MERCILESS_PREDATION",
                    "CHIMERA_SHARP_CHARGE",
                    "CHIMERA_THORN_SKIN",
                ],
            },
        ],
        passives: ["PASSIVE_CHIMERA_SAW_TEETH"],
    },
    // Stage 3 Monsters
    annihilationAmplifier: {
        name: "괴멸 증폭기",
        hp: 110,
        baseAtk: 6,
        baseDef: 2,
        patterns: [
            "AMPLIFIER_DISTORTION_BROADCAST",
            "AMPLIFIER_DOOM_RESONANCE",
            "AMPLIFIER_AMPLIFICATION_BROADCAST",
        ],
        tier: "normal",
        assetKey: "annihilationAmplifier",
        portraitSrc: stage3GeneratedAssetPath("assets/monsters/stage3-generated/stage3_annihilation_amplifier_portrait.png"),
        spriteSheetSrc: stage3GeneratedAssetPath("assets/monsters/stage3-generated/stage3_annihilation_amplifier_spritesheet.png"),
        spriteFrameSize: 256,
        spriteAnimations: monsterSpriteAnimations,
        passives: [
            "PASSIVE_AMPLIFIER_RUPTURE_SOUND",
            "PASSIVE_AMPLIFIER_BROAD_INTERFERENCE",
            "PASSIVE_AMPLIFIER_COLLAPSE_VIBRATION",
        ],
    },
    fleshCultivator: {
        name: "장의 사육자",
        hp: 120,
        baseAtk: 7,
        baseDef: 3,
        patterns: [
            "CULTIVATOR_BUTCHER_HOOK",
            "CULTIVATOR_TEAR_FLESH",
            "CULTIVATOR_FEEDING_PREP",
        ],
        tier: "normal",
        assetKey: "fleshCultivator",
        portraitSrc: stage3GeneratedAssetPath("assets/monsters/stage3-generated/stage3_flesh_cultivator_portrait.png"),
        spriteSheetSrc: stage3GeneratedAssetPath("assets/monsters/stage3-generated/stage3_flesh_cultivator_spritesheet.png"),
        spriteFrameSize: 256,
        spriteAnimations: monsterSpriteAnimations,
        passives: [
            "PASSIVE_CULTIVATOR_BUTCHER_INSTINCT",
            "PASSIVE_CULTIVATOR_FRESH_MEAT",
            "PASSIVE_CULTIVATOR_HOOK_RETRIEVAL",
        ],
    },
    abyssObserver: {
        name: "심연 관측체",
        hp: 95,
        baseAtk: 3,
        baseDef: 7,
        patterns: [
            "OBSERVER_GAZE",
            "OBSERVER_MENTAL_EROSION",
            "OBSERVER_CLOSED_EYE",
        ],
        tier: "normal",
        assetKey: "abyssObserver",
        portraitSrc: stage3GeneratedAssetPath("assets/monsters/stage3-generated/stage3_abyss_observer_portrait.png"),
        spriteSheetSrc: stage3GeneratedAssetPath("assets/monsters/stage3-generated/stage3_abyss_observer_spritesheet.png"),
        spriteFrameSize: 256,
        spriteAnimations: monsterSpriteAnimations,
        passives: [
            "PASSIVE_OBSERVER_VOID_GAZE",
            "PASSIVE_OBSERVER_MENTAL_COLLAPSE",
            "PASSIVE_OBSERVER_ABYSS_ECHO",
        ],
    },
    apostleOfFlesh: {
        name: "성육의 사도",
        hp: 180,
        baseAtk: 8,
        baseDef: 6,
        patterns: [
            "APOSTLE_FLESH_POUNDING",
            "APOSTLE_EVOLUTION_CRUSH",
            "APOSTLE_REGENERATIVE_TISSUE",
            "APOSTLE_IMPERFECT_MOLT",
        ],
        tier: "miniboss",
        assetKey: "apostleOfFlesh",
        portraitSrc: stage3GeneratedAssetPath("assets/monsters/stage3-generated/stage3_apostle_of_flesh_portrait.png"),
        spriteSheetSrc: stage3GeneratedAssetPath("assets/monsters/stage3-generated/stage3_apostle_of_flesh_spritesheet.png"),
        spriteFrameSize: 256,
        spriteAnimations: monsterSpriteAnimations,
        passives: [
            "PASSIVE_APOSTLE_ADAPTIVE_EVOLUTION",
            "PASSIVE_APOSTLE_FLESH_REFLECTION",
            "PASSIVE_APOSTLE_TWISTED_REGENERATION",
        ],
    },
    eclipseChoir: {
        name: "월식의 성가대",
        hp: 320,
        baseAtk: 9,
        baseDef: 10,
        patterns: [
            "CHOIR_DISSONANT_CHORD",
            "CHOIR_EROSION_CHORUS",
            "CHOIR_COLLAPSE_CANTICLE",
            "CHOIR_ECLIPSE_OPENING",
            "CHOIR_SILENT_PRAYER",
            "CHOIR_BLACK_SANCTUARY",
        ],
        tier: "boss",
        assetKey: "eclipseChoir",
        portraitSrc: stage3GeneratedAssetPath("assets/monsters/stage3-generated/stage3_eclipse_choir_portrait.png"),
        spriteSheetSrc: stage3GeneratedAssetPath("assets/monsters/stage3-generated/stage3_eclipse_choir_spritesheet.png"),
        spriteFrameSize: 256,
        spriteAnimations: monsterSpriteAnimations,
        phases: [
            {
                id: "eclipse_choir_crescendo",
                label: "월식 2악장",
                hpBelow: 0.5,
                patterns: [
                    "CHOIR_EROSION_CHORUS",
                    "CHOIR_COLLAPSE_CANTICLE",
                    "CHOIR_ECLIPSE_OPENING",
                    "CHOIR_SILENT_PRAYER",
                ],
            },
            {
                id: "eclipse_choir_finale",
                label: "종말 합창",
                hpBelow: 0.3,
                turnFrom: 6,
                patterns: [
                    "CHOIR_COLLAPSE_CANTICLE",
                    "CHOIR_ECLIPSE_OPENING",
                    "CHOIR_BLACK_SANCTUARY",
                ],
            },
        ],
        passives: [
            "PASSIVE_CHOIR_ECHO_MULTIPLICATION",
            "PASSIVE_CHOIR_UNHOLY_HYMN",
            "PASSIVE_CHOIR_DOOM_FORETELLING",
            "PASSIVE_CHOIR_ECLIPSE_PHENOMENON",
        ],
    },
};

// --- MONSTER SKILL IMPLEMENTATIONS ---
// This structure defines the logic and effects for each monster skill.
export const monsterPatterns: { [key: string]: MonsterPatternDefinition } = {
    // --- 약탈자1 (Marauder1) ---
    MARAUDER1_PURSUE: {
        name: "추적",
        type: PatternType.PAIR,
        face: CoinFace.HEADS,
        description: "피해를 4 줍니다. 추적을 1 얻습니다.",
        effect: (): AbilityEffect => ({ fixedDamage: 4, status: { type: StatusEffectType.PURSUIT, value: 1, target: 'self' } })
    },
    MARAUDER1_MANGLE: {
        name: "난도질",
        type: PatternType.TRIPLE,
        face: CoinFace.HEADS,
        description: "피해를 5 줍니다. 추적을 3 소비할 경우 피해를 5 만큼 2 번 줍니다.",
        effect: (a: EnemyCharacter): AbilityEffect => {
            if ((a.statusEffects[StatusEffectType.PURSUIT] || 0) >= 3) {
                return { multiHit: { count: 2, damage: 5 }, statusCost: { type: StatusEffectType.PURSUIT, value: 3 } };
            }
            return { fixedDamage: 5 };
        }
    },
    MARAUDER1_SHARPEN: {
        name: "칼날 갈기",
        type: PatternType.PAIR,
        face: CoinFace.TAILS,
        description: "방어를 4 얻습니다.",
        effect: (): AbilityEffect => ({ defense: 4 })
    },

    // --- 약탈자2 (Marauder2) ---
    MARAUDER2_SWING: {
        name: "망치 휘두르기",
        type: PatternType.PAIR,
        face: CoinFace.HEADS,
        description: "피해를 4 줍니다. 증폭을 1 얻습니다.",
        effect: (): AbilityEffect => ({ fixedDamage: 4, status: {type: StatusEffectType.AMPLIFY, value: 1, target: "self"} })
    },
    MARAUDER2_JUGGERNAUT: {
        name: "파괴전차",
        type: PatternType.PENTA,
        face: CoinFace.HEADS,
        description: "모든 증폭을 소모하여 잃은 증폭의 2배만큼 피해",
        effect: (a: EnemyCharacter): AbilityEffect => {
            const ampToConsume = a.statusEffects[StatusEffectType.AMPLIFY] || 0;
            return {
                fixedDamage: ampToConsume * 2,
                statusCost: { type: StatusEffectType.AMPLIFY, value: ampToConsume }
            };
        }
    },
    MARAUDER2_CHARGE: {
        name: "힘 충전",
        type: PatternType.PAIR,
        face: CoinFace.TAILS,
        description: "방어를 4 얻습니다. 증폭을 2 얻습니다.",
        effect: (): AbilityEffect => ({ defense: 4, status: {type: StatusEffectType.AMPLIFY, value: 2, target: "self"} })
    },

    // --- 감염된 들개 (Infected Dog) ---
    INFECTEDDOG_BITE: {
        name: "깨물기",
        type: PatternType.PAIR,
        face: CoinFace.HEADS,
        description: "피해를 4 줍니다.",
        effect: (): AbilityEffect => ({ fixedDamage: 4 })
    },
    INFECTEDDOG_NECKBITE: {
        name: "목 물어뜯기",
        type: PatternType.TRIPLE,
        face: CoinFace.HEADS,
        description: "피해를 6 줍니다. 저주를 2 부여합니다.",
        effect: (): AbilityEffect => ({ fixedDamage: 6, status: {type: StatusEffectType.CURSE, value: 2, target: "enemy"} })
    },
    INFECTEDDOG_PUS: {
        name: "차오르는 고름",
        type: PatternType.PAIR,
        face: CoinFace.TAILS,
        description: "방어를 3 얻습니다.",
        effect: (): AbilityEffect => ({ defense: 3 })
    },

    // --- 약탈자 리더 (Marauder Leader) ---
    LEADER_QUESTION: {
        name: "가진거 있냐",
        type: PatternType.PAIR,
        face: CoinFace.HEADS,
        description: "피해를 4 줍니다. 반격이 2 이상이면 분쇄를 1 부여합니다.",
        effect: (a: EnemyCharacter): AbilityEffect => {
            const effect: AbilityEffect = { fixedDamage: 4 };
            if ((a.statusEffects[StatusEffectType.COUNTER] || 0) >= 2) {
                effect.status = { type: StatusEffectType.SHATTER, value: 1, target: 'player' };
            }
            return effect;
        }
    },
    LEADER_DEMAND: {
        name: "가진거 다 내놔",
        type: PatternType.TRIPLE,
        face: CoinFace.HEADS,
        description: "피해를 6 줍니다.",
        effect: (): AbilityEffect => ({ fixedDamage: 6 })
    },
    LEADER_WAIT: {
        name: "잠깐!",
        type: PatternType.PAIR,
        face: CoinFace.TAILS,
        description: "방어를 3 얻습니다. 반격을 2 얻습니다.",
        effect: (): AbilityEffect => ({ defense: 3, status: {type: StatusEffectType.COUNTER, value: 2, target: "self"} })
    },
    LEADER_STAY: {
        name: "기다려!",
        type: PatternType.TRIPLE,
        face: CoinFace.TAILS,
        description: "방어를 5 얻습니다.",
        effect: (): AbilityEffect => ({ defense: 5 })
    },

    // --- 루멘 리퍼 (Lumen Reaper) ---
    LUMENREAPER_EROSION_SCYTHE: {
        name: "침식의 낫",
        type: PatternType.PAIR,
        face: CoinFace.HEADS,
        description: "피해를 4 줍니다. 저주를 2 부여합니다.",
        effect: (): AbilityEffect => ({ fixedDamage: 4, status: {type: StatusEffectType.CURSE, value: 2, target: "enemy"} })
    },
    LUMENREAPER_SHADOW_STRIKE: {
        name: "그림자 강타",
        type: PatternType.UNIQUE,
        face: CoinFace.HEADS,
        description: "피해를 4 줍니다. 다음 턴에 루멘 리퍼의 첫번째 동전이 뒷면으로 확정됩니다.",
        effect: (): AbilityEffect => ({ fixedDamage: 4, enemyTemporaryEffect: { name: 'guaranteedFirstCoinTails', value: true, duration: 2 } })
    },
    LUMENREAPER_NIGHT_PLUNDER: {
        name: "밤의 약탈",
        type: PatternType.QUAD,
        face: CoinFace.HEADS,
        description: "피해를 8 줍니다. 현재 저주 수치만큼 스킬 피해량이 1 증가합니다.",
        effect: (a: EnemyCharacter, d: PlayerCharacter): AbilityEffect => ({ fixedDamage: 8 + (d.statusEffects[StatusEffectType.CURSE] || 0) })
    },
    LUMENREAPER_STEALTH: {
        name: "은신",
        type: PatternType.PAIR,
        face: CoinFace.TAILS,
        description: "방어를 4 얻습니다.",
        effect: (): AbilityEffect => ({ defense: 4 })
    },
    LUMENREAPER_SHADOW_SHROUD: {
        name: "그림자 장막",
        type: PatternType.QUAD,
        face: CoinFace.TAILS,
        description: "방어를 8 얻습니다. 저주를 3 부여합니다.",
        effect: (): AbilityEffect => ({ defense: 8, status: {type: StatusEffectType.CURSE, value: 3, target: "enemy"} })
    },

    // --- 그림자 망령 (Shadow Wraith) ---
    SHADOWWRAITH_ROAR: {
        name: "포효",
        type: PatternType.UNIQUE,
        face: CoinFace.HEADS,
        description: "기본 공격 후 표식 수치당 추가 피해를 줍니다.",
        effect: (_a: EnemyCharacter, d: PlayerCharacter): AbilityEffect => ({
            fixedDamage: 9 + (d.statusEffects[StatusEffectType.MARK] || 0),
        }),
    },
    SHADOWWRAITH_SCREAM: {
        name: "비명",
        type: PatternType.QUAD,
        face: CoinFace.TAILS,
        description: "방어를 3 얻고 표식을 5 부여합니다.",
        effect: (): AbilityEffect => ({
            defense: 3,
            status: { type: StatusEffectType.MARK, value: 5, target: "enemy" },
        }),
    },

    // --- 도플갱어 (Doppelganger) ---
    DOPPELGANGER_IMITATE: {
        name: "따라하기",
        type: PatternType.PAIR,
        face: CoinFace.HEADS,
        description: "2회 공격하고 증폭을 1 얻습니다.",
        effect: (a: EnemyCharacter): AbilityEffect => ({
            multiHit: { count: 2, damage: a.baseAtk },
            status: { type: StatusEffectType.AMPLIFY, value: 1, target: "self" },
        }),
    },
    DOPPELGANGER_REPEATED_MIMICRY: {
        name: "반복적인 모방",
        type: PatternType.PENTA,
        face: CoinFace.TAILS,
        description: "증폭을 5 얻습니다.",
        effect: (): AbilityEffect => ({ status: { type: StatusEffectType.AMPLIFY, value: 5, target: "self" } }),
    },

    // --- 불쾌한 큐브 (Unpleasant Cube) ---
    UNPLEASANTCUBE_WHIP: {
        name: "채찍질",
        type: PatternType.PENTA,
        face: CoinFace.HEADS,
        description: "4회 공격하고 반격을 2 얻습니다.",
        effect: (a: EnemyCharacter): AbilityEffect => ({
            multiHit: { count: 4, damage: a.baseAtk },
            status: { type: StatusEffectType.COUNTER, value: 2, target: "self" },
        }),
    },
    UNPLEASANTCUBE_DEFENSIVE_STANCE: {
        name: "방어 태세",
        type: PatternType.TRIPLE,
        face: CoinFace.TAILS,
        description: "반격을 3 얻습니다.",
        effect: (): AbilityEffect => ({ status: { type: StatusEffectType.COUNTER, value: 3, target: "self" } }),
    },

    // --- 개체번호 162 (Subject 162) ---
    SUBJECT162_OPEN_MOUTH: {
        name: "아가리 열기",
        type: PatternType.QUAD,
        face: CoinFace.HEADS,
        description: "2회 공격하고 저주를 4 부여합니다.",
        effect: (a: EnemyCharacter): AbilityEffect => ({
            multiHit: { count: 2, damage: a.baseAtk },
            status: { type: StatusEffectType.CURSE, value: 4, target: "enemy" },
        }),
    },
    SUBJECT162_DAMAGE_DELUSION: {
        name: "피해 망상",
        type: PatternType.PAIR,
        face: CoinFace.TAILS,
        description: "저주를 2 부여합니다.",
        effect: (): AbilityEffect => ({ status: { type: StatusEffectType.CURSE, value: 2, target: "enemy" } }),
    },
    SUBJECT162_PSYCHOTIC_WAVE: {
        name: "정신병 파동",
        type: PatternType.AWAKENING,
        face: CoinFace.TAILS,
        description: "자신의 체력을 2 잃고 저주를 5 부여합니다.",
        effect: (): AbilityEffect => ({
            selfDamage: 2,
            status: { type: StatusEffectType.CURSE, value: 5, target: "enemy" },
        }),
    },

    // --- 키메라 (Chimera) ---
    CHIMERA_FIERCE_ROAR: {
        name: "거센 포효",
        type: PatternType.TRIPLE,
        face: CoinFace.HEADS,
        description: "2회 공격하고 표식을 2 부여합니다.",
        effect: (a: EnemyCharacter): AbilityEffect => ({
            multiHit: { count: 2, damage: a.baseAtk },
            status: { type: StatusEffectType.MARK, value: 2, target: "enemy" },
        }),
    },
    CHIMERA_THORN_TENTACLE: {
        name: "가시 촉수",
        type: PatternType.QUAD,
        face: CoinFace.HEADS,
        description: "부여한 표식만큼 고정 피해를 줍니다.",
        effect: (_a: EnemyCharacter, d: PlayerCharacter): AbilityEffect => ({
            fixedDamage: d.statusEffects[StatusEffectType.MARK] || 0,
        }),
    },
    CHIMERA_SHARP_CHARGE: {
        name: "날카로운 돌진",
        type: PatternType.PENTA,
        face: CoinFace.HEADS,
        description: "2회 공격합니다. 출혈이 있으면 2회 더 공격합니다.",
        effect: (a: EnemyCharacter, d: PlayerCharacter): AbilityEffect => ({
            multiHit: { count: (d.statusEffects[StatusEffectType.BLEED] || 0) > 0 ? 4 : 2, damage: a.baseAtk },
        }),
    },
    CHIMERA_MERCILESS_PREDATION: {
        name: "무자비한 포식",
        type: PatternType.UNIQUE,
        face: CoinFace.HEADS,
        description: "표식과 출혈 수치만큼 연속 공격합니다.",
        effect: (a: EnemyCharacter, d: PlayerCharacter): AbilityEffect => ({
            multiHit: {
                count: (d.statusEffects[StatusEffectType.MARK] || 0) + (d.statusEffects[StatusEffectType.BLEED] || 0),
                damage: a.baseAtk,
            },
        }),
    },
    CHIMERA_THORN_SKIN: {
        name: "가시 피부",
        type: PatternType.PAIR,
        face: CoinFace.TAILS,
        description: "체력 40% 이하일 때 방어를 2 얻습니다.",
        effect: (a: EnemyCharacter): AbilityEffect => a.currentHp <= a.maxHp * 0.4 ? { defense: 2 } : { defense: 0 },
    },

    // --- 괴멸 증폭기 (Annihilation Amplifier) ---
    AMPLIFIER_DISTORTION_BROADCAST: {
        name: "왜곡 송출",
        type: PatternType.PAIR,
        face: CoinFace.HEADS,
        description: "피해를 5 주고 증폭을 1 얻습니다.",
        effect: (): AbilityEffect => ({
            fixedDamage: 5,
            status: { type: StatusEffectType.AMPLIFY, value: 1, target: "self" },
        }),
    },
    AMPLIFIER_DOOM_RESONANCE: {
        name: "멸망 공명",
        type: PatternType.PENTA,
        face: CoinFace.HEADS,
        description: "피해를 8 주고 현재 증폭만큼 공명을 부여합니다.",
        effect: (a: EnemyCharacter): AbilityEffect => {
            const amplify = a.statusEffects[StatusEffectType.AMPLIFY] || 0;
            return {
                fixedDamage: 8,
                status: amplify > 0
                    ? { type: StatusEffectType.RESONANCE, value: amplify, target: "enemy" }
                    : undefined,
            };
        },
    },
    AMPLIFIER_AMPLIFICATION_BROADCAST: {
        name: "증폭 방송",
        type: PatternType.TRIPLE,
        face: CoinFace.TAILS,
        description: "방어를 5 얻고 증폭을 3 얻습니다.",
        effect: (): AbilityEffect => ({
            defense: 5,
            status: { type: StatusEffectType.AMPLIFY, value: 3, target: "self" },
        }),
    },

    // --- 장의 사육자 (Flesh Cultivator) ---
    CULTIVATOR_BUTCHER_HOOK: {
        name: "도축 갈고리",
        type: PatternType.TRIPLE,
        face: CoinFace.HEADS,
        description: "피해를 5 주고 표식을 2 부여합니다.",
        effect: (): AbilityEffect => ({
            fixedDamage: 5,
            status: { type: StatusEffectType.MARK, value: 2, target: "enemy" },
        }),
    },
    CULTIVATOR_TEAR_FLESH: {
        name: "살점 뜯기",
        type: PatternType.QUAD,
        face: CoinFace.HEADS,
        description: "2회 공격합니다. 대상이 출혈 중이면 2회 더 공격합니다.",
        effect: (_a: EnemyCharacter, d: PlayerCharacter): AbilityEffect => ({
            multiHit: { count: (d.statusEffects[StatusEffectType.BLEED] || 0) > 0 ? 4 : 2, damage: 4 },
        }),
    },
    CULTIVATOR_FEEDING_PREP: {
        name: "사육 준비",
        type: PatternType.UNIQUE,
        face: CoinFace.TAILS,
        description: "방어를 8 얻고 다음 턴 첫 동전 앞면을 확정합니다.",
        effect: (): AbilityEffect => ({
            defense: 8,
            temporaryEffect: { name: "guaranteedFirstCoinHeads", value: true, duration: 2 },
        }),
    },

    // --- 심연 관측체 (Abyss Observer) ---
    OBSERVER_GAZE: {
        name: "응시",
        type: PatternType.PAIR,
        face: CoinFace.HEADS,
        description: "피해를 4 주고 저주를 2 부여합니다.",
        effect: (): AbilityEffect => ({
            fixedDamage: 4,
            status: { type: StatusEffectType.CURSE, value: 2, target: "enemy" },
        }),
    },
    OBSERVER_MENTAL_EROSION: {
        name: "정신 침식",
        type: PatternType.QUAD,
        face: CoinFace.HEADS,
        description: "피해를 6 줍니다. 대상 저주가 5 이상이면 봉인을 2 부여합니다.",
        effect: (_a: EnemyCharacter, d: PlayerCharacter): AbilityEffect => ({
            fixedDamage: 6,
            status: (d.statusEffects[StatusEffectType.CURSE] || 0) >= 5
                ? { type: StatusEffectType.SEAL, value: 2, target: "enemy" }
                : undefined,
        }),
    },
    OBSERVER_CLOSED_EYE: {
        name: "닫힌 눈",
        type: PatternType.TRIPLE,
        face: CoinFace.TAILS,
        description: "방어를 6 얻고 저주를 3 부여합니다.",
        effect: (): AbilityEffect => ({
            defense: 6,
            status: { type: StatusEffectType.CURSE, value: 3, target: "enemy" },
        }),
    },

    // --- 성육의 사도 (Apostle of Flesh) ---
    APOSTLE_FLESH_POUNDING: {
        name: "육편 난타",
        type: PatternType.TRIPLE,
        face: CoinFace.HEADS,
        description: "피해를 7 주고 반격을 2 얻습니다.",
        effect: (): AbilityEffect => ({
            fixedDamage: 7,
            status: { type: StatusEffectType.COUNTER, value: 2, target: "self" },
        }),
    },
    APOSTLE_EVOLUTION_CRUSH: {
        name: "진화 압살",
        type: PatternType.PENTA,
        face: CoinFace.HEADS,
        description: "기본 피해에 현재 증폭의 2배만큼 추가 피해를 줍니다.",
        effect: (a: EnemyCharacter): AbilityEffect => ({
            fixedDamage: a.baseAtk + (a.statusEffects[StatusEffectType.AMPLIFY] || 0) * 2,
        }),
    },
    APOSTLE_REGENERATIVE_TISSUE: {
        name: "재생 조직",
        type: PatternType.PAIR,
        face: CoinFace.TAILS,
        description: "방어를 6 얻고 증폭을 2 얻습니다.",
        effect: (): AbilityEffect => ({
            defense: 6,
            status: { type: StatusEffectType.AMPLIFY, value: 2, target: "self" },
        }),
    },
    APOSTLE_IMPERFECT_MOLT: {
        name: "불완전 탈피",
        type: PatternType.UNIQUE,
        face: CoinFace.TAILS,
        description: "체력을 10 회복하고 반격을 모두 증폭으로 전환합니다.",
        effect: (a: EnemyCharacter): AbilityEffect => {
            const counter = a.statusEffects[StatusEffectType.COUNTER] || 0;
            return {
                heal: 10,
                statusDrain: { type: StatusEffectType.COUNTER, value: counter },
                status: counter > 0
                    ? { type: StatusEffectType.AMPLIFY, value: counter, target: "self" }
                    : undefined,
            };
        },
    },

    // --- 월식의 성가대 (Eclipse Choir) ---
    CHOIR_DISSONANT_CHORD: {
        name: "불협 화음",
        type: PatternType.PAIR,
        face: CoinFace.HEADS,
        description: "피해를 5 주고 저주를 2 부여합니다.",
        effect: (): AbilityEffect => ({
            fixedDamage: 5,
            status: { type: StatusEffectType.CURSE, value: 2, target: "enemy" },
        }),
    },
    CHOIR_EROSION_CHORUS: {
        name: "침식 합장",
        type: PatternType.QUAD,
        face: CoinFace.HEADS,
        description: "피해를 7 주고 공명을 4 부여합니다.",
        effect: (): AbilityEffect => ({
            fixedDamage: 7,
            status: { type: StatusEffectType.RESONANCE, value: 4, target: "enemy" },
        }),
    },
    CHOIR_COLLAPSE_CANTICLE: {
        name: "붕괴 성가",
        type: PatternType.PENTA,
        face: CoinFace.HEADS,
        description: "기본 피해에 대상 공명만큼 추가 피해를 줍니다.",
        effect: (a: EnemyCharacter, d: PlayerCharacter): AbilityEffect => ({
            fixedDamage: a.baseAtk + (d.statusEffects[StatusEffectType.RESONANCE] || 0),
        }),
    },
    CHOIR_ECLIPSE_OPENING: {
        name: "월식 개막",
        type: PatternType.UNIQUE,
        face: CoinFace.HEADS,
        description: "대상의 누적 디버프만큼 피해를 주고 봉인을 3 부여합니다.",
        effect: (_a: EnemyCharacter, d: PlayerCharacter): AbilityEffect => {
            const debuffTotal = [
                StatusEffectType.CURSE,
                StatusEffectType.SEAL,
                StatusEffectType.RESONANCE,
                StatusEffectType.MARK,
                StatusEffectType.BLEED,
                StatusEffectType.SHATTER,
                StatusEffectType.PURSUIT,
            ].reduce((total, status) => total + (d.statusEffects[status] || 0), 0);
            return {
                fixedDamage: debuffTotal,
                status: { type: StatusEffectType.SEAL, value: 3, target: "enemy" },
            };
        },
    },
    CHOIR_SILENT_PRAYER: {
        name: "침묵의 기도",
        type: PatternType.TRIPLE,
        face: CoinFace.TAILS,
        description: "방어를 8 얻고 봉인을 2 부여합니다.",
        effect: (): AbilityEffect => ({
            defense: 8,
            status: { type: StatusEffectType.SEAL, value: 2, target: "enemy" },
        }),
    },
    CHOIR_BLACK_SANCTUARY: {
        name: "검은 성역",
        type: PatternType.QUAD,
        face: CoinFace.TAILS,
        description: "방어를 12 얻고 저주를 3 부여합니다.",
        effect: (): AbilityEffect => ({
            defense: 12,
            status: { type: StatusEffectType.CURSE, value: 3, target: "enemy" },
        }),
    },
};

// 패시브 ID → 표시용 요약 (이름/설명).
// CombatIntelPanel의 "패시브/상태" 패널이 사용한다.
// monsterData[*].passives[] 의 ID와 일치해야 한다 — 누락 시 ID를 그대로 노출하는 폴백이 동작한다.
export const monsterPassiveSummaries: Record<string, { name: string; description: string }> = {
  PASSIVE_MARAUDER1_CRUEL_INTERIOR: {
    name: '잔혹한 내면',
    description: '추적을 쌓은 뒤 난도질로 연속 피해를 노립니다.',
  },
  PASSIVE_MARAUDER2_MUSCLE_GROWTH: {
    name: '근육 성장',
    description: '증폭을 쌓고, 파괴전차로 증폭을 피해로 전환합니다.',
  },
  PASSIVE_LEADER_HARD_SKIN: {
    name: '단단한 피부',
    description: '반격과 방어 기술로 버티며 분쇄 조건을 만듭니다.',
  },
  PASSIVE_REAPER_FLOWING_DARKNESS: {
    name: '흐르는 어둠',
    description: '저주를 누적해 밤의 약탈 피해를 키웁니다.',
  },
  PASSIVE_REAPER_AMBUSH: {
    name: '기습',
    description: '동전 흐름을 방해해 다음 턴의 안전한 조합을 흔듭니다.',
  },
  PASSIVE_REAPER_VITAL_STRIKE: {
    name: '급소 타격',
    description: '저주가 쌓인 대상을 강하게 압박합니다.',
  },
  PASSIVE_SHADOWWRAITH_EARDRUM_BREAK: {
    name: '고막 파괴',
    description: '대상의 표식이 4 이상이면 출혈을 추가로 부여합니다.',
  },
  PASSIVE_DOPPELGANGER_AFTERIMAGE: {
    name: '잔상',
    description: '증폭이 3 이상인 공격은 공명을 추가로 남깁니다.',
  },
  PASSIVE_UNPLEASANTCUBE_BIND: {
    name: '휘감기',
    description: '반격이 3 이상인 공격은 분쇄를 추가로 남깁니다.',
  },
  PASSIVE_SUBJECT162_DISGUST: {
    name: '혐오 유발',
    description: '대상의 저주가 5 이상이면 저주를 봉인으로 전환합니다.',
  },
  PASSIVE_CHIMERA_SAW_TEETH: {
    name: '톱날 이빨',
    description: '10 이상의 피해를 주면 출혈을 추가로 부여합니다.',
  },
  // Stage 2 — Amplifier / Cultivator / Observer 라인
  PASSIVE_AMPLIFIER_RUPTURE_SOUND: {
    name: '파열 음파',
    description: '증폭이 5 이상일 때 공격에 공명 2를 추가로 남깁니다.',
  },
  PASSIVE_AMPLIFIER_BROAD_INTERFERENCE: {
    name: '광역 간섭',
    description: '플레이어의 공명이 폭발할 때 방어를 최대 3 무너뜨립니다.',
  },
  PASSIVE_AMPLIFIER_COLLAPSE_VIBRATION: {
    name: '붕괴 진동',
    description: '증폭이 한계에 닿으면 모든 공격이 +5 추가 피해를 입힙니다.',
  },
  PASSIVE_CULTIVATOR_BUTCHER_INSTINCT: {
    name: '도축 본능',
    description: '대상의 표식이 4 이상이면 공격 시 출혈 2를 추가로 부여합니다.',
  },
  PASSIVE_CULTIVATOR_FRESH_MEAT: {
    name: '신선한 고기',
    description: '출혈 중인 대상에게 공격하면 +2 피해를 더 입힙니다.',
  },
  PASSIVE_CULTIVATOR_HOOK_RETRIEVAL: {
    name: '갈고리 회수',
    description: '다단 공격(2회 이상)에 표식 1을 추가로 부여합니다.',
  },
  PASSIVE_OBSERVER_VOID_GAZE: {
    name: '공허 주시',
    description: '대상의 저주가 4 이상이면 공격 시 봉인 1을 부여합니다.',
  },
  PASSIVE_OBSERVER_MENTAL_COLLAPSE: {
    name: '정신 붕괴',
    description: '봉인된 대상에게 +4 추가 피해를 입힙니다.',
  },
  PASSIVE_OBSERVER_ABYSS_ECHO: {
    name: '심연 메아리',
    description: '대상이 봉인되었을 때 봉인 수치만큼(최대 3) 저주를 되돌립니다.',
  },
  // Stage 3 — Apostle / Choir 라인 (보스 단)
  PASSIVE_APOSTLE_ADAPTIVE_EVOLUTION: {
    name: '적응 진화',
    description: '피격할 때마다 증폭 1을 얻습니다. 전투당 최대 3회 누적됩니다.',
  },
  PASSIVE_APOSTLE_FLESH_REFLECTION: {
    name: '육체 반사',
    description: '자신의 반격이 5 이상이면 모든 공격이 +5 피해를 입힙니다.',
  },
  PASSIVE_APOSTLE_TWISTED_REGENERATION: {
    name: '비틀린 재생',
    description: '체력 50% 이하일 때 턴 종료마다 5를 회복합니다.',
  },
  PASSIVE_CHOIR_ECHO_MULTIPLICATION: {
    name: '메아리 증식',
    description: '플레이어의 공명이 폭발한 직후 저주 2를 추가로 부여합니다.',
  },
  PASSIVE_CHOIR_UNHOLY_HYMN: {
    name: '부정 찬가',
    description: '봉인된 대상에게 +5 추가 피해를 입힙니다.',
  },
  PASSIVE_CHOIR_DOOM_FORETELLING: {
    name: '종말 예고',
    description: '대상의 누적 디버프 합이 10 이상이면 피해를 1.5배로 증폭합니다.',
  },
  PASSIVE_CHOIR_ECLIPSE_PHENOMENON: {
    name: '월식 현상',
    description: '체력 50% 이하일 때 모든 공격에 공명 2를 추가로 남깁니다.',
  },
};
