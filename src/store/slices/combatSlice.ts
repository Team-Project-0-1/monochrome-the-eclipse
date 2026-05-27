import { StateCreator } from 'zustand';
import { produce } from 'immer';
import { GameStore } from '../gameStore';
import { EnemyCharacter, Coin, DetectedPattern, CombatPrediction, EnemyIntent, CombatLogMessage, PatternType, CoinFace, CoinFace as CF, GameState, ActiveSkillState, CharacterClass } from '../../types';
import { monsterData } from '../../data/dataMonsters';
import { stageData } from '../../data/dataStages';
import { generateCoins, detectPatterns, flipCoin } from '../../utils/gameLogic';
import { determineEnemyIntent, calculateCombatPrediction, applyInnatePassives, applyPassives, resolvePlayerActions, resolveEnemyActions, processEndOfTurn, setupNextTurn, processStartOfTurn } from '../../utils/combatLogic';
import { STAGE_TURNS } from '../../constants';
import { eventData } from '../../data/dataEvents';
import { EffectPayload } from './uiSlice';
import { characterActiveSkills } from '../../data/dataCharacters';
import { isDocumentedFinalStage } from '../../utils/stageProgression';
import { CombatRewardChoice, createCombatRewardChoices } from '../../utils/combatRewards';
import { playerSkillUnlocks } from '../../data/dataSkills';
import { MAX_RESERVE_COINS } from '../../constants';

const COMBAT_RESOLUTION_DELAY_MS = 1200;

export interface PendingCombatReward {
  enemyName: string;
  enemyTier: EnemyCharacter['tier'];
  nextState: GameState;
  nextTurn?: number;
  choices: CombatRewardChoice[];
}

export interface CombatSlice {
  enemy: EnemyCharacter | null;
  playerCoins: Coin[];
  detectedPatterns: DetectedPattern[];
  selectedPatterns: DetectedPattern[];
  usedCoinIndices: number[];
  combatPrediction: CombatPrediction | null;
  enemyIntent: EnemyIntent | null;
  combatLog: CombatLogMessage[];
  combatTurn: number;
  pendingCombatReward: PendingCombatReward | null;
  swapState: {
    phase: 'idle' | 'revealed';
    reserveCoinIndex: number | null;
    revealedFace: CoinFace | null;
  };
  activeSkillState: ActiveSkillState;
  flipCoin: (index: number) => void;
  flipAllCoins: () => void;
  togglePattern: (type: PatternType, face: CF | undefined) => void;
  executeTurn: () => void;
  addLog: (message: string, type: CombatLogMessage['type']) => void;
  initiateSwap: (reserveCoinIndex: number) => void;
  cancelSwap: () => void;
  completeSwap: (activeCoinIndex: number) => void;
  useActiveSkill: () => void;
  handleActiveSkillCoinClick: (index: number) => void;
  cancelActiveSkill: () => void;
  claimCombatReward: (choiceId: string) => void;
}

// --- INTERNAL HELPER FUNCTIONS FOR ATOMIC STATE UPDATES ---

const _updatePatternsAndPrediction = (draft: GameStore) => {
    const { player, enemy, playerCoins, selectedPatterns, enemyIntent } = draft;
    if (player && enemy && enemyIntent) {
        draft.detectedPatterns = detectPatterns(playerCoins);
        draft.combatPrediction = calculateCombatPrediction(player, enemy, selectedPatterns, enemyIntent, playerCoins, draft.unlockedPatterns);
    }
};

const clearPostCombatPlayerState = (draft: GameStore) => {
    if (!draft.player) return;

    draft.player.temporaryDefense = 0;
    draft.player.statusEffects = {};

    const hpTrainingGains = draft.player.temporaryEffects?.hpTrainingGains;
    draft.player.temporaryEffects = hpTrainingGains ? { hpTrainingGains } : {};
};

