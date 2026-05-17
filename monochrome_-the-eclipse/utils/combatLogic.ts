import {
  PlayerCharacter,
  EnemyCharacter,
  DetectedPattern,
  EnemyIntent,
  CombatPrediction,
  Coin,
  CombatLogMessage,
  PatternType,
  StatusEffectType,
  CoinFace,
  AbilityEffect,
  MonsterPatternDefinition,
  CharacterClass,
} from '../types';
import { getMonsterPhase, monsterData, monsterPatterns } from '../dataMonsters';
import { characterData } from '../dataCharacters';
import { patternUpgrades } from '../dataUpgrades';
import { getPlayerAbility } from '../dataSkills';
import { detectPatterns, generateCoins } from './gameLogic';
import { statusLabels } from './combatPresentation';
import { EffectPayload } from '../store/slices/uiSlice';

// --- TYPE DEFINITIONS ---
type GameStoreDraft = {
    player: PlayerCharacter | null;
    enemy: EnemyCharacter | null;
    unlockedPatterns: string[];
    playerCoins: Coin[];
    selectedPatterns: DetectedPattern[];
    enemyIntent: EnemyIntent | null;
    combatLog: CombatLogMessage[];
    combatTurn: number;
};
type LogFn = (message: string, type: CombatLogMessage['type']) => void;
type Character = PlayerCharacter | EnemyCharacter;
type MonsterPassiveId =
    | 'PASSIVE_SHADOWWRAITH_EARDRUM_BREAK'
    | 'PASSIVE_DOPPELGANGER_AFTERIMAGE'
    | 'PASSIVE_UNPLEASANTCUBE_BIND'
    | 'PASSIVE_SUBJECT162_DISGUST'
    | 'PASSIVE_CHIMERA_SAW_TEETH'
    | 'PASSIVE_AMPLIFIER_RUPTURE_SOUND'
    | 'PASSIVE_AMPLIFIER_BROAD_INTERFERENCE'
    | 'PASSIVE_AMPLIFIER_COLLAPSE_VIBRATION'
    | 'PASSIVE_CULTIVATOR_BUTCHER_INSTINCT'
    | 'PASSIVE_CULTIVATOR_FRESH_MEAT'
    | 'PASSIVE_CULTIVATOR_HOOK_RETRIEVAL'
    | 'PASSIVE_OBSERVER_VOID_GAZE'
    | 'PASSIVE_OBSERVER_MENTAL_COLLAPSE'
    | 'PASSIVE_OBSERVER_ABYSS_ECHO'
    | 'PASSIVE_APOSTLE_ADAPTIVE_EVOLUTION'
    | 'PASSIVE_APOSTLE_FLESH_REFLECTION'
    | 'PASSIVE_APOSTLE_TWISTED_REGENERATION'
    | 'PASSIVE_CHOIR_ECHO_MULTIPLICATION'
    | 'PASSIVE_CHOIR_UNHOLY_HYMN'
    | 'PASSIVE_CHOIR_DOOM_FORETELLING'
    | 'PASSIVE_CHOIR_ECLIPSE_PHENOMENON';


// --- HELPER FUNCTIONS ---

const isEnemyCharacter = (character: Character): character is EnemyCharacter => !('class' in character);

