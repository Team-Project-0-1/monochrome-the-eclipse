import { characterData } from '../data/dataCharacters';
import { monsterData } from '../data/dataMonsters';
import {
  applyPassives,
  processEndOfTurn,
  processStartOfTurn,
  resolveEnemyActions,
  resolvePlayerActions,
  setupNextTurn,
} from '../utils/combatLogic';
import { detectPatterns } from '../utils/gameLogic';
import {
  CharacterClass,
  Coin,
  CoinFace,
  CombatLogMessage,
  DetectedPattern,
  EnemyCharacter,
  EnemyIntent,
  GameState,
  PatternType,
  PlayerCharacter,
  StatusEffectType,
} from '../types';

type ValidationState = {
  player: PlayerCharacter;
  enemy: EnemyCharacter;
  unlockedPatterns: string[];
  playerCoins: Coin[];
  selectedPatterns: DetectedPattern[];
  enemyIntent: EnemyIntent | null;
  combatLog: CombatLogMessage[];
  combatTurn: number;
};

type ValidationResult = {
  name: string;
  passed: boolean;
  details?: string;
};

const results: ValidationResult[] = [];

const log = (state: ValidationState) => (message: string, type: CombatLogMessage['type']) => {
  state.combatLog.push({ id: state.combatLog.length + 1, turn: state.combatTurn, message, type });
};

const coin = (face: CoinFace, id: number): Coin => ({ face, id, locked: false });

const makePattern = (type: PatternType, face: CoinFace | undefined, indices: number[]): DetectedPattern => ({
  id: `${type}-${face ?? 'NONE'}-${indices.join('-')}`,
  type,
  face,
  count: indices.length,
  indices,
});

const makePlayer = (characterClass: CharacterClass, acquiredSkills: string[] = []): PlayerCharacter => {
  const data = characterData[characterClass];
  return {
    ...data,
    class: characterClass,
    currentHp: data.hp,
    maxHp: data.hp,
    baseAtk: data.baseAtk,
    baseDef: data.baseDef,
    temporaryDefense: 0,
    statusEffects: {},
    temporaryEffects: {},
    acquiredSkills,
    memoryUpgrades: { maxHp: 0, baseAtk: 0, baseDef: 0 },
    activeSkillCooldown: 0,
  };
};

const makeEnemy = (key = 'subject162'): EnemyCharacter => {
  const data = monsterData[key];
  const coins = [
    coin(CoinFace.HEADS, 1),
    coin(CoinFace.HEADS, 2),
    coin(CoinFace.HEADS, 3),
    coin(CoinFace.TAILS, 4),
    coin(CoinFace.TAILS, 5),
  ];

  return {
    key,
    name: data.name,
    currentHp: data.hp,
    maxHp: data.hp,
    baseAtk: data.baseAtk,
    baseDef: data.baseDef,
    temporaryDefense: 0,
    statusEffects: {},
    temporaryEffects: {},
    coins,
    detectedPatterns: detectPatterns(coins),
    tier: data.tier,
  };
};

const makeState = (
  characterClass: CharacterClass,
  unlockedPatterns: string[],
  options: {
    acquiredSkills?: string[];
    enemyKey?: string;
    playerCoins?: Coin[];
    selectedPatterns?: DetectedPattern[];
    enemyIntent?: EnemyIntent;
  } = {}
): ValidationState => {
  const playerCoins = options.playerCoins ?? [
    coin(CoinFace.HEADS, 11),
    coin(CoinFace.HEADS, 12),
    coin(CoinFace.HEADS, 13),
    coin(CoinFace.TAILS, 14),
    coin(CoinFace.TAILS, 15),
  ];

  return {
    player: makePlayer(characterClass, options.acquiredSkills),
    enemy: makeEnemy(options.enemyKey),
    unlockedPatterns,
    playerCoins,
    selectedPatterns: options.selectedPatterns ?? [],
    enemyIntent: options.enemyIntent ?? null,
    combatLog: [],
    combatTurn: 1,
  };
};

const expect = (name: string, passed: boolean, details?: string) => {
  results.push({ name, passed, details });
};

