import { CharacterClass, NodeType, StageNode } from '../types';
import type { PlayerCharacter } from '../types';

export interface NodePresentation {
  label: string;
  signal: string;
  routeName: string;
  routeHint: string;
  senseHint: string;
  description: string;
  risk: string;
  reward: string;
  stake: string;
  className: string;
  lineClassName: string;
  iconClassName: string;
}

const baseNodePresentation: Record<NodeType, Omit<NodePresentation, 'routeName' | 'routeHint' | 'senseHint'>> = {
  [NodeType.COMBAT]: {
    label: '전투',
    signal: '적성 신호',
    description: '기본 전투입니다. 체력을 잃을 수 있지만 빌드 성장에 필요한 자원을 안정적으로 얻습니다.',
    risk: '체력 손실',
    reward: '에코 + 감각 조각',
    stake: '안정적인 성장',
    className: 'border-red-400/50 bg-red-950/50 text-red-50 hover:border-red-300 hover:bg-red-900/60',
    lineClassName: 'from-red-500/0 via-red-300/80 to-red-500/0',
    iconClassName: 'text-red-200',
  },
  [NodeType.SHOP]: {
    label: '상점',
    signal: '보급 신호',
    description: '전투 없이 다음 전투를 준비합니다. 보유 에코를 회복, 행운 동전, 기술 강화로 바꿉니다.',
    risk: '전투 보상 없음',
    reward: '즉시 보강',
    stake: '현재 빌드 보정',
    className: 'border-fuchsia-400/45 bg-fuchsia-950/45 text-fuchsia-50 hover:border-fuchsia-300 hover:bg-fuchsia-900/55',
    lineClassName: 'from-fuchsia-500/0 via-fuchsia-300/80 to-fuchsia-500/0',
    iconClassName: 'text-fuchsia-200',
  },
  [NodeType.REST]: {
    label: '휴식',
    signal: '회복 지대',
    description: '체력을 회복하거나 기억의 제단에 들러 장기 성장을 정리합니다. 다음 전투 전 숨을 고르는 선택입니다.',
    risk: '보상 성장 지연',
    reward: '회복 / 기억 정비',
    stake: '생존 안정화',
    className: 'border-emerald-400/45 bg-emerald-950/45 text-emerald-50 hover:border-emerald-300 hover:bg-emerald-900/55',
    lineClassName: 'from-emerald-500/0 via-emerald-300/80 to-emerald-500/0',
    iconClassName: 'text-emerald-200',
  },
  [NodeType.EVENT]: {
    label: '사건',
    signal: '흔들리는 기억',
    description: '확률과 조건이 섞인 장면입니다. 큰 보상, 손실, 전투 진입이 모두 가능합니다.',
    risk: '예측 불가',
    reward: '고변동 보상',
    stake: '런의 방향 전환',
    className: 'border-amber-300/50 bg-amber-950/45 text-amber-50 hover:border-amber-200 hover:bg-amber-900/55',
    lineClassName: 'from-amber-500/0 via-amber-200/80 to-amber-500/0',
    iconClassName: 'text-amber-100',
  },
  [NodeType.MINIBOSS]: {
    label: '중간 보스',
    signal: '고밀도 위협',
    description: '난도가 높지만 행운 동전과 핵심 보상을 노릴 수 있습니다. 런을 강하게 밀어붙이는 선택입니다.',
    risk: '큰 피해 가능',
    reward: '희귀 보상',
    stake: '고위험 성장',
    className: 'border-orange-300/60 bg-orange-950/55 text-orange-50 hover:border-orange-200 hover:bg-orange-900/65',
    lineClassName: 'from-orange-500/0 via-orange-200/90 to-orange-500/0',
    iconClassName: 'text-orange-100',
  },
  [NodeType.BOSS]: {
    label: '보스',
    signal: '이클립스 핵',
    description: '층의 종착점입니다. 지금까지 만든 조합, 자원, 체력 관리가 한 번에 검증됩니다.',
    risk: '치명적 전투',
    reward: '층 돌파',
    stake: '런 진행 관문',
    className: 'border-white/60 bg-black/80 text-white hover:border-red-200 hover:bg-gray-950',
    lineClassName: 'from-white/0 via-white/90 to-white/0',
    iconClassName: 'text-white',
  },
  [NodeType.UNKNOWN]: {
    label: '미확인',
    signal: '불명 신호',
    description: '정체를 알 수 없는 지점입니다. 위험과 보상이 모두 가려져 있습니다.',
    risk: '불명',
    reward: '불명',
    stake: '정보 부족',
    className: 'border-slate-400/45 bg-slate-900/55 text-slate-50 hover:border-slate-200 hover:bg-slate-800/70',
    lineClassName: 'from-slate-500/0 via-slate-200/80 to-slate-500/0',
    iconClassName: 'text-slate-100',
  },
};

const routeNames = ['정면 돌파', '측면 추적', '기회 진입', '침묵 경로'];
const routeHints = ['빠른 충돌', '보상 탐색', '리스크 관리', '변수 확인'];