const getPlayerHeadsChance = (draft: GameStore): number => {
    const player = draft.player;
    if (!player) return 0.5;

    const temporaryChance = player.temporaryEffects?.headsChanceUp?.value || 0;
    const passiveChance = draft.unlockedPatterns.includes('ROGUE_P_ADRENALINE') ? 0.1 : 0;
    return Math.min(0.95, Math.max(0.05, 0.5 + temporaryChance + passiveChance));
};

const applyPlayerCoinOverrides = (draft: GameStore) => {
    const player = draft.player;
    if (!player || draft.playerCoins.length === 0) return;

    if (player.temporaryEffects?.firstCoinHeads && !draft.playerCoins[0].locked) {
        draft.playerCoins[0].face = CF.HEADS;
    }

    const guaranteedHeads = Number(player.temporaryEffects?.guaranteeHeads?.value ?? 0);
    if (guaranteedHeads > 0) {
        draft.playerCoins.slice(0, guaranteedHeads).forEach((coin) => {
            if (!coin.locked) coin.face = CF.HEADS;
        });
    }

    if (player.temporaryEffects?.lockFirstCoin && draft.playerCoins[0]) {
        draft.playerCoins[0].locked = true;
    }

    const centerCoin = draft.playerCoins[2];
    const centerLock = player.temporaryEffects?.lockCenterCoin?.value;
    if (centerCoin && (centerLock === 'HEADS' || centerLock === 'TAILS')) {
        centerCoin.face = centerLock === 'HEADS' ? CF.HEADS : CF.TAILS;
        centerCoin.locked = true;
    }

    if (player.temporaryEffects?.huntFlowQueued?.value && !player.temporaryEffects?.huntFlowUsed?.value) {
        const tailCoin = draft.playerCoins.find(coin => coin.face === CF.TAILS && !coin.locked);
        if (tailCoin) {
            tailCoin.face = CF.HEADS;
        }
        player.temporaryEffects.huntFlowUsed = { value: true, duration: 999 };
        delete player.temporaryEffects.huntFlowQueued;
    }

    if (player.temporaryEffects?.lockOnTailsMajority && draft.playerCoins[0]) {
        const heads = draft.playerCoins.filter(coin => coin.face === CF.HEADS).length;
        const tails = draft.playerCoins.filter(coin => coin.face === CF.TAILS).length;
        if (tails > heads) {
            draft.playerCoins[0].locked = true;
        }
    }
};

const _flipCoinAndUpdate = (draft: GameStore, index: number) => {
    if (draft.playerCoins[index] && !draft.playerCoins[index].locked) {
        draft.playerCoins[index].face = draft.playerCoins[index].face === CF.HEADS ? CF.TAILS : CF.HEADS;
    }
    draft.selectedPatterns = [];
    draft.usedCoinIndices = [];
    _updatePatternsAndPrediction(draft);
};

const _flipAllCoinsAndUpdate = (draft: GameStore) => {
    if (!draft.player) return;
    const headsChance = getPlayerHeadsChance(draft);

    draft.playerCoins.forEach((coin, index) => {
        if (!coin.locked) {
            draft.playerCoins[index].face = flipCoin(headsChance);
        }
    });

    applyPlayerCoinOverrides(draft);

    draft.selectedPatterns = [];
    draft.usedCoinIndices = [];
    _updatePatternsAndPrediction(draft);
};