const runWarriorValidations = () => {
  const amplifyState = makeState(CharacterClass.WARRIOR, [
    'WARRIOR_PASSIVE_LOSE_HP_GAIN_AMP',
    'WARRIOR_PASSIVE_AMP_GIVES_DEF',
    'WARRIOR_PASSIVE_AMP_BONUS_UP',
    'WARRIOR_PASSIVE_MAX_AMP_20',
  ]);
  amplifyState.player.statusEffects[StatusEffectType.AMPLIFY] = 19;

  applyPassives(amplifyState, 'PLAYER_TURN_START', log(amplifyState));
  resolvePlayerActions(amplifyState, log(amplifyState));

  expect(
    '전사 증폭 상한/증폭 보너스/방어 전환',
    amplifyState.player.statusEffects[StatusEffectType.AMPLIFY] === 20 && amplifyState.player.temporaryDefense === 11,
    `AMPLIFY=${amplifyState.player.statusEffects[StatusEffectType.AMPLIFY]}, DEF=${amplifyState.player.temporaryDefense}`
  );

  const resonanceState = makeState(CharacterClass.WARRIOR, [
    'WARRIOR_PASSIVE_HEADS_GIVE_RESONANCE',
    'WARRIOR_PASSIVE_RESONANCE_DURATION',
  ]);
  applyPassives(resonanceState, 'PLAYER_TURN_START', log(resonanceState));

  expect(
    '전사 적 공명 3턴 지속',
    resonanceState.enemy.statusEffects[StatusEffectType.RESONANCE] === 1 &&
      resonanceState.enemy.temporaryEffects?.resonanceCountdown?.value === 3,
    `RESONANCE=${resonanceState.enemy.statusEffects[StatusEffectType.RESONANCE]}, countdown=${resonanceState.enemy.temporaryEffects?.resonanceCountdown?.value}`
  );

  const bleedState = makeState(CharacterClass.WARRIOR, ['WARRIOR_PASSIVE_SHARE_BLEED_DMG'], {
    enemyIntent: {
      description: '검증용 공격',
      damage: 4,
      defense: 0,
      sourcePatternKeys: ['MARAUDER2_SWING'],
      sourceCoinIndices: [0, 1],
    },
  });
  bleedState.player.statusEffects[StatusEffectType.BLEED] = 1;
  resolveEnemyActions(bleedState, log(bleedState));

  const expectedSharedBleed = Math.floor(bleedState.player.maxHp * 0.05);
  expect(
    '전사 출혈 피해 전이',
    bleedState.enemy.currentHp === bleedState.enemy.maxHp - expectedSharedBleed,
    `enemyHp=${bleedState.enemy.currentHp}, expected=${bleedState.enemy.maxHp - expectedSharedBleed}`
  );
};

const runRogueValidations = () => {
  const state = makeState(CharacterClass.ROGUE, [
    'ROGUE_P_DUAL_WIELD',
    'ROGUE_P_HUNT_FLOW',
    'ROGUE_P_HUNT_INSTINCT',
  ]);
  state.player.statusEffects[StatusEffectType.PURSUIT] = 6;

  processEndOfTurn(state, log(state));

  expect(
    '도적 추적 2회 발동/6 감소/사냥의 흐름 예약',
    state.enemy.currentHp === state.enemy.maxHp - 12 &&
      state.player.statusEffects[StatusEffectType.PURSUIT] === 0 &&
      state.player.temporaryEffects?.huntFlowQueued?.value === true,
    `enemyHp=${state.enemy.currentHp}, pursuit=${state.player.statusEffects[StatusEffectType.PURSUIT]}, queued=${state.player.temporaryEffects?.huntFlowQueued?.value}`
  );
};

