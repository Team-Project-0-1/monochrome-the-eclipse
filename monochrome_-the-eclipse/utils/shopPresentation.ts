import {
  PatternUpgradeDefinition,
  SkillUpgradeDefinition,
  ShopItem,
} from '../types';
import { MAX_RESERVE_COINS } from '../constants';

export type ShopEntryStatus = 'available' | 'blocked' | 'owned';
export type ShopCurrency = 'echo' | 'sense';

export interface ShopEntryPresentation {
  cost: number;
  currency: ShopCurrency;
  status: ShopEntryStatus;
  statusLabel: string;
  actionLabel: string;
  helperText: string;
}

const currencyLabels: Record<ShopCurrency, string> = {
  echo: '에코',
  sense: '감각',
};

export const formatShopCost = (cost: number, currency: ShopCurrency): string => {
  return `${cost} ${currencyLabels[currency]}`;
};

export const getBasicItemPresentation = (
  item: ShopItem,
  echoRemnants: number,
  reserveCoinCount: number,
  reserveCoinShopCost: number,
): ShopEntryPresentation => {
  const isReserveCoin = item.id === 'reserve_coin';
  const cost = isReserveCoin ? reserveCoinShopCost : item.cost;
  const isFull = isReserveCoin && reserveCoinCount >= MAX_RESERVE_COINS;
  const canAfford = echoRemnants >= cost;

  if (isFull) {
    return {
      cost,
      currency: 'echo',
      status: 'owned',
      statusLabel: '한도 도달',
      actionLabel: '보유중',
      helperText: `예비 동전은 최대 ${MAX_RESERVE_COINS}개까지 보유할 수 있습니다.`,
    };
  }

  if (!canAfford) {
    return {
      cost,
      currency: 'echo',
      status: 'blocked',
      statusLabel: '에코 부족',
      actionLabel: formatShopCost(cost, 'echo'),
      helperText: `${cost - echoRemnants} 에코가 더 필요합니다.`,
    };
  }

  return {
    cost,
    currency: 'echo',
    status: 'available',
    statusLabel: '구매 가능',
    actionLabel: formatShopCost(cost, 'echo'),
    helperText: isReserveCoin ? '전투 중 교체용 동전을 준비합니다.' : '즉시 적용되는 보급품입니다.',
  };
};

export const getPatternUpgradePresentation = (
  item: PatternUpgradeDefinition,
  senseFragments: number,
): ShopEntryPresentation => {
  const cost = item.cost.senseFragments;
  const canAfford = senseFragments >= cost;

  return {
    cost,
    currency: 'sense',
    status: canAfford ? 'available' : 'blocked',
    statusLabel: canAfford ? '습득 가능' : '감각 부족',
    actionLabel: formatShopCost(cost, 'sense'),
    helperText: canAfford ? '이번 런의 동전 족보 선택지를 넓힙니다.' : `${cost - senseFragments} 감각이 더 필요합니다.`,
  };
};

export const getSkillUpgradePresentation = (
  item: SkillUpgradeDefinition,
  echoRemnants: number,
): ShopEntryPresentation => {
  const cost = item.cost.echoRemnants;
  const canAfford = echoRemnants >= cost;

  return {
    cost,
    currency: 'echo',
    status: canAfford ? 'available' : 'blocked',
    statusLabel: canAfford ? '습득 가능' : '에코 부족',
    actionLabel: formatShopCost(cost, 'echo'),
    helperText: canAfford ? '패턴 발동 시 사용할 새 기술을 추가합니다.' : `${cost - echoRemnants} 에코가 더 필요합니다.`,
  };
};
