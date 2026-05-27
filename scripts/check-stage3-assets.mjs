import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, "..");
const failures = [];

const monsterAssets = [
  {
    key: "annihilationAmplifier",
    portrait: "public/assets/monsters/stage3-generated/stage3_annihilation_amplifier_portrait.png",
    spritesheet: "public/assets/monsters/stage3-generated/stage3_annihilation_amplifier_spritesheet.png",
  },
  {
    key: "fleshCultivator",
    portrait: "public/assets/monsters/stage3-generated/stage3_flesh_cultivator_portrait.png",
    spritesheet: "public/assets/monsters/stage3-generated/stage3_flesh_cultivator_spritesheet.png",
  },
  {
    key: "abyssObserver",
    portrait: "public/assets/monsters/stage3-generated/stage3_abyss_observer_portrait.png",
    spritesheet: "public/assets/monsters/stage3-generated/stage3_abyss_observer_spritesheet.png",
  },
  {
    key: "apostleOfFlesh",
    portrait: "public/assets/monsters/stage3-generated/stage3_apostle_of_flesh_portrait.png",
    spritesheet: "public/assets/monsters/stage3-generated/stage3_apostle_of_flesh_spritesheet.png",
  },
  {
    key: "eclipseChoir",
    portrait: "public/assets/monsters/stage3-generated/stage3_eclipse_choir_portrait.png",
    spritesheet: "public/assets/monsters/stage3-generated/stage3_eclipse_choir_spritesheet.png",
  },
];

const backgroundAssets = [
  "public/assets/backgrounds/combat-stage-3-eclipse-sanctum.png",
  "public/assets/backgrounds/event-stage3-resonance-relay.png",
  "public/assets/backgrounds/event-stage3-flesh-vat.png",
  "public/assets/backgrounds/event-stage3-eclipse-sanctuary.png",
];

const stage3EventIds = [
  "event_stage3_resonance_relay",
  "event_stage3_flesh_vat",
  "event_stage3_eclipse_sanctuary",
];

const resolveAppPath = (relativePath) => path.join(appDir, relativePath);

const requireFile = (relativePath, minBytes = 1) => {
  const fullPath = resolveAppPath(relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`missing ${relativePath}`);
    return null;
  }

  const bytes = readFileSync(fullPath);
  if (bytes.length < minBytes) {
    failures.push(`${relativePath} is unexpectedly small (${bytes.length} bytes)`);
  }
  return bytes;
};

const readText = (relativePath) => {
  const bytes = requireFile(relativePath);
  return bytes ? bytes.toString("utf8") : "";
};

const pngInfo = (relativePath) => {
  const bytes = requireFile(relativePath, 1024);
  if (!bytes) return null;

  const signature = bytes.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    failures.push(`${relativePath} is not a PNG file`);
    return null;
  }

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bitDepth: bytes[24],
    colorType: bytes[25],
  };
};

const requirePngShape = (relativePath, shape) => {
  const info = pngInfo(relativePath);
  if (!info) return;

  if (shape.width && info.width !== shape.width) {
    failures.push(`${relativePath} width ${info.width} != ${shape.width}`);
  }
  if (shape.height && info.height !== shape.height) {
    failures.push(`${relativePath} height ${info.height} != ${shape.height}`);
  }
  if (shape.minWidth && info.width < shape.minWidth) {
    failures.push(`${relativePath} width ${info.width} < ${shape.minWidth}`);
  }
  if (shape.minHeight && info.height < shape.minHeight) {
    failures.push(`${relativePath} height ${info.height} < ${shape.minHeight}`);
  }
  if (shape.colorType !== undefined && info.colorType !== shape.colorType) {
    failures.push(`${relativePath} PNG color type ${info.colorType} != ${shape.colorType}`);
  }
};

const requireWebpPair = (pngPath, minBytes = 50_000) => {
  const webpPath = pngPath.replace(/\.png$/, ".webp");
  const bytes = requireFile(webpPath, minBytes);
  if (!bytes) return;

  if (bytes.subarray(0, 4).toString("ascii") !== "RIFF" || bytes.subarray(8, 12).toString("ascii") !== "WEBP") {
    failures.push(`${webpPath} is not a WebP file`);
  }
};

