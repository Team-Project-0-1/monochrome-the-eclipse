import {
  StatusEffectType,
  CoinFace,
  AbilityEffect,
  PatternType,
  CharacterClass,
} from '../../types';
import { detectPatterns } from '../gameLogic';
import { statusLabels } from '../combatPresentation';
import { EffectPayload } from '../../store/slices/uiSlice';
import { GameStoreDraft, LogFn, Character } from './types';
import {
  getTemporaryNumber,
  hasUnlockedPassive,
  getStatusValue,
  getTotalDebuffStacks,
  getAmplifyLimit,
  getAmplifyBonus,
  pushDefenseGain,
  getResonanceDelay,
  hasMonsterPassive,
  syncResonanceMirror,
  applyHeal,
} from './helpers';
import { determineEnemyIntent } from './enemyIntent';

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

export const applyAndLogStatus = (
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

export const applyDamage = (caster: Character, target: Character, damage: number, log: LogFn, state: GameStoreDraft, options: { isFixed?: boolean, ignoreDefense?: boolean, isCounterAttack?: boolean, isBleed?: boolean, isCurse?: boolean, isPursuit?: boolean } = {}): { damageDealt: number, effects: EffectPayload[] } => {
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

export const applyMonsterStatePassives = (caster: Character, target: Character, effect: AbilityEffect, state: GameStoreDraft, log: LogFn): EffectPayload[] => {
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

export const tryExecuteTarget = (
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

export const triggerMageCurseNuke = (state: GameStoreDraft, log: LogFn, allEffects: EffectPayload[]) => {
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
