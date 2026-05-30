import {
  PlayerCharacter,
  EnemyCharacter,
  DetectedPattern,
  EnemyIntent,
  CombatPrediction,
  Coin,
  PatternType,
  AbilityEffect,
} from '../../types';
import { getMonsterPhase, monsterData, monsterPatterns } from '../../data/dataMonsters';
import { getPlayerAbility } from '../../data/dataSkills';
import { getTemporaryNumber, getAmplifyBonusFromUnlocks } from './helpers';

// --- PREDICTION LOGIC ---
const getEffectStatuses = (effect: AbilityEffect) => {
  if (!effect.status) return [];
  return Array.isArray(effect.status) ? effect.status : [effect.status];
};

const getEnemyIntentCategory = (
  effect: AbilityEffect,
  damage: number,
  defense: number,
): NonNullable<EnemyIntent['category']> => {
  const statuses = getEffectStatuses(effect);
  const hasSelfGain = statuses.some(status => status.target === 'self' || !status.target) ||
    Boolean(effect.temporaryEffect || effect.gainMaxAmplify);
  const hasHarmfulTargetEffect = statuses.some(status => status.target !== 'self' && status.value > 0) ||
    Boolean(effect.enemyTemporaryEffect);

  if (damage > 0) return 'attack';
  if (hasHarmfulTargetEffect) return 'debuff';
  if (defense > 0 || hasSelfGain) return 'buff';
  return 'idle';
};

const getEnemyIntentRangeLabel = (
  category: NonNullable<EnemyIntent['category']>,
  hitCount: number,
) => {
  if (category === 'attack') return hitCount > 1 ? `플레이어 ${hitCount}회` : '플레이어 1명';
  if (category === 'debuff') return '플레이어 상태';
  if (category === 'buff') return '자신';
  if (category === 'move') return '위치 변경';
  return '없음';
};

const getEnemyIntentDangerLevel = (
  enemy: EnemyCharacter,
  effect: AbilityEffect,
  patternType: PatternType,
  damage: number,
  hitCount: number,
): NonNullable<EnemyIntent['dangerLevel']> => {
  const statuses = getEffectStatuses(effect);
  const addsHarmfulStatus = statuses.some(status => status.target !== 'self' && status.value > 0);
  const isHighPattern = [
    PatternType.PENTA,
    PatternType.UNIQUE,
    PatternType.AWAKENING,
  ].includes(patternType);

  if (damage >= 10 || hitCount >= 4 || isHighPattern) return 'high';
  if (enemy.tier === 'boss' && damage > 0) return 'high';
  if (addsHarmfulStatus && damage > 0) return 'high';
  return 'normal';
};

export const determineEnemyIntent = (enemy: EnemyCharacter): EnemyIntent => {
  const phase = getMonsterPhase(enemy);
  const baseSkillKeys = monsterData[enemy.key]?.patterns ?? [];
  const preferredSkillKeys = phase?.patterns ?? baseSkillKeys;
  const availableDetectedPatterns = [...enemy.detectedPatterns].sort((a, b) => b.count - a.count);

  const findBestMatch = (allowedSkillKeys: string[]) => {
    for (const detectedPattern of availableDetectedPatterns) {
      const matchingSkillKey = allowedSkillKeys.find(key => {
        const skillDef = monsterPatterns[key];
        return skillDef && skillDef.type === detectedPattern.type && (!skillDef.face || skillDef.face === detectedPattern.face);
      });

      if (matchingSkillKey) {
        return { patternKey: matchingSkillKey, skillDef: monsterPatterns[matchingSkillKey], patternInstance: detectedPattern };
      }
    }
    return null;
  };

  const bestMatch = findBestMatch(preferredSkillKeys) ?? (phase ? findBestMatch(baseSkillKeys) : null);

  if (!bestMatch) {
    return { description: '숨을 고른다', damage: 0, defense: 0, sourcePatternKeys: [], sourceCoinIndices: [] };
  }

  const { patternKey, skillDef, patternInstance } = bestMatch;
  const effect = skillDef.effect(enemy, { statusEffects: {} } as PlayerCharacter);

  let damage = effect.fixedDamage || 0;
  if(effect.multiHit) damage += effect.multiHit.count * effect.multiHit.damage;
  const hitCount = (effect.fixedDamage && effect.fixedDamage > 0 ? 1 : 0) + (effect.multiHit?.count ?? 0);

  const amplifyBonus = Math.floor((enemy.statusEffects.AMPLIFY || 0) / 2);
  if (amplifyBonus > 0) damage += amplifyBonus;

  const defense = (effect.defense || 0) + enemy.baseDef;
  const category = getEnemyIntentCategory(effect, damage, defense);

  return {
    description: phase ? `${phase.label} - ${skillDef.name}` : skillDef.name,
    damage: Math.round(damage),
    defense: Math.round(defense),
    category,
    dangerLevel: getEnemyIntentDangerLevel(enemy, effect, patternInstance.type, damage, hitCount),
    rangeLabel: getEnemyIntentRangeLabel(category, hitCount),
    hitCount,
    sourcePatternKeys: [patternKey],
    sourcePatternType: patternInstance.type,
    sourcePatternFace: patternInstance.face,
    sourcePatternCount: patternInstance.count,
    sourceCoinIndices: patternInstance.indices,
  };
};

