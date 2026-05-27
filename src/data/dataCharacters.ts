import { CharacterClass, StatusEffectType } from "../types";
import { assetPath } from "../utils/assetPath";
import { MEMORY_UPGRADE_DATA } from "../constants";

// 캐릭터 선택 화면에서 잠금 카드에 노출되는 해금 조건 안내.
// 룰 변경 시 한 곳에서 갱신할 수 있도록 view에서 분리.
export const characterUnlockHints: { [key in CharacterClass]?: string } = {
  [CharacterClass.ROGUE]: "3회 이상 플레이",
  [CharacterClass.TANK]: "스테이지 2 도달",
  [CharacterClass.MAGE]: "총 400 에코 수집",
};

// 메타 진행에 따른 캐릭터 최대 체력 계산.
// 화면에서 HP 표기/실제 적용이 동일 공식을 쓰도록 단일 출처.
export const getCharacterMaxHp = (baseHp: number, maxHpUpgradeLevel: number): number =>
  baseHp + MEMORY_UPGRADE_DATA.maxHp.effect * maxHpUpgradeLevel;

export const characterData = {
  [CharacterClass.WARRIOR]: {
    name: "김훈희",
    title: "공명파의 기술자",
    weapon: "소리 굽쇠",
    signature: "청각 / 증폭",
    assetKey: "warrior",
    portraitSrc: assetPath("assets/characters/warrior.png"),
    spriteSheetSrc: assetPath("assets/characters/sprites/warrior-spritesheet-transparent.png"),
    spriteFrameSize: 256,
    spriteAnimations: { idle: 0, attack: 1, skill: 2, death: 3 },
    hp: 75,
    baseAtk: 0,
    baseDef: 0,
    mainEffect: StatusEffectType.AMPLIFY,
    subEffect: StatusEffectType.RESONANCE,
    innatePassives: ["전투 시작 시 증폭을 2 얻습니다."],
  },
  [CharacterClass.ROGUE]: {
    name: "신제우",
    title: "잔향을 추적하는 자",
    weapon: "추적 권총",
    signature: "후각 / 추적",
    assetKey: "rogue",
    portraitSrc: assetPath("assets/characters/rogue.png"),
    spriteSheetSrc: assetPath("assets/characters/sprites/rogue-spritesheet-transparent.png"),
    spriteFrameSize: 256,
    spriteAnimations: { idle: 0, attack: 1, skill: 2, death: 3 },
    hp: 60,
    baseAtk: 0,
    baseDef: 0,
    mainEffect: StatusEffectType.PURSUIT,
    subEffect: StatusEffectType.BLEED,
    innatePassives: ["전투 시작 시 첫 번째 동전은 반드시 앞면이 됩니다."],
  },
  [CharacterClass.TANK]: {
    name: "곽장환",
    title: "철벽으로 버티는 자",
    weapon: "경량 버클러 / 강화 육체",
    signature: "촉각 / 반격",
    assetKey: "tank",
    portraitSrc: assetPath("assets/characters/tank.png"),
    spriteSheetSrc: assetPath("assets/characters/sprites/tank-spritesheet-transparent.png"),
    spriteFrameSize: 256,
    spriteAnimations: { idle: 0, attack: 1, skill: 2, death: 3 },
    hp: 70,
    baseAtk: 0,
    baseDef: 0,
    mainEffect: StatusEffectType.COUNTER,
    subEffect: StatusEffectType.SHATTER,
    innatePassives: ["전투 시작 시 공격과 방어를 3 얻습니다."],
  },
  [CharacterClass.MAGE]: {
    name: "박재석",
    title: "마력의 시야를 보는 자",
    weapon: "지팡이 / 점성학",
    signature: "영적 / 저주",
    assetKey: "mage",
    portraitSrc: assetPath("assets/characters/mage.png"),
    spriteSheetSrc: assetPath("assets/characters/sprites/mage-spritesheet-transparent.png"),
    spriteFrameSize: 256,
    spriteAnimations: { idle: 0, attack: 1, skill: 2, death: 3 },
    hp: 65,
    baseAtk: 0,
    baseDef: 0,
    mainEffect: StatusEffectType.CURSE,
    subEffect: StatusEffectType.SEAL,
    innatePassives: ["5턴간 피해를 받지 않고 생존하면, 5턴마다 적에게 피해를 한 번 줍니다."],
  },
};

export const characterActiveSkills = {
  [CharacterClass.WARRIOR]: {
    name: "재조율",
    description: "모든 동전 배치를 초기화합니다. (쿨다운 5턴)",
    cooldown: 5,
  },
  [CharacterClass.ROGUE]: {
    name: "동전 뒤집기",
    description: "원하는 동전 하나를 뒤집습니다. (쿨다운 3턴)",
    cooldown: 3,
  },
  [CharacterClass.TANK]: {
    name: "위치 변경",
    description: "자신의 동전 2개의 위치를 서로 바꿉니다. (쿨다운 8턴)",
    cooldown: 8,
  },
  [CharacterClass.MAGE]: {
    name: "동전 고정",
    description: "1턴간 원하는 동전 1개를 고정합니다. (쿨다운 3턴)",
    cooldown: 3,
  },
};