const getTemporaryNumber = (character: Character, key: string): number => {
    const value = character.temporaryEffects?.[key]?.value;
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

const hasUnlockedPassive = (state: GameStoreDraft | undefined, passiveId: string): boolean => (
    Boolean(state?.unlockedPatterns.includes(passiveId))
);

const getStatusValue = (character: Character, type: StatusEffectType): number => (
    character.statusEffects[type] || 0
);

const getTotalDebuffStacks = (character: Character): number => (
    [
        StatusEffectType.CURSE,
        StatusEffectType.SEAL,
        StatusEffectType.RESONANCE,
        StatusEffectType.MARK,
        StatusEffectType.BLEED,
        StatusEffectType.SHATTER,
        StatusEffectType.PURSUIT,
    ].reduce((total, type) => total + getStatusValue(character, type), 0)
);

const getAmplifyLimit = (state: GameStoreDraft | undefined, target: Character): number => (
    state?.player === target && hasUnlockedPassive(state, 'WARRIOR_PASSIVE_MAX_AMP_20') ? 20 : 10
);

const getAmplifyBonusFromUnlocks = (
    character: Character,
    unlockedPatterns: string[],
    isPlayer: boolean
): number => {
    const baseBonus = Math.floor(getStatusValue(character, StatusEffectType.AMPLIFY) / 2);
    if (baseBonus <= 0) return 0;
    if (isPlayer && unlockedPatterns.includes('WARRIOR_PASSIVE_AMP_BONUS_UP')) {
        return baseBonus + 1;
    }
    return baseBonus;
};

const getAmplifyBonus = (character: Character, state?: GameStoreDraft): number => (
    getAmplifyBonusFromUnlocks(character, state?.unlockedPatterns ?? [], state?.player === character)
);

const pushDefenseGain = (
    target: Character,
    amount: number,
    log: LogFn,
    effects: EffectPayload[],
    message?: string
) => {
    if (amount <= 0) return;
    target.temporaryDefense += amount;
    log(message ?? `${target.name}(이)가 방어 ${amount}를 얻습니다.`, 'defense');
    effects.push({ type: 'defense', target: 'class' in target ? 'player' : 'enemy', data: { amount } });
};

const getResonanceDelay = (
    state: GameStoreDraft | undefined,
    target: Character,
    source: Character | undefined,
    nextValue: number
): number => {
    if (state?.player && state.enemy && source === state.player && target === state.enemy && hasUnlockedPassive(state, 'WARRIOR_PASSIVE_RESONANCE_DURATION')) {
        return 3;
    }
    if (state?.player === target && nextValue >= 3 && hasUnlockedPassive(state, 'MAGE_P_RESONANCE_DURATION')) {
        return 3;
    }
    return 2;
};

const hasMonsterPassive = (character: Character, passiveId: MonsterPassiveId): character is EnemyCharacter => (
    isEnemyCharacter(character) && Boolean(monsterData[character.key]?.passives?.includes(passiveId))
);

const resolveStatusTarget = (
    caster: Character,
    target: Character,
    statusTarget: 'player' | 'enemy' | 'self' | undefined
): Character => {
    if (statusTarget === 'enemy') return target;
    if (statusTarget === 'self' || !statusTarget) return caster;

    if ('class' in caster) return caster;
    if ('class' in target) return target;

    return caster;
};

const syncResonanceMirror = (target: Character, value: number, countdown: number | undefined) => {
    target.temporaryEffects = target.temporaryEffects || {};
    if (value > 0) {
        target.temporaryEffects.resonance = { name: 'resonance', value, duration: countdown ?? 999, accumulative: true };
    } else {
        delete target.temporaryEffects.resonance;
        delete target.temporaryEffects.resonanceCountdown;
    }
};

const triggerMageSealDefense = (state: GameStoreDraft, log: LogFn, effects: EffectPayload[]) => {
    const { player, enemy } = state;
    if (!player || !enemy) return;
    if (!hasUnlockedPassive(state, 'MAGE_P_SEAL_DEFENSE')) return;
    if (player.temporaryEffects?.mageSealDefenseUsed?.value) return;
    if (getStatusValue(enemy, StatusEffectType.SEAL) < 10) return;

    player.temporaryEffects = player.temporaryEffects || {};
    player.temporaryEffects.mageSealDefenseUsed = { value: true, duration: 999 };
    enemy.coins.forEach(coin => {
        if (!coin.locked) coin.face = CoinFace.TAILS;
    });
    enemy.detectedPatterns = detectPatterns(enemy.coins);
    state.enemyIntent = determineEnemyIntent(enemy);
    log(`[강제 방어 명령] 봉인된 적의 동전을 전부 뒷면으로 뒤집습니다.`, 'status');
    effects.push({ type: 'status', target: 'enemy', data: { statusType: StatusEffectType.SEAL, value: 0 } });
};

const triggerMageSelfHate = (state: GameStoreDraft, log: LogFn, effects: EffectPayload[]) => {
    const { player, enemy } = state;
    if (!player || !enemy) return;
    if (!hasUnlockedPassive(state, 'MAGE_P_SELF_HATE')) return;
    const resonance = getStatusValue(player, StatusEffectType.RESONANCE);
    if (resonance < 6) return;

    log(`[자기 혐오] 공명을 끊어내며 양쪽에 피해를 줍니다.`, 'status');
    effects.push(...applyAndLogStatus(player, StatusEffectType.RESONANCE, -resonance, log, state, player, { skipSelfHate: true }));
    effects.push(...applyDamage(player, player, 6, log, state, { isFixed: true, ignoreDefense: true, isCurse: true }).effects);
    effects.push(...applyDamage(player, enemy, 6, log, state, { isFixed: true, ignoreDefense: true, isCurse: true }).effects);
};

const applyAndLogStatus = (
    target: Character,
    type: StatusEffectType,
    value: number,
    log: LogFn,
    state?: GameStoreDraft,
    source?: Character,
    options: { skipSelfHate?: boolean } = {}
): EffectPayload[] => {
    if (value === 0) return [];
    const effectName = statusLabels[type] ?? type;
    const prevValue = target.statusEffects[type] || 0;
    let nextValue = Math.max(0, prevValue + value);
    if (type === StatusEffectType.AMPLIFY) {
        nextValue = Math.min(nextValue, getAmplifyLimit(state, target));
    }
    target.statusEffects[type] = nextValue;

    const actualDelta = nextValue - prevValue;
    if (actualDelta === 0) return [];

    const action = actualDelta > 0 ? "부여" : "감소";
    log(`${target.name}에게 ${effectName} ${Math.abs(actualDelta)} ${action}. (총: ${nextValue})`, 'status');

    if (type === StatusEffectType.RESONANCE) {
        target.temporaryEffects = target.temporaryEffects || {};
        if (nextValue > 0 && actualDelta > 0) {
            const countdown = getResonanceDelay(state, target, source, nextValue);
            target.temporaryEffects.resonanceCountdown = { value: countdown, duration: 999 };
            syncResonanceMirror(target, nextValue, countdown);
        }
        if (nextValue <= 0) {
            syncResonanceMirror(target, 0, undefined);
        } else if (actualDelta < 0) {
            const countdown = Number(target.temporaryEffects.resonanceCountdown?.value ?? 2);
            syncResonanceMirror(target, nextValue, countdown);
        }
    }

    const targetType = 'class' in target ? 'player' : 'enemy';
    let effects: EffectPayload[] = [{
        type: 'status',
        target: targetType,
        data: { statusType: type, value: actualDelta }
    }];
    if (state && state.enemy === target && type === StatusEffectType.SEAL && actualDelta > 0) {
        triggerMageSealDefense(state, log, effects);
    }
    if (state && state.player === target && type === StatusEffectType.RESONANCE && actualDelta > 0 && !options.skipSelfHate) {
        triggerMageSelfHate(state, log, effects);
    }
    return effects;
};

const applyHeal = (target: Character, amount: number, log: LogFn): EffectPayload[] => {
    if (amount <= 0) return [];
    const prevHp = target.currentHp;
    target.currentHp = Math.min(target.maxHp, target.currentHp + amount);
    const healed = target.currentHp - prevHp;
    if (healed > 0) {
        log(`${target.name}(이)가 체력을 ${healed} 회복합니다.`, 'heal');
        const targetType = 'class' in target ? 'player' : 'enemy';
        return [{ type: 'heal', target: targetType, data: { amount: healed } }];
    }
    return [];
}

const applyDamage = (caster: Character, target: Character, damage: number, log: LogFn, state: GameStoreDraft, options: { isFixed?: boolean, ignoreDefense?: boolean, isCounterAttack?: boolean, isBleed?: boolean, isCurse?: boolean, isPursuit?: boolean } = {}): { damageDealt: number, effects: EffectPayload[] } => {
    if (damage <= 0) return { damageDealt: 0, effects: [] };

    let totalDamage = damage;
    let allEffects: EffectPayload[] = [];

    // 1. Caster's attack modifiers
    if (!options.isFixed) {
      const temporaryDamageBonus = getTemporaryNumber(caster, 'bonusAtk') + getTemporaryNumber(caster, 'bonusDamage');
      if (temporaryDamageBonus > 0) {
          totalDamage += temporaryDamageBonus;
          log(`${caster.name}의 임시 강화로 피해량이 ${temporaryDamageBonus} 증가!`, 'status');
      }

      if ('class' in caster && state.unlockedPatterns.includes('TANK_P_IMPLANT')) {
          totalDamage += 6;
          log(`${caster.name}의 임플란트로 피해량이 6 증가!`, 'status');
      }

      if ('class' in caster && state.unlockedPatterns.includes('WARRIOR_PASSIVE_BLEED_GIVES_ATK')) {
          const bleedBonus = caster.statusEffects[StatusEffectType.BLEED] || 0;
          if (bleedBonus > 0) {
              totalDamage += bleedBonus;
              log(`[고통과 쾌락] 출혈만큼 피해량이 ${bleedBonus} 증가!`, 'status');
          }
      }

      if ('class' in caster && state.unlockedPatterns.includes('ROGUE_P_WEAKNESS_TRACK') && target.temporaryDefense <= 5) {
          const bonus = Math.floor(totalDamage * 0.3);
          if (bonus > 0) {
              totalDamage += bonus;
              log(`[약점 추적] 낮은 방어를 노려 피해량이 ${bonus} 증가!`, 'status');
          }
      }

      if ('class' in caster && state.unlockedPatterns.includes('ROGUE_P_BLOOD_FESTIVAL') && (target.statusEffects[StatusEffectType.BLEED] || 0) >= 6) {
          totalDamage += 2;
          log(`[피의 축제] 출혈이 깊어 추가 피해 2를 얻습니다.`, 'status');
      }

      if ('class' in caster && state.unlockedPatterns.includes('MAGE_P_SEAL_DMG_UP')) {
          const sealBonus = target.statusEffects[StatusEffectType.SEAL] || 0;
          if (sealBonus > 0) {
              totalDamage += sealBonus;
              log(`[약자멸시] 봉인 수치만큼 피해량이 ${sealBonus} 증가!`, 'status');
          }
      }

      const ampBonus = getAmplifyBonus(caster, state);
      if (ampBonus > 0) {
          totalDamage += ampBonus;
          log(`${caster.name}의 증폭 효과로 피해량이 ${ampBonus} 증가!`, 'status');
      }

      if (hasMonsterPassive(caster, 'PASSIVE_CULTIVATOR_FRESH_MEAT') && getStatusValue(target, StatusEffectType.BLEED) > 0) {
          totalDamage += 2;
          log(`[신선한 고기] ${caster.name}이(가) 출혈 중인 대상을 더 깊게 가릅니다.`, 'status');
      }

      if (hasMonsterPassive(caster, 'PASSIVE_OBSERVER_MENTAL_COLLAPSE') && getStatusValue(target, StatusEffectType.SEAL) > 0) {
          totalDamage += 4;
          log(`[정신 붕괴] ${caster.name}이(가) 봉인된 정신을 파고듭니다.`, 'status');
      }

      if (hasMonsterPassive(caster, 'PASSIVE_APOSTLE_FLESH_REFLECTION') && getStatusValue(caster, StatusEffectType.COUNTER) >= 5) {
          totalDamage += 5;
          log(`[육체 반사] ${caster.name}의 반격 태세가 공격을 강화합니다.`, 'status');
      }

      if (hasMonsterPassive(caster, 'PASSIVE_CHOIR_UNHOLY_HYMN') && getStatusValue(target, StatusEffectType.SEAL) > 0) {
          totalDamage += 5;
          log(`[부정 찬가] ${caster.name}이(가) 봉인된 대상을 찢습니다.`, 'status');
      }

      if (hasMonsterPassive(caster, 'PASSIVE_CHOIR_DOOM_FORETELLING') && getTotalDebuffStacks(target) >= 10) {
          totalDamage = Math.ceil(totalDamage * 1.5);
          log(`[종말 예고] 누적 디버프가 한계에 닿아 피해가 증폭됩니다.`, 'status');
      }

      if (hasMonsterPassive(caster, 'PASSIVE_AMPLIFIER_COLLAPSE_VIBRATION') && getStatusValue(caster, StatusEffectType.AMPLIFY) >= getAmplifyLimit(state, caster)) {
          totalDamage += 5;
          log(`[붕괴 진동] 최대 증폭이 공격에 추가 충격을 싣습니다.`, 'status');
      }

      const sealStacks = caster.statusEffects.SEAL || 0;
      if (sealStacks > 0) {
          const reduction = Math.floor(totalDamage * (sealStacks * 0.15));
          totalDamage = Math.max(0, totalDamage - reduction);
          log(`${caster.name}의 봉인 효과로 피해량이 ${reduction} 감소!`, 'status');
      }
    }

    if (options.isPursuit && 'class' in caster && caster.temporaryEffects?.doublePursuitDamageAndModifiedLoss) {
        totalDamage *= 2;
    }

    // 2. Target's defense modifiers
    const originalTargetDefense = options.ignoreDefense ? 0 : target.temporaryDefense;
    let targetDefense = originalTargetDefense;
    const shatterStacks = target.statusEffects.SHATTER || 0;
    if (shatterStacks > 0) {
        const shatterRate = state.unlockedPatterns.includes('TANK_P_SHATTER_DOUBLE') ? 0.30 : 0.15;
        const reduction = Math.floor(targetDefense * (shatterStacks * shatterRate));
        targetDefense = Math.max(0, targetDefense - reduction);
        log(`${target.name}의 분쇄 효과로 방어력이 ${reduction} 감소!`, 'status');
    }

    let finalDamage = Math.max(0, totalDamage - targetDefense);

    const resonanceShieldActive = 'class' in target && (
        Boolean(target.temporaryEffects?.resonanceAsShield) ||
        Boolean(target.temporaryEffects?.resonanceShieldAndDrain)
    );
    if (resonanceShieldActive && finalDamage > 0) {
        const resonance = getStatusValue(target, StatusEffectType.RESONANCE);
        if (resonance > 0) {
            const shieldCapacity = resonance + (hasUnlockedPassive(state, 'MAGE_P_RESONANCE_SHIELD') ? Math.ceil(resonance * 0.1) : 0);
            const absorbedDamage = Math.min(finalDamage, shieldCapacity);
            const resonanceDrain = Math.min(resonance, absorbedDamage);
            finalDamage -= absorbedDamage;
            log(`[무책임한 방벽] 공명이 피해 ${absorbedDamage}를 흡수합니다.`, 'defense');
            allEffects.push(...applyAndLogStatus(target, StatusEffectType.RESONANCE, -resonanceDrain, log, state, target, { skipSelfHate: true }));
        }
    }

    const prevHp = target.currentHp;
    target.currentHp = Math.max(0, target.currentHp - finalDamage);
    const actualDamage = prevHp - target.currentHp;

    if (caster.temporaryEffects) {
        caster.temporaryEffects.damageDealtThisTurn = (caster.temporaryEffects.damageDealtThisTurn || 0) + actualDamage;
    }

    if (actualDamage > 0) {
        if (target.temporaryEffects) {
            target.temporaryEffects.damageTakenThisTurn = (target.temporaryEffects.damageTakenThisTurn || 0) + actualDamage;
        }

        const targetType = 'class' in target ? 'player' : 'enemy';
        allEffects.push({ type: 'damage', target: targetType, data: { amount: actualDamage } });
        log(`${caster.name}(이)가 ${target.name}에게 ${actualDamage} 피해. (${totalDamage} - ${targetDefense})`, 'damage');

        const brokeDefense = !options.isFixed && originalTargetDefense > 0 && totalDamage > targetDefense;
        if ('class' in caster && target === state.enemy && brokeDefense && hasUnlockedPassive(state, 'TANK_P_ABSORB_DEFENSE')) {
            pushDefenseGain(caster, 3, log, allEffects, `[방어 흡수] 상대 방어를 뚫고 방어 3을 얻습니다.`);
        }

        if (hasMonsterPassive(target, 'PASSIVE_APOSTLE_ADAPTIVE_EVOLUTION')) {
            target.temporaryEffects = target.temporaryEffects || {};
            const triggerCount = Number(target.temporaryEffects.adaptiveEvolutionTriggers?.value ?? 0);
            if (triggerCount < 3) {
                target.temporaryEffects.adaptiveEvolutionTriggers = { value: triggerCount + 1, duration: 999 };
                allEffects.push(...applyAndLogStatus(target, StatusEffectType.AMPLIFY, 1, log, state, caster));
                log(`[적응 진화] ${target.name}이(가) 피해에 적응해 증폭을 얻습니다.`, 'status');
            }
        }

        // 3. On Damage Taken effects
        const triggersReactiveDamage = !options.isBleed && !options.isCurse && !options.isPursuit;
        if (triggersReactiveDamage) {
            const bleedStacks = target.statusEffects[StatusEffectType.BLEED] || 0;
            if (bleedStacks > 0) {
                let bleedDamage = Math.floor(target.maxHp * 0.05);

                const bleedHits = (state.player && state.unlockedPatterns.includes('ROGUE_P_WOUND_TEAR')) ? 2 : 1;

                for (let i = 0; i < bleedHits; i++) {
                    if (bleedDamage > 0) {
                        const { damageDealt, effects } = applyDamage(target, target, bleedDamage, log, state, { isFixed: true, ignoreDefense: true, isBleed: true });
                        if(damageDealt > 0) {
                             log(`[출혈] ${target.name}(이)가 ${damageDealt} 피해를 입었다!`, 'damage');
                             allEffects.push(...effects);
                             if (state.player && state.unlockedPatterns.includes('ROGUE_P_LIFE_STEAL')) {
                                 allEffects.push(...applyHeal(state.player, Math.floor(damageDealt * 0.1), log));
                             }
                             if (state.player && state.unlockedPatterns.includes('ROGUE_P_BLOOD_BULLET')) {
                                 allEffects.push(...applyAndLogStatus(state.player, StatusEffectType.PURSUIT, 1, log, state, state.player));
                             }
                             if (target === state.player && state.enemy && state.unlockedPatterns.includes('WARRIOR_PASSIVE_SHARE_BLEED_DMG')) {
                                 const sharedBleed = applyDamage(target, state.enemy, damageDealt, log, state, { isFixed: true, ignoreDefense: true, isBleed: true });
                                 allEffects.push(...sharedBleed.effects);
                                 if (sharedBleed.damageDealt > 0) {
                                     log(`[비명 이중주] 자신의 출혈 피해가 적에게도 전이됩니다.`, 'damage');
                                 }
                             }
                        }
                    }
                }
                allEffects.push(...applyAndLogStatus(target, StatusEffectType.BLEED, -1, log, state, target));
            }

            const counterStacks = target.statusEffects[StatusEffectType.COUNTER] || 0;
            if (counterStacks > 0 && !options.isCounterAttack) {
                const counterDamage = counterStacks;
                log(`[반격] ${target.name}이(가) ${caster.name}에게 ${counterDamage} 피해를 돌려줍니다!`, 'player');
                const counterResult = applyDamage(target, caster, counterDamage, log, state, { isFixed: true, isCounterAttack: true });
                allEffects.push(...counterResult.effects);
                allEffects.push(...applyAndLogStatus(target, StatusEffectType.COUNTER, -counterStacks, log, state, target));
            }

            allEffects.push(...applyPassives(state, 'ON_DAMAGE_TAKEN', log, { character: target, damage: actualDamage, caster, ignoreDefense: options.ignoreDefense }));
        }

        if ('class' in target && target.currentHp <= 0 && state.unlockedPatterns.includes('MAGE_P_DEATH_RESIST') && !target.temporaryEffects?.deathResistUsed) {
            target.temporaryEffects = target.temporaryEffects || {};
            target.temporaryEffects.deathResistUsed = { value: true, duration: 999 };
            target.statusEffects = {};
            target.currentHp = Math.max(1, Math.floor(target.maxHp * 0.5));
            log(`[죽음 극복] ${target.name}이(가) 죽음에 달하는 피해를 버티고 회복합니다.`, 'heal');
            allEffects.push({ type: 'heal', target: 'player', data: { amount: target.currentHp } });
        }

        if ('class' in caster && !options.isFixed && state.unlockedPatterns.includes('WARRIOR_PASSIVE_ATTACKS_GIVE_RESONANCE')) {
            caster.temporaryEffects = caster.temporaryEffects || {};
            const attackCount = (caster.temporaryEffects.attackSkillCount?.value || 0) + 1;
            caster.temporaryEffects.attackSkillCount = { value: attackCount, duration: 999 };
            if (attackCount % 3 === 0) {
                allEffects.push(...applyAndLogStatus(target, StatusEffectType.RESONANCE, 5, log, state, caster));
                log(`[자가 공명 기능] 세 번째 공격이 공명을 남깁니다.`, 'status');
            }
        }

        if ('class' in target && hasMonsterPassive(caster, 'PASSIVE_CHIMERA_SAW_TEETH') && actualDamage >= 10) {
            allEffects.push(...applyAndLogStatus(target, StatusEffectType.BLEED, 1, log, state, caster));
            log(`[톱날 이빨] ${caster.name}의 큰 피해가 출혈을 남깁니다.`, 'status');
        }
    }

    return { damageDealt: actualDamage, effects: allEffects };
};

const applyMonsterStatePassives = (caster: Character, target: Character, effect: AbilityEffect, state: GameStoreDraft, log: LogFn): EffectPayload[] => {
    if (!('class' in target)) return [];

    let allEffects: EffectPayload[] = [];
    const effectHasAttack = Boolean(effect.fixedDamage || effect.multiHit);

    if (effectHasAttack && hasMonsterPassive(caster, 'PASSIVE_DOPPELGANGER_AFTERIMAGE') && (caster.statusEffects[StatusEffectType.AMPLIFY] || 0) >= 3) {
        allEffects.push(...applyAndLogStatus(target, StatusEffectType.RESONANCE, 2, log, state, caster));
        log(`[잔상] ${caster.name}의 증폭이 공명으로 번집니다.`, 'status');
    }

    if (effectHasAttack && hasMonsterPassive(caster, 'PASSIVE_UNPLEASANTCUBE_BIND') && (caster.statusEffects[StatusEffectType.COUNTER] || 0) >= 3) {
        allEffects.push(...applyAndLogStatus(target, StatusEffectType.SHATTER, 2, log, state, caster));
        log(`[휘감기] ${caster.name}의 반격 태세가 분쇄를 남깁니다.`, 'status');
    }

    if (hasMonsterPassive(caster, 'PASSIVE_SHADOWWRAITH_EARDRUM_BREAK') && (target.statusEffects[StatusEffectType.MARK] || 0) >= 4) {
        allEffects.push(...applyAndLogStatus(target, StatusEffectType.BLEED, 2, log, state, caster));
        log(`[고막 파괴] ${caster.name}의 표식이 출혈로 이어집니다.`, 'status');
    }

    if (hasMonsterPassive(caster, 'PASSIVE_SUBJECT162_DISGUST') && (target.statusEffects[StatusEffectType.CURSE] || 0) >= 5) {
        const curseAmount = target.statusEffects[StatusEffectType.CURSE] || 0;
        allEffects.push(...applyAndLogStatus(target, StatusEffectType.CURSE, -curseAmount, log, state, caster));
        allEffects.push(...applyAndLogStatus(target, StatusEffectType.SEAL, 5, log, state, caster));
        log(`[혐오 유발] ${caster.name}의 저주가 봉인으로 전환됩니다.`, 'status');
    }

    if (effectHasAttack && hasMonsterPassive(caster, 'PASSIVE_AMPLIFIER_RUPTURE_SOUND') && getStatusValue(caster, StatusEffectType.AMPLIFY) >= 5) {
        allEffects.push(...applyAndLogStatus(target, StatusEffectType.RESONANCE, 2, log, state, caster));
        log(`[파열 음파] ${caster.name}의 증폭음이 공명으로 남습니다.`, 'status');
    }

    if (effectHasAttack && hasMonsterPassive(caster, 'PASSIVE_CULTIVATOR_BUTCHER_INSTINCT') && getStatusValue(target, StatusEffectType.MARK) >= 4) {
        allEffects.push(...applyAndLogStatus(target, StatusEffectType.BLEED, 2, log, state, caster));
        log(`[도축 본능] ${caster.name}이(가) 깊은 표식을 출혈로 벌립니다.`, 'status');
    }

    if (effect.multiHit && effect.multiHit.count >= 2 && hasMonsterPassive(caster, 'PASSIVE_CULTIVATOR_HOOK_RETRIEVAL')) {
        allEffects.push(...applyAndLogStatus(target, StatusEffectType.MARK, 1, log, state, caster));
        log(`[갈고리 회수] ${caster.name}의 연속 공격이 표식을 남깁니다.`, 'status');
    }

    if (hasMonsterPassive(caster, 'PASSIVE_OBSERVER_VOID_GAZE') && getStatusValue(target, StatusEffectType.CURSE) >= 4) {
        allEffects.push(...applyAndLogStatus(target, StatusEffectType.SEAL, 1, log, state, caster));
        log(`[공허 주시] ${caster.name}의 시선이 저주를 봉인으로 조입니다.`, 'status');
    }

    if (hasMonsterPassive(caster, 'PASSIVE_OBSERVER_ABYSS_ECHO') && getStatusValue(target, StatusEffectType.SEAL) > 0) {
        const curseEcho = Math.min(3, getStatusValue(target, StatusEffectType.SEAL));
        allEffects.push(...applyAndLogStatus(target, StatusEffectType.CURSE, curseEcho, log, state, caster));
        log(`[심연 메아리] 봉인된 감각만큼 저주가 되돌아옵니다.`, 'status');
    }

    if (effectHasAttack && hasMonsterPassive(caster, 'PASSIVE_CHOIR_ECLIPSE_PHENOMENON') && caster.currentHp <= caster.maxHp * 0.5) {
        allEffects.push(...applyAndLogStatus(target, StatusEffectType.RESONANCE, 2, log, state, caster));
        log(`[월식 현상] ${caster.name}의 합창이 모든 공격에 공명을 싣습니다.`, 'status');
    }

    return allEffects;
};

const tryExecuteTarget = (
    caster: Character,
    target: Character,
    state: GameStoreDraft,
    log: LogFn,
    allEffects: EffectPayload[]
) => {
    const executeThreshold = getTemporaryNumber(caster, 'execute');
    if (executeThreshold <= 0 || target.currentHp <= 0) return;

    const thresholdHp = Math.max(1, Math.floor(target.maxHp * executeThreshold));
    if (target.currentHp <= thresholdHp) {
        const previousHp = target.currentHp;
        target.currentHp = 0;
        const targetType = 'class' in target ? 'player' : 'enemy';
        log(`[나태의 낫] ${target.name}의 남은 의지를 끊어 처형합니다.`, 'damage');
        allEffects.push({ type: 'damage', target: targetType, data: { amount: previousHp } });
    }

    if (caster.temporaryEffects?.execute) {
        delete caster.temporaryEffects.execute;
    }
};

const triggerMageCurseNuke = (state: GameStoreDraft, log: LogFn, allEffects: EffectPayload[]) => {
    const { player, enemy } = state;
    if (!player || !enemy) return;
    if (!hasUnlockedPassive(state, 'MAGE_P_CURSE_NUKE')) return;
    if (player.temporaryEffects?.curseNukeUsed?.value) return;

    const curse = getStatusValue(player, StatusEffectType.CURSE);
    if (curse < 20) return;

    player.temporaryEffects = player.temporaryEffects || {};
    player.temporaryEffects.curseNukeUsed = { value: true, duration: 999 };
    log(`[강림] 누적된 저주가 폭발합니다.`, 'status');
    const { effects } = applyDamage(player, enemy, curse * 2, log, state, { isFixed: true, ignoreDefense: true, isCurse: true });
    allEffects.push(...effects);
    allEffects.push(...applyAndLogStatus(player, StatusEffectType.CURSE, -curse, log, state, player));
};

const applyAbilityEffect = (caster: Character, target: Character, effect: AbilityEffect, state: GameStoreDraft, log: LogFn): EffectPayload[] => {
    if (!effect || typeof effect !== 'object') return [];
    let allEffects: EffectPayload[] = [];
    const casterType = 'class' in caster ? 'player' : 'enemy';

    // Status Costs & Drains
    if (effect.statusCost) {
        allEffects.push(...applyAndLogStatus(caster, effect.statusCost.type, -effect.statusCost.value, log, state, caster));
    }
    if (effect.enemyStatusDrain) {
        allEffects.push(...applyAndLogStatus(target, effect.enemyStatusDrain.type, -effect.enemyStatusDrain.value, log, state, caster));
    }
    if (effect.statusDrain) {
        allEffects.push(...applyAndLogStatus(caster, effect.statusDrain.type, -effect.statusDrain.value, log, state, caster));
    }

    // Defense and Heal
    let defenseGain = 0;
    if (typeof effect.defense === 'number') defenseGain += effect.defense;
    if (typeof effect.bonusDefense === 'number') defenseGain += effect.bonusDefense;

    if (defenseGain > 0) {
        if ('class' in caster && state.unlockedPatterns.includes('ROGUE_P_BULLETPROOF_VEST')) {
            defenseGain += 2;
        }
        if ('class' in caster && hasUnlockedPassive(state, 'WARRIOR_PASSIVE_AMP_GIVES_DEF')) {
            const amplifyDefense = getAmplifyBonus(caster, state);
            if (amplifyDefense > 0) {
                defenseGain += amplifyDefense;
                log(`[공방일체] 증폭으로 방어 ${amplifyDefense}를 추가합니다.`, 'defense');
            }
        }
        pushDefenseGain(caster, defenseGain, log, allEffects);
    }
    if (typeof effect.heal === 'number' && effect.heal > 0) {
        allEffects.push(...applyHeal(caster, effect.heal, log));
    }

    if (typeof effect.selfDamage === 'number' && effect.selfDamage > 0) {
        const { effects } = applyDamage(caster, caster, effect.selfDamage, log, state, { isFixed: true, ignoreDefense: true });
        allEffects.push(...effects);
    }

    // Status Effects
    if (effect.status) {
        const statuses = Array.isArray(effect.status) ? effect.status : [effect.status];
        statuses.forEach((s) => {
            const finalTarget = resolveStatusTarget(caster, target, s.target);
            let statusValue = s.value;
            if ('class' in caster && finalTarget === target && s.type === StatusEffectType.SHATTER && state.unlockedPatterns.includes('ROGUE_P_SCENT_SCOPE')) {
                statusValue += 1;
            }
            allEffects.push(...applyAndLogStatus(finalTarget, s.type, statusValue, log, state, caster));
            if ('class' in caster && finalTarget === target && s.type === StatusEffectType.SHATTER && state.unlockedPatterns.includes('TANK_P_SHATTER_SEAL')) {
                allEffects.push(...applyAndLogStatus(finalTarget, StatusEffectType.SEAL, 1, log, state, caster));
            }
        });
    }

    // Temporary Effects
    if (effect.temporaryEffect) handleTemporaryEffect(caster, casterType, effect.temporaryEffect, allEffects, state, log, caster);
    if (effect.enemyTemporaryEffect) handleTemporaryEffect(target, 'class' in target ? 'player' : 'enemy', effect.enemyTemporaryEffect, allEffects, state, log, caster);

    if (effect.gainMaxAmplify === true) {
       allEffects.push(...applyAndLogStatus(caster, StatusEffectType.AMPLIFY, 10, log, state, caster));
    }

    // Damage
    let damagePayload = 0;
    if (typeof effect.fixedDamage === 'number') damagePayload += effect.fixedDamage;
    if (effect.bonusDamage) {
        damagePayload += effect.bonusDamage;
    }

    if (effect.damageMultiplier) {
        damagePayload *= effect.damageMultiplier;
    }

    if (damagePayload > 0) {
        const { effects } = applyDamage(caster, target, damagePayload, log, state);
        allEffects.push(...effects);
        tryExecuteTarget(caster, target, state, log, allEffects);
    }
    if (effect.multiHit) {
        for (let i = 0; i < effect.multiHit.count; i++) {
            const { effects } = applyDamage(caster, target, effect.multiHit.damage, log, state);
            allEffects.push(...effects);
        }
        tryExecuteTarget(caster, target, state, log, allEffects);
    }

    allEffects.push(...applyMonsterStatePassives(caster, target, effect, state, log));
    return allEffects;
};

const handleTemporaryEffect = (
    char: Character,
    charType: 'player' | 'enemy',
    te: any,
    allEffects: EffectPayload[],
    state?: GameStoreDraft,
    log?: LogFn,
    source?: Character
) => {
    char.temporaryEffects = char.temporaryEffects || {};

    if (te.name === 'resonance_clear' || te.name === 'clearResonance') {
        const resonance = getStatusValue(char, StatusEffectType.RESONANCE);
        if (resonance > 0 && log) {
            allEffects.push(...applyAndLogStatus(char, StatusEffectType.RESONANCE, -resonance, log, state, source, { skipSelfHate: true }));
        }
        syncResonanceMirror(char, 0, undefined);
        return;
    }

    if (te.name === 'resonance_extend') {
        const countdown = Number(char.temporaryEffects.resonanceCountdown?.value ?? char.temporaryEffects.resonance?.duration ?? 0);
        if (countdown > 0) {
            const nextCountdown = countdown + Number(te.value || 0);
            char.temporaryEffects.resonanceCountdown = { value: nextCountdown, duration: 999 };
            syncResonanceMirror(char, getStatusValue(char, StatusEffectType.RESONANCE), nextCountdown);
        }
        return;
    }

    if (te.name === 'resonance' || te.name === 'resonanceAndFlip') {
        if (log) {
            allEffects.push(...applyAndLogStatus(char, StatusEffectType.RESONANCE, Number(te.value || 0), log, state, source));
        }
        if (te.name === 'resonanceAndFlip') {
            char.temporaryEffects.resonanceAndFlip = { ...te, value: true };
        }
        return;
    }

    const storedEffect = { ...te };
    if (te.name === 'execute' && state?.player === char && hasUnlockedPassive(state, 'MAGE_P_SEAL_EXECUTE')) {
        storedEffect.value = Math.max(Number(te.value || 0), 0.1);
    }

    if (storedEffect.accumulative && char.temporaryEffects[storedEffect.name]) {
        char.temporaryEffects[storedEffect.name].value = (char.temporaryEffects[storedEffect.name].value || 0) + storedEffect.value;
        char.temporaryEffects[storedEffect.name].duration = Math.max(char.temporaryEffects[storedEffect.name].duration || 0, storedEffect.duration);
    } else {
        char.temporaryEffects[storedEffect.name] = storedEffect;
    }

    if ((storedEffect.name === 'bonusAtk' || storedEffect.name === 'bonusDef') && typeof storedEffect.value === 'number' && storedEffect.value !== 0) {
        allEffects.push({
            type: 'temp_stat',
            target: charType,
            data: { stat: storedEffect.name === 'bonusAtk' ? 'attack' : 'defense', value: storedEffect.value, duration: storedEffect.duration - 1 },
        });
    }
};

// --- PASSIVE APPLICATION LOGIC ---
export const applyInnatePassives = (state: GameStoreDraft, log: LogFn): EffectPayload[] => {
    const { player, enemy } = state;
    if (!player || !enemy) return [];
    let allEffects: EffectPayload[] = [];
    player.temporaryEffects = player.temporaryEffects || {};

    switch (player.class) {
        case CharacterClass.WARRIOR:
            allEffects.push(...applyAndLogStatus(player, StatusEffectType.AMPLIFY, 2, log, state, player));
            if (state.unlockedPatterns.includes('WARRIOR_PASSIVE_START_RESONANCE')) {
                allEffects.push(...applyAndLogStatus(enemy, StatusEffectType.RESONANCE, 2, log, state, player));
            }
            break;
        case CharacterClass.ROGUE:
            player.temporaryEffects.firstCoinHeads = { duration: 2 };
            break;
        case CharacterClass.TANK:
            player.temporaryEffects.bonusAtk = { value: 3, duration: 999 };
            player.temporaryEffects.bonusDef = { value: 3, duration: 999 };
            log(`${player.name}이(가) 전투 태세에 돌입하여 공격과 방어를 3 얻습니다.`, 'status');
            if (state.unlockedPatterns.includes('TANK_P_PREPARED')) {
                allEffects.push(...applyAndLogStatus(player, StatusEffectType.COUNTER, 3, log, state, player));
            }
            break;
        case CharacterClass.MAGE:
            player.temporaryEffects.debuffAccumulator = { damage: 0, turns: 0 };
            log(`${player.name}이(가) 5턴간 디버프 피해를 저장합니다.`, 'status');
            break;
    }
    return allEffects;
};

export const applyPassives = (
  state: GameStoreDraft,
  trigger: 'PLAYER_TURN_START' | 'ON_DAMAGE_TAKEN' | 'ENEMY_TURN_START' | 'END_OF_TURN' | 'ON_ATTACK',
  log: LogFn,
  payload?: any
): EffectPayload[] => {
    const { player, unlockedPatterns, playerCoins, enemy } = state;
    if (!player || !enemy) return [];

    let allEffects: EffectPayload[] = [];

    if (trigger === 'PLAYER_TURN_START') {
        unlockedPatterns.forEach(id => {
            switch (id) {
                case 'WARRIOR_PASSIVE_LOSE_HP_GAIN_AMP': {
                    const { effects } = applyDamage(player, player, 1, log, state, { isFixed: true, ignoreDefense: true, isCurse: true });
                    allEffects.push(...effects);
                    allEffects.push(...applyAndLogStatus(player, StatusEffectType.AMPLIFY, 1, log, state, player));
                    break;
                }
                case 'WARRIOR_PASSIVE_LOW_HP_GAIN_AMP':
                    if (player.currentHp <= Math.floor(player.maxHp * 0.5)) {
                        allEffects.push(...applyAndLogStatus(player, StatusEffectType.AMPLIFY, 3, log, state, player));
                    }
                    break;
                case 'WARRIOR_PASSIVE_HEADS_GIVE_RESONANCE': {
                    const headsCount = playerCoins.filter(c => c.face === CoinFace.HEADS).length;
                    if (headsCount >= 3) allEffects.push(...applyAndLogStatus(enemy, StatusEffectType.RESONANCE, 1, log, state, player));
                    break;
                }
                case 'WARRIOR_PASSIVE_HIGH_AMP_GIVES_BLEED':
                    if ((player.statusEffects[StatusEffectType.AMPLIFY] || 0) >= 5) {
                        allEffects.push(...applyAndLogStatus(player, StatusEffectType.BLEED, 1, log, state, player));
                    }
                    break;
                case 'ROGUE_P_GUN_KATA':
                    const headsCount = playerCoins.filter(c => c.face === CoinFace.HEADS).length;
                    if (headsCount > 0) allEffects.push(...applyAndLogStatus(player, StatusEffectType.PURSUIT, headsCount, log, state, player));
                    break;
                case 'ROGUE_P_STENCH_SPRAYER': {
                    const tailsCount = playerCoins.filter(c => c.face === CoinFace.TAILS).length;
                    if (tailsCount > 0) allEffects.push(...applyAndLogStatus(enemy, StatusEffectType.SHATTER, tailsCount, log, state, player));
                    break;
                }
                case 'ROGUE_P_SMOKE_BOMB':
                    if ((enemy.statusEffects[StatusEffectType.SHATTER] || 0) >= 5) {
                        pushDefenseGain(player, 3, log, allEffects, `[연막탄] 분쇄된 적을 틈타 방어 3을 얻습니다.`);
                    }
                    break;
                case 'TANK_P_BACKHAND_UP': {
                    const tailsCount = playerCoins.filter(c => c.face === CoinFace.TAILS).length;
                    if (tailsCount > 0) allEffects.push(...applyAndLogStatus(player, StatusEffectType.COUNTER, tailsCount, log, state, player));
                    break;
                }
                case 'TANK_P_TAILS_DEF': {
                    const tailsCount = playerCoins.filter(c => c.face === CoinFace.TAILS).length;
                    if (tailsCount > 0) {
                        pushDefenseGain(player, tailsCount, log, allEffects, `[되돌아보기] 뒷면 ${tailsCount}개만큼 방어를 얻습니다.`);
                    }
                    break;
                }
                case 'TANK_P_CHAIN_HEAL': {
                    player.temporaryEffects = player.temporaryEffects || {};
                    if ((player.statusEffects[StatusEffectType.SEAL] || 0) >= 10) {
                        const sealTurns = (Number(player.temporaryEffects.chainSealTurns?.value) || 0) + 1;
                        player.temporaryEffects.chainSealTurns = { value: sealTurns, duration: 999 };
                        if (sealTurns >= 5 && !player.temporaryEffects.chainHealUsed?.value) {
                            player.temporaryEffects.chainHealUsed = { value: true, duration: 999 };
                            pushDefenseGain(player, 5, log, allEffects, `[구속복] 봉인을 오래 유지해 방어 5를 얻습니다.`);
                        }
                    } else {
                        delete player.temporaryEffects.chainSealTurns;
                    }
                    break;
                }
                case 'MAGE_P_FEAR':
                    if ((player.statusEffects[StatusEffectType.CURSE] || 0) >= 3) {
                        const { effects } = applyDamage(player, enemy, 1, log, state, { isFixed: true });
                        allEffects.push(...effects);
                    }
                    break;
                case 'MAGE_P_TAILS_CURSE': {
                    const tailsCount = playerCoins.filter(c => c.face === CoinFace.TAILS).length;
                    if (tailsCount > 0) allEffects.push(...applyAndLogStatus(player, StatusEffectType.CURSE, tailsCount, log, state, player));
                    break;
                }
                case 'MAGE_P_TRIPLE_RESONANCE':
                    if (detectPatterns(playerCoins).some(pattern => pattern.type === PatternType.TRIPLE)) {
                        allEffects.push(...applyAndLogStatus(player, StatusEffectType.RESONANCE, 2, log, state, player));
                    }
                    break;
            }
        });
        triggerMageCurseNuke(state, log, allEffects);
    }

    if (trigger === 'ON_DAMAGE_TAKEN' && payload.character === player) {
        unlockedPatterns.forEach(id => {
            if (id === 'ROGUE_P_KILLER_MINDSET') {
                allEffects.push(...applyAndLogStatus(player, StatusEffectType.PURSUIT, 2, log, state, player));
            }
            if (id === 'TANK_P_SEAL_THORNS') {
                const thornDamage = Math.floor((player.statusEffects[StatusEffectType.SEAL] || 0) * 0.3);
                if (thornDamage > 0) {
                    const { effects } = applyDamage(player, payload.caster, thornDamage, log, state, { isFixed: true });
                    allEffects.push(...effects);
                }
            }
            if (id === 'MAGE_P_WEAK_BLOOD') {
                const sealAmount = Math.floor((payload.damage || 0) / 2);
                if (sealAmount > 0) {
                    allEffects.push(...applyAndLogStatus(payload.caster, StatusEffectType.SEAL, sealAmount, log, state, player));
                }
            }
        });
    }

    if (trigger === 'END_OF_TURN' && payload.character === player) {
        unlockedPatterns.forEach(id => {
             if (id === 'WARRIOR_PASSIVE_NO_ATTACK_GAIN_AMP' && (player.temporaryEffects?.damageDealtThisTurn || 0) <= 0) {
                allEffects.push(...applyAndLogStatus(player, StatusEffectType.AMPLIFY, 2, log, state, player));
             }
             if (id === 'TANK_P_KEEP_DEF' && payload.defense > 0) {
                player.temporaryEffects = player.temporaryEffects || {};
                player.temporaryEffects.keepDefenseNextTurn = { value: payload.defense, duration: 1 };
             }
             if (id === 'TANK_P_DEF_TO_SEAL' && payload.defense > 0) {
                allEffects.push(...applyAndLogStatus(player, StatusEffectType.SEAL, payload.defense, log, state, player));
             }
        });
    }

    return allEffects;
};

// --- CORE ACTION RESOLUTION ---
export const resolvePlayerActions = (state: GameStoreDraft, log: LogFn): EffectPayload[] => {
    const { player, enemy, selectedPatterns, playerCoins } = state;
    if (!player || !enemy) return [];
    let allEffects: EffectPayload[] = [];

    const baseDefenseGain = player.baseDef + getTemporaryNumber(player, 'bonusDef');
    player.temporaryDefense += baseDefenseGain;
    if (state.unlockedPatterns.includes('TANK_P_IMPLANT')) {
        player.temporaryDefense += 6;
    }
    if (hasUnlockedPassive(state, 'WARRIOR_PASSIVE_AMP_GIVES_DEF')) {
        const amplifyDefense = getAmplifyBonus(player, state);
        if (amplifyDefense > 0) {
            pushDefenseGain(player, amplifyDefense, log, allEffects, `[공방일체] 증폭으로 기본 방어 ${amplifyDefense}를 추가합니다.`);
        }
    }

    for (const pattern of selectedPatterns) {
        const ability = getPlayerAbility(player.class, player.acquiredSkills, pattern.type, pattern.face);
        if (ability) {
            log(`${player.name}이(가) [${ability.name}] 사용!`, 'player');
            allEffects.push({ type: 'skill', target: 'player', data: { name: ability.name } });
            const effect = ability.effect(player, enemy, playerCoins, selectedPatterns);
            if (state.unlockedPatterns.includes('TANK_P_UNIQUE_UP') && pattern.type === PatternType.UNIQUE) {
                if (typeof effect.fixedDamage === 'number') effect.fixedDamage += 4;
                if (typeof effect.defense === 'number') effect.defense += 4;
            }
            allEffects.push(...applyAbilityEffect(player, enemy, effect, state, log));
        }
    }
    if (state.unlockedPatterns.includes('TANK_P_COMBO_HEAL') && selectedPatterns.length >= 2) {
        allEffects.push(...applyHeal(player, 5, log));
    }
    if (state.unlockedPatterns.includes('MAGE_P_DEF_TO_SEAL') && player.temporaryDefense > 0) {
        allEffects.push(...applyAndLogStatus(enemy, StatusEffectType.SEAL, player.temporaryDefense, log, state, player));
    }
    return allEffects;
};

export const resolveEnemyActions = (state: GameStoreDraft, log: LogFn): EffectPayload[] => {
    const { player, enemy, enemyIntent } = state;
    if (!player || !enemy || !enemyIntent) return [];
    let allEffects: EffectPayload[] = [];

    enemy.temporaryDefense += enemy.baseDef + getTemporaryNumber(enemy, 'bonusDef');

    for (const key of enemyIntent.sourcePatternKeys) {
        const ability = monsterPatterns[key];
        if (ability) {
            log(`${enemy.name}이(가) [${ability.name}] 사용!`, 'enemy');
            allEffects.push({ type: 'skill', target: 'enemy', data: { name: ability.name } });
            const effect = ability.effect(enemy, player);
            allEffects.push(...applyAbilityEffect(enemy, player, effect, state, log));
        }
    }
    return allEffects;
};


// --- TURN PHASE MANAGEMENT ---
export const processStartOfTurn = (character: Character, opponent: Character, log: LogFn, state: GameStoreDraft): EffectPayload[] => {
    let allEffects: EffectPayload[] = [];
    const curse = character.statusEffects[StatusEffectType.CURSE] || 0;
    if (curse > 0) {
        if ('class' in character && character.temporaryEffects?.debuffAccumulator) {
            character.temporaryEffects.debuffAccumulator.damage += curse;
            log(`[저주] ${character.name} (은)는 피해 ${curse}를 저장했다.`, 'status');
        } else {
             const { effects } = applyDamage(character, character, curse, log, state, { isFixed: true, ignoreDefense: true, isCurse: true });
             allEffects.push(...effects);
        }
        if (character === state.player) {
            triggerMageCurseNuke(state, log, allEffects);
        }
        const remainingCurse = getStatusValue(character, StatusEffectType.CURSE);
        if (remainingCurse > 0) {
            allEffects.push(...applyAndLogStatus(character, StatusEffectType.CURSE, -1, log, state, character));
        }
    }

    if ('class' in character && character.temporaryEffects?.debuffAccumulator) {
        const acc = character.temporaryEffects.debuffAccumulator;
        acc.turns++;
        if (acc.turns >= 5) {
            log(`[저장된 고통] ${character.name}이(가) 누적된 디버프 피해 ${acc.damage}를 받습니다!`, 'status');
            const { effects } = applyDamage(character, character, acc.damage, log, state, { isFixed: true, ignoreDefense: true, isCurse: true });
            allEffects.push(...effects);
            acc.damage = 0;
            acc.turns = 0;
        }
    }

    const resonance = character.statusEffects[StatusEffectType.RESONANCE] || 0;
    if (resonance > 0) {
        character.temporaryEffects = character.temporaryEffects || {};
        const countdown = Number(character.temporaryEffects.resonanceCountdown?.value ?? 2) - 1;
        if (countdown <= 0) {
            log(`[공명] ${character.name}에게 누적 공명 ${resonance}이(가) 폭발합니다.`, 'status');
            const { damageDealt, effects } = applyDamage(character, character, resonance, log, state, { isFixed: true, ignoreDefense: true, isCurse: true });
            allEffects.push(...effects);
            if (character === state.player && state.enemy && hasMonsterPassive(state.enemy, 'PASSIVE_AMPLIFIER_BROAD_INTERFERENCE')) {
                const defenseBreak = Math.min(3, character.temporaryDefense);
                if (defenseBreak > 0) {
                    character.temporaryDefense -= defenseBreak;
                    log(`[광역 간섭] 공명 폭발이 방어 ${defenseBreak}을 무너뜨립니다.`, 'status');
                    allEffects.push({ type: 'defense', target: 'player', data: { amount: -defenseBreak } });
                }
            }
            if (character === state.player && state.enemy && hasMonsterPassive(state.enemy, 'PASSIVE_CHOIR_ECHO_MULTIPLICATION')) {
                allEffects.push(...applyAndLogStatus(character, StatusEffectType.CURSE, 2, log, state, state.enemy));
                log(`[메아리 증식] 공명 폭발 뒤에 저주가 따라붙습니다.`, 'status');
            }
            if (character === state.enemy && state.player && state.unlockedPatterns.includes('WARRIOR_PASSIVE_RESONANCE_HEAL')) {
                allEffects.push(...applyHeal(state.player, Math.floor(damageDealt * 0.2), log));
            }
            const recoilResonance = character === state.player && state.unlockedPatterns.includes('MAGE_P_RESONANCE_RECOIL')
                ? Math.floor(damageDealt / 2)
                : 0;
            allEffects.push(...applyAndLogStatus(character, StatusEffectType.RESONANCE, -resonance, log, state, character, { skipSelfHate: true }));
            if (recoilResonance > 0) {
                allEffects.push(...applyAndLogStatus(character, StatusEffectType.RESONANCE, recoilResonance, log, state, character));
                log(`[반복되는 자책] 공명 피해 일부가 다시 공명으로 남습니다.`, 'status');
            }
        } else {
            character.temporaryEffects.resonanceCountdown = { value: countdown, duration: 999 };
            syncResonanceMirror(character, resonance, countdown);
        }
    }

    if ('class' in character && character.temporaryEffects?.gainDefenseOnTurnStart) {
        pushDefenseGain(character, Number(character.temporaryEffects.gainDefenseOnTurnStart.value || 0), log, allEffects);
        delete character.temporaryEffects.gainDefenseOnTurnStart;
    }

    if ('class' in character && character.temporaryEffects?.gainAmplifyOnTurnStart) {
        allEffects.push(...applyAndLogStatus(character, StatusEffectType.AMPLIFY, character.temporaryEffects.gainAmplifyOnTurnStart.value, log, state, character));
        delete character.temporaryEffects.gainAmplifyOnTurnStart;
    }

    if ('class' in character && character.temporaryEffects?.damageNextTurn) {
        const { effects } = applyDamage(character, opponent, character.temporaryEffects.damageNextTurn.value, log, state, { isFixed: true });
        allEffects.push(...effects);
        delete character.temporaryEffects.damageNextTurn;
    }

    if ('class' in character && character.temporaryEffects?.gainCounterNextTurn) {
        allEffects.push(...applyAndLogStatus(character, StatusEffectType.COUNTER, character.temporaryEffects.gainCounterNextTurn.value, log, state, character));
        delete character.temporaryEffects.gainCounterNextTurn;
    }

    if ('class' in character && character.temporaryEffects?.healAndClearSeal) {
        const seal = character.statusEffects[StatusEffectType.SEAL] || 0;
        allEffects.push(...applyHeal(character, seal, log));
        allEffects.push(...applyAndLogStatus(character, StatusEffectType.SEAL, -seal, log, state, character));
        delete character.temporaryEffects.healAndClearSeal;
    }
    return allEffects;
};


const processCharacterEndOfTurn = (character: Character, opponent: Character, log: LogFn, state: GameStoreDraft): EffectPayload[] => {
    let allEffects: EffectPayload[] = [];
    let pursuit = character.statusEffects[StatusEffectType.PURSUIT] || 0;
    if (pursuit > 0) {
        const isPlayer = character === state.player;
        const usesTemporaryDouble = Boolean('class' in character && character.temporaryEffects?.doublePursuitDamageAndModifiedLoss);
        const hasDualWield = isPlayer && state.unlockedPatterns.includes('ROGUE_P_DUAL_WIELD');
        const hitCount = hasDualWield && !usesTemporaryDouble ? 2 : 1;

        for (let i = 0; i < hitCount; i++) {
            const { damageDealt, effects } = applyDamage(character, opponent, pursuit, log, state, { isFixed: true, isPursuit: true });
            allEffects.push(...effects);
            if ('class' in character && damageDealt > 0 && state.unlockedPatterns.includes('ROGUE_P_HUNT_INSTINCT')) {
                allEffects.push(...applyAndLogStatus(opponent, StatusEffectType.BLEED, 1, log, state, character));
            }
        }

        let loss = 3;
        if ('class' in character && character.temporaryEffects?.doublePursuitDamageAndModifiedLoss) {
            loss = character.temporaryEffects.doublePursuitDamageAndModifiedLoss.value.loss;
        } else if (hasDualWield) {
            loss = 6;
            log(`[쌍권총 마스터] 추적이 한 번 더 발동하고 6 감소합니다.`, 'status');
        }
        character.statusEffects[StatusEffectType.PURSUIT] = Math.max(0, pursuit - loss);

        if (isPlayer && state.unlockedPatterns.includes('ROGUE_P_HUNT_FLOW') && pursuit >= 6 && !character.temporaryEffects?.huntFlowUsed?.value) {
            character.temporaryEffects = character.temporaryEffects || {};
            character.temporaryEffects.huntFlowQueued = { value: true, duration: 999 };
            log(`[사냥의 흐름] 다음 턴 뒷면 하나를 앞면으로 바꿉니다.`, 'status');
        }
    }

    if (character.temporaryEffects?.pursuitReload && 'class' in character) {
        if ((character.statusEffects.PURSUIT || 0) === 0) {
            const tailsCount = state.playerCoins.filter(c => c.face === CoinFace.TAILS).length;
            const pursuitGain = tailsCount * character.temporaryEffects.pursuitReload.value;
            if (pursuitGain > 0) {
                allEffects.push(...applyAndLogStatus(character, StatusEffectType.PURSUIT, pursuitGain, log, state, character));
            }
        }
    }

    if (character.temporaryEffects?.pursuitRefill && 'class' in character) {
        if ((character.statusEffects.PURSUIT || 0) <= 2) {
            const pursuitGain = character.temporaryEffects.pursuitRefill.value;
            if (pursuitGain > 0) {
                log(`[퀵 슬롯] 추적 수치가 낮아 재장전합니다!`, 'player');
                allEffects.push(...applyAndLogStatus(character, StatusEffectType.PURSUIT, pursuitGain, log, state, character));
            }
        }
    }

    if ((character.statusEffects[StatusEffectType.SHATTER] || 0) > 0) {
        allEffects.push(...applyAndLogStatus(character, StatusEffectType.SHATTER, -1, log, state, character));
        if (character === state.enemy && state.player && state.unlockedPatterns.includes('TANK_P_SHATTER_DEF')) {
            state.player.temporaryEffects = state.player.temporaryEffects || {};
            const queuedDefense = getTemporaryNumber(state.player, 'gainDefenseOnTurnStart') + 3;
            state.player.temporaryEffects.gainDefenseOnTurnStart = { value: queuedDefense, duration: 999 };
            log(`[불어오는 돌풍] 분쇄가 사라진 반동으로 다음 턴 방어를 준비합니다.`, 'defense');
        }
    }
    if ((character.statusEffects[StatusEffectType.SEAL] || 0) > 0) {
        allEffects.push(...applyAndLogStatus(character, StatusEffectType.SEAL, -1, log, state, character));
    }

    if (hasMonsterPassive(character, 'PASSIVE_APOSTLE_TWISTED_REGENERATION') && character.currentHp > 0 && character.currentHp <= character.maxHp * 0.5) {
        allEffects.push(...applyHeal(character, 5, log));
        log(`[비틀린 재생] ${character.name}의 조직이 다시 붙습니다.`, 'heal');
    }

    if (character.temporaryEffects) {
        for (const key in character.temporaryEffects) {
            const effect = character.temporaryEffects[key];
            if (effect?.duration) {
                effect.duration -= 1;
                if (effect.duration <= 0) {
                    // Handle lifeAndDeathHeal effect before removing it
                    if (key === 'lifeAndDeathHeal' && 'class' in character) {
                        const curseAmount = character.statusEffects[StatusEffectType.CURSE] || 0;
                        if (curseAmount > 0) {
                            // Heal for curse amount
                            allEffects.push(...applyHeal(character, curseAmount, log));
                            // Remove all curses
                            allEffects.push(...applyAndLogStatus(character, StatusEffectType.CURSE, -curseAmount, log, state, character));
                            log(`[생과 사] ${character.name}이(가) 저주 ${curseAmount}만큼 체력을 회복하고 모든 저주를 정화합니다!`, 'heal');
                        }
                    }
                    delete character.temporaryEffects[key];
                }
            }
        }
    }
    return allEffects;
};

export const processEndOfTurn = (state: GameStoreDraft, log: LogFn): EffectPayload[] => {
    const { player, enemy } = state;
    if (!player || !enemy) return [];
    let allEffects: EffectPayload[] = [];

    const playerDefenseBefore = player.temporaryDefense;
    allEffects.push(...processCharacterEndOfTurn(player, enemy, log, state));
    allEffects.push(...applyPassives(state, 'END_OF_TURN', log, { character: player, defense: playerDefenseBefore }));

    allEffects.push(...processCharacterEndOfTurn(enemy, player, log, state));
    return allEffects;
};

export const setupNextTurn = (state: GameStoreDraft) => {
    const { player, enemy } = state;
    if (!player || !enemy) return;

    const keptDefense = getTemporaryNumber(player, 'keepDefenseNextTurn');
    player.temporaryDefense = keptDefense;
    enemy.temporaryDefense = 0;

    if (player.temporaryEffects) {
        player.temporaryEffects.damageDealtThisTurn = 0;
        player.temporaryEffects.damageTakenThisTurn = 0;
    }
    if (enemy.temporaryEffects) {
        enemy.temporaryEffects.damageDealtThisTurn = 0;
        enemy.temporaryEffects.damageTakenThisTurn = 0;
        delete enemy.temporaryEffects.adaptiveEvolutionTriggers;
    }

    enemy.coins = generateCoins();

    if (enemy.temporaryEffects?.guaranteedFirstCoinHeads?.value) enemy.coins[0].face = CoinFace.HEADS;
    if (enemy.temporaryEffects?.guaranteedFirstCoinTails?.value) enemy.coins[0].face = CoinFace.TAILS;
    if (enemy.temporaryEffects?.tailsChanceUp?.value) {
        const headsChance = Math.max(0.05, 0.5 - enemy.temporaryEffects.tailsChanceUp.value);
        enemy.coins.forEach(coin => {
            if (!coin.locked) {
                coin.face = Math.random() < headsChance ? CoinFace.HEADS : CoinFace.TAILS;
            }
        });
    }
    if (enemy.temporaryEffects?.lockRandomCoinTails?.value) {
        const count = Math.min(enemy.coins.length, Number(enemy.temporaryEffects.lockRandomCoinTails.value));
        [...enemy.coins.keys()]
            .sort(() => Math.random() - 0.5)
            .slice(0, count)
            .forEach(index => {
                enemy.coins[index].face = CoinFace.TAILS;
                enemy.coins[index].locked = true;
            });
    }

    enemy.detectedPatterns = detectPatterns(enemy.coins);
    state.enemyIntent = determineEnemyIntent(enemy);
};


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