export const createCombatSlice: StateCreator<GameStore, [], [], CombatSlice> = (set, get, api) => ({
  enemy: null,
  playerCoins: [],
  detectedPatterns: [],
  selectedPatterns: [],
  usedCoinIndices: [],
  combatPrediction: null,
  enemyIntent: null,
  combatLog: [],
  combatTurn: 1,
  pendingCombatReward: null,
  swapState: { phase: 'idle', reserveCoinIndex: null, revealedFace: null },
  activeSkillState: { phase: 'idle', selection: [] },
  addLog: (message, type) => {
      set(produce(state => {
          state.combatLog.push({ id: Date.now() + Math.random(), turn: state.combatTurn, message, type });
      }));
  },
  flipCoin: (index) => {
    set(produce((draft: GameStore) => {
        if (draft.playerCoins[index] && !draft.playerCoins[index].locked) {
            _flipCoinAndUpdate(draft, index);
        }
    }));
  },
  flipAllCoins: () => {
    set(produce((draft: GameStore) => {
        _flipAllCoinsAndUpdate(draft);
    }));
  },
  togglePattern: (type, face) => {
    set(produce((draft: GameStore) => {
      const { selectedPatterns, detectedPatterns, player, enemy, playerCoins, enemyIntent } = draft;

      const selectedInstances = selectedPatterns.filter(p => p.type === type && p.face === face);
      const numSelected = selectedInstances.length;

      const currentlyUsedIndices = Array.from(new Set(selectedPatterns.flatMap(p => p.indices)));
      const availableInstance = detectedPatterns.find(p =>
        p.type === type &&
        p.face === face &&
        !selectedPatterns.some(sp => sp.id === p.id) &&
        !p.indices.some(i => currentlyUsedIndices.includes(i))
      );

      if (numSelected < 2 && availableInstance) {
        draft.selectedPatterns.push(availableInstance);
      } else {
        draft.selectedPatterns = selectedPatterns.filter(p => !(p.type === type && p.face === face));
      }

      draft.usedCoinIndices = Array.from(new Set(draft.selectedPatterns.flatMap(p => p.indices)));
      if (player && enemy && enemyIntent) {
          draft.combatPrediction = calculateCombatPrediction(player, enemy, draft.selectedPatterns, enemyIntent, playerCoins, draft.unlockedPatterns);
      }
    }));
  },
  initiateSwap: (reserveCoinIndex) => {
    set(produce((draft: GameStore) => {
        const reserveCoin = draft.reserveCoins[reserveCoinIndex];
        if (!reserveCoin) return;

        const revealedFace = flipCoin(); // The coin is flipped here.

        draft.swapState = {
            phase: 'revealed',
            reserveCoinIndex,
            revealedFace
        };
    }));
  },
  cancelSwap: () => {
    set({ swapState: { phase: 'idle', reserveCoinIndex: null, revealedFace: null } });
  },
  completeSwap: (activeCoinIndex) => {
    set(produce((draft: GameStore) => {
        const { phase, reserveCoinIndex, revealedFace } = draft.swapState;
        if (phase !== 'revealed' || reserveCoinIndex === null || !revealedFace || !draft.reserveCoins[reserveCoinIndex] || !draft.playerCoins[activeCoinIndex]) {
            draft.swapState = { phase: 'idle', reserveCoinIndex: null, revealedFace: null };
            return;
        }

        // Create a new coin object for the swap
        const newCoinForPlayer: Coin = {
            face: revealedFace,
            locked: false,
            id: draft.playerCoins[activeCoinIndex].id // re-use id to avoid React key issues
        };
        draft.playerCoins[activeCoinIndex] = newCoinForPlayer;

        draft.reserveCoins.splice(reserveCoinIndex, 1);

        draft.swapState = { phase: 'idle', reserveCoinIndex: null, revealedFace: null };
        draft.selectedPatterns = [];
        draft.usedCoinIndices = [];

        _updatePatternsAndPrediction(draft);
    }));
  },
  useActiveSkill: () => {
    set(produce((draft: GameStore) => {
        const { player } = draft;
        if (!player || player.activeSkillCooldown > 0) return;

        const skill = characterActiveSkills[player.class];

        draft.combatLog.push({ id: Date.now() + Math.random(), turn: draft.combatTurn, message: `[${skill.name}] 사용!`, type: 'player' });

        if (player.class === CharacterClass.WARRIOR) {
            _flipAllCoinsAndUpdate(draft);
            player.activeSkillCooldown = skill.cooldown;
        } else {
            switch (player.class) {
                case CharacterClass.ROGUE:
                    draft.activeSkillState = { phase: 'rogue_flip', selection: [] };
                    break;
                case CharacterClass.TANK:
                    draft.activeSkillState = { phase: 'tank_swap_1', selection: [] };
                    break;
                case CharacterClass.MAGE:
                    draft.activeSkillState = { phase: 'mage_lock', selection: [] };
                    break;
            }
        }
    }));
  },
  handleActiveSkillCoinClick: (index: number) => {
      set(produce((draft: GameStore) => {
          const { player, activeSkillState } = draft;
          if (!player) return;

          const skill = characterActiveSkills[player.class];

          switch (activeSkillState.phase) {
              case 'rogue_flip': {
                  if (draft.playerCoins[index] && !draft.playerCoins[index].locked) {
                      draft.playerCoins[index].face = draft.playerCoins[index].face === CF.HEADS ? CF.TAILS : CF.HEADS;
                  }

                  draft.detectedPatterns = detectPatterns(draft.playerCoins);

                  const validSelectedPatterns = draft.selectedPatterns.filter(sp =>
                      draft.detectedPatterns.some(dp => dp.id === sp.id)
                  );

                  draft.selectedPatterns = validSelectedPatterns;
                  draft.usedCoinIndices = Array.from(new Set(draft.selectedPatterns.flatMap(p => p.indices)));

                  // FIX: Removed re-declaration of 'player' to avoid shadowing and "used before declaration" error.
                  const { enemy, enemyIntent, playerCoins } = draft;
                  if (player && enemy && enemyIntent) {
                      draft.combatPrediction = calculateCombatPrediction(player, enemy, draft.selectedPatterns, enemyIntent, playerCoins, draft.unlockedPatterns);
                  }

                  player.activeSkillCooldown = skill.cooldown;
                  draft.activeSkillState = { phase: 'idle', selection: [] };
                  break;
              }
              case 'tank_swap_1':
                  activeSkillState.selection.push(index);
                  activeSkillState.phase = 'tank_swap_2';
                  break;
              case 'tank_swap_2': {
                  if (activeSkillState.selection[0] !== index) {
                      const firstIndex = activeSkillState.selection[0];
                      const secondIndex = index;
                      const tempCoin = draft.playerCoins[firstIndex];
                      draft.playerCoins[firstIndex] = draft.playerCoins[secondIndex];
                      draft.playerCoins[secondIndex] = tempCoin;

                      player.activeSkillCooldown = skill.cooldown;
                      draft.activeSkillState = { phase: 'idle', selection: [] };

                      draft.detectedPatterns = detectPatterns(draft.playerCoins);
                      const validSelectedPatterns = draft.selectedPatterns.filter(sp =>
                          draft.detectedPatterns.some(dp => dp.id === sp.id)
                      );
                      draft.selectedPatterns = validSelectedPatterns;
                      draft.usedCoinIndices = Array.from(new Set(draft.selectedPatterns.flatMap(p => p.indices)));

                      // FIX: Removed re-declaration of 'player' to avoid shadowing and "used before declaration" error.
                      const { enemy, enemyIntent, playerCoins } = draft;
                      if (player && enemy && enemyIntent) {
                          draft.combatPrediction = calculateCombatPrediction(player, enemy, draft.selectedPatterns, enemyIntent, playerCoins, draft.unlockedPatterns);
                      }
                  }
                  break;
              }
              case 'mage_lock':
                  draft.playerCoins[index].locked = true;
                  player.activeSkillCooldown = skill.cooldown;
                  draft.activeSkillState = { phase: 'idle', selection: [] };
                  break;
          }
      }));
  },
  cancelActiveSkill: () => {
      set({ activeSkillState: { phase: 'idle', selection: [] } });
  },
  claimCombatReward: (choiceId) => {
    set(produce((draft: GameStore) => {
      const reward = draft.pendingCombatReward;
      if (!reward) return;

      const choice = reward.choices.find(item => item.id === choiceId) ?? reward.choices[0];
      const { rewards } = choice;

      if (rewards.echoRemnants) {
        draft.resources.echoRemnants += rewards.echoRemnants;
        draft.metaProgress.totalEchoCollected += rewards.echoRemnants;
      }
      if (rewards.senseFragments) {
        draft.resources.senseFragments += rewards.senseFragments;
      }
      if (rewards.memoryPieces) {
        draft.resources.memoryPieces += rewards.memoryPieces;
      }
      if (rewards.reserveCoin && draft.reserveCoins.length < MAX_RESERVE_COINS) {
        draft.reserveCoins.push({ face: null, locked: false, id: Date.now() + Math.random() });
      }
      if (choice.skillId && draft.player) {
        const skill = playerSkillUnlocks[draft.player.class]?.[choice.skillId];
        if (skill && !draft.player.acquiredSkills.includes(skill.id)) {
          draft.player.acquiredSkills.push(skill.id);
        }
      }
      if (choice.passiveId && draft.player && !draft.unlockedPatterns.includes(choice.passiveId)) {
        draft.unlockedPatterns.push(choice.passiveId);
      }

      if (reward.nextTurn) {
        draft.currentTurn = reward.nextTurn;
      }

      draft.pendingCombatReward = null;
      draft.gameState = reward.nextState;

      clearPostCombatPlayerState(draft);

      draft.enemy = null;
      draft.currentEvent = null;
      draft.eventPhase = 'choice';
      draft.eventResultData = null;
      draft.eventDisplayItems = [];
      draft.combatLog = [];
      draft.playerCoins = [];
      draft.selectedPatterns = [];
      draft.usedCoinIndices = [];
      draft.combatPrediction = null;
      draft.enemyIntent = null;
      draft.activeSkillState = { phase: 'idle', selection: [] };
    }));
  },
  executeTurn: () => {
    const { selectedPatterns, player, enemy } = get();
    if (selectedPatterns.length === 0 || !player || !enemy) return;

    let delayedGameState: GameState.REWARD | GameState.GAME_OVER | null = null;

    set(produce((draft: GameStore) => {
      // 1. Setup
      if(draft.player) {
          if (draft.player.activeSkillCooldown > 0) draft.player.activeSkillCooldown--;
      }
      draft.combatTurn += 1;
      if (draft.enemy) {
          draft.enemy.temporaryEffects = draft.enemy.temporaryEffects || {};
          draft.enemy.temporaryEffects.combatTurn = { value: draft.combatTurn, duration: 999 };
      }
      let effects: EffectPayload[] = [];
      const log = (message: string, type: CombatLogMessage['type']) => {
        draft.combatLog.push({ id: Date.now() + Math.random(), turn: draft.combatTurn, message, type });
      };
      const dispatchEffects = () => {
        effects.forEach(effect => {
          draft.combatEffects.push({ ...effect, id: Date.now() + Math.random() });
          if (effect.type === 'damage' && effect.data.amount > 0) {
            if (effect.target === 'player') draft.playerHit = (draft.playerHit || 0) + 1;
            else draft.enemyHit = (draft.enemyHit || 0) + 1;
          }
        });
        effects = [];
      };
      log(`--- ${draft.combatTurn}턴 ---`, 'system');

      const isCombatOver = () => !draft.player || draft.player.currentHp <= 0 || !draft.enemy || draft.enemy.currentHp <= 0;

      // 2. Start of Turn Phase
      if (draft.player && draft.enemy) {
        effects.push(...processStartOfTurn(draft.player, draft.enemy, log, draft));
      }
      if (!isCombatOver() && draft.player && draft.enemy) {
        effects.push(...processStartOfTurn(draft.enemy, draft.player, log, draft));
      }

      // 3. Action Phase
      if (!isCombatOver()) {
          effects.push(...applyPassives(draft, 'PLAYER_TURN_START', log));
          effects.push(...resolvePlayerActions(draft, log));
          if (draft.enemy && draft.enemy.currentHp > 0) {
              effects.push(...resolveEnemyActions(draft, log));
          }
      }

      // 4. End of Turn Phase
      if (!isCombatOver()) {
          effects.push(...processEndOfTurn(draft, log));
      }

      // 5. Resolution Phase
      const playerIsDead = !draft.player || draft.player.currentHp <= 0;
      const enemyIsDead = !draft.enemy || draft.enemy.currentHp <= 0;

      if (enemyIsDead) {
        const defeatedEnemy = draft.enemy!;
        log(`${defeatedEnemy.name}을 처치했습니다.`, 'system');

        if (draft.player && draft.unlockedPatterns.includes('WARRIOR_PASSIVE_KILL_MAX_HP')) {
          draft.player.maxHp += 5;
          draft.player.currentHp += 5;
          log(`[피 주머니] 최대 체력이 5 증가합니다.`, 'heal');
        }

        if (draft.player && draft.unlockedPatterns.includes('TANK_P_HP_TRAINING')) {
          draft.player.temporaryEffects = draft.player.temporaryEffects || {};
          const gained = draft.player.temporaryEffects.hpTrainingGains?.value || 0;
          if (gained < 10) {
            draft.player.maxHp += 1;
            draft.player.currentHp += 1;
            draft.player.temporaryEffects.hpTrainingGains = { value: gained + 1, duration: 999 };
            log(`[기초 체력 훈련] 최대 체력이 1 증가합니다.`, 'heal');
          }
        }

        if (draft.player && draft.unlockedPatterns.includes('MAGE_P_KILL_HEAL')) {
          const curse = draft.player.statusEffects.CURSE || 0;
          if (curse > 0) {
            draft.player.currentHp = Math.min(draft.player.maxHp, draft.player.currentHp + curse);
            log(`[죽음을 대하는 자세] 남은 저주만큼 체력을 회복합니다.`, 'heal');
          }
        }

        const rewardIsBoss = defeatedEnemy.key === stageData[draft.currentStage as keyof typeof stageData].boss;
        const nextState = rewardIsBoss
          ? isDocumentedFinalStage(draft.currentStage)
            ? GameState.VICTORY
            : GameState.STAGE_CLEAR
          : GameState.EXPLORATION;

        draft.pendingCombatReward = {
          enemyName: defeatedEnemy.name,
          enemyTier: defeatedEnemy.tier,
          nextState,
          nextTurn: rewardIsBoss ? undefined : draft.currentTurn + 1,
          choices: createCombatRewardChoices(defeatedEnemy, draft.player, draft.unlockedPatterns),
        };
        dispatchEffects();
        draft.gameState = GameState.COMBAT;
        delayedGameState = GameState.REWARD;
        return;

      } else if (playerIsDead) {
        log(`플레이어가 쓰러졌습니다...`, 'system');

        draft.metaProgress.totalRuns += 1;
        if (draft.currentStage > draft.metaProgress.highestStage) {
            draft.metaProgress.highestStage = draft.currentStage;
        }

        dispatchEffects();
        draft.gameState = GameState.COMBAT;
        delayedGameState = GameState.GAME_OVER;
      } else {
        // --- Combat Continues: Setup next turn ---
        setupNextTurn(draft);

        const headsChance = getPlayerHeadsChance(draft);

        draft.playerCoins.forEach((coin, index) => {
            if (coin.locked) {
                draft.playerCoins[index].locked = false; // Unlock for next turn
            } else {
                draft.playerCoins[index].face = flipCoin(headsChance);
            }
        });

        applyPlayerCoinOverrides(draft);
        draft.selectedPatterns = [];
        draft.usedCoinIndices = [];

        draft.detectedPatterns = detectPatterns(draft.playerCoins);
        draft.combatPrediction = calculateCombatPrediction(draft.player!, draft.enemy!, draft.selectedPatterns, draft.enemyIntent!, draft.playerCoins, draft.unlockedPatterns);
        dispatchEffects();
      }
    }));

    if (delayedGameState) {
      const targetState = delayedGameState;
      setTimeout(() => {
        set(produce((draft: GameStore) => {
          if (draft.gameState !== GameState.COMBAT) return;
          if (targetState === GameState.REWARD && !draft.pendingCombatReward) return;
          if (targetState === GameState.REWARD) {
            clearPostCombatPlayerState(draft);
          }
          draft.gameState = targetState;
        }));
      }, COMBAT_RESOLUTION_DELAY_MS);
    }
  },
});
