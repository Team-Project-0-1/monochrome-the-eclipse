import {
  ShopItem,
  StatusEffectType,
} from "../types";

export const shopData: { basic: { name: string; items: ShopItem[] } } = {
  basic: {
    name: "유기체 상점",
    items: [
      {
        id: "reserve_coin",
        name: "예비 동전",
        description: "전투 중 동전을 교체할 수 있는 예비 동전입니다. (최대 3개 소지)",
        cost: 100, // This is a placeholder, the actual cost is dynamic
        type: 'consumable',
        effect: {},
      },
      {
        id: "heal_potion",
        name: "치유의 물약",
        description: "체력을 30% 회복합니다",
        cost: 50,
        type: "consumable",
        effect: { heal: 0.3 },
      },
      {
        id: "amplify_crystal",
        name: "증폭 수정",
        description: "증폭 +3을 획득합니다",
        cost: 40,
        type: "consumable",
        effect: { statusEffect: { type: StatusEffectType.AMPLIFY, value: 3 } },
      },
      {
        id: "sense_fragment_bundle",
        name: "감각 파편 묶음",
        description: "감각 파편 3개를 획득합니다",
        cost: 150,
        type: "resource",
        effect: { senseFragments: 3 },
      },
    ],
  },
};