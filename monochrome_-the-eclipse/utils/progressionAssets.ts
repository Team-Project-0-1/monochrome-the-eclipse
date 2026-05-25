import { effectIconPaths } from '../data/dataEffects';
import {
  CharacterClass,
  PatternType,
  PatternUpgradeDefinition,
  SkillUpgradeDefinition,
  StatusEffectType,
} from '../types';

export const patternIconPaths: Record<PatternType, string> = {
  [PatternType.PAIR]: 'assets/icons/combat/pattern-pair.png',
  [PatternType.TRIPLE]: 'assets/icons/combat/pattern-triple.png',
  [PatternType.QUAD]: 'assets/icons/combat/pattern-quad.png',
  [PatternType.PENTA]: 'assets/icons/combat/pattern-penta.png',
  [PatternType.UNIQUE]: 'assets/icons/combat/pattern-unique.png',
  [PatternType.AWAKENING]: 'assets/icons/combat/pattern-awakening.png',
};

const classActiveIconPaths: Record<CharacterClass, string> = {
  [CharacterClass.WARRIOR]: 'assets/icons/combat/active-warrior-reroll.png',
  [CharacterClass.ROGUE]: 'assets/icons/combat/active-rogue-flip.png',
  [CharacterClass.TANK]: 'assets/icons/combat/active-tank-lock.png',
  [CharacterClass.MAGE]: 'assets/icons/combat/active-mage-swap.png',
};

const statusIconMatchers: Array<[RegExp, StatusEffectType]> = [
  [/SHATTER|STENCH|SCENT/, StatusEffectType.SHATTER],
  [/SEAL/, StatusEffectType.SEAL],
  [/CURSE|FEAR|SELF_HATE/, StatusEffectType.CURSE],
  [/RESONANCE|(^|_)RES(_|$)|HEADACHE/, StatusEffectType.RESONANCE],
  [/PURSUIT|HUNT|TRACK|GUN_KATA|DUAL_WIELD/, StatusEffectType.PURSUIT],
  [/BLEED|BLOOD|WOUND|LIFE_STEAL/, StatusEffectType.BLEED],
  [/COUNTER|BACKHAND|PREPARED/, StatusEffectType.COUNTER],
  [/MARK|WEAKNESS/, StatusEffectType.MARK],
  [/AMPLIFY|AMP|ADRENALINE/, StatusEffectType.AMPLIFY],
];

const statusIconPathFromText = (id: string, description = ''): string | null => {
  const source = `${id} ${description}`.toUpperCase();
  const match = statusIconMatchers.find(([pattern]) => pattern.test(source));
  return match ? effectIconPaths[match[1]] ?? null : null;
};

export const getPatternUpgradeIconPath = (
  upgrade: PatternUpgradeDefinition,
  characterClass: CharacterClass,
): string => statusIconPathFromText(upgrade.id, upgrade.description) ?? classActiveIconPaths[characterClass];

export const getSkillUpgradeIconPath = (
  upgrade: SkillUpgradeDefinition,
  characterClass: CharacterClass,
): string => (
  statusIconPathFromText(upgrade.id, upgrade.description)
  ?? patternIconPaths[upgrade.replaces.type]
  ?? classActiveIconPaths[characterClass]
);
