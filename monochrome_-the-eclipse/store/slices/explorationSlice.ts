import { StateCreator } from 'zustand';
import { produce } from 'immer';
import { GameStore } from '../gameStore';
import { StageNode, NodeType, EventDefinition, GameState, EnemyCharacter, CombatLogMessage, CharacterClass, CoinFace } from '../../types';
import { detectPatterns, generateCoins, generateLoggedStageNodes, isRouteNodeAvailable } from '../../utils/gameLogic';
import type { RouteGenerationLogEntry } from '../../utils/gameLogic';
import { stageData } from '../../dataStages';
import { eventData } from '../../dataEvents';
import { STAGE_TURNS } from '../../constants';
import { monsterData } from '../../dataMonsters';
import { determineEnemyIntent, calculateCombatPrediction, applyInnatePassives } from '../../utils/combatLogic';
import { isDocumentedFinalStage, isStagePlayable } from '../../utils/stageProgression';


export interface ExplorationSlice {
  currentStage: number;
  currentTurn: number;
  stageNodes: StageNode[][];
  routeSeed: string | null;
  routeGenerationLog: RouteGenerationLogEntry[];
  path: { turn: number; nodeIndex: number; nodeId: string; }[];
  startStage: (stageNumber: number) => void;
  selectNode: (node: StageNode, nodeIndex: number) => void;
  proceedToNextTurn: () => void;
  handleRestChoice: (choice: 'heal' | 'memory_altar') => void;
}