const runTankValidations = () => {
  const absorbState = makeState(CharacterClass.TANK, ['TANK_P_ABSORB_DEFENSE'], {
    selectedPatterns: [makePattern(PatternType.PAIR, CoinFace.HEADS, [0, 1])],
  });
  absorbState.enemy.temporaryDefense = 2;
  resolvePlayerActions(absorbState, log(absorbState));

  expect(
    '탱커 방어 흡수',
    absorbState.player.temporaryDefense === 3 && absorbState.enemy.currentHp === absorbState.enemy.maxHp - 3,
    `playerDef=${absorbState.player.temporaryDefense}, enemyHp=${absorbState.enemy.currentHp}`
  );

  const shatterState = makeState(CharacterClass.TANK, ['TANK_P_SHATTER_DEF']);
  shatterState.enemy.statusEffects[StatusEffectType.SHATTER] = 1;
  processEndOfTurn(shatterState, log(shatterState));
  processStartOfTurn(shatterState.player, shatterState.enemy, log(shatterState), shatterState);

  expect(
    '탱커 분쇄 감소 다음 턴 방어',
    shatterState.player.temporaryDefense === 3,
    `playerDef=${shatterState.player.temporaryDefense}`
  );

  const chainState = makeState(CharacterClass.TANK, ['TANK_P_CHAIN_HEAL']);
  chainState.player.statusEffects[StatusEffectType.SEAL] = 10;
  for (let turn = 0; turn < 5; turn += 1) {
    applyPassives(chainState, 'PLAYER_TURN_START', log(chainState));
  }

  expect(
    '탱커 봉인 5턴 유지 방어 보상',
    chainState.player.temporaryDefense === 5 && chainState.player.temporaryEffects?.chainHealUsed?.value === true,
    `playerDef=${chainState.player.temporaryDefense}, used=${chainState.player.temporaryEffects?.chainHealUsed?.value}`
  );
};

