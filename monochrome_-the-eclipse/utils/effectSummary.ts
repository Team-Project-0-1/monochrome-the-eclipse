import { effectConfig } from '../data/dataEffects';
import { StatusEffectType } from '../types';
import type { ShopEntryPresentation } from './shopPresentation';

export type EffectTone =
  | 'damage'
  | 'defense'
  | 'heal'
  | 'buff'
  | 'debuff'
  | 'coin'
  | 'timing'
  | 'condition'
  | 'resource'
  | 'neutral';

export interface EffectChip {
  id: string;
  tone: EffectTone;
  label: string;
  value?: string;
  statusType?: StatusEffectType;
}

export interface EffectSummary {
  headline: string;
  chips: EffectChip[];
  detail: string;
  cue: string;
  priorityTone: EffectTone;
}

interface AbilityLike {
  name?: string;
  description: string;
}

interface ShopEntryLike {
  name: string;
  description: string;
  presentation: ShopEntryPresentation;
  tab?: string;
}

const statusTone = (type: StatusEffectType): EffectTone => (
  effectConfig[type]?.isBuff ? 'buff' : 'debuff'
);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sentenceFrom = (text: string) => (
  text
    .replace(/\s+/g, ' ')
    .split(/[.\n]/)
    .map(part => part.trim())
    .find(Boolean) ?? '상세 효과'
);

const normalizeValue = (value?: string) => {
  if (!value) return undefined;
  const compact = value
    .replace(/\s+/g, ' ')
    .replace(/\s*만큼\s*$/g, '')
    .replace(/\s*(?:줍니다|얻습니다|회복합니다|부여합니다|획득합니다)\s*$/g, '')
    .trim();
  return compact.length > 0 ? compact : undefined;
};

const firstMatch = (text: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return normalizeValue(match[1]);
  }
  return undefined;
};

const makeChip = (
  tone: EffectTone,
  label: string,
  value?: string,
  statusType?: StatusEffectType,
): EffectChip => ({
  id: `${tone}-${statusType ?? label}-${value ?? 'flag'}`,
  tone,
  label,
  value,
  statusType,
});

const pushUnique = (chips: EffectChip[], chip: EffectChip) => {
  const key = `${chip.tone}:${chip.label}:${chip.value ?? ''}:${chip.statusType ?? ''}`;
  if (!chips.some(existing => `${existing.tone}:${existing.label}:${existing.value ?? ''}:${existing.statusType ?? ''}` === key)) {
    chips.push(chip);
  }
};

const extractCoreChips = (text: string): EffectChip[] => {
  const chips: EffectChip[] = [];

  const multiHit = text.match(/피해를\s*([0-9]+)\s*만큼\s*([0-9]+)\s*번/);
  if (multiHit) {
    pushUnique(chips, makeChip('damage', '피해', `${multiHit[1]}x${multiHit[2]}`));
  } else {
    const damage = firstMatch(text, [
      /피해를\s*([^.,\n]+?)(?:\s*(?:줍니다|준다|반복|입힙니다|부여|증가|감소|발생|$))/,
      /([0-9]+(?:\s*[+*~]\s*[^.,\n]+?)?)\s*피해/,
    ]);
    if (damage || /피해/.test(text)) pushUnique(chips, makeChip('damage', '피해', damage));
  }

  const defense = firstMatch(text, [
    /방어를\s*([^.,\n]+?)(?:\s*(?:얻습니다|얻고|획득|증가|$))/,
    /방어력(?:을|이)?\s*([^.,\n]+?)(?:\s*(?:얻|증가|감소|$))/,
  ]);
  if (defense || /방어/.test(text)) pushUnique(chips, makeChip('defense', '방어', defense));

  const heal = firstMatch(text, [
    /체력을\s*([^.,\n]+?)(?:\s*(?:회복|얻|$))/,
    /회복(?:합니다|한다|하고)?\s*([^.,\n]+)?/,
  ]);
  if (heal || /회복/.test(text)) pushUnique(chips, makeChip('heal', '회복', heal));

  Object.entries(effectConfig).forEach(([typeKey, config]) => {
    if (!config?.name) return;
    const type = typeKey as StatusEffectType;
    const name = config.name;
    if (!text.includes(name)) return;

    const escaped = escapeRegExp(name);
    const value = firstMatch(text, [
      new RegExp(`${escaped}\\s*([+-]\\s*[0-9]+(?:\\s*~\\s*[0-9]+)?)`),
      new RegExp(`${escaped}(?:을|를)?\\s*([0-9]+(?:\\s*~\\s*[0-9]+)?)\\s*(?:얻|부여|획득|감소|잃|소모|유지|전환)`),
      new RegExp(`${escaped}\\s*수치(?:가|를)?\\s*([0-9]+(?:\\s*~\\s*[0-9]+)?)`),
    ]);
    pushUnique(chips, makeChip(statusTone(type), name, value?.replace(/\s+/g, ''), type));
  });

  if (/다음 턴|턴 종료|턴 시작|[0-9]+\s*턴간|[0-9]+\s*턴 뒤/.test(text)) {
    const value = firstMatch(text, [/([0-9]+\s*턴(?:간| 뒤)?)/]);
    pushUnique(chips, makeChip('timing', /다음 턴/.test(text) ? '다음 턴' : '지속', value?.replace(/\s+/g, '')));
  }

  if (/연계|\[연계\]|경우|이면|라면|이상|이하|확률|조건/.test(text)) {
    const label = /\[연계\]|연계/.test(text) ? '연계' : /확률/.test(text) ? '확률' : '조건부';
    pushUnique(chips, makeChip('condition', label));
  }

  if (/동전|앞면|뒷면|고정|뒤집|교체|리롤/.test(text)) {
    const label = /교체/.test(text) ? '동전 교체' : /고정/.test(text) ? '동전 고정' : /확률/.test(text) ? '확률 조정' : '동전 조작';
    pushUnique(chips, makeChip('coin', label));
  }

  if (/모든\s+\S+\s*을?\s*잃|소모|잃습니다|감소/.test(text)) {
    pushUnique(chips, makeChip('condition', '소모'));
  }

  if (/반복|번 반복/.test(text)) {
    const repeats = firstMatch(text, [/([0-9]+)\s*번\s*반복/]);
    pushUnique(chips, makeChip('neutral', '반복', repeats?.replace(/\s+/g, '')));
  }

  return chips;
};

