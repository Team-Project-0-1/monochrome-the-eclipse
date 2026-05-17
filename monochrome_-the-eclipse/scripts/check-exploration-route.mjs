import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const source = readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  module._compile(outputText, filename);
};

const { generateLoggedStageNodes } = require('../utils/gameLogic.ts');
const { NodeType } = require('../types.ts');

const fail = (message) => {
  console.error(`FAIL ${message}`);
  process.exit(1);
};

const serializeNodes = (nodes) => JSON.stringify(nodes);
const seed = 'exploration-route-check-stage-1';
const first = generateLoggedStageNodes(1, seed);
const second = generateLoggedStageNodes(1, seed);

if (first.routeSeed !== seed || second.routeSeed !== seed) {
  fail('route seed was not preserved');
}

if (serializeNodes(first.stageNodes) !== serializeNodes(second.stageNodes)) {
  fail('same seed produced different route nodes');
}

if (first.stageNodes.length !== 15) {
  fail(`expected 15 turns, received ${first.stageNodes.length}`);
}

for (const [turnIndex, turnNodes] of first.stageNodes.entries()) {
  if (turnNodes.length !== 3) {
    fail(`turn ${turnIndex + 1} expected 3 route choices, received ${turnNodes.length}`);
  }
}

const minibossTurn = first.stageNodes.findIndex((turnNodes) => turnNodes.some((node) => node.type === NodeType.MINIBOSS)) + 1;
if (![5, 6].includes(minibossTurn)) {
  fail(`expected miniboss on turn 5 or 6, received turn ${minibossTurn || 'none'}`);
}

if (!first.stageNodes[14].every((node) => node.type === NodeType.BOSS && node.isGuaranteed)) {
  fail('turn 15 must be guaranteed boss choices');
}

if (first.routeGenerationLog.length < first.stageNodes.length * 3) {
  fail('route generation log is missing node decisions');
}

console.log(`PASS exploration route generation check (${seed}, miniboss turn ${minibossTurn}, log entries ${first.routeGenerationLog.length})`);