const runMageValidations = () => {
  const curseState = makeState(CharacterClass.MAGE, ['MAGE_P_CURSE_NUKE'], { enemyKey: 'subject162' });
  curseState.player.statusEffects[StatusEffectType.CURSE] = 20;
  processStartOfTurn(curseState.player, curseState.enemy, log(curseState), curseState);

  expect(
    '마법사 강림 저주 폭발',
    curseState.enemy.currentHp === curseState.enemy.maxHp - 40 &&
      (curseState.player.statusEffects[StatusEffectType.CURSE] || 0) === 0,
    `enemyHp=${curseState.enemy.currentHp}, curse=${curseState.player.statusEffects[StatusEffectType.CURSE]}`
  );

  const sealState = makeState(CharacterClass.MAGE, ['MAGE_P_SEAL_DEFENSE'], {
    acquiredSkills: ['MAGE_SEAL_PH'],
    selectedPatterns: [makePattern(PatternType.PAIR, CoinFace.HEADS, [0, 1])],
  });
  sealState.enemy.statusEffects[StatusEffectType.SEAL] = 9;
  resolvePlayerActions(sealState, log(sealState));

  expect(
    '마법사 봉인 10 이상 적 동전 뒷면 전환',
    sealState.enemy.coins.every(item => item.face === CoinFace.TAILS) &&
      sealState.player.temporaryEffects?.mageSealDefenseUsed?.value === true,
    `enemyFaces=${sealState.enemy.coins.map(item => item.face).join(',')}, used=${sealState.player.temporaryEffects?.mageSealDefenseUsed?.value}`
  );

  const executeState = makeState(CharacterClass.MAGE, ['MAGE_P_SEAL_EXECUTE'], {
    acquiredSkills: ['MAGE_SEAL_AWAH'],
    selectedPatterns: [makePattern(PatternType.AWAKENING, CoinFace.HEADS, [0, 1, 2, 3, 4])],
  });
  executeState.enemy.currentHp = 9;
  executeState.enemy.maxHp = 100;
  executeState.enemy.statusEffects[StatusEffectType.SEAL] = 1;
  resolvePlayerActions(executeState, log(executeState));

  expect(
    '마법사 나태의 낫 10% 처형',
    executeState.enemy.currentHp === 0,
    `enemyHp=${executeState.enemy.currentHp}`
  );

  const durationState = makeState(CharacterClass.MAGE, ['MAGE_P_RESONANCE_DURATION'], {
    acquiredSkills: ['MAGE_RES_QT'],
    selectedPatterns: [makePattern(PatternType.QUAD, CoinFace.TAILS, [0, 1, 2, 3])],
  });
  resolvePlayerActions(durationState, log(durationState));

  expect(
    '마법사 self 공명 3 이상 3턴 지속',
    durationState.player.statusEffects[StatusEffectType.RESONANCE] === 3 &&
      durationState.player.temporaryEffects?.resonanceCountdown?.value === 3,
    `RESONANCE=${durationState.player.statusEffects[StatusEffectType.RESONANCE]}, countdown=${durationState.player.temporaryEffects?.resonanceCountdown?.value}`
  );

  const selfHateState = makeState(CharacterClass.MAGE, ['MAGE_P_SELF_HATE'], {
    acquiredSkills: ['MAGE_RES_UH'],
    selectedPatterns: [makePattern(PatternType.UNIQUE, CoinFace.HEADS, [0])],
  });
  selfHateState.player.statusEffects[StatusEffectType.RESONANCE] = 2;
  resolvePlayerActions(selfHateState, log(selfHateState));

  expect(
    '마법사 자기 혐오 즉시 발동',
    (selfHateState.player.statusEffects[StatusEffectType.RESONANCE] || 0) === 0 &&
      selfHateState.player.currentHp === selfHateState.player.maxHp - 6 &&
      selfHateState.enemy.currentHp === selfHateState.enemy.maxHp - 6,
    `playerHp=${selfHateState.player.currentHp}, enemyHp=${selfHateState.enemy.currentHp}, resonance=${selfHateState.player.statusEffects[StatusEffectType.RESONANCE]}`
  );

  const shieldState = makeState(CharacterClass.MAGE, ['MAGE_P_RESONANCE_SHIELD'], {
    enemyIntent: {
      description: '검증용 공격',
      damage: 4,
      defense: 0,
      sourcePatternKeys: ['MARAUDER2_SWING'],
      sourceCoinIndices: [0, 1],
    },
  });
  shieldState.player.statusEffects[StatusEffectType.RESONANCE] = 10;
  shieldState.player.temporaryEffects = {
    resonanceAsShield: { value: true, duration: 2 },
    resonance: { name: 'resonance', value: 10, duration: 2, accumulative: true },
    resonanceCountdown: { value: 2, duration: 999 },
  };
  resolveEnemyActions(shieldState, log(shieldState));

  expect(
    '마법사 공명 방벽 피해 흡수',
    shieldState.player.currentHp === shieldState.player.maxHp &&
      shieldState.player.statusEffects[StatusEffectType.RESONANCE] === 6,
    `playerHp=${shieldState.player.currentHp}, resonance=${shieldState.player.statusEffects[StatusEffectType.RESONANCE]}`
  );

  const recoilState = makeState(CharacterClass.MAGE, ['MAGE_P_RESONANCE_RECOIL']);
  recoilState.player.statusEffects[StatusEffectType.RESONANCE] = 4;
  recoilState.player.temporaryEffects = {
    resonance: { name: 'resonance', value: 4, duration: 1, accumulative: true },
    resonanceCountdown: { value: 1, duration: 999 },
  };
  processStartOfTurn(recoilState.player, recoilState.enemy, log(recoilState), recoilState);

  expect(
    '마법사 공명 피해 반동 재부여',
    recoilState.player.currentHp === recoilState.player.maxHp - 4 &&
      recoilState.player.statusEffects[StatusEffectType.RESONANCE] === 2,
    `playerHp=${recoilState.player.currentHp}, resonance=${recoilState.player.statusEffects[StatusEffectType.RESONANCE]}`
  );
};

const run = () => {
  runWarriorValidations();
  runRogueValidations();
  runTankValidations();
  runMageValidations();

  const failed = results.filter(result => !result.passed);
  for (const result of results) {
    const prefix = result.passed ? 'PASS' : 'FAIL';
    console.log(`${prefix} ${result.name}${result.details ? ` :: ${result.details}` : ''}`);
  }

  if (failed.length > 0) {
    throw new Error(`${failed.length} passive validation(s) failed.`);
  }

  console.log(`Validated ${results.length} passive scenarios.`);
};

run();
