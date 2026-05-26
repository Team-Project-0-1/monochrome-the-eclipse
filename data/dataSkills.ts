import {
  PatternType,
  StatusEffectType,
  CharacterClass,
  SkillUpgradeDefinition,
  CoinFace,
  PlayerCharacter,
  EnemyCharacter,
  Coin,
  AbilityEffect,
  DetectedPattern,
  StatusApplication,
} from "../types";

// Helper for random values in effects
const randomBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const playerAbilities: { [key: string]: any } = {
    [CharacterClass.WARRIOR]: {
        [PatternType.PAIR]: {
            [CoinFace.HEADS]: { name: "진동 타격", description: "피해를 4 줍니다. 증폭을 1 얻습니다.", effect: (): AbilityEffect => ({ fixedDamage: 4, status: { type: StatusEffectType.AMPLIFY, value: 1, target: 'player' } }) },
            [CoinFace.TAILS]: { name: "진동 방어막", description: "방어를 3 얻습니다. 증폭을 1 얻습니다.", effect: (): AbilityEffect => ({ defense: 3, status: { type: StatusEffectType.AMPLIFY, value: 1, target: 'player' } }) },
        },
        [PatternType.TRIPLE]: {
            [CoinFace.HEADS]: { name: "증폭 돌진", description: "피해를 5 줍니다. 스킬 사용 전, 증폭을 1 얻고, 1 턴간 추가 공격력을 2 얻습니다.", effect: (): AbilityEffect => ({ fixedDamage: 5, status: { type: StatusEffectType.AMPLIFY, value: 1, target: 'player' }, temporaryEffect: { name: 'bonusAtk', value: 2, duration: 2 } }) },
            [CoinFace.TAILS]: { name: "진동막", description: "방어를 6 얻습니다. 스킬 사용 전, 증폭을 1 얻고, 1 턴간 추가 방어력을 2 얻습니다.", effect: (): AbilityEffect => ({ defense: 6, status: { type: StatusEffectType.AMPLIFY, value: 1, target: 'player' }, temporaryEffect: { name: 'bonusDef', value: 2, duration: 2 } }) },
        },
        [PatternType.QUAD]: {
            [CoinFace.HEADS]: { name: "위상 붕괴", description: "피해를 8 줍니다. 스킬 사용 전, 현재 증폭 수치가 10 이면, 피해를 8 + 증폭 만큼 주고, 모든 증폭을 잃습니다.", effect: (p: PlayerCharacter): AbilityEffect => {
                const amp = p.statusEffects.AMPLIFY || 0;
                if(amp >= 10) return { fixedDamage: 8 + amp, statusCost: { type: StatusEffectType.AMPLIFY, value: amp } };
                return { fixedDamage: 8 };
            }},
            [CoinFace.TAILS]: { name: "증폭 유지 파동", description: "방어를 5 얻습니다. 스킬 사용 전, 현재 증폭 수치가 10 이면, 방어를 5 + 증폭 만큼 얻고, 모든 증폭을 잃습니다.", effect: (p: PlayerCharacter): AbilityEffect => {
                const amp = p.statusEffects.AMPLIFY || 0;
                if(amp >= 10) return { defense: 5 + amp, statusCost: { type: StatusEffectType.AMPLIFY, value: amp } };
                return { defense: 5 };
            }},
        },
        [PatternType.PENTA]: {
            [CoinFace.HEADS]: { name: "해방", description: "피해를 10 줍니다. 스킬 사용 전, 현재 증폭 수치가 10 이면, 피해를 10 + (증폭*2) 만큼 주고, 모든 증폭을 잃습니다.", effect: (p: PlayerCharacter): AbilityEffect => {
                const amp = p.statusEffects.AMPLIFY || 0;
                if(amp >= 10) return { fixedDamage: 10 + (amp * 2), statusCost: { type: StatusEffectType.AMPLIFY, value: amp } };
                return { fixedDamage: 10 };
            }},
            [CoinFace.TAILS]: { name: "초진동 갑주", description: "방어를 8 얻습니다. 스킬 사용 전, 현재 증폭 수치가 10 이면, 방어를 10 얻고, 1턴간 추가 공격력을 증폭 만큼 얻습니다. 사용 후 모든 증폭을 잃습니다.", effect: (p: PlayerCharacter): AbilityEffect => {
                const amp = p.statusEffects.AMPLIFY || 0;
                if(amp >= 10) return { defense: 10, temporaryEffect: { name: 'bonusAtk', value: amp, duration: 2 }, statusCost: { type: StatusEffectType.AMPLIFY, value: amp } };
                return { defense: 8 };
            }},
        },
        [PatternType.UNIQUE]: {
            [CoinFace.HEADS]: { name: "공진", description: "피해를 4 줍니다. 상대방에게 공명을 1 부여합니다.", effect: (): AbilityEffect => ({ fixedDamage: 4, status: { type: StatusEffectType.RESONANCE, value: 1, target: 'enemy' } }) },
            [CoinFace.TAILS]: { name: "충격 전달", description: "방어를 4 얻습니다. 다음 턴 시작 시 첫번째 동전을 앞면으로 만듭니다.", effect: (): AbilityEffect => ({ defense: 4, temporaryEffect: { name: 'firstCoinHeads', value: true, duration: 2 } }) },
        },
        [PatternType.AWAKENING]: {
            [CoinFace.HEADS]: { name: "파멸의 메아리", description: "피해를 12 줍니다. 스킬 사용 전, 현재 증폭 수치가 10 이면, 피해를 12 + 앞면 개수 + (증폭*4) 만큼 주고, 모든 증폭을 잃습니다.", effect: (p: PlayerCharacter, e: EnemyCharacter, c: Coin[] = []): AbilityEffect => {
                const amp = p.statusEffects.AMPLIFY || 0;
                if(amp >= 10) {
                    const headsCount = c.filter(cn => cn.face === CoinFace.HEADS).length || 0;
                    return { fixedDamage: 12 + headsCount + (amp * 4), statusCost: { type: StatusEffectType.AMPLIFY, value: amp } };
                }
                return { fixedDamage: 12 };
            }},
            [CoinFace.TAILS]: { name: "생명의 메아리", description: "방어를 10 얻습니다. 스킬 사용 전, 현재 증폭 수치가 10 이면, 방어를 10 얻고, 체력을 5 + 뒷면 개수 + (증폭)만큼 회복합니다. 사용 후 모든 증폭을 잃습니다.", effect: (p: PlayerCharacter, e: EnemyCharacter, c: Coin[] = []): AbilityEffect => {
                const amp = p.statusEffects.AMPLIFY || 0;
                if(amp >= 10) {
                    const tailsCount = c.filter(cn => cn.face === CoinFace.TAILS).length || 0;
                    return { defense: 10, heal: 5 + tailsCount + amp, statusCost: { type: StatusEffectType.AMPLIFY, value: amp } };
                }
                return { defense: 10 };
            }},
        },
    },
    [CharacterClass.ROGUE]: {
        [PatternType.PAIR]: {
            [CoinFace.HEADS]: { name: "추적 탄환", description: "피해를 4 줍니다. 추적을 3 얻습니다.", effect: (): AbilityEffect => ({ fixedDamage: 4, status: { type: StatusEffectType.PURSUIT, value: 3, target: 'player' } }) },
            [CoinFace.TAILS]: { name: "가로막기", description: "방어를 3 얻습니다. 추적을 1 얻습니다.", effect: (): AbilityEffect => ({ defense: 3, status: { type: StatusEffectType.PURSUIT, value: 1, target: 'player' } }) },
        },
        [PatternType.TRIPLE]: {
            [CoinFace.HEADS]: { name: "집요한 일격", description: "피해를 3 만큼 2 번 반복합니다. 추적을 2 얻습니다.", effect: (): AbilityEffect => ({ multiHit: { count: 2, damage: 3 }, status: { type: StatusEffectType.PURSUIT, value: 2, target: 'player' } }) },
            [CoinFace.TAILS]: { name: "긴급 후퇴", description: "방어를 4 얻습니다. 추적 2 당 추가 방어력을 1 얻습니다.", effect: (p: PlayerCharacter): AbilityEffect => ({ defense: 4 + Math.floor((p.statusEffects.PURSUIT || 0) / 2) }) },
        },
        [PatternType.QUAD]: {
            [CoinFace.HEADS]: { name: "이동 사격", description: "피해를 10 줍니다. 턴 종료 시, 2 배의 추적 피해로 주고, 수치를 6 잃습니다.", effect: (): AbilityEffect => ({ fixedDamage: 10, temporaryEffect: { name: 'doublePursuitDamageAndModifiedLoss', value: { multiplier: 2, loss: 6 }, duration: 2 } }) },
            [CoinFace.TAILS]: { name: "예측 기동", description: "방어를 5 얻습니다. 상대가 공격 스킬을 사용한 경우 추적을 2 번 반복합니다.", effect: (): AbilityEffect => ({ defense: 5, temporaryEffect: { name: 'pursuitOnEnemyAttack', value: 2, duration: 2 } }) },
        },
        [PatternType.PENTA]: {
            [CoinFace.HEADS]: { name: "연사 본능", description: "피해를 8 줍니다. 추적을 5 얻습니다. 턴 종료 시, 1 턴간 추적을 3 번 반복합니다", effect: (): AbilityEffect => ({ fixedDamage: 8, status: { type: StatusEffectType.PURSUIT, value: 5, target: 'player' }, temporaryEffect: { name: 'pursuitTriggerCount', value: 3, duration: 2 } }) },
            [CoinFace.TAILS]: { name: "퀵 슬롯", description: "방어를 7 얻습니다. 턴 종료 시, 추적이 2 이하인 경우 추적을 6 얻습니다.", effect: (): AbilityEffect => ({ defense: 7, temporaryEffect: { name: 'pursuitRefill', value: 6, duration: 2 } }) },
        },
        [PatternType.UNIQUE]: {
            [CoinFace.HEADS]: { name: "다리 걸기", description: "피해를 4 줍니다. 분쇄를 2 부여합니다.", effect: (): AbilityEffect => ({ fixedDamage: 4, status: { type: StatusEffectType.SHATTER, value: 2, target: 'enemy' } }) },
            [CoinFace.TAILS]: { name: "손놀림", description: "방어를 4 얻습니다. 다음 턴에 앞면 확률이 15% 증가합니다.", effect: (): AbilityEffect => ({ defense: 4, temporaryEffect: { name: 'headsChanceUp', value: 0.15, duration: 2 } }) },
        },
        [PatternType.AWAKENING]: {
            [CoinFace.HEADS]: { name: "전탄 사격", description: "피해를 5만큼 (추적*2) 번 반복합니다. 턴 종료 시, 1 턴간 추적을 5 번 반복하고, 모든 추적을 잃습니다.", effect: (p: PlayerCharacter): AbilityEffect => ({ multiHit: { count: ((p.statusEffects.PURSUIT || 0) * 2), damage: 5 }, temporaryEffect: { name: 'pursuitAnnihilation', value: { triggers: 5 }, duration: 2 } }) },
            [CoinFace.TAILS]: { name: "탄창 교체", description: "방어를 9 얻습니다. 턴 종료 시, 추적이 0 인 경우 뒷면 개수*3 만큼 얻습니다.", effect: (): AbilityEffect => ({ defense: 9, temporaryEffect: { name: 'pursuitReload', value: 3, duration: 2 } }) },
        }
    },
    [CharacterClass.TANK]: {
        [PatternType.PAIR]: {
            [CoinFace.HEADS]: { name: "반격 태세", description: "피해를 5 줍니다. 반격을 2 얻습니다.", effect: (): AbilityEffect => ({ fixedDamage: 5, status: { type: StatusEffectType.COUNTER, value: 2, target: 'player' } }) },
            [CoinFace.TAILS]: { name: "아래막기", description: "방어를 6 얻습니다. 반격을 3 얻습니다.\n[연계] 뒷면 3연 스킬과 함께 사용 시, 반격을 4 추가로 얻습니다.", effect: (p, e, c, s = []): AbilityEffect => {
                const statuses: StatusApplication[] = [{ type: StatusEffectType.COUNTER, value: 3, target: 'player' }];
                const hasCombo = s.some(pattern => pattern.type === PatternType.TRIPLE && pattern.face === CoinFace.TAILS);
                if (hasCombo) {
                    statuses.push({ type: StatusEffectType.COUNTER, value: 4, target: 'player' });
                }
                return { defense: 6, status: statuses };
            }},
        },
        [PatternType.UNIQUE]: {
            [CoinFace.HEADS]: { name: "기류 예측", description: "피해를 4 줍니다. 스킬 사용 후, 반격을 소유 중이면 1턴간 자신의 중앙 동전이 앞면으로 고정됩니다.", effect: (p: PlayerCharacter): AbilityEffect => {
                const effect: AbilityEffect = { fixedDamage: 4 };
                if ((p.statusEffects.COUNTER || 0) > 0) {
                    effect.temporaryEffect = { name: 'lockCenterCoin', value: 'HEADS', duration: 2 };
                }
                return effect;
            }},
            [CoinFace.TAILS]: { name: "재정비", description: "방어를 4 얻습니다. 스킬 사용 후, 반격이 없는 경우 1턴간 자신의 중앙 동전이 뒷면으로 고정됩니다.", effect: (p: PlayerCharacter): AbilityEffect => {
                const effect: AbilityEffect = { defense: 4 };
                if (!p.statusEffects.COUNTER || p.statusEffects.COUNTER === 0) {
                    effect.temporaryEffect = { name: 'lockCenterCoin', value: 'TAILS', duration: 2 };
                }
                return effect;
            }},
        },
        [PatternType.TRIPLE]: {
            [CoinFace.HEADS]: { name: "흘려치기", description: "피해를 6 줍니다.\n[연계] 뒷면 2연 스킬과 함께 사용 시, 피해 대신 (현재 피해+연계한 스킬 방어)만큼 반격을 얻습니다.", effect: (p, e, c, s = []): AbilityEffect => {
                const hasCombo = s.some(pattern => pattern.type === PatternType.PAIR && pattern.face === CoinFace.TAILS);
                if (hasCombo) {
                    return { status: { type: StatusEffectType.COUNTER, value: 6 + 6, target: 'player' } }; // 6 from this skill's damage, 6 from 아래막기's defense
                }
                return { fixedDamage: 6 };
            }},
            [CoinFace.TAILS]: { name: "역이용", description: "방어를 6 얻습니다.\n[연계] 앞면 2연 스킬과 함께 사용 시, 연계한 스킬의 피해량만큼 반격을 얻습니다.", effect: (p, e, c, s = []): AbilityEffect => {
                const effect: AbilityEffect = { defense: 6 };
                const hasCombo = s.some(pattern => pattern.type === PatternType.PAIR && pattern.face === CoinFace.HEADS);
                if (hasCombo) {
                    effect.status = { type: StatusEffectType.COUNTER, value: 5, target: 'player' }; // 5 from 반격 태세's damage
                }
                return effect;
            }},
        },
        [PatternType.QUAD]: {
            [CoinFace.HEADS]: { name: "안면강타", description: "피해를 7 줍니다.\n[연계] 뒷면 스킬과 함께 사용 시, 2턴간 반격을 4 얻습니다.", effect: (p, e, c, s = []): AbilityEffect => {
                const effect: AbilityEffect = { fixedDamage: 7 };
                const hasCombo = s.some(pattern => pattern.face === CoinFace.TAILS);
                if (hasCombo) {
                    effect.status = { type: StatusEffectType.COUNTER, value: 4, target: 'player' }; // The effect does not specify duration, but it is likely temporary
                }
                return effect;
            }},
            [CoinFace.TAILS]: { name: "자세 유지", description: "방어를 8 얻습니다.\n[연계] 앞면 유일 스킬과 함께 사용 시, 3턴간 반격 수치가 유지됩니다.", effect: (p, e, c, s = []): AbilityEffect => {
                const effect: AbilityEffect = { defense: 8 };
                const hasCombo = s.some(pattern => pattern.type === PatternType.UNIQUE && pattern.face === CoinFace.HEADS);
                if (hasCombo) {
                    effect.temporaryEffect = { name: 'counterLock', value: true, duration: 4 };
                }
                return effect;
            }},
        },
        [PatternType.PENTA]: {
            [CoinFace.HEADS]: { name: "되갚기", description: "피해를 10 줍니다. 스킬 사용 후, 자신이 받은 피해 만큼 즉시 반격을 얻습니다.", effect: (): AbilityEffect => ({ fixedDamage: 10, temporaryEffect: { name: 'gainCounterFromDamageTaken', value: true, duration: 2 }})},
            [CoinFace.TAILS]: { name: "재기의 바람", description: "방어를 10 얻습니다. 다음 턴 시작 시, 반격을 10 얻습니다.", effect: (): AbilityEffect => ({ defense: 10, temporaryEffect: { name: 'gainCounterNextTurn', value: 10, duration: 2 }})},
        },
        [PatternType.AWAKENING]: {
            [CoinFace.HEADS]: { name: "피의 복수", description: "피해를 12 + 현재 반격*2 만큼 주고, 모든 반격을 잃습니다.", effect: (p: PlayerCharacter): AbilityEffect => ({ fixedDamage: 12 + (p.statusEffects.COUNTER || 0) * 2, statusCost: { type: StatusEffectType.COUNTER, value: p.statusEffects.COUNTER || 0 } })},
            [CoinFace.TAILS]: { name: "폭풍의 눈", description: "방어를 12 얻고, 3턴간 반격 수치가 유지되고, 디버프를 무시합니다.", effect: (): AbilityEffect => ({ defense: 12, temporaryEffect: { name: 'counterLockAndDebuffImmunity', value: true, duration: 4 }})},
        }
    },
    [CharacterClass.MAGE]: {
        [PatternType.PAIR]: {
            [CoinFace.HEADS]: { name: "저주의 흔적", description: "피해를 4 줍니다. 상대방에게 저주를 2 부여합니다.", effect: (): AbilityEffect => ({ fixedDamage: 4, status: { type: StatusEffectType.CURSE, value: 2, target: 'enemy' } }) },
            [CoinFace.TAILS]: { name: "혐오", description: "방어를 4 얻습니다. 상대방에게 저주를 1 부여합니다.", effect: (): AbilityEffect => ({ defense: 4, status: { type: StatusEffectType.CURSE, value: 1, target: 'enemy' } }) },
        },
        [PatternType.UNIQUE]: {
            [CoinFace.HEADS]: { name: "저주 악화", description: "피해를 4 줍니다. 스킬 사용 후, 1턴간 상대방의 무작위 동전 1개를 뒷면으로 고정시킵니다.", effect: (): AbilityEffect => ({ fixedDamage: 4, enemyTemporaryEffect: { name: 'lockRandomCoinTails', value: 1, duration: 2 } }) },
            [CoinFace.TAILS]: { name: "저주의 중심", description: "방어를 4 + 자신의 저주 만큼 얻고, 1턴간 자신의 중앙 동전을 앞면으로 고정 시킵니다.", effect: (p: PlayerCharacter): AbilityEffect => ({ defense: 4 + (p.statusEffects.CURSE || 0), temporaryEffect: { name: 'lockCenterCoin', value: 'HEADS', duration: 2 } }) },
        },
        [PatternType.TRIPLE]: {
            [CoinFace.HEADS]: { name: "퍼붓는 저주", description: "현재 저주% 확률(소수점 버림)로 피해를 저주*3 만큼 줍니다. 실패 시 피해를 6 줍니다.", effect: (p: PlayerCharacter): AbilityEffect => {
                const curse = p.statusEffects.CURSE || 0;
                const chance = curse / 100;
                if (Math.random() < chance) {
                    return { fixedDamage: curse * 3 };
                }
                return { fixedDamage: 6 };
            }},
            [CoinFace.TAILS]: { name: "자기 투영", description: "방어를 5 얻습니다. 스킬 사용 후, 자신의 방어가 파괴될 경우, 자신과 상대방에게 저주 피해가 발생하고, 모든 저주를 잃습니다.", effect: (): AbilityEffect => ({ defense: 5, temporaryEffect: { name: 'curseOnBreak', value: true, duration: 2 } }) },
        },
        [PatternType.QUAD]: {
            [CoinFace.HEADS]: { name: "눈 먼 기도", description: "피해를 6 줍니다. 스킬 사용 후, 20% 확률로 피해를 6만큼 2번 반복합니다.", effect: (): AbilityEffect => {
                let hits = 1;
                if (Math.random() < 0.20) hits++;
                if (Math.random() < 0.20) hits++;
                if (hits > 1) {
                    return { multiHit: { count: hits, damage: 6 } };
                }
                return { fixedDamage: 6 };
            }},
            [CoinFace.TAILS]: { name: "혐오의 파동", description: "방어를 6 얻습니다. 자신에게 저주를 2 부여합니다. 다음 턴 시작 시, 피해를 자신의 저주*2 만큼 줍니다.", effect: (p: PlayerCharacter): AbilityEffect => {
                const currentCurse = p.statusEffects.CURSE || 0;
                return {
                    defense: 6,
                    status: { type: StatusEffectType.CURSE, value: 2, target: 'enemy' },
                    temporaryEffect: { name: 'damageNextTurn', value: (currentCurse + 2) * 2, duration: 2 }
                }
            }},
        },
        [PatternType.PENTA]: {
            [CoinFace.HEADS]: { name: "고행의 사슬", description: "피해를 6 줍니다. 스킬 사용 후, 적 방어를 파괴할 경우, 자신의 모든 저주를 상대방에게 전달합니다.", effect: (): AbilityEffect => ({ fixedDamage: 6, temporaryEffect: { name: 'transferCurseOnBreak', value: true, duration: 2 } })},
            [CoinFace.TAILS]: { name: "증오", description: "방어를 6 얻습니다. 스킬 사용 후, 2턴간 자신의 저주 만큼 자신과 상대방에게 피해를 받습니다.", effect: (p: PlayerCharacter): AbilityEffect => {
                const curseAmount = p.statusEffects.CURSE || 0;
                return {
                    defense: 6,
                    temporaryEffect: { name: 'mutualCurseDamage', value: curseAmount, duration: 3 },
                    enemyTemporaryEffect: { name: 'mutualCurseDamage', value: curseAmount, duration: 3 }
                }
            }},
        },
        [PatternType.AWAKENING]: {
            [CoinFace.HEADS]: { name: "몰아치는 저주", description: "피해를 자신의 저주 만큼 줍니다. 현재 저주*5% 확률로 피해를 실패할 때 까지 반복하고, 모든 저주를 잃습니다.", effect: (p: PlayerCharacter): AbilityEffect => {
                const curse = p.statusEffects.CURSE || 0;
                let hits = 1;
                const chance = Math.min(curse * 0.05, 0.95); // Cap chance
                while(Math.random() < chance && hits < 10) { // Add hit cap to prevent infinite loops
                    hits++;
                }
                return { multiHit: { count: hits, damage: curse }, statusCost: { type: StatusEffectType.CURSE, value: curse } };
            }},
            [CoinFace.TAILS]: { name: "생과 사", description: "방어를 10 얻습니다. 자신에게 저주를 15 부여합니다. 2 턴 뒤, 자신의 저주 만큼 체력을 회복하고, 자신에게 걸린 모든 저주를 잃습니다.", effect: (): AbilityEffect => ({
                defense: 10,
                status: { type: StatusEffectType.CURSE, value: 15, target: 'player' },
                temporaryEffect: { name: 'lifeAndDeathHeal', value: true, duration: 3 }
            })},
        }
    }
};

