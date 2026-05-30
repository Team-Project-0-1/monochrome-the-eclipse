import {
  EnemyCharacter,
  StatusEffectType,
} from '../../types';
import { monsterData } from '../../data/dataMonsters';
import { EffectPayload } from '../../store/slices/uiSlice';
import { GameStoreDraft, LogFn, Character, MonsterPassiveId } from './types';

// --- HELPER FUNCTIONS ---

export const isEnemyCharacter = (character: Character): character is EnemyCharacter => !('class' in character);

export const getTemporaryNumber = (character: Character, key: string): number => {
    const value = character.temporaryEffects?.[key]?.value;
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

export const hasUnlockedPassive = (state: GameStoreDraft | undefined, passiveId: string): boolean => (
    Boolean(state?.unlockedPatterns.includes(passiveId))
);

export const getStatusValue = (character: Character, type: StatusEffectType): number => (
    character.statusEffects[type] || 0
);

export const getTotalDebuffStacks = (character: Character): number => (
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

export const getAmplifyLimit = (state: GameStoreDraft | undefined, target: Character): number => (
    state?.player === target && hasUnlockedPassive(state, 'WARRIOR_PASSIVE_MAX_AMP_20') ? 20 : 10
);

export const getAmplifyBonusFromUnlocks = (
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

export const getAmplifyBonus = (character: Character, state?: GameStoreDraft): number => (
    getAmplifyBonusFromUnlocks(character, state?.unlockedPatterns ?? [], state?.player === character)
);

export const pushDefenseGain = (
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

export const getResonanceDelay = (
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

export const hasMonsterPassive = (character: Character, passiveId: MonsterPassiveId): character is EnemyCharacter => (
    isEnemyCharacter(character) && Boolean(monsterData[character.key]?.passives?.includes(passiveId))
);

export const resolveStatusTarget = (
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

export const syncResonanceMirror = (target: Character, value: number, countdown: number | undefined) => {
    target.temporaryEffects = target.temporaryEffects || {};
    if (value > 0) {
        target.temporaryEffects.resonance = { name: 'resonance', value, duration: countdown ?? 999, accumulative: true };
    } else {
        delete target.temporaryEffects.resonance;
        delete target.temporaryEffects.resonanceCountdown;
    }
};

export const applyHeal = (target: Character, amount: number, log: LogFn): EffectPayload[] => {
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
