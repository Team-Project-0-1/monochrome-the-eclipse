import {
  StatusEffectType,
  CoinFace,
  AbilityEffect,
  PatternType,
} from '../../types';
import { monsterPatterns } from '../../data/dataMonsters';
import { getPlayerAbility } from '../../data/dataSkills';
import { detectPatterns, generateCoins } from '../gameLogic';
import { EffectPayload } from '../../store/slices/uiSlice';
import { GameStoreDraft, LogFn, Character } from './types';
import {
  getTemporaryNumber,
  hasUnlockedPassive,
  getStatusValue,
  getAmplifyBonus,
  pushDefenseGain,
  hasMonsterPassive,
  resolveStatusTarget,
  syncResonanceMirror,
  applyHeal,
} from './helpers';
import {
  applyAndLogStatus,
  applyDamage,
  applyMonsterStatePassives,
  tryExecuteTarget,
  triggerMageCurseNuke,
  applyPassives,
} from './passives';
import { determineEnemyIntent } from './enemyIntent';

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