export const createExplorationSlice: StateCreator<GameStore, [], [], ExplorationSlice> = (set, get, api) => ({
  currentStage: 1,
  currentTurn: 1,
  stageNodes: [],
  routeSeed: null,
  routeGenerationLog: [],
  path: [],
  startStage: (stageNumber) => {
    set(produce((draft: GameStore) => {
        if (!isStagePlayable(stageNumber)) {
            draft.gameState = GameState.STAGE_CLEAR;
            return;
        }

        draft.currentStage = stageNumber;
        draft.currentTurn = 1;
        const generatedRoute = generateLoggedStageNodes(stageNumber);
        draft.stageNodes = generatedRoute.stageNodes;
        draft.routeSeed = generatedRoute.routeSeed;
        draft.routeGenerationLog = generatedRoute.routeGenerationLog;
        draft.path = [];
        draft.gameState = GameState.EXPLORATION;
        draft.metaProgress.highestStage = Math.max(draft.metaProgress.highestStage, stageNumber);

        // Preserve run resources and build upgrades across stages; only transient combat state resets.
        if (draft.player) {
            draft.player.statusEffects = {};
            draft.player.temporaryEffects = {};
            draft.player.temporaryDefense = 0;
            draft.player.activeSkillCooldown = 0;
            draft.playerCoins = [];
        }
    }));
  },
  selectNode: (node, nodeIndex) => {
    set(produce((draft: GameStore) => {
        const currentNodes = draft.stageNodes[draft.currentTurn - 1] ?? [];
        if (!isRouteNodeAvailable(draft.currentTurn, nodeIndex, draft.path, currentNodes.length)) {
            return;
        }

        draft.path.push({ turn: draft.currentTurn, nodeIndex, nodeId: node.id });

        switch (node.type) {
            case NodeType.COMBAT:
            case NodeType.MINIBOSS:
            case NodeType.BOSS: {
                const stageInfo = stageData[draft.currentStage as keyof typeof stageData];
                let monsterKey = stageInfo.combatPool[Math.floor(Math.random() * stageInfo.combatPool.length)];
                if (node.type === NodeType.MINIBOSS) monsterKey = stageInfo.miniboss;
                if (node.type === NodeType.BOSS) monsterKey = stageInfo.boss;

                const player = draft.player;
                if (!player) return;

                player.activeSkillCooldown = 0;

                const monsterTemplate = monsterData[monsterKey];
                const enemyCoins = generateCoins();

                const enemy: EnemyCharacter = {
                    key: monsterKey,
                    name: monsterTemplate.name,
                    currentHp: monsterTemplate.hp,
                    maxHp: monsterTemplate.hp,
                    baseAtk: monsterTemplate.baseAtk,
                    baseDef: monsterTemplate.baseDef,
                    temporaryDefense: 0,
                    statusEffects: {},
                    assetKey: monsterTemplate.assetKey ?? monsterKey,
                    portraitSrc: monsterTemplate.portraitSrc,
                    spriteSheetSrc: monsterTemplate.spriteSheetSrc,
                    spriteFrameSize: monsterTemplate.spriteFrameSize,
                    spriteAnimations: monsterTemplate.spriteAnimations,
                    coins: enemyCoins,
                    detectedPatterns: detectPatterns(enemyCoins),
                    temporaryEffects: {},
                    tier: monsterTemplate.tier,
                };

                draft.enemy = enemy;

                draft.combatLog = [];
                draft.combatTurn = 1;
                draft.pendingCombatReward = null;
                draft.selectedPatterns = [];
                draft.usedCoinIndices = [];
                draft.activeSkillState = { phase: 'idle', selection: [] };

                const log = (message: string, type: CombatLogMessage['type']) => {
                  draft.combatLog.push({ id: Date.now() + Math.random(), turn: draft.combatTurn, message, type });
                };

                log(`--- 전투 시작 ---`, 'system');
                log(`${enemy.name} 등장!`, 'system');

                // REFACTOR: Generate a fresh set of coins for EVERY combat encounter.
                draft.playerCoins = generateCoins();

                // Apply innate passives at the start of every combat.
                applyInnatePassives(draft, log);

                // Specifically apply Rogue's passive to the newly generated coins.
                if (player.class === CharacterClass.ROGUE) {
                    if (draft.playerCoins.length > 0) {
                        draft.playerCoins[0].face = CoinFace.HEADS;
                    }
                }

                draft.gameState = GameState.COMBAT;

                // With the definitive coin state set, calculate patterns and predictions.
                draft.detectedPatterns = detectPatterns(draft.playerCoins);
                draft.enemyIntent = determineEnemyIntent(enemy);
                draft.combatPrediction = calculateCombatPrediction(player, enemy, draft.selectedPatterns, draft.enemyIntent, draft.playerCoins, draft.unlockedPatterns);
                break;
            }
            case NodeType.SHOP:
                draft.gameState = GameState.SHOP;
                break;
            case NodeType.REST:
                draft.gameState = GameState.REST;
                break;
            case NodeType.EVENT: {
                const stageInfo = stageData[draft.currentStage as keyof typeof stageData];
                const stageEventPool = (stageInfo?.eventPool ?? [])
                  .map(eventId => eventData[eventId as keyof typeof eventData])
                  .filter((event): event is EventDefinition => Boolean(event && !event.isFollowUp));
                const fallbackEventPool = Object.values(eventData).filter((e) => !e.isFollowUp);
                const eventPool = stageEventPool.length > 0 ? stageEventPool : fallbackEventPool;
                const unseenEventPool = eventPool.filter((event) => !draft.encounteredEventIds.includes(event.id));
                const selectableEventPool = unseenEventPool.length > 0 ? unseenEventPool : eventPool;
                const event = selectableEventPool[Math.floor(Math.random() * selectableEventPool.length)];
                if (!event) break;
                if (!draft.encounteredEventIds.includes(event.id)) {
                    draft.encounteredEventIds.push(event.id);
                }

                // --- Inlined _startEvent logic ---
                draft.currentEvent = event;
                draft.eventPhase = 'choice';
                draft.gameState = GameState.EVENT;
                draft.eventDisplayItems = [];
                break;
            }
        }
    }));
  },
  proceedToNextTurn: () => {
    set(produce((draft: GameStore) => {
        if (!draft.player) return;

        const nextTurn = draft.currentTurn + 1;

        if (nextTurn > STAGE_TURNS) {
            if (isDocumentedFinalStage(draft.currentStage)) {
                draft.gameState = GameState.VICTORY;
            } else {
                draft.gameState = GameState.STAGE_CLEAR;
            }
        } else {
            draft.currentTurn = nextTurn;
            draft.gameState = GameState.EXPLORATION;

            // Perform transient state reset directly within this atomic update
            draft.player.temporaryDefense = 0;

            draft.currentEvent = null;
            draft.eventPhase = 'choice';
            draft.eventResultData = null;
            draft.eventDisplayItems = [];
        }
    }));
  },
  handleRestChoice: (choice) => {
    set(produce((draft: GameStore) => {
        if (!draft.player) return;

        if (choice === 'heal') {
            // Heal logic
            const healAmount = Math.floor(draft.player.maxHp * 0.4);
            draft.player.currentHp = Math.min(draft.player.maxHp, draft.player.currentHp + healAmount);

            // Turn progression logic (from proceedToNextTurn)
            const nextTurn = draft.currentTurn + 1;
            if (nextTurn > STAGE_TURNS) {
                if (isDocumentedFinalStage(draft.currentStage)) {
                    draft.gameState = GameState.VICTORY;
                } else {
                    draft.gameState = GameState.STAGE_CLEAR;
                }
            } else {
                draft.currentTurn = nextTurn;
                draft.gameState = GameState.EXPLORATION;
                // Reset transient state
                draft.player.temporaryDefense = 0;
                draft.currentEvent = null;
                draft.eventPhase = 'choice';
                draft.eventResultData = null;
                draft.eventDisplayItems = [];
            }
        } else if (choice === 'memory_altar') {
            draft.gameState = GameState.MEMORY_ALTAR;
        }
    }));
  },
});
