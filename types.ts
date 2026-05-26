import { LucideIcon as OriginalLucideIcon } from 'lucide-react';

// Re-exporting to be used in other files.
export type LucideIcon = OriginalLucideIcon;

export enum GameState {
  MENU = "MENU",
  CHARACTER_SELECT = "CHARACTER_SELECT",
  EXPLORATION = "EXPLORATION",
  COMBAT = "COMBAT",
  SHOP = "SHOP",
  REST = "REST",
  EVENT = "EVENT",
  REWARD = "REWARD",
  GAME_OVER = "GAME_OVER",
  VICTORY = "VICTORY",
  STAGE_CLEAR = "STAGE_CLEAR",
  MEMORY_ALTAR = "MEMORY_ALTAR",
}

export enum NodeType {
  COMBAT = "COMBAT",
  SHOP = "SHOP",
  REST = "REST",
  EVENT = "EVENT",
  MINIBOSS = "MINIBOSS",
  BOSS = "BOSS",
  UNKNOWN = "UNKNOWN",
}

export interface StageNode {
  type: NodeType;
  id: string;
  isGuaranteed?: boolean;
}

export enum CoinFace {
  HEADS = "HEADS",
  TAILS = "TAILS",
}

export interface Coin {
  face: CoinFace | null;
  locked: boolean;
  id: number;
}

export enum PatternType {
  PAIR = "PAIR", // 2
  TRIPLE = "TRIPLE", // 3
  QUAD = "QUAD", // 4
  PENTA = "PENTA", // 5
  UNIQUE = "UNIQUE", // 1 of a kind
  AWAKENING = "AWAKENING", // Special, e.g. alternating
}

export interface DetectedPattern {
  id: string;
  type: PatternType;
  face?: CoinFace;
  count: number;
  indices: number[];
}

export enum CharacterClass {
  WARRIOR = "WARRIOR",
  ROGUE = "ROGUE",
  TANK = "TANK",
  MAGE = "MAGE",
}

export enum StatusEffectType {
  AMPLIFY = "AMPLIFY", // 증폭: Atk up
  RESONANCE = "RESONANCE", // 공명: Damage after X turns
  MARK = "MARK", // 표식: Take extra damage
  BLEED = "BLEED", // 출혈: Damage over time on hit
  COUNTER = "COUNTER", // 반격: Retaliate when attacked
  SHATTER = "SHATTER", // 분쇄: Armor break
  CURSE = "CURSE", // 저주: Damage over time
  SEAL = "SEAL", // 봉인: Atk down
  PURSUIT = "PURSUIT", // 추적: Damage at end of turn, consumes stacks
}

export type StatusEffects = {
  [key in StatusEffectType]?: number;
};

export interface SpriteAnimations {
  idle: number;
  attack: number;
  skill: number;
  death: number;
}

interface Character {
  name: string;
  currentHp: number;
  maxHp: number;
  baseAtk: number;
  baseDef: number;
  temporaryDefense: number;
  statusEffects: StatusEffects;
  temporaryEffects?: { [key: string]: any };
}

export interface PlayerCharacter extends Character {
  class: CharacterClass;
  title: string;
  weapon?: string;
  signature?: string;
  portraitSrc?: string;
  assetKey?: string;
  spriteSheetSrc?: string;
  spriteFrameSize?: number;
  spriteAnimations?: SpriteAnimations;
  acquiredSkills: string[];
  memoryUpgrades: { [key in MemoryUpgradeType]: number };
  activeSkillCooldown: number;
}

export interface EnemyCharacter extends Character {
  key: string;
  assetKey?: string;
  portraitSrc?: string;
  spriteSheetSrc?: string;
  spriteFrameSize?: number;
  spriteAnimations?: SpriteAnimations;
  coins: Coin[];
  detectedPatterns: DetectedPattern[];
  tier: 'normal' | 'miniboss' | 'boss';
}

export interface EnemyIntent {
  description: string;
  damage: number;
  defense: number;
  category?: 'attack' | 'buff' | 'debuff' | 'move' | 'idle';
  dangerLevel?: 'normal' | 'high';
  rangeLabel?: string;
  hitCount?: number;
  sourcePatternKeys: string[];
  sourcePatternType?: PatternType;
  sourcePatternFace?: CoinFace;
  sourcePatternCount?: number;
  sourceCoinIndices?: number[];
}

export interface CombatPrediction {
  player: { attack: { formula: string; total: number }; defense: { formula: string; total: number } };
  enemy: { attack: { formula: string; total: number }; defense: { formula: string; total: number } };
  damageToPlayer: number;
  damageToEnemy: number;
  playerHp: number;
  enemyHp: number;
}

