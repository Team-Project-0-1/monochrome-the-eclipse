import { StateCreator } from 'zustand';
import { produce } from 'immer';
import { GameStore } from '../gameStore';
import { EventDefinition, EventChoice, GameState, EnemyCharacter, CombatLogMessage } from '../../types';
import { monsterData } from '../../data/dataMonsters';
import { eventData } from '../../data/dataEvents';
import { generateCoins, detectPatterns } from '../../utils/gameLogic';
import { determineEnemyIntent, calculateCombatPrediction, applyInnatePassives } from '../../utils/combatLogic';
import { MAX_RESERVE_COINS } from '../../constants';

export interface EventSlice {
  currentEvent: EventDefinition | null;
  eventPhase: 'choice' | 'coinFlip' | 'result';
  eventResultData: { type: string; payload: any } | null;
  eventDisplayItems: { label: string; value: string | number; }[];
  encounteredEventIds: string[];
  handleEventChoice: (choice: EventChoice) => void;
  continueEventResult: () => void;
}

export const createEventSlice: StateCreator<GameStore, [], [], EventSlice> = (set, get, api) => ({
  currentEvent: null,
  eventPhase: 'choice',
  eventResultData: null,
  eventDisplayItems: [],
  encounteredEventIds: [],
  handleEventChoice: (choice) => {
    set(produce((state: GameStore) => {
      const { player } = state;
      if (!player) return;
      if (choice.requiredSense && choice.requiredSense !== player.class) return;
      if (choice.requiredResources) {
        const lacksResource = Object.entries(choice.requiredResources).some(([key, value]) => {
          const resourceKey = key as keyof typeof state.resources;
          return state.resources[resourceKey] < value;
        });
        if (lacksResource) return;
      }

      let eventOutcome: any = null;
      let combatToStart: string | null = null;

      const determineOutcome = (result: any) => {
        if (!result) return;
        if (result.combat) {
          combatToStart = result.combat;
        }
        eventOutcome = result;
      };

      if (choice.guaranteed && choice.result) {
        determineOutcome(choice.result);
      } else if (choice.baseSuccessRate !== undefined) {
        let successRate = choice.baseSuccessRate / 100;
        if (choice.senseBonus && player.class in choice.senseBonus) {
          successRate += (choice.senseBonus[player.class] || 0) / 100;
        }
        const success = Math.random() < successRate;
        determineOutcome(success ? choice.success : choice.failure);
      } else {
        eventOutcome = { message: '아무 일도 일어나지 않았습니다.' };
      }

      if (combatToStart) {
        const monsterTemplate = monsterData[combatToStart];
        const enemyCoins = generateCoins();
        const enemy: EnemyCharacter = {
          key: combatToStart,
          name: monsterTemplate.name,
          currentHp: monsterTemplate.hp,
          maxHp: monsterTemplate.hp,
          baseAtk: monsterTemplate.baseAtk,
          baseDef: monsterTemplate.baseDef,
          temporaryDefense: 0,
          statusEffects: {},
          assetKey: monsterTemplate.assetKey ?? combatToStart,
          portraitSrc: monsterTemplate.portraitSrc,
          spriteSheetSrc: monsterTemplate.spriteSheetSrc,
          spriteFrameSize: monsterTemplate.spriteFrameSize,
          spriteAnimations: monsterTemplate.spriteAnimations,
          coins: enemyCoins,
          detectedPatterns: detectPatterns(enemyCoins),
          temporaryEffects: {},
          tier: monsterTemplate.tier,
        };

        state.enemy = enemy;
        state.playerCoins = generateCoins();
        state.combatLog = [];
        state.combatTurn = 1;
        state.pendingCombatReward = null;
        state.selectedPatterns = [];
        state.usedCoinIndices = [];

        const log = (message: string, type: CombatLogMessage['type']) => {
          state.combatLog.push({ id: Date.now() + Math.random(), turn: state.combatTurn, message, type });
        };

        log('--- 전투 시작 ---', 'system');
        if (eventOutcome.message) {
          log(`[이벤트] ${eventOutcome.message}`, 'system');
        }
        log(`${enemy.name} 등장!`, 'system');

        applyInnatePassives(state, log);

        state.gameState = GameState.COMBAT;
        state.detectedPatterns = detectPatterns(state.playerCoins);
        state.enemyIntent = determineEnemyIntent(enemy);
        state.combatPrediction = calculateCombatPrediction(player, enemy, state.selectedPatterns, state.enemyIntent, state.playerCoins, state.unlockedPatterns);

        state.currentEvent = null;
        state.eventPhase = 'choice';
        state.eventResultData = null;
        state.eventDisplayItems = [];
      } else if (eventOutcome) {
        const knownResultLabels: { [key: string]: string } = {
          damage: '받은 피해',
          echoRemnants: '에코 변화',
          senseFragments: '감각 조각',
          memoryPieces: '기억 조각',
          curse: '저주',
          reserveCoinsGained: '행운 동전',
        };
        const displayItems: { label: string; value: string | number; }[] = [];

        if (eventOutcome.reserveCoinsGained) {
          for (let i = 0; i < eventOutcome.reserveCoinsGained; i++) {
            if (state.reserveCoins.length < MAX_RESERVE_COINS) {
              state.reserveCoins.push({ face: null, locked: false, id: Date.now() + Math.random() });
            }
          }
        }

        for (const key in eventOutcome) {
          if (knownResultLabels[key]) {
            const value = eventOutcome[key];
            const type = typeof value;
            if ((type === 'string' && value !== '') || (type === 'number' && value !== 0)) {
              displayItems.push({ label: knownResultLabels[key], value });
            }
          }
        }

        state.eventPhase = 'result';
        state.eventResultData = {
          type: 'outcome',
          payload: {
            baseMessage: eventOutcome.message || '결과가 발생했습니다.',
            followUp: eventOutcome.followUp,
          },
        };
        state.eventDisplayItems = displayItems;

        if (eventOutcome.damage) player.currentHp = Math.max(0, player.currentHp - eventOutcome.damage);
        if (eventOutcome.curse) player.statusEffects.CURSE = (player.statusEffects.CURSE || 0) + eventOutcome.curse;
        if (eventOutcome.echoRemnants) {
          state.resources.echoRemnants = Math.max(0, state.resources.echoRemnants + eventOutcome.echoRemnants);
          if (eventOutcome.echoRemnants > 0) {
            state.metaProgress.totalEchoCollected += eventOutcome.echoRemnants;
          }
        }
        if (eventOutcome.senseFragments) state.resources.senseFragments = Math.max(0, state.resources.senseFragments + eventOutcome.senseFragments);
        if (eventOutcome.memoryPieces) state.resources.memoryPieces = Math.max(0, state.resources.memoryPieces + eventOutcome.memoryPieces);
      }
    }));
  },
  continueEventResult: () => {
    const state = get();
    const player = state.player;
    if (!player) return;

    if (player.currentHp <= 0) {
      set(produce((draft: GameStore) => {
        draft.metaProgress.totalRuns += 1;
        draft.metaProgress.highestStage = Math.max(draft.metaProgress.highestStage, draft.currentStage);
        draft.currentEvent = null;
        draft.eventPhase = 'choice';
        draft.eventResultData = null;
        draft.eventDisplayItems = [];
        draft.gameState = GameState.GAME_OVER;
      }));
      return;
    }

    const followUpId = state.eventResultData?.payload?.followUp;
    const followUpEvent = typeof followUpId === 'string' ? eventData[followUpId] : null;
    if (followUpEvent) {
      set(produce((draft: GameStore) => {
        draft.currentEvent = followUpEvent;
        if (!draft.encounteredEventIds.includes(followUpEvent.id)) {
          draft.encounteredEventIds.push(followUpEvent.id);
        }
        draft.eventPhase = 'choice';
        draft.eventResultData = null;
        draft.eventDisplayItems = [];
        draft.gameState = GameState.EVENT;
      }));
      return;
    }

    get().proceedToNextTurn();
  },
});
