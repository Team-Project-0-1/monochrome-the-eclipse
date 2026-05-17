import {
  MemoryUpgradeDataDefinition,
  MemoryUpgradeType,
} from './types';

export const COIN_COUNT = 5;
export const TURN_COOLDOWN = 3;
export const STAGE_TURNS = 15;
export const MINIBOSS_TURN_OPTIONS = [5, 6] as const;
export const BOSS_TURN = 15;
export const MAX_SKILLS = 12;
export const MAX_RESERVE_COINS = 7;
export const APP_RELEASE_LABEL = 'Prototype v0.1';
export const APP_RELEASE_SCOPE = '1-3층 공개 프로토타입';

export const MEMORY_UPGRADE_DATA: { [key in MemoryUpgradeType]: MemoryUpgradeDataDefinition } = {
  maxHp: {
    name: '생명의 기억',
    description: '최대 체력이 5 증가합니다.',
    cost: (level: number) => 1 + level,
    effect: 5,
  },
  baseAtk: {
    name: '공격의 기억',
    description: '기본 공격력이 1 증가합니다.',
    cost: (level: number) => 1 + level,
    effect: 1,
  },
  baseDef: {
    name: '수호의 기억',
    description: '기본 방어력이 1 증가합니다.',
    cost: (level: number) => 1 + level,
    effect: 1,
  },
} as const;