export enum MemoryUpgradeType {
  maxHp = "maxHp",
  baseAtk = "baseAtk",
  baseDef = "baseDef",
}

export interface MemoryUpgradeDataDefinition {
  name: string;
  description: string;
  cost: (level: number) => number;
  effect: number;
}

export interface ShopItem {
    id: string;
    name: string;
    description: string;
    cost: number;
    type: 'consumable' | 'resource';
    effect: { [key: string]: any };
}

export interface PatternUpgradeDefinition {
  id: string;
  name: string;
  description: string;
  cost: { senseFragments: number };
}

// --- NEW ABILITY EFFECT TYPES ---

export interface StatusApplication {
  type: StatusEffectType;
  value: number;
  target?: 'player' | 'enemy' | 'self'; // 'self' is context-dependent
}

export interface TemporaryEffect {
  name: string;
  value: any;
  duration: number;
  accumulative?: boolean;
}

export interface MultiHit {
  count: number;
  damage: number;
}

export interface AbilityEffect {
  fixedDamage?: number;
  selfDamage?: number;
  multiHit?: MultiHit;
  defense?: number;
  bonusDefense?: number;
  heal?: number;
  status?: StatusApplication | StatusApplication[];
  statusCost?: { type: StatusEffectType; value: number };
  statusDrain?: { type: StatusEffectType; value: number };
  enemyStatusDrain?: { type: StatusEffectType; value: number };
  temporaryEffect?: TemporaryEffect;
  enemyTemporaryEffect?: TemporaryEffect;
  gainMaxAmplify?: boolean;
  bonusDamage?: number; // For legacy/complex logic
  damageMultiplier?: number;
  healIfPairedWithSame?: boolean;
  enemyFlipMiddleCoinIfBreakDefense?: boolean;
  playerFlipCoinIfBreakDefense?: number;
  addShatterIfNotAttacking?: number;
}

export interface SkillUpgradeDefinition {
    id: string;
    name: string;
    description: string;
    cost: { echoRemnants: number };
    replaces: {
        type: PatternType;
        face?: CoinFace;
    };
    effect: (player: PlayerCharacter, enemy: EnemyCharacter, coins?: Coin[], selectedPatterns?: DetectedPattern[]) => AbilityEffect;
}

export interface MonsterPatternDefinition {
  name: string;
  type: PatternType;
  face?: CoinFace;
  description: string;
  effect: (enemy: EnemyCharacter, player: PlayerCharacter) => AbilityEffect;
}

export interface MonsterPhaseDefinition {
  id: string;
  label: string;
  hpBelow?: number;
  turnFrom?: number;
  patterns: string[];
}


export interface EventChoice {
    text: string;
    requiredSense?: CharacterClass;
    requiredResources?: {
        echoRemnants?: number;
        senseFragments?: number;
        memoryPieces?: number;
    };
    baseSuccessRate?: number;
    senseBonus?: { [key in CharacterClass]?: number };
    success?: { [key: string]: any };
    failure?: { [key: string]: any };
    guaranteed?: boolean;
    result?: { [key: string]: any };
}

export interface EventDefinition {
    id: string;
    title: string;
    description: string;
    choices: EventChoice[];
    isFollowUp?: boolean;
}

export interface MonsterData {
    [key: string]: {
        name: string;
        hp: number;
        baseAtk: number;
        baseDef: number;
        patterns: string[];
        tier: 'normal' | 'miniboss' | 'boss';
        phases?: MonsterPhaseDefinition[];
        assetKey?: string;
        portraitSrc?: string;
        spriteSheetSrc?: string;
        spriteFrameSize?: number;
        spriteAnimations?: SpriteAnimations;
        passives?: string[];
    };
}

export interface CombatLogMessage {
    id: number;
    turn: number;
    message: string;
    type: 'player' | 'enemy' | 'system' | 'roll' | 'damage' | 'defense' | 'heal' | 'status';
}

export interface CombatEffect {
  id: number;
  type: 'damage' | 'status' | 'skill' | 'heal' | 'defense' | 'temp_stat';
  target: 'player' | 'enemy';
  data: any; // e.g., { amount: 10 } for damage, { statusType: 'BLEED', value: 2 } for status
}

export interface SkillReplacementState {
    isModalOpen: boolean;
    newSkill: SkillUpgradeDefinition;
}

export interface TooltipContent {
  icon: string;
  imagePath?: string;
  name: string;
  description: string;
  color: string;
}

export interface TooltipState {
  content: TooltipContent;
  position: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
}

export interface ActiveSkillState {
    phase: 'idle' | 'rogue_flip' | 'tank_swap_1' | 'tank_swap_2' | 'mage_lock';
    selection: number[];
}