const formatChip = (chip: EffectChip) => `${chip.label}${chip.value ? ` ${chip.value}` : ''}`;

const buildHeadline = (text: string, chips: EffectChip[]) => {
  const priority: EffectTone[] = ['damage', 'defense', 'heal', 'buff', 'debuff', 'coin', 'timing', 'condition'];
  const primary = chips
    .filter(chip => priority.includes(chip.tone))
    .sort((a, b) => priority.indexOf(a.tone) - priority.indexOf(b.tone))
    .slice(0, 3)
    .map(formatChip);

  return primary.length > 0 ? primary.join(' · ') : sentenceFrom(text);
};

const hasTone = (chips: EffectChip[], tone: EffectTone) => chips.some(chip => chip.tone === tone);

const firstChipValue = (chips: EffectChip[], tone: EffectTone) => (
  chips.find(chip => chip.tone === tone)?.value
);

const getPriorityTone = (chips: EffectChip[]): EffectTone => {
  const priority: EffectTone[] = ['damage', 'defense', 'heal', 'debuff', 'buff', 'coin', 'timing', 'condition', 'resource'];
  return priority.find(tone => hasTone(chips, tone)) ?? 'neutral';
};

const buildCue = (text: string, chips: EffectChip[]) => {
  const damage = firstChipValue(chips, 'damage');
  const defense = firstChipValue(chips, 'defense');

  if (hasTone(chips, 'damage') && hasTone(chips, 'defense')) {
    return '공격과 생존을 같이 챙기는 선택';
  }
  if (hasTone(chips, 'damage') && hasTone(chips, 'condition')) {
    return `${damage ? `피해 ${damage}` : '공격'} 조건을 먼저 맞추기`;
  }
  if (hasTone(chips, 'damage')) {
    return `${damage ? `피해 ${damage}` : '피해'}로 적 HP 줄이기`;
  }
  if (hasTone(chips, 'defense') && hasTone(chips, 'heal')) {
    return '이번 턴 생존을 우선하기';
  }
  if (hasTone(chips, 'defense')) {
    return `${defense ? `방어 ${defense}` : '방어'} 확보해 받는 피해 줄이기`;
  }
  if (hasTone(chips, 'heal')) {
    return '체력을 회복해 다음 전투 준비';
  }
  if (hasTone(chips, 'coin')) {
    return '동전 결과를 바꿔 필요한 족보 만들기';
  }
  if (hasTone(chips, 'debuff')) {
    return '상태를 걸어 다음 턴 고점 만들기';
  }
  if (hasTone(chips, 'buff')) {
    return '내 상태를 쌓아 다음 행동 강화';
  }
  if (hasTone(chips, 'resource')) {
    return '비용과 구매 가능 여부 먼저 확인';
  }
  if (/패시브|강화|영구/.test(text)) {
    return '자동으로 쌓이는 성장 효과';
  }
  return '핵심 태그만 보고 필요하면 원문 확인';
};

export const summarizeDescription = (text: string): EffectSummary => {
  const detail = text.trim();
  const chips = extractCoreChips(detail);

  if (chips.length === 0) {
    pushUnique(chips, makeChip('neutral', '상세'));
  }

  return {
    headline: buildHeadline(detail, chips),
    chips,
    detail,
    cue: buildCue(detail, chips),
    priorityTone: getPriorityTone(chips),
  };
};

export const summarizeAbility = ({ description }: AbilityLike): EffectSummary => (
  summarizeDescription(description)
);

export const summarizeShopEntry = ({ description, presentation, tab }: ShopEntryLike): EffectSummary => {
  const summary = summarizeDescription(description);
  const chips = [...summary.chips];

  pushUnique(chips, makeChip('resource', presentation.statusLabel));
  pushUnique(chips, makeChip('resource', presentation.currency === 'echo' ? '에코' : '감각', String(presentation.cost)));

  if (tab === 'items') pushUnique(chips, makeChip('timing', '즉시 적용'));
  if (tab === 'upgrades') pushUnique(chips, makeChip('buff', '족보 확장'));
  if (tab === 'skills') pushUnique(chips, makeChip('buff', '기술 교체'));

  return {
    ...summary,
    headline: buildHeadline(description, chips),
    chips,
    cue: buildCue(description, chips),
    priorityTone: getPriorityTone(chips),
  };
};