const characterSenseHints: Record<CharacterClass, Record<NodeType, string>> = {
  [CharacterClass.WARRIOR]: {
    [NodeType.COMBAT]: '굽쇠가 적성 리듬을 크게 울립니다. 안정적인 공명 성장을 기대할 수 있습니다.',
    [NodeType.SHOP]: '보급 신호의 잡음이 낮습니다. 에코를 전투 준비로 바꾸기 좋습니다.',
    [NodeType.REST]: '소리가 잦아드는 안전 주파수입니다. 체력과 기억을 정돈할 수 있습니다.',
    [NodeType.EVENT]: '흔들리는 파형이 섞여 있습니다. 보상과 손실의 진폭이 큽니다.',
    [NodeType.MINIBOSS]: '무거운 위협음이 겹칩니다. 버티면 핵심 보상이 크게 울립니다.',
    [NodeType.BOSS]: '이클립스 핵음이 정면에서 들립니다. 지금 빌드 전체가 시험대에 오릅니다.',
    [NodeType.UNKNOWN]: '소리의 윤곽이 흐립니다. 정보가 부족한 경로입니다.',
  },
  [CharacterClass.ROGUE]: {
    [NodeType.COMBAT]: '잔향이 짧고 선명합니다. 추적으로 주도권을 잡기 쉬운 충돌입니다.',
    [NodeType.SHOP]: '냄새가 오래 머문 보급로입니다. 필요한 도구를 고르기 좋습니다.',
    [NodeType.REST]: '위협의 잔향이 옅습니다. 다음 추적 전에 숨을 고를 수 있습니다.',
    [NodeType.EVENT]: '냄새가 여러 갈래로 끊깁니다. 성공하면 방향을 크게 틀 수 있습니다.',
    [NodeType.MINIBOSS]: '강한 표적 냄새가 남았습니다. 위험하지만 추적 보상이 큽니다.',
    [NodeType.BOSS]: '가장 짙은 흔적이 한곳으로 모입니다. 결착을 준비해야 합니다.',
    [NodeType.UNKNOWN]: '잔향이 덮여 있습니다. 선택 전 정보가 거의 없습니다.',
  },
  [CharacterClass.TANK]: {
    [NodeType.COMBAT]: '지면 진동이 일정합니다. 받아내며 성장하기 좋은 전투입니다.',
    [NodeType.SHOP]: '금속 진동이 안정적입니다. 방어와 보급을 보강할 수 있습니다.',
    [NodeType.REST]: '충격이 끊긴 지대입니다. 손상된 리듬을 회복하기 좋습니다.',
    [NodeType.EVENT]: '진동이 불규칙합니다. 반격할 틈과 위험이 함께 있습니다.',
    [NodeType.MINIBOSS]: '묵직한 압력이 다가옵니다. 견디면 고위험 보상을 노릴 수 있습니다.',
    [NodeType.BOSS]: '층 전체가 한 번에 울립니다. 방어선이 버틸지 확인해야 합니다.',
    [NodeType.UNKNOWN]: '촉감이 비어 있습니다. 압력의 정체가 보이지 않습니다.',
  },
  [CharacterClass.MAGE]: {
    [NodeType.COMBAT]: '영적 시야에 적의 윤곽이 잡힙니다. 저주와 봉인을 쌓기 좋습니다.',
    [NodeType.SHOP]: '마력 흔적이 보급품에 남아 있습니다. 필요한 강화로 흐름을 바꿀 수 있습니다.',
    [NodeType.REST]: '시야가 맑아지는 지점입니다. 다음 주문 전 부담을 낮출 수 있습니다.',
    [NodeType.EVENT]: '기억과 저주의 결이 겹칩니다. 큰 변수의 장면입니다.',
    [NodeType.MINIBOSS]: '짙은 마력 압력이 보입니다. 버티면 강한 각인을 얻을 수 있습니다.',
    [NodeType.BOSS]: '이클립스의 핵심 윤곽이 드러납니다. 모든 준비가 검증됩니다.',
    [NodeType.UNKNOWN]: '시야가 닫혀 있습니다. 감지되지 않는 위험이 있습니다.',
  },
};

const getSenseHint = (node: StageNode, player?: PlayerCharacter | null) => {
  if (!player) return '감각 동기화: 경로 정보를 더 확인해야 합니다.';
  const hint = characterSenseHints[player.class]?.[node.type] ?? '경로 신호가 불안정합니다.';
  return `${player.signature ?? '감각 동기화'}: ${hint}`;
};

export const getNodePresentation = (node: StageNode, index: number, player?: PlayerCharacter | null): NodePresentation => ({
  ...baseNodePresentation[node.type],
  routeName: routeNames[index % routeNames.length],
  routeHint: routeHints[index % routeHints.length],
  senseHint: getSenseHint(node, player),
});

export const getNodeTypeCounts = (nodes: StageNode[]) => (
  nodes.reduce<Record<string, number>>((counts, node) => {
    counts[node.type] = (counts[node.type] ?? 0) + 1;
    return counts;
  }, {})
);