export const playerSkillUnlocks: { [key in CharacterClass]?: { [id: string]: SkillUpgradeDefinition } } = {
  [CharacterClass.WARRIOR]: {
    // Resonance Build
    'WARRIOR_RES_P_H': { id: 'WARRIOR_RES_P_H', name: '공명 주입', description: '피해를 5 줍니다. 공명을 2 부여합니다.', cost: { echoRemnants: 50 }, replaces: { type: PatternType.PAIR, face: CoinFace.HEADS }, effect: (): AbilityEffect => ({ fixedDamage: 5, enemyTemporaryEffect: { name: 'resonance', value: 2, duration: 3, accumulative: true } })},
    'WARRIOR_RES_P_T': { id: 'WARRIOR_RES_P_T', name: '잔류 방어', description: '방어를 2 얻습니다. 공명을 1 부여합니다.', cost: { echoRemnants: 50 }, replaces: { type: PatternType.PAIR, face: CoinFace.TAILS }, effect: (): AbilityEffect => ({ defense: 2, enemyTemporaryEffect: { name: 'resonance', value: 1, duration: 3, accumulative: true } })},
    'WARRIOR_RES_U_H': { id: 'WARRIOR_RES_U_H', name: '두통 유발 타격', description: '피해를 4 줍니다. 다음 턴 시작 시 공명 수치만큼 앞면 확률이 5% 증가합니다.', cost: { echoRemnants: 60 }, replaces: { type: PatternType.UNIQUE, face: CoinFace.HEADS }, effect: (p, e): AbilityEffect => ({ fixedDamage: 4, temporaryEffect: { name: 'headsChanceUp', value: (e.temporaryEffects?.resonance?.value || 0) * 0.05, duration: 2 } })},
    'WARRIOR_RES_U_T': { id: 'WARRIOR_RES_U_T', name: '재충전', description: '방어를 4 얻습니다. 다음 턴 시작 시 증폭을 2 얻습니다.', cost: { echoRemnants: 60 }, replaces: { type: PatternType.UNIQUE, face: CoinFace.TAILS }, effect: (): AbilityEffect => ({ defense: 4, temporaryEffect: { name: 'gainAmplifyOnTurnStart', value: 2, duration: 2 } })},
    'WARRIOR_RES_T_H': { id: 'WARRIOR_RES_T_H', name: '삼중 타격', description: '피해를 2 만큼 3번 줍니다. 스킬 사용 전, 증폭을 2 소모할 경우 마지막 타격에 공명을 3 부여합니다.', cost: { echoRemnants: 70 }, replaces: { type: PatternType.TRIPLE, face: CoinFace.HEADS }, effect: (p: PlayerCharacter): AbilityEffect => {
        const effect: AbilityEffect = { multiHit: { count: 3, damage: 2 } };
        if ((p.statusEffects.AMPLIFY || 0) >= 2) {
            effect.statusCost = { type: StatusEffectType.AMPLIFY, value: 2 };
            effect.enemyTemporaryEffect = { name: 'resonance', value: 3, duration: 3, accumulative: true };
        }
        return effect;
    }},
    'WARRIOR_RES_T_T': { id: 'WARRIOR_RES_T_T', name: '반복 파동', description: '방어를 4 얻습니다. 스킬 사용 전, 증폭을 2 소모할 경우 적에게 공명을 2 부여합니다.', cost: { echoRemnants: 70 }, replaces: { type: PatternType.TRIPLE, face: CoinFace.TAILS }, effect: (p): AbilityEffect => {
        const effect: AbilityEffect = { defense: 4 };
        if ((p.statusEffects.AMPLIFY || 0) >= 2) {
            effect.statusCost = { type: StatusEffectType.AMPLIFY, value: 2 };
            effect.enemyTemporaryEffect = { name: 'resonance', value: 2, duration: 3, accumulative: true };
        }
        return effect;
    }},
    'WARRIOR_RES_Q_H': { id: 'WARRIOR_RES_Q_H', name: '연쇄 공명', description: '피해를 9 줍니다. 스킬 사용 전, 증폭을 4 소모할 경우 적에게 공명을 4 부여합니다.', cost: { echoRemnants: 80 }, replaces: { type: PatternType.QUAD, face: CoinFace.HEADS }, effect: (p): AbilityEffect => {
        const effect: AbilityEffect = { fixedDamage: 9 };
        if ((p.statusEffects.AMPLIFY || 0) >= 4) {
            effect.statusCost = { type: StatusEffectType.AMPLIFY, value: 4 };
            effect.enemyTemporaryEffect = { name: 'resonance', value: 4, duration: 3, accumulative: true };
        }
        return effect;
    }},
    'WARRIOR_RES_Q_T': { id: 'WARRIOR_RES_Q_T', name: '일시 정지', description: '방어를 7 얻습니다. 증폭을 2 소모할 경우 적에게 공명을 4 부여합니다.', cost: { echoRemnants: 80 }, replaces: { type: PatternType.QUAD, face: CoinFace.TAILS }, effect: (p): AbilityEffect => {
        const effect: AbilityEffect = { defense: 7 };
        if ((p.statusEffects.AMPLIFY || 0) >= 2) {
            effect.statusCost = { type: StatusEffectType.AMPLIFY, value: 2 };
            effect.enemyTemporaryEffect = { name: 'resonance', value: 4, duration: 3, accumulative: true };
        }
        return effect;
    }},
    'WARRIOR_RES_PENTA_H': { id: 'WARRIOR_RES_PENTA_H', name: '초진동 타격', description: '피해를 공명 수치만큼 줍니다. 스킬 사용 전, 증폭을 6 소모할 경우 피해를 2배로 줍니다.', cost: { echoRemnants: 90 }, replaces: { type: PatternType.PENTA, face: CoinFace.HEADS }, effect: (p, e): AbilityEffect => {
        const resonanceValue = e.temporaryEffects?.resonance?.value || 0;
        const effect: AbilityEffect = { fixedDamage: resonanceValue };
        if ((p.statusEffects.AMPLIFY || 0) >= 6) {
            effect.fixedDamage = resonanceValue * 2;
            effect.statusCost = { type: StatusEffectType.AMPLIFY, value: 6 };
        }
        return effect;
    }},
    'WARRIOR_RES_PENTA_T': { id: 'WARRIOR_RES_PENTA_T', name: '위상 차단', description: '방어를 10 얻습니다. 증폭을 4 소모할 경우 상대방의 공명을 2 턴 더 지속시킵니다.', cost: { echoRemnants: 90 }, replaces: { type: PatternType.PENTA, face: CoinFace.TAILS }, effect: (p): AbilityEffect => {
        const effect: AbilityEffect = { defense: 10 };
        if ((p.statusEffects.AMPLIFY || 0) >= 4) {
            effect.statusCost = { type: StatusEffectType.AMPLIFY, value: 4 };
            effect.enemyTemporaryEffect = { name: 'resonance_extend', value: 2, duration: 1 };
        }
        return effect;
    }},
    'WARRIOR_RES_AWA_H': { id: 'WARRIOR_RES_AWA_H', name: '영속의 파동', description: '피해를 7 + 앞면 개수 + (공명*2) 만큼 주고, 모든 공명을 잃습니다.', cost: { echoRemnants: 100 }, replaces: { type: PatternType.AWAKENING, face: CoinFace.HEADS }, effect: (p: PlayerCharacter, e: EnemyCharacter, c: Coin[] = []): AbilityEffect => ({ fixedDamage: 7 + (c.filter(cn => cn.face === CoinFace.HEADS).length || 0) + (e.temporaryEffects?.resonance?.value || 0) * 2, enemyTemporaryEffect: { name: 'resonance_clear', value: 0, duration: 1 } })},
    'WARRIOR_RES_AWA_T': { id: 'WARRIOR_RES_AWA_T', name: '완전 공명', description: '현재 적이 보유한 공명 + 뒷면 개수 만큼 방어를 얻고, 모든 공명을 잃습니다.', cost: { echoRemnants: 100 }, replaces: { type: PatternType.AWAKENING, face: CoinFace.TAILS }, effect: (p: PlayerCharacter, e: EnemyCharacter, c: Coin[] = []): AbilityEffect => ({ defense: (e.temporaryEffects?.resonance?.value || 0) + (c.filter(cn => cn.face === CoinFace.TAILS).length || 0), enemyTemporaryEffect: { name: 'resonance_clear', value: 0, duration: 1 } })},

    // Self-Bleed Build
    'WARRIOR_BLEED_P_H': { id: 'WARRIOR_BLEED_P_H', name: '이명 타격', description: '피해를 4 줍니다. 자신에게 출혈을 2 부여합니다.', cost: { echoRemnants: 50 }, replaces: { type: PatternType.PAIR, face: CoinFace.HEADS }, effect: (): AbilityEffect => ({ fixedDamage: 4, status: { type: StatusEffectType.BLEED, value: 2, target: 'player' } })},
    'WARRIOR_BLEED_P_T': { id: 'WARRIOR_BLEED_P_T', name: '소음 방벽', description: '방어를 4 얻습니다. 자신에게 출혈을 1 부여합니다.', cost: { echoRemnants: 50 }, replaces: { type: PatternType.PAIR, face: CoinFace.TAILS }, effect: (): AbilityEffect => ({ defense: 4, status: { type: StatusEffectType.BLEED, value: 1, target: 'player' } })},
    'WARRIOR_BLEED_U_H': { id: 'WARRIOR_BLEED_U_H', name: '낮은 진동', description: '피해를 4 줍니다. 다음 턴 시작 시 뒷면 확률이 15% 증가합니다.', cost: { echoRemnants: 60 }, replaces: { type: PatternType.UNIQUE, face: CoinFace.HEADS }, effect: (): AbilityEffect => ({ fixedDamage: 4, temporaryEffect: { name: 'tailsChanceUp', value: 0.15, duration: 2 } })},
    'WARRIOR_BLEED_U_T': { id: 'WARRIOR_BLEED_U_T', name: '흩어지는 소리', description: '방어를 4 얻습니다. 다음 턴에 뒷면 3 개 이상이면 임의의 뒷면 1 개를 앞면으로 뒤집습니다.', cost: { echoRemnants: 60 }, replaces: { type: PatternType.UNIQUE, face: CoinFace.TAILS }, effect: (): AbilityEffect => ({ defense: 4, temporaryEffect: { name: 'tailsToHeads', value: 1, duration: 2 } })},
    'WARRIOR_BLEED_T_H': { id: 'WARRIOR_BLEED_T_H', name: '내부 파열', description: '피해를 6 줍니다. 스킬 사용 전, 자신의 출혈이 3 이상인 경우 2 턴간 추가 공격력을 4 얻습니다.', cost: { echoRemnants: 70 }, replaces: { type: PatternType.TRIPLE, face: CoinFace.HEADS }, effect: (p): AbilityEffect => {
        const effect: AbilityEffect = { fixedDamage: 6 };
        if ((p.statusEffects.BLEED || 0) >= 3) {
            effect.temporaryEffect = { name: 'bonusAtk', value: 4, duration: 3 };
        }
        return effect;
    }},
    'WARRIOR_BLEED_T_T': { id: 'WARRIOR_BLEED_T_T', name: '비탄', description: '방어를 6 얻습니다. 자신에게 출혈을 5 부여하고, 2 턴간 자신의 출혈 피해가 2% 증가합니다.', cost: { echoRemnants: 70 }, replaces: { type: PatternType.TRIPLE, face: CoinFace.TAILS }, effect: (): AbilityEffect => ({ defense: 6, status: { type: StatusEffectType.BLEED, value: 5, target: 'player' }, temporaryEffect: { name: 'bleedDamageUp', value: 0.02, duration: 3 } })},
    'WARRIOR_BLEED_Q_H': { id: 'WARRIOR_BLEED_Q_H', name: '날카로운 파동', description: '피해를 8 줍니다. 스킬 사용 전, 자신의 출혈을 5 소모할 경우 3 턴간 증폭을 1 얻습니다.', cost: { echoRemnants: 80 }, replaces: { type: PatternType.QUAD, face: CoinFace.HEADS }, effect: (p): AbilityEffect => {
        const effect: AbilityEffect = { fixedDamage: 8 };
        if ((p.statusEffects.BLEED || 0) >= 5) {
            effect.statusCost = { type: StatusEffectType.BLEED, value: 5 };
            effect.temporaryEffect = { name: 'gainAmplifyOnTurnEnd', value: 1, duration: 4 };
        }
        return effect;
    }},
    'WARRIOR_BLEED_Q_T': { id: 'WARRIOR_BLEED_Q_T', name: '목을 찢는 비명', description: '방어를 8 얻습니다. 스킬 사용 전, 출혈이 5 이상이라면 출혈*2 만큼 추가 방어를 얻습니다.', cost: { echoRemnants: 80 }, replaces: { type: PatternType.QUAD, face: CoinFace.TAILS }, effect: (p): AbilityEffect => ({ defense: 8 + ((p.statusEffects.BLEED || 0) >= 5 ? (p.statusEffects.BLEED || 0) * 2 : 0) })},
    'WARRIOR_BLEED_PENTA_H': { id: 'WARRIOR_BLEED_PENTA_H', name: '귀를 찢는 나팔', description: '피해를 12 줍니다. 스킬 사용 전, 자신의 출혈만큼 추가 공격력을 얻고, 모든 출혈을 잃습니다.', cost: { echoRemnants: 90 }, replaces: { type: PatternType.PENTA, face: CoinFace.HEADS }, effect: (p: PlayerCharacter): AbilityEffect => ({ fixedDamage: 12 + (p.statusEffects.BLEED || 0), statusCost: { type: StatusEffectType.BLEED, value: p.statusEffects.BLEED || 0 } })},
    'WARRIOR_BLEED_PENTA_T': { id: 'WARRIOR_BLEED_PENTA_T', name: '고통의 갑옷', description: '방어를 11 얻습니다. 다음 턴에 자신의 출혈 피해가 2 배 증가하고, 증폭을 최대치까지 얻습니다.', cost: { echoRemnants: 90 }, replaces: { type: PatternType.PENTA, face: CoinFace.TAILS }, effect: (): AbilityEffect => ({ defense: 11, temporaryEffect: { name: 'bleedMultiplier', value: 2, duration: 2 }, gainMaxAmplify: true })},
    'WARRIOR_BLEED_AWA_H': { id: 'WARRIOR_BLEED_AWA_H', name: '피의 합주', description: '피해를 15 줍니다. 다음 턴 시작 시 1턴간 (출혈*2) 만큼 추가 공격력을 얻고, 모든 출혈을 잃습니다.', cost: { echoRemnants: 100 }, replaces: { type: PatternType.AWAKENING, face: CoinFace.HEADS }, effect: (p): AbilityEffect => ({ fixedDamage: 15, temporaryEffect: { name: 'bonusAtk', value: (p.statusEffects.BLEED || 0) * 2, duration: 2 }, statusCost: { type: StatusEffectType.BLEED, value: p.statusEffects.BLEED || 0 } })},
    'WARRIOR_BLEED_AWA_T': { id: 'WARRIOR_BLEED_AWA_T', name: '천사의 비명', description: '자신의 출혈*3 만큼 방어를 얻고, 증폭을 뒷면 개수*2 얻습니다.', cost: { echoRemnants: 100 }, replaces: { type: PatternType.AWAKENING, face: CoinFace.TAILS }, effect: (p: PlayerCharacter, e: EnemyCharacter, c: Coin[] = []): AbilityEffect => ({ defense: (p.statusEffects.BLEED || 0) * 3, status: { type: StatusEffectType.AMPLIFY, value: (c.filter(cn => cn.face === CoinFace.TAILS).length || 0) * 2, target: 'player' } })},
  },
  [CharacterClass.ROGUE]: {
    // --- Bleed Build ---
    'ROGUE_BLEED_PH': { id: 'ROGUE_BLEED_PH', name: '연사', description: '피해를 2 만큼 2 번 반복합니다. 출혈을 2 부여합니다.', cost: { echoRemnants: 50 }, replaces: { type: PatternType.PAIR, face: CoinFace.HEADS }, effect: (): AbilityEffect => ({ multiHit: { count: 2, damage: 2 }, status: { type: StatusEffectType.BLEED, value: 2, target: 'enemy' } }) },
    'ROGUE_BLEED_PT': { id: 'ROGUE_BLEED_PT', name: '거친 저항', description: '방어를 3 얻습니다. 출혈을 1 부여합니다.', cost: { echoRemnants: 50 }, replaces: { type: PatternType.PAIR, face: CoinFace.TAILS }, effect: (): AbilityEffect => ({ defense: 3, status: { type: StatusEffectType.BLEED, value: 1, target: 'enemy' } }) },
    'ROGUE_BLEED_UH': { id: 'ROGUE_BLEED_UH', name: '전술 사격', description: '피해를 4 줍니다. 스킬 사용 전, 추적이 2 이상인 경우 적의 동전 2개를 무작위로 뒤집습니다.', cost: { echoRemnants: 60 }, replaces: { type: PatternType.UNIQUE, face: CoinFace.HEADS }, effect: (p): AbilityEffect => {
        const effect: AbilityEffect = { fixedDamage: 4 };
        if ((p.statusEffects.PURSUIT || 0) >= 2) {
            effect.enemyTemporaryEffect = { name: 'flipCoinsRandom', value: 2, duration: 1 };
        }
        return effect;
    }},
    'ROGUE_BLEED_UT': { id: 'ROGUE_BLEED_UT', name: '팔 꺾기', description: '방어를 4 얻습니다. 분쇄를 2 부여합니다.', cost: { echoRemnants: 60 }, replaces: { type: PatternType.UNIQUE, face: CoinFace.TAILS }, effect: (): AbilityEffect => ({ defense: 4, status: { type: StatusEffectType.SHATTER, value: 2, target: 'enemy' } }) },
    'ROGUE_BLEED_TH': { id: 'ROGUE_BLEED_TH', name: '상처 관통', description: '피해를 3 줍니다. 스킬 사용 전, 추적이 3 이상인 경우 출혈을 4 부여합니다.', cost: { echoRemnants: 70 }, replaces: { type: PatternType.TRIPLE, face: CoinFace.HEADS }, effect: (p): AbilityEffect => {
        const effect: AbilityEffect = { fixedDamage: 3 };
        if ((p.statusEffects.PURSUIT || 0) >= 3) {
            effect.status = { type: StatusEffectType.BLEED, value: 4, target: 'enemy' };
        }
        return effect;
    }},
    'ROGUE_BLEED_TT': { id: 'ROGUE_BLEED_TT', name: '약점 파악', description: '방어를 5 얻습니다. 1 턴간 부여하는 출혈이 2 증가합니다.', cost: { echoRemnants: 70 }, replaces: { type: PatternType.TRIPLE, face: CoinFace.TAILS }, effect: (): AbilityEffect => ({ defense: 5, temporaryEffect: { name: 'bleedUp', value: 2, duration: 2 } }) },
    'ROGUE_BLEED_QH': { id: 'ROGUE_BLEED_QH', name: '확장형 탄자', description: '피해를 4 줍니다. 스킬 사용 전, 추적이 6 이상인 경우 다음 턴 시작 시 출혈을 추적*2 만큼 부여합니다.', cost: { echoRemnants: 80 }, replaces: { type: PatternType.QUAD, face: CoinFace.HEADS }, effect: (p): AbilityEffect => {
        const effect: AbilityEffect = { fixedDamage: 4 };
        const pursuit = p.statusEffects.PURSUIT || 0;
        if (pursuit >= 6) {
            effect.temporaryEffect = { name: 'bleedOnTurnStart', value: pursuit * 2, duration: 2 };
        }
        return effect;
    }},
    'ROGUE_BLEED_QT': { id: 'ROGUE_BLEED_QT', name: '혈기 왕성', description: '방어를 5 얻습니다. 스킬 사용 전, 상대방이 부여한 출혈을 3 소모할 경우 추가 방어를 2 얻습니다.', cost: { echoRemnants: 80 }, replaces: { type: PatternType.QUAD, face: CoinFace.TAILS }, effect: (p, e): AbilityEffect => {
        const effect: AbilityEffect = { defense: 5 };
        if ((e.statusEffects.BLEED || 0) >= 3) {
            effect.bonusDefense = 2;
            effect.enemyStatusDrain = { type: StatusEffectType.BLEED, value: 3 };
        }
        return effect;
    }},
    'ROGUE_BLEED_PENTA_H': { id: 'ROGUE_BLEED_PENTA_H', name: '피의 화망', description: '상대방의 출혈 스택 수만큼 1 피해를 반복한다.', cost: { echoRemnants: 90 }, replaces: { type: PatternType.PENTA, face: CoinFace.HEADS }, effect: (p, e): AbilityEffect => ({ multiHit: { count: e.statusEffects.BLEED || 0, damage: 1 } }) },
    'ROGUE_BLEED_PENTA_T': { id: 'ROGUE_BLEED_PENTA_T', name: '흡혈마', description: '방어를 6 얻습니다. 스킬 사용 전, 상대방의 출혈을 5 소모할 경우 방어를 10 얻습니다.', cost: { echoRemnants: 90 }, replaces: { type: PatternType.PENTA, face: CoinFace.TAILS }, effect: (p, e): AbilityEffect => {
        if ((e.statusEffects.BLEED || 0) >= 5) {
            return { defense: 10, enemyStatusDrain: { type: StatusEffectType.BLEED, value: 5 } };
        }
        return { defense: 6 };
    }},
    'ROGUE_BLEED_AWA_H': { id: 'ROGUE_BLEED_AWA_H', name: '혈탄', description: '스킬 사용 전, 상대방의 모든 출혈을 잃고, 방어 무시 피해를 출혈*2 만큼 줍니다.', cost: { echoRemnants: 100 }, replaces: { type: PatternType.AWAKENING, face: CoinFace.HEADS }, effect: (p, e): AbilityEffect => ({ fixedDamage: (e.statusEffects.BLEED || 0) * 2, enemyStatusDrain: { type: StatusEffectType.BLEED, value: e.statusEffects.BLEED || 0 } }) },
    'ROGUE_BLEED_AWA_T': { id: 'ROGUE_BLEED_AWA_T', name: '인계철선', description: '방어를 8 얻습니다. 스킬 사용 전, 상대방의 출혈을 2 배로 늘립니다.', cost: { echoRemnants: 100 }, replaces: { type: PatternType.AWAKENING, face: CoinFace.TAILS }, effect: (p, e): AbilityEffect => ({ defense: 8, status: { type: StatusEffectType.BLEED, value: e.statusEffects.BLEED || 0, target: 'enemy' } }) },

    // --- Shatter/Combo Build ---
    'ROGUE_SHATTER_PH': { id: 'ROGUE_SHATTER_PH', name: '철갑탄', description: '피해를 4 줍니다. 스킬 사용 후, 추적 피해를 줄 경우 분쇄를 3 부여합니다.', cost: { echoRemnants: 50 }, replaces: { type: PatternType.PAIR, face: CoinFace.HEADS }, effect: (): AbilityEffect => ({ fixedDamage: 4, temporaryEffect: { name: 'shatterOnPursuitDamage', value: 3, duration: 2 } }) },
    // FIX: Corrected a type error where a number was assigned to a boolean property (`healIfPairedWithSame`).
    // The skill logic has been implemented to conditionally add a `heal` effect based on duplicate pattern usage, consistent with other skill definitions.
    'ROGUE_SHATTER_PT': { id: 'ROGUE_SHATTER_PT', name: '호흡 제어', description: '방어를 2 얻습니다. 스킬 사용 전, 중복으로 사용할 경우 체력을 4 회복합니다.', cost: { echoRemnants: 50 }, replaces: { type: PatternType.PAIR, face: CoinFace.TAILS }, effect: (p, e, c, s = []): AbilityEffect => {
      const effect: AbilityEffect = { defense: 2 };
      const isDuplicated = s.filter(pattern => pattern.type === PatternType.PAIR && pattern.face === CoinFace.TAILS).length > 1;
      if (isDuplicated) {
        effect.heal = 4;
      }
      return effect;
    }},
    'ROGUE_SHATTER_UH': { id: 'ROGUE_SHATTER_UH', name: '빈틈 명중', description: '피해를 4 줍니다. 스킬 사용 후, 상대방의 방어가 파괴될 경우, 다음 턴 시작 시 상대방의 가운데 동전을 뒷면으로 만듭니다.', cost: { echoRemnants: 60 }, replaces: { type: PatternType.UNIQUE, face: CoinFace.HEADS }, effect: (): AbilityEffect => ({ fixedDamage: 4, enemyTemporaryEffect: { name: 'flipMiddleCoinOnBreak', value: true, duration: 2 } }) },
    'ROGUE_SHATTER_UT': { id: 'ROGUE_SHATTER_UT', name: '곡예', description: '방어를 4 얻습니다. 이번 턴에 자신의 방어가 파괴되었다면, 다음 턴에 본인 동전 1개를 뒷면으로 만듭니다.', cost: { echoRemnants: 60 }, replaces: { type: PatternType.UNIQUE, face: CoinFace.TAILS }, effect: (): AbilityEffect => ({ defense: 4, temporaryEffect: { name: 'flipCoinOnBreak', value: 1, duration: 2 } }) },
    'ROGUE_SHATTER_TH': { id: 'ROGUE_SHATTER_TH', name: '저격', description: '피해를 2 만큼 4 번 반복합니다. 분쇄를 2 부여합니다.', cost: { echoRemnants: 70 }, replaces: { type: PatternType.TRIPLE, face: CoinFace.HEADS }, effect: (): AbilityEffect => ({ multiHit: { count: 4, damage: 2 }, status: { type: StatusEffectType.SHATTER, value: 2, target: 'enemy' } }) },
    'ROGUE_SHATTER_TT': { id: 'ROGUE_SHATTER_TT', name: '밀쳐내기', description: '방어를 5 얻습니다. 이번 턴에 공격하지 않은 경우 분쇄를 3 부여합니다.', cost: { echoRemnants: 70 }, replaces: { type: PatternType.TRIPLE, face: CoinFace.TAILS }, effect: (): AbilityEffect => ({ defense: 5, addShatterIfNotAttacking: 3 }) },
    'ROGUE_SHATTER_QH': { id: 'ROGUE_SHATTER_QH', name: '영점 사격', description: '피해를 7 줍니다. 스킬 사용 후, 상대방의 분쇄가 6 이상인 경우 추적을 3 얻습니다.', cost: { echoRemnants: 80 }, replaces: { type: PatternType.QUAD, face: CoinFace.HEADS }, effect: (p, e): AbilityEffect => {
        const effect: AbilityEffect = { fixedDamage: 7 };
        if ((e.statusEffects.SHATTER || 0) >= 6) {
            effect.status = { type: StatusEffectType.PURSUIT, value: 3, target: 'player' };
        }
        return effect;
    }},
    'ROGUE_SHATTER_QT': { id: 'ROGUE_SHATTER_QT', name: '흩어내기', description: '방어를 8 얻습니다. 추적을 2 얻습니다. 분쇄를 2 부여합니다.', cost: { echoRemnants: 80 }, replaces: { type: PatternType.QUAD, face: CoinFace.TAILS }, effect: (): AbilityEffect => ({ defense: 8, status: [{ type: StatusEffectType.PURSUIT, value: 2, target: 'player' }, { type: StatusEffectType.SHATTER, value: 2, target: 'enemy' }] }) },
    'ROGUE_SHATTER_PENTA_H': { id: 'ROGUE_SHATTER_PENTA_H', name: '파열탄', description: '피해를 8 줍니다. 스킬 사용 전, 상대방이 방어를 가지고 있는 경우 피해를 2 배로 늘립니다.', cost: { echoRemnants: 90 }, replaces: { type: PatternType.PENTA, face: CoinFace.HEADS }, effect: (p, e): AbilityEffect => ({ fixedDamage: 8, damageMultiplier: (e.temporaryDefense > 0 || e.baseDef > 0) ? 2 : 1 }) },
    'ROGUE_SHATTER_PENTA_T': { id: 'ROGUE_SHATTER_PENTA_T', name: '삼전', description: '방어를 5 얻습니다. 스킬 사용 전, 상대방의 분쇄 만큼의 추가 방어를 얻고, 모든 분쇄를 잃습니다.', cost: { echoRemnants: 90 }, replaces: { type: PatternType.PENTA, face: CoinFace.TAILS }, effect: (p, e): AbilityEffect => ({ defense: 5 + (e.statusEffects.SHATTER || 0), enemyStatusDrain: { type: StatusEffectType.SHATTER, value: e.statusEffects.SHATTER || 0 } }) },
    'ROGUE_SHATTER_AWA_H': { id: 'ROGUE_SHATTER_AWA_H', name: '평정', description: '스킬 사용 전, 상대방의 모든 분쇄를 잃고, 피해를 자신의 추적 + (분쇄*2) 만큼 줍니다.', cost: { echoRemnants: 100 }, replaces: { type: PatternType.AWAKENING, face: CoinFace.HEADS }, effect: (p, e): AbilityEffect => ({ fixedDamage: (p.statusEffects.PURSUIT || 0) + ((e.statusEffects.SHATTER || 0) * 2), enemyStatusDrain: { type: StatusEffectType.SHATTER, value: e.statusEffects.SHATTER || 0 } }) },
    'ROGUE_SHATTER_AWA_T': { id: 'ROGUE_SHATTER_AWA_T', name: '필살의 준비', description: '방어를 5 얻습니다. 스킬 사용 후, 상대방의 분쇄 만큼의 추적을 얻습니다.', cost: { echoRemnants: 100 }, replaces: { type: PatternType.AWAKENING, face: CoinFace.TAILS }, effect: (p, e): AbilityEffect => ({ defense: 5, status: { type: StatusEffectType.PURSUIT, value: (e.statusEffects.SHATTER || 0), target: 'player' } }) },
  },
  [CharacterClass.TANK]: {
    // Shatter Build
    'TANK_SHATTER_PH': { id: 'TANK_SHATTER_PH', name: '분쇄격', description: '피해를 6 줍니다. 분쇄를 1 부여합니다.\n[연계] 뒷면 스킬과 함께 사용 시, 분쇄를 2 추가로 부여합니다.', cost: { echoRemnants: 50 }, replaces: { type: PatternType.PAIR, face: CoinFace.HEADS }, effect: (p, e, c, s = []): AbilityEffect => {
        const statuses: StatusApplication[] = [{ type: StatusEffectType.SHATTER, value: 1, target: 'enemy' }];
        const hasCombo = s.some(pattern => pattern.face === CoinFace.TAILS);
        if (hasCombo) {
            statuses.push({ type: StatusEffectType.SHATTER, value: 2, target: 'enemy' });
        }
        return { fixedDamage: 6, status: statuses };
    }},
    'TANK_SHATTER_PT': { id: 'TANK_SHATTER_PT', name: '쌍수 방어', description: '방어를 7 얻습니다.\n[연계] 뒷면 2연 스킬과 중복 사용 시, 분쇄를 3 부여합니다.', cost: { echoRemnants: 50 }, replaces: { type: PatternType.PAIR, face: CoinFace.TAILS }, effect: (p, e, c, s = []): AbilityEffect => {
        const effect: AbilityEffect = { defense: 7 };
        const isDoubled = s.filter(pattern => pattern.type === PatternType.PAIR && pattern.face === CoinFace.TAILS).length > 1;
        if (isDoubled) {
            effect.status = { type: StatusEffectType.SHATTER, value: 3, target: 'enemy' };
        }
        return effect;
    }},
    'TANK_SHATTER_UH': { id: 'TANK_SHATTER_UH', name: '손등 치기', description: '피해를 4 줍니다. 2턴간 상대방의 동전 1개를 뒷면으로 만듭니다.', cost: { echoRemnants: 60 }, replaces: { type: PatternType.UNIQUE, face: CoinFace.HEADS }, effect: (): AbilityEffect => ({ fixedDamage: 4, enemyTemporaryEffect: { name: 'lockRandomCoinTails', value: 1, duration: 3 } }) },
    'TANK_SHATTER_UT': { id: 'TANK_SHATTER_UT', name: '전투력 파악', description: '방어를 4 + 상대 앞면 개수 만큼 얻습니다.', cost: { echoRemnants: 60 }, replaces: { type: PatternType.UNIQUE, face: CoinFace.TAILS }, effect: (p, e): AbilityEffect => ({ defense: 4 + (e.coins.filter(cn => cn.face === CoinFace.HEADS).length || 0) }) },
    'TANK_SHATTER_TH': { id: 'TANK_SHATTER_TH', name: '철산고', description: '피해를 6 + 자신의 방어 만큼 줍니다.', cost: { echoRemnants: 70 }, replaces: { type: PatternType.TRIPLE, face: CoinFace.HEADS }, effect: (p: PlayerCharacter): AbilityEffect => ({ fixedDamage: 6 + p.temporaryDefense }) },
    'TANK_SHATTER_TT': { id: 'TANK_SHATTER_TT', name: '굳건함', description: '방어를 8 얻습니다.\n[연계] 앞면 2연 스킬과 함께 사용 시, 1턴간 자신의 방어가 사라지지 않습니다.', cost: { echoRemnants: 70 }, replaces: { type: PatternType.TRIPLE, face: CoinFace.TAILS }, effect: (p, e, c, s = []): AbilityEffect => {
        const effect: AbilityEffect = { defense: 8 };
        const hasCombo = s.some(pattern => pattern.type === PatternType.PAIR && pattern.face === CoinFace.HEADS);
        if (hasCombo) {
            effect.temporaryEffect = { name: 'keepDefense', value: true, duration: 2 };
        }
        return effect;
    }},
    'TANK_SHATTER_QH': { id: 'TANK_SHATTER_QH', name: '파쇄격', description: '피해를 7 + 부여한 분쇄 만큼 줍니다.\n[연계] 뒷면 2연 스킬과 함께 사용 시, 1턴간 방어를 2 얻습니다.', cost: { echoRemnants: 80 }, replaces: { type: PatternType.QUAD, face: CoinFace.HEADS }, effect: (p, e, c, s = []): AbilityEffect => {
        const effect: AbilityEffect = { fixedDamage: 7 + (e.statusEffects.SHATTER || 0) };
        const hasCombo = s.some(pattern => pattern.type === PatternType.PAIR && pattern.face === CoinFace.TAILS);
        if (hasCombo) {
            effect.temporaryEffect = { name: 'bonusDef', value: 2, duration: 2 };
        }
        return effect;
    }},
    'TANK_SHATTER_QT': { id: 'TANK_SHATTER_QT', name: '분쇄 갑주', description: '방어를 9 얻습니다.\n[연계] 앞면 유일 스킬과 함께 사용 시, 상대방의 분쇄 만큼 추가 방어를 얻습니다.', cost: { echoRemnants: 80 }, replaces: { type: PatternType.QUAD, face: CoinFace.TAILS }, effect: (p, e, c, s = []): AbilityEffect => {
        const effect: AbilityEffect = { defense: 9 };
        const hasCombo = s.some(pattern => pattern.type === PatternType.UNIQUE && pattern.face === CoinFace.HEADS);
        if (hasCombo) {
            effect.bonusDefense = e.statusEffects.SHATTER || 0;
        }
        return effect;
    }},
    'TANK_SHATTER_PENTAH': { id: 'TANK_SHATTER_PENTAH', name: '파열각', description: '피해를 10 + (분쇄*2) 만큼 줍니다. 2턴간 분쇄를 유지시킵니다.', cost: { echoRemnants: 90 }, replaces: { type: PatternType.PENTA, face: CoinFace.HEADS }, effect: (p, e): AbilityEffect => ({ fixedDamage: 10 + (e.statusEffects.SHATTER || 0) * 2, temporaryEffect: { name: 'shatterLock', value: true, duration: 3 } }) },
    'TANK_SHATTER_PENTAT': { id: 'TANK_SHATTER_PENTAT', name: '아우라', description: '방어를 10 얻습니다. 스킬 사용 후, 자신의 남은 방어 만큼 피해를 줍니다.', cost: { echoRemnants: 90 }, replaces: { type: PatternType.PENTA, face: CoinFace.TAILS }, effect: (p): AbilityEffect => ({ defense: 10, temporaryEffect: { name: 'damageFromDefense', value: true, duration: 2 } }) },
    'TANK_SHATTER_AWAH': { id: 'TANK_SHATTER_AWAH', name: '경정권', description: '피해를 12 줍니다. 스킬 사용 전, 상대방의 방어가 0인 경우, 추가 피해를 (분쇄*2) 만큼 줍니다.', cost: { echoRemnants: 100 }, replaces: { type: PatternType.AWAKENING, face: CoinFace.HEADS }, effect: (p, e): AbilityEffect => ({ fixedDamage: 12 + (e.temporaryDefense === 0 ? (e.statusEffects.SHATTER || 0) * 2 : 0) }) },
    'TANK_SHATTER_AWAT': { id: 'TANK_SHATTER_AWAT', name: '전신 해방', description: '2턴간 자신과 상대방의 모든 피해가 2배로 증가합니다.', cost: { echoRemnants: 100 }, replaces: { type: PatternType.AWAKENING, face: CoinFace.TAILS }, effect: (): AbilityEffect => ({ temporaryEffect: { name: 'doubleDamage', value: 2, duration: 3 }, enemyTemporaryEffect: { name: 'doubleDamage', value: 2, duration: 3 } }) },
    // Seal Build
    'TANK_SEAL_PH': { id: 'TANK_SEAL_PH', name: '쇠사슬 감기', description: '피해를 2 줍니다. 자신에게 봉인을 2 부여합니다.\n[연계] 뒷면 스킬과 함께 사용 시, 피해를 자신의 봉인 + 사용한 뒷면 개수 만큼 줍니다.', cost: { echoRemnants: 50 }, replaces: { type: PatternType.PAIR, face: CoinFace.HEADS }, effect: (p, e, c, s = []): AbilityEffect => {
      const effect: AbilityEffect = { status: { type: StatusEffectType.SEAL, value: 2, target: 'player' } };
      const hasCombo = s.some(pattern => pattern.face === CoinFace.TAILS);
      if (hasCombo) {
          const tailsCount = c?.filter(cn => cn.face === CoinFace.TAILS).length || 0;
          effect.fixedDamage = (p.statusEffects.SEAL || 0) + 2 + tailsCount;
      } else {
          effect.fixedDamage = 2;
      }
      return effect;
    }},
    'TANK_SEAL_PT': { id: 'TANK_SEAL_PT', name: '사슬 방어', description: '방어를 6 얻습니다.\n[연계] 앞면 스킬과 함께 사용 시, 사용한 앞면 개수 만큼 자신에게 봉인을 부여합니다.', cost: { echoRemnants: 50 }, replaces: { type: PatternType.PAIR, face: CoinFace.TAILS }, effect: (p, e, c, s = []): AbilityEffect => {
        const effect: AbilityEffect = { defense: 6 };
        const hasCombo = s.some(pattern => pattern.face === CoinFace.HEADS);
        if (hasCombo) {
            const headsCount = c?.filter(cn => cn.face === CoinFace.HEADS).length || 0;
            effect.status = { type: StatusEffectType.SEAL, value: headsCount, target: 'player' };
        }
        return effect;
    }},
    'TANK_SEAL_UH': { id: 'TANK_SEAL_UH', name: '되감아치기', description: '피해를 4 줍니다.\n[연계] 뒷면 4연 스킬과 함께 사용 시, 다음 턴에 1~4번째 동전이 앞면으로 나옵니다.', cost: { echoRemnants: 60 }, replaces: { type: PatternType.UNIQUE, face: CoinFace.HEADS }, effect: (p, e, c, s = []): AbilityEffect => {
        const effect: AbilityEffect = { fixedDamage: 4 };
        const hasCombo = s.some(pattern => pattern.type === PatternType.QUAD && pattern.face === CoinFace.TAILS);
        if (hasCombo) {
            effect.temporaryEffect = { name: 'guaranteeHeads', value: 4, duration: 2 };
        }
        return effect;
    }},
    'TANK_SEAL_UT': { id: 'TANK_SEAL_UT', name: '봉인 의식', description: '방어를 4 얻습니다. 스킬 사용 후, 자신의 봉인이 6 이상인 경우 1턴간 1번째 동전을 고정시킵니다.', cost: { echoRemnants: 60 }, replaces: { type: PatternType.UNIQUE, face: CoinFace.TAILS }, effect: (p): AbilityEffect => {
      const effect: AbilityEffect = { defense: 4 };
      if ((p.statusEffects.SEAL || 0) >= 6) {
          effect.temporaryEffect = { name: 'lockFirstCoin', value: true, duration: 2 };
      }
      return effect;
    }},
    'TANK_SEAL_TH': { id: 'TANK_SEAL_TH', name: '사슬 당겨치기', description: '피해를 자신의 봉인 만큼 줍니다.\n[연계] 뒷면 2연 스킬과 함께 사용 시, 피해를 자신의 봉인 + 자신의 방어 만큼 줍니다.', cost: { echoRemnants: 70 }, replaces: { type: PatternType.TRIPLE, face: CoinFace.HEADS }, effect: (p: PlayerCharacter, e, c, s = []): AbilityEffect => {
      const hasCombo = s.some(pattern => pattern.type === PatternType.PAIR && pattern.face === CoinFace.TAILS);
      if (hasCombo) {
          return { fixedDamage: (p.statusEffects.SEAL || 0) + p.temporaryDefense };
      }
      return { fixedDamage: p.statusEffects.SEAL || 0 };
    }},
    'TANK_SEAL_TT': { id: 'TANK_SEAL_TT', name: '사슬 분쇄', description: '방어를 6 얻습니다.\n[연계] 앞면 2연 스킬과 함께 사용 시, 봉인을 5만큼 잃고, 3턴간 스킬 피해가 2만큼 증가합니다.', cost: { echoRemnants: 70 }, replaces: { type: PatternType.TRIPLE, face: CoinFace.TAILS }, effect: (p: PlayerCharacter, e, c, s = []): AbilityEffect => {
        const effect: AbilityEffect = { defense: 6 };
        const hasCombo = s.some(pattern => pattern.type === PatternType.PAIR && pattern.face === CoinFace.HEADS);
        if (hasCombo) {
            effect.statusCost = { type: StatusEffectType.SEAL, value: 5 };
            effect.temporaryEffect = { name: 'bonusDamage', value: 2, duration: 4 };
        }
        return effect;
    }},
    'TANK_SEAL_QH': { id: 'TANK_SEAL_QH', name: '사슬 후려치기', description: '피해를 5 줍니다.\n[연계] 뒷면 유일 스킬과 함께 사용 시, 피해를 자신의 봉인 + 자신의 방어 만큼 줍니다.', cost: { echoRemnants: 80 }, replaces: { type: PatternType.QUAD, face: CoinFace.HEADS }, effect: (p: PlayerCharacter, e, c, s = []): AbilityEffect => {
        const hasCombo = s.some(pattern => pattern.type === PatternType.UNIQUE && pattern.face === CoinFace.TAILS);
        if (hasCombo) {
            return { fixedDamage: (p.statusEffects.SEAL || 0) + p.temporaryDefense };
        }
        return { fixedDamage: 5 };
    }},
    'TANK_SEAL_QT': { id: 'TANK_SEAL_QT', name: '사슬 연장술', description: '방어를 8 얻습니다.\n[연계] 앞면 유일 스킬과 함께 사용 시, 봉인을 2턴간 연장시킵니다.', cost: { echoRemnants: 80 }, replaces: { type: PatternType.QUAD, face: CoinFace.TAILS }, effect: (p, e, c, s = []): AbilityEffect => {
        const effect: AbilityEffect = { defense: 8 };
        const hasCombo = s.some(pattern => pattern.type === PatternType.UNIQUE && pattern.face === CoinFace.HEADS);
        if (hasCombo) {
            effect.temporaryEffect = { name: 'sealExtend', value: 2, duration: 1 };
        }
        return effect;
    }},
    'TANK_SEAL_PENTAH': { id: 'TANK_SEAL_PENTAH', name: '봉인격', description: '자신에게 봉인을 5 부여하고, 피해를 자신의 봉인 + 자신의 최대 체력의 10% 만큼 줍니다.', cost: { echoRemnants: 90 }, replaces: { type: PatternType.PENTA, face: CoinFace.HEADS }, effect: (p: PlayerCharacter): AbilityEffect => ({ status: { type: StatusEffectType.SEAL, value: 5, target: 'player' }, fixedDamage: (p.statusEffects.SEAL || 0) + 5 + Math.floor(p.maxHp * 0.1) }) },
    'TANK_SEAL_PENTAT': { id: 'TANK_SEAL_PENTAT', name: '전부 내려놓기', description: '방어를 10 얻습니다. 다음 턴 시작 시 자신의 봉인 만큼 체력을 회복하고, 모든 봉인을 잃습니다.', cost: { echoRemnants: 90 }, replaces: { type: PatternType.PENTA, face: CoinFace.TAILS }, effect: (): AbilityEffect => ({ defense: 10, temporaryEffect: { name: 'healAndClearSeal', value: true, duration: 2 } }) },
    'TANK_SEAL_AWAH': { id: 'TANK_SEAL_AWAH', name: '봉인 해방', description: '자신에게 봉인을 6 + (앞면 개수*2) 만큼 부여합니다. 피해를 자신의 봉인*3 만큼 주고, 모든 봉인을 잃습니다.', cost: { echoRemnants: 100 }, replaces: { type: PatternType.AWAKENING, face: CoinFace.HEADS }, effect: (p, e, c: Coin[] = []): AbilityEffect => {
      const headsCount = c.filter(cn => cn.face === CoinFace.HEADS).length || 0;
      const sealToAdd = 6 + headsCount * 2;
      const totalSeal = (p.statusEffects.SEAL || 0) + sealToAdd;
      return { status: { type: StatusEffectType.SEAL, value: sealToAdd, target: 'player' }, fixedDamage: totalSeal * 3, statusDrain: { type: StatusEffectType.SEAL, value: totalSeal } };
    }},
    'TANK_SEAL_AWAT': { id: 'TANK_SEAL_AWAT', name: '분노 폭발', description: '방어를 12 얻습니다. 다음 턴에 모든 봉인을 잃습니다. 5턴간 잃은 자신의 봉인 만큼 모든 스킬 피해가 증가합니다.', cost: { echoRemnants: 100 }, replaces: { type: PatternType.AWAKENING, face: CoinFace.TAILS }, effect: (p): AbilityEffect => ({ defense: 12, temporaryEffect: { name: 'rageFromSeal', value: true, duration: 2 }, statusDrain: { type: StatusEffectType.SEAL, value: p.statusEffects.SEAL || 0 } }) },
  },
  [CharacterClass.MAGE]: {
    // Seal Build
    'MAGE_SEAL_PH': { id: 'MAGE_SEAL_PH', name: '어두운 손', description: '피해를 2만큼 2번 줍니다. 봉인을 2 부여합니다.', cost: { echoRemnants: 50 }, replaces: { type: PatternType.PAIR, face: CoinFace.HEADS }, effect: (): AbilityEffect => ({ multiHit: { count: 2, damage: 2 }, status: { type: StatusEffectType.SEAL, value: 2, target: 'enemy' } }) },
    'MAGE_SEAL_PT': { id: 'MAGE_SEAL_PT', name: '어두운 기운', description: '방어를 4 얻습니다. 봉인을 1~3만큼 부여합니다.', cost: { echoRemnants: 50 }, replaces: { type: PatternType.PAIR, face: CoinFace.TAILS }, effect: (): AbilityEffect => ({ defense: 4, status: { type: StatusEffectType.SEAL, value: randomBetween(1, 3), target: 'enemy' } }) },
    'MAGE_SEAL_UH': { id: 'MAGE_SEAL_UH', name: '타인의 고통', description: '피해를 4 줍니다. 1턴간 앞면 확률이 현재 상대방의 봉인% 확률로 증가합니다.', cost: { echoRemnants: 60 }, replaces: { type: PatternType.UNIQUE, face: CoinFace.HEADS }, effect: (p, e): AbilityEffect => ({ fixedDamage: 4, temporaryEffect: { name: 'headsChanceUp', value: (e.statusEffects.SEAL || 0) / 100, duration: 2 } }) },
    'MAGE_SEAL_UT': { id: 'MAGE_SEAL_UT', name: '자학 유발', description: '방어를 4 얻습니다. 3턴간 상대방의 뒷면 확률이 현재 상대방의 봉인% 확률로 증가합니다.', cost: { echoRemnants: 60 }, replaces: { type: PatternType.UNIQUE, face: CoinFace.TAILS }, effect: (p, e): AbilityEffect => ({ defense: 4, enemyTemporaryEffect: { name: 'tailsChanceUp', value: (e.statusEffects.SEAL || 0) / 100, duration: 4 } }) },
    'MAGE_SEAL_TH': { id: 'MAGE_SEAL_TH', name: '정신 약화', description: '피해를 6 + 상대방의 봉인*1~3만큼 확률로 주고, 모든 봉인을 잃습니다.', cost: { echoRemnants: 70 }, replaces: { type: PatternType.TRIPLE, face: CoinFace.HEADS }, effect: (p, e): AbilityEffect => ({ fixedDamage: 6 + (e.statusEffects.SEAL || 0) * randomBetween(1, 3), enemyStatusDrain: { type: StatusEffectType.SEAL, value: e.statusEffects.SEAL || 0 } }) },
    'MAGE_SEAL_TT': { id: 'MAGE_SEAL_TT', name: '나태 흡수', description: '방어를 6 + 상대방의 봉인*1~3만큼 확률로 얻고, 상대방의 모든 봉인을 잃습니다.', cost: { echoRemnants: 70 }, replaces: { type: PatternType.TRIPLE, face: CoinFace.TAILS }, effect: (p, e): AbilityEffect => ({ defense: 6 + (e.statusEffects.SEAL || 0) * randomBetween(1, 3), enemyStatusDrain: { type: StatusEffectType.SEAL, value: e.statusEffects.SEAL || 0 } }) },
    'MAGE_SEAL_QH': { id: 'MAGE_SEAL_QH', name: '나태한 손길', description: '피해를 6 줍니다. 봉인을 3~8만큼 확률로 부여합니다.', cost: { echoRemnants: 80 }, replaces: { type: PatternType.QUAD, face: CoinFace.HEADS }, effect: (): AbilityEffect => ({ fixedDamage: 6, status: { type: StatusEffectType.SEAL, value: randomBetween(3, 8), target: 'enemy' } }) },
    'MAGE_SEAL_QT': { id: 'MAGE_SEAL_QT', name: '게으름 전염', description: '방어를 6 or 8 만큼 확률로 얻습니다. 스킬 사용 전, 상대방의 봉인이 0인 경우, 봉인을 3~6만큼 확률로 부여합니다.', cost: { echoRemnants: 80 }, replaces: { type: PatternType.QUAD, face: CoinFace.TAILS }, effect: (p, e): AbilityEffect => {
      const effect: AbilityEffect = { defense: Math.random() < 0.5 ? 6 : 8 };
      if ((e.statusEffects.SEAL || 0) === 0) {
        effect.status = { type: StatusEffectType.SEAL, value: randomBetween(3, 6), target: 'enemy' };
      }
      return effect;
    }},
    'MAGE_SEAL_PENTAH': { id: 'MAGE_SEAL_PENTAH', name: '의지 절단', description: '피해를 8 줍니다. 3턴간 해당 스킬 피해량이 상대방의 봉인*1~2만큼 확률로 증가합니다.', cost: { echoRemnants: 90 }, replaces: { type: PatternType.PENTA, face: CoinFace.HEADS }, effect: (p, e): AbilityEffect => ({ fixedDamage: 8 + (e.statusEffects.SEAL || 0) * randomBetween(1, 2) }) },
    'MAGE_SEAL_PENTAT': { id: 'MAGE_SEAL_PENTAT', name: '뒤늦은 후회', description: '방어를 8 얻습니다. 3턴간 해당 스킬 방어량이 상대방의 봉인*1~2만큼 확률로 증가합니다.', cost: { echoRemnants: 90 }, replaces: { type: PatternType.PENTA, face: CoinFace.TAILS }, effect: (p, e): AbilityEffect => ({ defense: 8 + (e.statusEffects.SEAL || 0) * randomBetween(1, 2) }) },
    'MAGE_SEAL_AWAH': { id: 'MAGE_SEAL_AWAH', name: '게으른 시선', description: '피해를 상대방의 봉인*1~5만큼 확률로 주고, 모든 봉인을 잃습니다. 스킬 사용 후, 상대방의 체력이 5% 이하 시 즉시 처형시킵니다.', cost: { echoRemnants: 100 }, replaces: { type: PatternType.AWAKENING, face: CoinFace.HEADS }, effect: (p, e): AbilityEffect => ({ fixedDamage: (e.statusEffects.SEAL || 0) * randomBetween(1, 5), enemyStatusDrain: { type: StatusEffectType.SEAL, value: e.statusEffects.SEAL || 0 }, temporaryEffect: { name: 'execute', value: 0.05, duration: 2 } }) },
    'MAGE_SEAL_AWAT': { id: 'MAGE_SEAL_AWAT', name: '나태하구나!', description: '방어를 상대방의 봉인*1~5만큼 확률로 얻고, 모든 봉인을 잃습니다. 스킬 사용 후, 남은 자신의 방어 만큼 봉인을 추가로 부여합니다.', cost: { echoRemnants: 100 }, replaces: { type: PatternType.AWAKENING, face: CoinFace.TAILS }, effect: (p, e): AbilityEffect => ({ defense: (e.statusEffects.SEAL || 0) * randomBetween(1, 5), enemyStatusDrain: { type: StatusEffectType.SEAL, value: e.statusEffects.SEAL || 0 }, temporaryEffect: { name: 'sealFromDefense', value: true, duration: 2 } }) },
    // Resonance Build
    'MAGE_RES_PH': { id: 'MAGE_RES_PH', name: '우울 초기', description: '피해를 4 줍니다. 자신에게 공명을 2 부여합니다.', cost: { echoRemnants: 50 }, replaces: { type: PatternType.PAIR, face: CoinFace.HEADS }, effect: (): AbilityEffect => ({ fixedDamage: 4, temporaryEffect: { name: 'resonance', value: 2, duration: 3, accumulative: true } }) },
    'MAGE_RES_PT': { id: 'MAGE_RES_PT', name: '기분 전환', description: '방어를 6 얻습니다. 자신의 디버프를 1~3만큼 확률로 잃습니다.', cost: { echoRemnants: 50 }, replaces: { type: PatternType.PAIR, face: CoinFace.TAILS }, effect: (p): AbilityEffect => {
      const curseToLose = randomBetween(1,3);
      const currentCurse = p.statusEffects.CURSE || 0;
      return { defense: 6, status: { type: StatusEffectType.CURSE, value: -Math.min(curseToLose, currentCurse), target: 'player' } }
    }},
    'MAGE_RES_UH': { id: 'MAGE_RES_UH', name: '편두통 유발', description: '자신에게 공명을 4 부여합니다. 다음 턴에 2연 이상 족보가 나온 경우 즉시 상대방의 동전을 2개 뒤집습니다.', cost: { echoRemnants: 60 }, replaces: { type: PatternType.UNIQUE, face: CoinFace.HEADS }, effect: (): AbilityEffect => ({ temporaryEffect: { name: 'resonanceAndFlip', value: 4, duration: 2 } }) },
    'MAGE_RES_UT': { id: 'MAGE_RES_UT', name: '방어 본능', description: '방어를 4 얻습니다. 다음 턴에 뒷면이 앞면보다 많을 경우 1턴간 자신의 첫번째 동전을 고정시킵니다.', cost: { echoRemnants: 60 }, replaces: { type: PatternType.UNIQUE, face: CoinFace.TAILS }, effect: (): AbilityEffect => ({ defense: 4, temporaryEffect: { name: 'lockOnTailsMajority', value: true, duration: 2 } }) },
    'MAGE_RES_TH': { id: 'MAGE_RES_TH', name: '무력함의 파동', description: '피해를 4 줍니다. 다음 턴에 3연 이상 족보가 나온 경우 피해를 현재 공명 만큼 주고, 모든 공명을 잃습니다.', cost: { echoRemnants: 70 }, replaces: { type: PatternType.TRIPLE, face: CoinFace.HEADS }, effect: (): AbilityEffect => ({ fixedDamage: 4, temporaryEffect: { name: 'resonanceNukeOnTriple', value: true, duration: 2 } }) },
    'MAGE_RES_TT': { id: 'MAGE_RES_TT', name: '책임 회피', description: '방어를 4 얻습니다. 받은 피해 만큼 자신의 체력 대신 공명으로 대신 잃습니다.', cost: { echoRemnants: 70 }, replaces: { type: PatternType.TRIPLE, face: CoinFace.TAILS }, effect: (): AbilityEffect => ({ defense: 4, temporaryEffect: { name: 'resonanceAsShield', value: true, duration: 2 } }) },
    'MAGE_RES_QH': { id: 'MAGE_RES_QH', name: '급성 피로', description: '피해를 6 + 자신의 공명 만큼 줍니다. 다음 턴에 유일 족보가 나온 경우, 다음 턴에 저장한 공명이 2배로 증가합니다.', cost: { echoRemnants: 80 }, replaces: { type: PatternType.QUAD, face: CoinFace.HEADS }, effect: (p): AbilityEffect => ({ fixedDamage: 6 + (p.temporaryEffects?.resonance?.value || 0), temporaryEffect: { name: 'doubleResonanceOnUnique', value: true, duration: 2 } }) },
    'MAGE_RES_QT': { id: 'MAGE_RES_QT', name: '우울 지속', description: '방어를 8 얻습니다. 스킬 사용 후, 자신의 디버프가 0인 경우 자신에게 공명을 3 부여합니다.', cost: { echoRemnants: 80 }, replaces: { type: PatternType.QUAD, face: CoinFace.TAILS }, effect: (p): AbilityEffect => {
      const effect: AbilityEffect = { defense: 8 };
      if((p.statusEffects.CURSE || 0) === 0) {
        effect.temporaryEffect = { name: 'resonance', value: 3, duration: 3, accumulative: true };
      }
      return effect;
    }},
    'MAGE_RES_PENTAH': { id: 'MAGE_RES_PENTAH', name: '트라우마 자극', description: '피해를 10 + 자신의 공명 만큼 줍니다. 스킬 사용 후, 자신의 디버프 발동을 2턴간 연장시킵니다.', cost: { echoRemnants: 90 }, replaces: { type: PatternType.PENTA, face: CoinFace.HEADS }, effect: (p): AbilityEffect => ({ fixedDamage: 10 + (p.temporaryEffects?.resonance?.value || 0), temporaryEffect: { name: 'delayDebuffs', value: 2, duration: 2 } }) },
    'MAGE_RES_PENTAT': { id: 'MAGE_RES_PENTAT', name: '정신의 방벽', description: '방어를 10 얻습니다. 다음 턴에 앞면이 많으면 자신, 뒷면이 많으면 상대방에게 공명을 10 만큼 부여합니다.', cost: { echoRemnants: 90 }, replaces: { type: PatternType.PENTA, face: CoinFace.TAILS }, effect: (): AbilityEffect => ({ defense: 10, temporaryEffect: { name: 'resonanceBasedOnMajority', value: 10, duration: 2 } }) },
    'MAGE_RES_AWAH': { id: 'MAGE_RES_AWAH', name: '스스로 죽어라', description: '피해를 2만큼 (자신의 공명) 번 반복하고, 자신의 공명을 모두 잃습니다.', cost: { echoRemnants: 100 }, replaces: { type: PatternType.AWAKENING, face: CoinFace.HEADS }, effect: (p): AbilityEffect => ({ multiHit: { count: p.temporaryEffects?.resonance?.value || 0, damage: 2 }, temporaryEffect: { name: 'clearResonance', value: true, duration: 1 } }) },
    'MAGE_RES_AWAT': { id: 'MAGE_RES_AWAT', name: '반영구적 휴식', description: '2턴간 적 공격 피해를 자신의 공명 만큼 추가로 방어합니다. 추가로 방어한 양 만큼 자신의 공명을 잃습니다.', cost: { echoRemnants: 100 }, replaces: { type: PatternType.AWAKENING, face: CoinFace.TAILS }, effect: (): AbilityEffect => ({ temporaryEffect: { name: 'resonanceShieldAndDrain', value: true, duration: 3 } }) },
  },
};

const UNDEFINED_ABILITY = {
  name: `미정의`,
  description: "효과 없음.",
  effect: () => ({}),
};

export const getPlayerAbility = (playerClass: CharacterClass, acquiredSkills: string[], type: PatternType, face?: CoinFace) => {
    const acquiredSkillId = acquiredSkills.find(skillId => {
      const skillDef = playerSkillUnlocks[playerClass]?.[skillId];
      return skillDef && skillDef.replaces.type === type && skillDef.replaces.face === face;
    });

    if (acquiredSkillId) {
      const upgrade = playerSkillUnlocks[playerClass]?.[acquiredSkillId];
      if (upgrade) return upgrade;
    }

    const baseAbilitySet = playerAbilities[playerClass]?.[type];
    if (face && baseAbilitySet?.[face as CoinFace]) {
      return baseAbilitySet[face as CoinFace];
    }
    if (baseAbilitySet && !face && baseAbilitySet.description) { // For UNIQUE, AWAKENING
      return baseAbilitySet;
    }

    return UNDEFINED_ABILITY;
};
