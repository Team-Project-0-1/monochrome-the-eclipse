import { describe, it, expect } from 'vitest';
import { summarizeDescription, summarizeAbility } from './effectSummary';

describe('summarizeDescription', () => {
  it('summarizes a pure-damage description', () => {
    const summary = summarizeDescription('피해를 4 줍니다.');
    expect(summary.priorityTone).toBe('damage');
    expect(summary.headline).toBe('피해 4');
    expect(summary.cue).toBe('피해 4로 적 HP 줄이기');
    expect(summary.chips.some(c => c.tone === 'damage' && c.value === '4')).toBe(true);
  });

  it('summarizes a pure-defense description', () => {
    const summary = summarizeDescription('방어를 3 얻습니다.');
    expect(summary.priorityTone).toBe('defense');
    expect(summary.headline).toBe('방어 3');
    expect(summary.cue).toBe('방어 3 확보해 받는 피해 줄이기');
  });

  it('summarizes a pure-heal description', () => {
    const summary = summarizeDescription('체력을 5 회복합니다.');
    expect(summary.priorityTone).toBe('heal');
    expect(summary.headline).toBe('회복 5');
    expect(summary.cue).toBe('체력을 회복해 다음 전투 준비');
  });

  it('parses multi-hit damage as "NxM"', () => {
    // matches /피해를\s*([0-9]+)\s*만큼\s*([0-9]+)\s*번/
    const summary = summarizeDescription('피해를 3 만큼 4 번 줍니다.');
    expect(summary.chips.some(c => c.tone === 'damage' && c.value === '3x4')).toBe(true);
    expect(summary.headline).toBe('피해 3x4');
  });

  it('combines damage and defense into the "공격과 생존" cue and orders the headline', () => {
    const summary = summarizeDescription('피해를 4 줍니다. 방어를 3 얻습니다.');
    // damage precedes defense in the headline priority order.
    expect(summary.headline).toBe('피해 4 · 방어 3');
    expect(summary.cue).toBe('공격과 생존을 같이 챙기는 선택');
    expect(summary.priorityTone).toBe('damage');
  });

  it('builds a buff status chip for an AMPLIFY description', () => {
    // effectConfig AMPLIFY name "증폭" isBuff true.
    const summary = summarizeDescription('증폭을 2 얻습니다.');
    const ampChip = summary.chips.find(c => c.label === '증폭');
    expect(ampChip?.tone).toBe('buff');
    expect(ampChip?.value).toBe('2');
    expect(summary.priorityTone).toBe('buff');
  });

  it('builds a debuff status chip for a CURSE description', () => {
    // effectConfig CURSE name "저주" isBuff false -> debuff tone.
    const summary = summarizeDescription('저주를 3 부여합니다.');
    const curseChip = summary.chips.find(c => c.label === '저주');
    expect(curseChip?.tone).toBe('debuff');
    expect(curseChip?.value).toBe('3');
  });

  it('falls back to a "상세" chip for an unparseable description', () => {
    const summary = summarizeDescription('알 수 없는 효과');
    expect(summary.chips).toHaveLength(1);
    expect(summary.chips[0]).toMatchObject({ tone: 'neutral', label: '상세' });
    expect(summary.priorityTone).toBe('neutral');
    expect(summary.cue).toBe('핵심 태그만 보고 필요하면 원문 확인');
  });

  it('preserves the trimmed original text as detail', () => {
    const summary = summarizeDescription('  피해를 4 줍니다.  ');
    expect(summary.detail).toBe('피해를 4 줍니다.');
  });
});

describe('summarizeAbility', () => {
  it('delegates to summarizeDescription using the ability description', () => {
    const summary = summarizeAbility({ name: '진동 타격', description: '피해를 4 줍니다.' });
    expect(summary.headline).toBe('피해 4');
    expect(summary.priorityTone).toBe('damage');
  });
});