export const calculateCombatPrediction = (
  player: PlayerCharacter,
  enemy: EnemyCharacter,
  selectedPlayerPatterns: DetectedPattern[],
  enemyIntent: EnemyIntent,
  playerCoins: Coin[],
  unlockedPatterns: string[] = []
): CombatPrediction => {

  const tempPlayer = JSON.parse(JSON.stringify(player));
  const tempEnemy = JSON.parse(JSON.stringify(enemy));

  let playerAttack = 0;
  let playerDefense = tempPlayer.baseDef + getTemporaryNumber(tempPlayer, 'bonusDef');
  if (unlockedPatterns.includes('TANK_P_IMPLANT')) playerDefense += 6;
  const playerAmplifyBonus = getAmplifyBonusFromUnlocks(tempPlayer, unlockedPatterns, true);
  if (playerAmplifyBonus > 0 && unlockedPatterns.includes('WARRIOR_PASSIVE_AMP_GIVES_DEF')) {
    playerDefense += playerAmplifyBonus;
  }

  selectedPlayerPatterns.forEach(p => {
    const ability = getPlayerAbility(player.class, player.acquiredSkills, p.type, p.face);
    if(ability && ability.effect) {
        const effect: AbilityEffect = ability.effect(tempPlayer, tempEnemy, playerCoins, selectedPlayerPatterns);
        if (typeof effect.fixedDamage === 'number') playerAttack += effect.fixedDamage;
        if(effect.multiHit) playerAttack += effect.multiHit.count * effect.multiHit.damage;
        let effectDefense = 0;
        if (typeof effect.defense === 'number') effectDefense += effect.defense;
        if (typeof effect.bonusDefense === 'number') effectDefense += effect.bonusDefense;
        if (effectDefense > 0 && unlockedPatterns.includes('ROGUE_P_BULLETPROOF_VEST')) effectDefense += 2;
        if (effectDefense > 0 && unlockedPatterns.includes('WARRIOR_PASSIVE_AMP_GIVES_DEF')) effectDefense += playerAmplifyBonus;
        playerDefense += effectDefense;
    }
  });

  const temporaryDamageBonus = getTemporaryNumber(tempPlayer, 'bonusAtk') + getTemporaryNumber(tempPlayer, 'bonusDamage');
  if (playerAttack > 0) playerAttack += temporaryDamageBonus;
  if (playerAttack > 0 && unlockedPatterns.includes('TANK_P_IMPLANT')) playerAttack += 6;

  if (playerAmplifyBonus > 0 && playerAttack > 0) {
    playerAttack += playerAmplifyBonus;
  }

  let predictedEnemyDefense = tempEnemy.baseDef + enemyIntent.defense;
  const shatterStacks = tempEnemy.statusEffects.SHATTER || 0;
  if(shatterStacks > 0) {
      const shatterRate = unlockedPatterns.includes('TANK_P_SHATTER_DOUBLE') ? 0.30 : 0.15;
      predictedEnemyDefense = Math.max(0, predictedEnemyDefense - Math.floor(predictedEnemyDefense * (shatterStacks * shatterRate)));
  }

  const damageToEnemy = Math.max(0, playerAttack - predictedEnemyDefense);
  const damageToPlayer = Math.max(0, enemyIntent.damage - playerDefense);

  return {
    player: {
      attack: { formula: `...`, total: playerAttack },
      defense: { formula: `${player.baseDef} + ...`, total: playerDefense },
    },
    enemy: {
      attack: { formula: `${enemy.baseAtk} + ...`, total: enemyIntent.damage },
      defense: { formula: `${enemy.baseDef} + ...`, total: enemyIntent.defense },
    },
    damageToPlayer,
    damageToEnemy,
    playerHp: player.currentHp,
    enemyHp: enemy.currentHp,
  };
};