const publicAssetPath = (relativePath) => relativePath.replace(/^public\//, "");

const requireTextIncludes = (label, text, expected) => {
  if (!text.includes(expected)) {
    failures.push(`${label} does not include ${expected}`);
  }
};

const dataMonsters = readText("src/data/dataMonsters.ts");
const dataStages = readText("src/data/dataStages.ts");
const dataEvents = readText("src/data/dataEvents.ts");
const eventScenes = readText("src/utils/eventScenes.ts");
const generatedAssetManifest = readText("src/utils/generatedAssetManifest.ts");
const spriteManifest = readText("public/assets/monsters/sprites/manifest.json");

for (const monster of monsterAssets) {
  requirePngShape(monster.portrait, { minWidth: 768, minHeight: 1024, colorType: 6 });
  requirePngShape(monster.spritesheet, { width: 1024, height: 1024, colorType: 6 });
  requireWebpPair(monster.portrait);
  requireWebpPair(monster.spritesheet);

  const portraitAssetPath = publicAssetPath(monster.portrait);
  const spritesheetAssetPath = publicAssetPath(monster.spritesheet);
  const spritesheetManifestPath = `../stage3-generated/${path.basename(monster.spritesheet)}`;

  requireTextIncludes("src/data/dataMonsters.ts", dataMonsters, `${monster.key}: {`);
  requireTextIncludes("src/data/dataMonsters.ts", dataMonsters, portraitAssetPath);
  requireTextIncludes("src/data/dataMonsters.ts", dataMonsters, spritesheetAssetPath);
  requireTextIncludes("public/assets/monsters/sprites/manifest.json", spriteManifest, `"${monster.key}": "${spritesheetManifestPath}"`);
  requireTextIncludes("generatedAssetManifest.ts", generatedAssetManifest, `"${portraitAssetPath}": "${portraitAssetPath.replace(/\.png$/, ".webp")}"`);
  requireTextIncludes("generatedAssetManifest.ts", generatedAssetManifest, `"${spritesheetAssetPath}": "${spritesheetAssetPath.replace(/\.png$/, ".webp")}"`);
}

for (const backgroundPath of backgroundAssets) {
  requirePngShape(backgroundPath, { minWidth: 1600, minHeight: 900 });
  requireWebpPair(backgroundPath, 80_000);

  const assetPath = publicAssetPath(backgroundPath);
  requireTextIncludes("generatedAssetManifest.ts", generatedAssetManifest, `"${assetPath}": "${assetPath.replace(/\.png$/, ".webp")}"`);
}

requireTextIncludes(
  "src/data/dataStages.ts",
  dataStages,
  "eventPool: ['event_stage3_resonance_relay', 'event_stage3_flesh_vat', 'event_stage3_eclipse_sanctuary']",
);
requireTextIncludes(
  "src/data/dataStages.ts",
  dataStages,
  "combatPool: ['annihilationAmplifier', 'fleshCultivator', 'abyssObserver']",
);

for (const eventId of stage3EventIds) {
  requireTextIncludes("src/data/dataEvents.ts", dataEvents, eventId);
  requireTextIncludes("src/utils/eventScenes.ts", eventScenes, eventId);
}

[
  "assets/backgrounds/combat-stage-3-eclipse-sanctum.png",
  "assets/backgrounds/event-stage3-resonance-relay.png",
  "assets/backgrounds/event-stage3-flesh-vat.png",
  "assets/backgrounds/event-stage3-eclipse-sanctuary.png",
].forEach((assetPath) => {
  const label = assetPath.includes("combat-stage-3") ? "CombatStage.tsx" : "src/utils/eventScenes.ts";
  const text = assetPath.includes("combat-stage-3") ? readText("src/components/combat/CombatStage.tsx") : eventScenes;
  requireTextIncludes(label, text, assetPath);
});

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`FAIL ${failure}`));
  process.exit(1);
}

console.log("PASS Stage 3 generated asset integrity checks");
