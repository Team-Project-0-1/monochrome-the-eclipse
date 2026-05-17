import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(appDir, "..");
const strict = process.argv.includes("--strict");
const templatePath = path.join(appDir, "content", "stage3", "stage3-content-template.json");
const failures = [];

const allowedRoles = new Set(["warrior", "assassin", "mage", "utility", "hybrid", "buff"]);
const allowedIntentCategories = new Set(["attack", "buff", "debuff", "move", "idle"]);
const allowedDangerLevels = new Set(["normal", "high"]);
const allowedSecretTechniqueKinds = new Set(["active", "passive"]);

const readText = (relativePath) => {
  const fullPath = path.join(appDir, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`missing ${path.relative(repoDir, fullPath)}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
};

const requireFile = (relativePath) => {
  const fullPath = path.join(appDir, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`missing ${path.relative(repoDir, fullPath)}`);
  }
};

const formatPath = (segments) => segments.join(".");

const isPlainObject = (value) => (
  Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const requireArray = (value, label, minLength = 1) => {
  if (!Array.isArray(value)) {
    failures.push(`${label} must be an array`);
    return [];
  }
  if (value.length < minLength) {
    failures.push(`${label} must include at least ${minLength} entry`);
  }
  return value;
};

const requireString = (value, segments) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    failures.push(`${formatPath(segments)} must be a non-empty string`);
  }
};

const requireNumber = (value, segments) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    failures.push(`${formatPath(segments)} must be a finite number`);
  }
};

const requireEnum = (value, segments, allowedValues) => {
  if (!allowedValues.has(value)) {
    failures.push(`${formatPath(segments)} uses invalid enum value ${JSON.stringify(value)}`);
  }
};

const requireText = (label, text, expected) => {
  if (!text.includes(expected)) {
    failures.push(`${label} does not include ${expected}`);
  }
};

const walkForTbd = (value, segments = ["root"]) => {
  if (typeof value === "string" && value.includes("__STAGE3_TBD__")) {
    failures.push(`${formatPath(segments)} still uses __STAGE3_TBD__`);
    return;
  }
  if (isPlainObject(value) && value.__stage3_tbd__ === "__STAGE3_TBD__") {
    failures.push(`${formatPath(segments)} still uses __STAGE3_TBD__`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkForTbd(item, [...segments, String(index)]));
    return;
  }
  if (isPlainObject(value)) {
    Object.entries(value).forEach(([key, nested]) => walkForTbd(nested, [...segments, key]));
  }
};

const validateIntent = (intent, segments) => {
  if (!isPlainObject(intent)) {
    failures.push(`${formatPath(segments)} must be an object`);
    return;
  }
  requireEnum(intent.category, [...segments, "category"], allowedIntentCategories);
  requireEnum(intent.dangerLevel, [...segments, "dangerLevel"], allowedDangerLevels);
  requireString(intent.rangeLabel, [...segments, "rangeLabel"]);
  requireString(intent.playerCue, [...segments, "playerCue"]);
};

const validatePatterns = (patterns, segments, runtimePatternKeys) => {
  const rows = requireArray(patterns, formatPath(segments), 1);
  rows.forEach((pattern, index) => {
    const next = [...segments, String(index)];
    if (!/^stage3_/.test(pattern.id ?? "")) failures.push(`${formatPath(next)}.id must start with stage3_`);
    requireString(pattern.runtimeKey, [...next, "runtimeKey"]);
    requireString(pattern.name, [...next, "name"]);
    requireString(pattern.trigger, [...next, "trigger"]);
    requireEnum(pattern.role, [...next, "role"], allowedRoles);
    requireString(pattern.effect, [...next, "effect"]);
    validateIntent(pattern.intent, [...next, "intent"]);
    if (pattern.runtimeKey && !runtimePatternKeys.has(pattern.runtimeKey)) {
      failures.push(`${formatPath(next)}.runtimeKey ${pattern.runtimeKey} is missing from dataMonsters.ts`);
    }
  });
};

const validateMonster = (monster, segments, tier, runtimeMonsterKeys, runtimePatternKeys) => {
  if (!/^stage3_/.test(monster.id ?? "")) failures.push(`${formatPath(segments)}.id must start with stage3_`);
  requireString(monster.runtimeKey, [...segments, "runtimeKey"]);
  if (monster.runtimeKey && !runtimeMonsterKeys.has(monster.runtimeKey)) {
    failures.push(`${formatPath(segments)}.runtimeKey ${monster.runtimeKey} is missing from dataMonsters.ts`);
  }
  if (monster.status !== "ready") failures.push(`${formatPath(segments)}.status must be ready`);
  if (monster.tier !== tier) failures.push(`${formatPath(segments)}.tier must be ${tier}`);
  requireString(monster.name, [...segments, "name"]);
  requireEnum(monster.role, [...segments, "role"], allowedRoles);
  requireNumber(monster.hp, [...segments, "hp"]);
  requireNumber(monster.baseAtk, [...segments, "baseAtk"]);
  requireNumber(monster.baseDef, [...segments, "baseDef"]);
  validatePatterns(monster.patterns, [...segments, "patterns"], runtimePatternKeys);
  requireArray(monster.passives, `${formatPath(segments)}.passives`, 1);
};

const dataStages = readText("dataStages.ts");
const dataMonsters = readText("dataMonsters.ts");

const runtimeMonsterKeys = new Set([
  "annihilationAmplifier",
  "fleshCultivator",
  "abyssObserver",
  "apostleOfFlesh",
  "eclipseChoir",
]);

const runtimePatternKeys = new Set([
  "AMPLIFIER_DISTORTION_BROADCAST",
  "AMPLIFIER_DOOM_RESONANCE",
  "AMPLIFIER_AMPLIFICATION_BROADCAST",
  "CULTIVATOR_BUTCHER_HOOK",
  "CULTIVATOR_TEAR_FLESH",
  "CULTIVATOR_FEEDING_PREP",
  "OBSERVER_GAZE",
  "OBSERVER_MENTAL_EROSION",
  "OBSERVER_CLOSED_EYE",
  "APOSTLE_FLESH_POUNDING",
  "APOSTLE_EVOLUTION_CRUSH",
  "APOSTLE_REGENERATIVE_TISSUE",
  "APOSTLE_IMPERFECT_MOLT",
  "CHOIR_DISSONANT_CHORD",
  "CHOIR_EROSION_CHORUS",
  "CHOIR_COLLAPSE_CANTICLE",
  "CHOIR_ECLIPSE_OPENING",
  "CHOIR_SILENT_PRAYER",
  "CHOIR_BLACK_SANCTUARY",
]);

runtimeMonsterKeys.forEach(key => requireText("dataMonsters.ts", dataMonsters, `${key}: {`));
runtimePatternKeys.forEach(key => requireText("dataMonsters.ts", dataMonsters, `${key}: {`));

[
  "combatPool: ['annihilationAmplifier', 'fleshCultivator', 'abyssObserver']",
  "miniboss: 'apostleOfFlesh'",
  "boss: 'eclipseChoir'",
  "eventPool: ['event_stage3_resonance_relay', 'event_stage3_flesh_vat', 'event_stage3_eclipse_sanctuary']",
].forEach(snippet => requireText("dataStages.ts Stage 3", dataStages, snippet));

[
  "assets/monsters/stage3-generated/stage3_annihilation_amplifier_portrait.png",
  "assets/monsters/stage3-generated/stage3_annihilation_amplifier_spritesheet.png",
  "assets/monsters/stage3-generated/stage3_flesh_cultivator_portrait.png",
  "assets/monsters/stage3-generated/stage3_flesh_cultivator_spritesheet.png",
  "assets/monsters/stage3-generated/stage3_abyss_observer_portrait.png",
  "assets/monsters/stage3-generated/stage3_abyss_observer_spritesheet.png",
  "assets/monsters/stage3-generated/stage3_apostle_of_flesh_portrait.png",
  "assets/monsters/stage3-generated/stage3_apostle_of_flesh_spritesheet.png",
  "assets/monsters/stage3-generated/stage3_eclipse_choir_portrait.png",
  "assets/monsters/stage3-generated/stage3_eclipse_choir_spritesheet.png",
].forEach(snippet => requireText("dataMonsters.ts Stage 3 generated assets", dataMonsters, snippet));

[
  "public/assets/monsters/stage3-generated/stage3_annihilation_amplifier_portrait.png",
  "public/assets/monsters/stage3-generated/stage3_annihilation_amplifier_spritesheet.png",
  "public/assets/monsters/stage3-generated/stage3_flesh_cultivator_portrait.png",
  "public/assets/monsters/stage3-generated/stage3_flesh_cultivator_spritesheet.png",
  "public/assets/monsters/stage3-generated/stage3_abyss_observer_portrait.png",
  "public/assets/monsters/stage3-generated/stage3_abyss_observer_spritesheet.png",
  "public/assets/monsters/stage3-generated/stage3_apostle_of_flesh_portrait.png",
  "public/assets/monsters/stage3-generated/stage3_apostle_of_flesh_spritesheet.png",
  "public/assets/monsters/stage3-generated/stage3_eclipse_choir_portrait.png",
  "public/assets/monsters/stage3-generated/stage3_eclipse_choir_spritesheet.png",
  "public/assets/backgrounds/combat-stage-3-eclipse-sanctum.png",
  "public/assets/backgrounds/event-stage3-resonance-relay.png",
  "public/assets/backgrounds/event-stage3-flesh-vat.png",
  "public/assets/backgrounds/event-stage3-eclipse-sanctuary.png",
].forEach(requireFile);

const dataEvents = readText("dataEvents.ts");
const eventScenes = readText(path.join("utils", "eventScenes.ts"));
[
  "event_stage3_resonance_relay",
  "event_stage3_flesh_vat",
  "event_stage3_eclipse_sanctuary",
].forEach(snippet => {
  requireText("dataEvents.ts Stage 3 events", dataEvents, snippet);
  requireText("eventScenes.ts Stage 3 scenes", eventScenes, snippet);
});

[
  "assets/backgrounds/event-stage3-resonance-relay.png",
  "assets/backgrounds/event-stage3-flesh-vat.png",
  "assets/backgrounds/event-stage3-eclipse-sanctuary.png",
].forEach(snippet => requireText("eventScenes.ts Stage 3 generated backgrounds", eventScenes, snippet));

if (!existsSync(templatePath)) {
  failures.push(`missing ${path.relative(repoDir, templatePath)}`);
} else {
  const data = JSON.parse(readFileSync(templatePath, "utf8"));

  if (data.schemaVersion !== "stage3-content-input-v1") failures.push("schemaVersion must be stage3-content-input-v1");
  if (data.stage !== 3) failures.push("stage must be 3");
  if (data.status !== "ready") failures.push("status must be ready");
  if (data.source?.title !== "몬스터 컨셉") failures.push("source.title must be 몬스터 컨셉");
  if (data.source?.documentId !== "1xqQ_aFtUzEnwangtwOhpGUdFg83zhx3M4G0c-Kcj9XI") {
    failures.push("source.documentId does not match the Stage 3 monster concept Drive doc");
  }

  const gate = data.gate ?? {};
  if (gate.normalCombatsBeforeBoss !== 2) failures.push("gate.normalCombatsBeforeBoss must be 2");
  if (gate.targetTotalEnemyCount !== 8) failures.push("gate.targetTotalEnemyCount must be 8");
  if (gate.maxEnemiesOnField !== 3) failures.push("gate.maxEnemiesOnField must be 3");
  if (gate.bossReward !== "secretTechniqueDraft") failures.push("gate.bossReward must be secretTechniqueDraft");
  if (gate.rewardOfferCount !== 3 || gate.rewardChooseCount !== 1) {
    failures.push("Gate 3 비기 reward must offer 3 and choose 1");
  }

  requireArray(data.normalMonsterTemplates, "normalMonsterTemplates", 3).forEach((monster, index) => {
    validateMonster(monster, ["normalMonsterTemplates", String(index)], "normal", runtimeMonsterKeys, runtimePatternKeys);
  });

  requireArray(data.minibossTemplates, "minibossTemplates", 1).forEach((monster, index) => {
    validateMonster(monster, ["minibossTemplates", String(index)], "miniboss", runtimeMonsterKeys, runtimePatternKeys);
  });

  requireArray(data.bossTemplates, "bossTemplates", 1).forEach((boss, index) => {
    const segments = ["bossTemplates", String(index)];
    validateMonster(boss, segments, "boss", runtimeMonsterKeys, runtimePatternKeys);
    requireArray(boss.phases, `${formatPath(segments)}.phases`, 1).forEach((phase, phaseIndex) => {
      const phaseSegments = [...segments, "phases", String(phaseIndex)];
      if (!/^stage3_/.test(phase.id ?? "")) failures.push(`${formatPath(phaseSegments)}.id must start with stage3_`);
      requireString(phase.runtimeKey, [...phaseSegments, "runtimeKey"]);
      requireString(phase.label, [...phaseSegments, "label"]);
      if ("hpBelow" in phase) requireNumber(phase.hpBelow, [...phaseSegments, "hpBelow"]);
      if ("turnFrom" in phase) requireNumber(phase.turnFrom, [...phaseSegments, "turnFrom"]);
      requireArray(phase.patternIds, `${formatPath(phaseSegments)}.patternIds`, 1);
      requireString(phase.playerCue, [...phaseSegments, "playerCue"]);
    });
    requireString(boss.dangerIntentThreshold, [...segments, "dangerIntentThreshold"]);
  });

  const rewards = requireArray(data.secretTechniqueRewardTemplates, "secretTechniqueRewardTemplates", 3);
  if (rewards.length !== 3) failures.push("secretTechniqueRewardTemplates must contain exactly 3 options");
  rewards.forEach((reward, index) => {
    const segments = ["secretTechniqueRewardTemplates", String(index)];
    if (!/^stage3_secret_technique_/.test(reward.id ?? "")) {
      failures.push(`${formatPath(segments)}.id must start with stage3_secret_technique_`);
    }
    if (reward.status !== "ready") failures.push(`${formatPath(segments)}.status must be ready`);
    requireEnum(reward.kind, [...segments, "kind"], allowedSecretTechniqueKinds);
    requireString(reward.runtimeKey, [...segments, "runtimeKey"]);
    requireString(reward.name, [...segments, "name"]);
    requireString(reward.role, [...segments, "role"]);
    requireString(reward.usageRule, [...segments, "usageRule"]);
    requireString(reward.effect, [...segments, "effect"]);
    requireString(reward.playerCue, [...segments, "playerCue"]);
  });

  walkForTbd(data);
}

const combatRewards = readText(path.join("utils", "combatRewards.ts"));
[
  "stage3_secret_technique_flash",
  "stage3_secret_technique_veil",
  "stage3_secret_technique_resonance_core",
].forEach(snippet => requireText("combatRewards.ts", combatRewards, snippet));

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`FAIL ${failure}`));
  process.exit(1);
}

console.log(`PASS Stage 3 playable content checks${strict ? " (strict)" : ""}`);
