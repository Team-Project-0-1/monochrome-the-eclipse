export const STAGE3_TBD_MARKER = "__STAGE3_TBD__" as const;

export type Stage3ExpectedType =
  | "string"
  | "number"
  | "boolean"
  | "enum"
  | "array"
  | "object"
  | "effect";

export interface Stage3Tbd<TExpected extends Stage3ExpectedType = Stage3ExpectedType> {
  __stage3_tbd__: typeof STAGE3_TBD_MARKER;
  expectedType: TExpected;
  sourceNeeded: string;
  owner: "content" | "combat" | "balance" | "art" | "audio" | "implementation";
  note?: string;
}

export type Stage3DraftField<T, TExpected extends Stage3ExpectedType = Stage3ExpectedType> =
  | T
  | Stage3Tbd<TExpected>;

export type Stage3MonsterRole = "warrior" | "assassin" | "mage" | "utility" | "hybrid" | "buff";
export type Stage3IntentCategory = "attack" | "buff" | "debuff" | "move" | "idle";
export type Stage3DangerLevel = "normal" | "high";
export type Stage3SecretTechniqueKind = "active" | "passive";

export interface Stage3IntentTemplate {
  category: Stage3DraftField<Stage3IntentCategory, "enum">;
  dangerLevel: Stage3DraftField<Stage3DangerLevel, "enum">;
  rangeLabel: Stage3DraftField<string, "string">;
  playerCue: Stage3DraftField<string, "string">;
}

export interface Stage3MonsterPatternTemplate {
  id: string;
  runtimeKey: string;
  name: Stage3DraftField<string, "string">;
  trigger: Stage3DraftField<string, "string">;
  role: Stage3DraftField<Stage3MonsterRole, "enum">;
  effect: Stage3DraftField<string, "effect">;
  intent: Stage3IntentTemplate;
}

export interface Stage3NormalMonsterTemplate {
  id: string;
  runtimeKey: string;
  status: "tbd" | "ready";
  tier: "normal";
  name: Stage3DraftField<string, "string">;
  role: Stage3DraftField<Stage3MonsterRole, "enum">;
  hp: Stage3DraftField<number, "number">;
  baseAtk: Stage3DraftField<number, "number">;
  baseDef: Stage3DraftField<number, "number">;
  patterns: Stage3MonsterPatternTemplate[];
  passives: Stage3DraftField<string[], "array">;
}

export interface Stage3MinibossTemplate extends Omit<Stage3NormalMonsterTemplate, "tier"> {
  tier: "miniboss";
}

export interface Stage3BossPhaseTemplate {
  id: string;
  runtimeKey: string;
  label: Stage3DraftField<string, "string">;
  hpBelow?: Stage3DraftField<number, "number">;
  turnFrom?: Stage3DraftField<number, "number">;
  patternIds: Stage3DraftField<string[], "array">;
  playerCue: Stage3DraftField<string, "string">;
}

export interface Stage3BossTemplate {
  id: string;
  runtimeKey: string;
  status: "tbd" | "ready";
  tier: "boss";
  role: Stage3DraftField<Stage3MonsterRole, "enum">;
  name: Stage3DraftField<string, "string">;
  hp: Stage3DraftField<number, "number">;
  baseAtk: Stage3DraftField<number, "number">;
  baseDef: Stage3DraftField<number, "number">;
  patterns: Stage3MonsterPatternTemplate[];
  phases: Stage3BossPhaseTemplate[];
  passives: Stage3DraftField<string[], "array">;
  dangerIntentThreshold: Stage3DraftField<string, "string">;
}

export interface Stage3SecretTechniqueTemplate {
  id: string;
  runtimeKey: string;
  status: "tbd" | "ready";
  kind: Stage3DraftField<Stage3SecretTechniqueKind, "enum">;
  name: Stage3DraftField<string, "string">;
  role: Stage3DraftField<string, "string">;
  usageRule: Stage3DraftField<string, "string">;
  effect: Stage3DraftField<string, "effect">;
  playerCue: Stage3DraftField<string, "string">;
}

export interface Stage3AssetSet {
  generationMode: string;
  combatBackground: string;
  eventBackgrounds: string[];
  monsterDirectory: string;
}

export interface Stage3EventTemplate {
  id: string;
  status: "ready";
  title: string;
  backgroundPath: string;
  role: string;
}

export interface Stage3ContentInput {
  schemaVersion: "stage3-content-input-v1";
  stage: 3;
  status: "locked" | "ready";
  source: {
    title: string;
    documentId: string;
    verifiedAt: string;
    relatedDocuments?: Array<{
      title: string;
      documentId: string;
      scope: string;
    }>;
  };
  gate: {
    normalCombatsBeforeBoss: 2;
    targetTotalEnemyCount: 8;
    maxEnemiesOnField: 3;
    bossReward: "secretTechniqueDraft";
    rewardOfferCount: 3;
    rewardChooseCount: 1;
  };
  assetSet?: Stage3AssetSet;
  stage3EventTemplates?: Stage3EventTemplate[];
  normalMonsterTemplates: Stage3NormalMonsterTemplate[];
  minibossTemplates?: Stage3MinibossTemplate[];
  bossTemplates: Stage3BossTemplate[];
  secretTechniqueRewardTemplates: Stage3SecretTechniqueTemplate[];
  implementationNotes?: string[];
}

export const isStage3Tbd = (value: unknown): value is Stage3Tbd => (
  Boolean(value) &&
  typeof value === "object" &&
  (value as { __stage3_tbd__?: unknown }).__stage3_tbd__ === STAGE3_TBD_MARKER
);
