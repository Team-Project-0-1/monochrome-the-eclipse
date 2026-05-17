import { Coin, CoinFace, DetectedPattern, PatternType, StageNode, NodeType, PlayerCharacter, CharacterClass } from '../types';
import { COIN_COUNT, STAGE_TURNS, MINIBOSS_TURN_OPTIONS, BOSS_TURN } from '../constants';

export interface RouteGenerationLogEntry {
  seed: string;
  stageNumber: number;
  turn: number;
  nodeId: string;
  nodeIndex: number;
  type: NodeType;
  isGuaranteed: boolean;
  reason: string;
  roll?: number;
}

interface StageGenerationOptions {
  seed?: string | number;
  onLog?: (entry: RouteGenerationLogEntry) => void;
}

type RandomSource = () => number;

const hashSeed = (seedInput: string | number): number => {
  const seed = String(seedInput);
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const createSeededRandom = (seedInput: string | number): RandomSource => {
  let state = hashSeed(seedInput) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

export const createRouteSeed = (stageNumber: number): string => (
  `stage-${stageNumber}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
);

const toLogRoll = (roll: number) => Math.round(roll * 1000) / 1000;

export const flipCoin = (headsChance: number = 0.5): CoinFace => Math.random() < headsChance ? CoinFace.HEADS : CoinFace.TAILS;

export const generateCoins = (count = COIN_COUNT): Coin[] => {
  return Array(count)
    .fill(null)
    .map((_, idx) => ({ face: flipCoin(), locked: false, id: Date.now() + Math.random() + idx }));
};

export const detectPatterns = (coins: Coin[]): DetectedPattern[] => {
  const patterns: DetectedPattern[] = [];
  const faces = coins.map((c) => c.face);
  const addPattern = (pattern: Omit<DetectedPattern, "id">) => {
    const id = `p-${pattern.type}-${pattern.face || 'special'}-${pattern.indices.join('-')}`;
    patterns.push({ ...pattern, id });
  };

  const patternTypesByLength: { [key: number]: PatternType } = {
    2: PatternType.PAIR,
    3: PatternType.TRIPLE,
    4: PatternType.QUAD,
    5: PatternType.PENTA,
  };

  let i = 0;
  while (i < faces.length) {
    let j = i;
    while (j < faces.length && faces[j] === faces[i]) {
      j++;
    }
    const streakLen = j - i;
    const streakFace = faces[i];
    const streakStart = i;

    if (streakLen >= 2) {
      for (let subLen = 2; subLen <= streakLen; subLen++) {
        const type = patternTypesByLength[subLen];
        if (type) {
          for (let k = 0; k <= streakLen - subLen; k++) {
            const indices = Array.from({ length: subLen }, (_, l) => streakStart + k + l);
            addPattern({ type, face: streakFace, count: subLen, indices });
          }
        }
      }
    }
    i = j;
  }

  const headCount = faces.filter((f) => f === CoinFace.HEADS).length;
  const tailCount = faces.filter((f) => f === CoinFace.TAILS).length;

  if (headCount === 1) {
    const headIndex = faces.findIndex((f) => f === CoinFace.HEADS);
    addPattern({ type: PatternType.UNIQUE, face: CoinFace.HEADS, count: 1, indices: [headIndex] });
  }
  if (tailCount === 1) {
    const tailIndex = faces.findIndex((f) => f === CoinFace.TAILS);
    addPattern({ type: PatternType.UNIQUE, face: CoinFace.TAILS, count: 1, indices: [tailIndex] });
  }

  const isAlternating = () => {
    if (faces.length !== 5) return false;
    for (let i = 0; i < faces.length - 1; i++) {
      if (faces[i] === faces[i+1]) return false;
    }
    return true;
  };

  if (isAlternating()) {
    addPattern({ type: PatternType.AWAKENING, count: 5, indices: [0,1,2,3,4], face: faces[0] });
  }

  return patterns.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if ((a.face || 'ZZZ') !== (b.face || 'ZZZ')) return (a.face || 'ZZZ').localeCompare(b.face || 'ZZZ');
    return a.indices[0] - b.indices[0];
  });
};


export const generateStageNodes = (stageNumber: number, options: StageGenerationOptions = {}): StageNode[][] => {
  let nodes: StageNode[][] = [];
  const seed = String(options.seed ?? createRouteSeed(stageNumber));
  const random = createSeededRandom(seed);
  const logNode = (entry: Omit<RouteGenerationLogEntry, 'seed' | 'stageNumber'>) => {
    options.onLog?.({ seed, stageNumber, ...entry });
  };
  const minibossRoll = random();
  const minibossTurn = MINIBOSS_TURN_OPTIONS[Math.floor(minibossRoll * MINIBOSS_TURN_OPTIONS.length)];

  for (let turn = 1; turn <= STAGE_TURNS; turn++) {
    const turnNodes: StageNode[] = [];

    const generateWithGuaranteedNode = (guaranteedType: NodeType) => {
        const guaranteedRoll = random();
        const guaranteedPosition = Math.floor(guaranteedRoll * 3);
        for (let i = 0; i < 3; i++) {
            const randomType = getRandomNodeType(turn, random);
            const isGuaranteed = i === guaranteedPosition;
            const type = isGuaranteed ? guaranteedType : randomType.type;
            turnNodes.push({ type, id: `${turn}-${i}`, isGuaranteed: i === guaranteedPosition });
            logNode({
              turn,
              nodeId: `${turn}-${i}`,
              nodeIndex: i,
              type,
              isGuaranteed,
              reason: isGuaranteed ? `guaranteed-${guaranteedType.toLowerCase()}` : 'weighted-random',
              roll: isGuaranteed ? toLogRoll(guaranteedRoll) : randomType.roll,
            });
        }
    };

    if (turn === 1) {
      for (let i = 0; i < 3; i++) {
        turnNodes.push({ type: NodeType.COMBAT, id: `${turn}-${i}` });
        logNode({ turn, nodeId: `${turn}-${i}`, nodeIndex: i, type: NodeType.COMBAT, isGuaranteed: false, reason: 'opening-combat' });
      }
    } else if (turn === 4) {
      generateWithGuaranteedNode(NodeType.REST);
    } else if (turn === 7) {
      generateWithGuaranteedNode(NodeType.SHOP);
    } else if (turn === minibossTurn) {
      generateWithGuaranteedNode(NodeType.MINIBOSS);
    } else if (turn === 9) {
      generateWithGuaranteedNode(NodeType.REST);
    } else if (turn === 14) {
      for (let i = 0; i < 3; i++) {
        turnNodes.push({ type: NodeType.REST, id: `${turn}-${i}`, isGuaranteed: true });
        logNode({ turn, nodeId: `${turn}-${i}`, nodeIndex: i, type: NodeType.REST, isGuaranteed: true, reason: 'pre-boss-rest' });
      }
    } else if (turn === BOSS_TURN) {
      for (let i = 0; i < 3; i++) {
        turnNodes.push({ type: NodeType.BOSS, id: `${turn}-${i}`, isGuaranteed: true });
        logNode({ turn, nodeId: `${turn}-${i}`, nodeIndex: i, type: NodeType.BOSS, isGuaranteed: true, reason: 'stage-boss' });
      }
    } else {
      for (let i = 0; i < 3; i++) {
          const randomType = getRandomNodeType(turn, random);
          const type = randomType.type;
          const node: StageNode = { type, id: `${turn}-${i}`};
          turnNodes.push(node);
          logNode({
            turn,
            nodeId: node.id,
            nodeIndex: i,
            type,
            isGuaranteed: false,
            reason: 'weighted-random',
            roll: randomType.roll,
          });
      }
    }
    nodes.push(turnNodes);
  }
  nodes = applyAntiConsecutiveRules(nodes, logNode);
  return nodes;
};

export const generateLoggedStageNodes = (stageNumber: number, seed = createRouteSeed(stageNumber)) => {
  const routeGenerationLog: RouteGenerationLogEntry[] = [];
  const stageNodes = generateStageNodes(stageNumber, {
    seed,
    onLog: (entry) => routeGenerationLog.push(entry),
  });

  return { stageNodes, routeSeed: String(seed), routeGenerationLog };
};

const getRandomNodeType = (turn: number, random: RandomSource = Math.random): { type: NodeType; roll: number } => {
  const weights = turn < 3
    ? { [NodeType.COMBAT]: 70, [NodeType.EVENT]: 30 }
    : { [NodeType.COMBAT]: 50, [NodeType.EVENT]: 20, [NodeType.SHOP]: 15, [NodeType.REST]: 15 };
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const roll = random() * totalWeight;
  let remaining = roll;
  for (const [type, weight] of Object.entries(weights)) {
    remaining -= weight;
    if (remaining <= 0) return { type: type as NodeType, roll: toLogRoll(roll) };
  }
  return { type: NodeType.COMBAT, roll: toLogRoll(roll) };
};

const applyAntiConsecutiveRules = (
  nodes: StageNode[][],
  onLog?: (entry: Omit<RouteGenerationLogEntry, 'seed' | 'stageNumber'>) => void,
): StageNode[][] => {
  const specialNodes: NodeType[] = [NodeType.MINIBOSS, NodeType.SHOP, NodeType.REST];
  for (let turn = 1; turn < nodes.length; turn++) {
    const currentTurnNodes = nodes[turn];
    const previousTurnNodes = nodes[turn - 1];
    for (let pos = 0; pos < currentTurnNodes.length; pos++) {
      const currentNode = currentTurnNodes[pos];
      if (currentNode.isGuaranteed) continue;
      if (specialNodes.includes(currentNode.type)) {
        const hasSpecialInPreviousConnectedPath =
          (pos > 0 && specialNodes.includes(previousTurnNodes[pos-1]?.type)) ||
          specialNodes.includes(previousTurnNodes[pos]?.type) ||
          (pos < previousTurnNodes.length -1 && specialNodes.includes(previousTurnNodes[pos+1]?.type));

        if (hasSpecialInPreviousConnectedPath && currentNode.type !== NodeType.REST && !(turn + 1 === 9 || turn + 1 === 14) ) {
          const previousType = currentNode.type;
          currentNode.type = NodeType.COMBAT;
          onLog?.({
            turn: turn + 1,
            nodeId: currentNode.id,
            nodeIndex: pos,
            type: NodeType.COMBAT,
            isGuaranteed: false,
            reason: `anti-consecutive:${previousType.toLowerCase()}->combat`,
          });
        }
      }
    }
  }
  return nodes;
};
