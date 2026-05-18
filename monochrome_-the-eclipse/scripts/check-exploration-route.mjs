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

const { generateLoggedStageNodes, getAvailableRouteNodeIndices, isRouteNodeAvailable } = require('../utils/gameLogic.ts');
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

const openingChoices = getAvailableRouteNodeIndices(1, [], 3);
if (openingChoices.join(',') !== '0,1,2') {
  fail(`opening turn should expose all 3 choices, received ${openingChoices.join(',')}`);
}

const leftPath = [{ turn: 1, nodeIndex: 0, nodeId: first.stageNodes[0][0].id }];
const leftConnected = getAvailableRouteNodeIndices(2, leftPath, 3);
if (leftConnected.join(',') !== '0,1') {
  fail(`left route should connect to nodes 1-2, received ${leftConnected.join(',')}`);
}

if (isRouteNodeAvailable(2, 2, leftPath, 3)) {
  fail('route guard allowed a disconnected right-side node after choosing the left route');
}

console.log(`PASS exploration route generation check (${seed}, miniboss turn ${minibossTurn}, log entries ${first.routeGenerationLog.length})`);
