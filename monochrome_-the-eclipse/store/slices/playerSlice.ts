import { StateCreator } from 'zustand';
import { produce } from 'immer';
import { GameStore } from '../gameStore';
import { PlayerCharacter, CharacterClass, ShopItem, PatternUpgradeDefinition, SkillUpgradeDefinition, MemoryUpgradeType, GameState, CoinFace, Coin } from '../../types';
import { characterData } from '../../dataCharacters';
import { MAX_RESERVE_COINS, MAX_SKILLS, MEMORY_UPGRADE_DATA } from '../../constants';
import { generateLoggedStageNodes } from '../../utils/gameLogic';

export interface PlayerSlice {
  player: PlayerCharacter | null;
  resources: {
    echoRemnants: number;
    senseFragments: number;
    memoryPieces: number;
  };
  unlockedPatterns: string[];
  reserveCoins: Coin[];
  reserveCoinShopCost: number;
  selectCharacter: (characterClass: CharacterClass) => void;
  handlePurchase: (item: ShopItem | (PatternUpgradeDefinition & { type: 'upgrade' })) => void;
  handleSkillUpgradePurchase: (skill: SkillUpgradeDefinition) => void;
  handleMemoryUpgrade: (upgradeType: MemoryUpgradeType) => void;
  forgetSkill: (skillId: string) => void;
  executeSkillReplacement: (skillToForgetId: string) => void;
  flipReserveCoin: (index: number) => void;
}

export const createPlayerSlice: StateCreator<GameStore, [], [], PlayerSlice> = (set, get, api) => ({
  player: null,
  resources: { echoRemnants: 0, senseFragments: 0, memoryPieces: 0 },
  unlockedPatterns: [],
  reserveCoins: [],
  reserveCoinShopCost: 100,
  selectCharacter: (characterClass) => {
    set(produce((draft: GameStore) => {
        const data = characterData[characterClass];
        const meta = draft.metaProgress;

        const player: PlayerCharacter = {
          ...data,
          class: characterClass,
          currentHp: data.hp + (meta.memoryUpgrades.maxHp * MEMORY_UPGRADE_DATA.maxHp.effect),
          maxHp: data.hp + (meta.memoryUpgrades.maxHp * MEMORY_UPGRADE_DATA.maxHp.effect),
          baseAtk: data.baseAtk + (meta.memoryUpgrades.baseAtk * MEMORY_UPGRADE_DATA.baseAtk.effect),
          baseDef: data.baseDef + (meta.memoryUpgrades.baseDef * MEMORY_UPGRADE_DATA.baseDef.effect),
          temporaryDefense: 0,
          acquiredSkills: [],
          memoryUpgrades: meta.memoryUpgrades,
          statusEffects: {},
          temporaryEffects: {},
          activeSkillCooldown: 0,
        };
        draft.player = player;

        // --- COMPLETE STATE RESET & NEW RUN INITIALIZATION (ATOMIC) ---
        draft.resources = { echoRemnants: 100, senseFragments: 0, memoryPieces: 0 };
        draft.unlockedPatterns = [];
        draft.reserveCoins = [{ face: null, locked: false, id: Date.now() + Math.random() }];
        draft.reserveCoinShopCost = 100;

        draft.currentStage = 1;
        draft.currentTurn = 1;
        const generatedRoute = generateLoggedStageNodes(1);
        draft.stageNodes = generatedRoute.stageNodes;
        draft.routeSeed = generatedRoute.routeSeed;
        draft.routeGenerationLog = generatedRoute.routeGenerationLog;
        draft.path = [];

        // Reset ALL combat-related states for a completely clean slate.
        draft.enemy = null;
        draft.playerCoins = []; // Coins are now generated upon entering combat.
        draft.detectedPatterns = [];
        draft.selectedPatterns = [];
        draft.usedCoinIndices = [];
        draft.combatPrediction = null;
        draft.enemyIntent = null;
        draft.combatLog = [];
        draft.combatTurn = 1;
        draft.pendingCombatReward = null;
        draft.swapState = { phase: 'idle', reserveCoinIndex: null, revealedFace: null };
        draft.activeSkillState = { phase: 'idle', selection: [] };

        // Also reset event state to prevent carry-over from a previous aborted run
        draft.currentEvent = null;
        draft.eventPhase = 'choice';
        draft.eventResultData = null;
        draft.eventDisplayItems = [];
        draft.encounteredEventIds = [];

        // Also reset UI state for a clean start
        draft.isInventoryOpen = false;
        draft.skillReplacementState = null;
        draft.combatEffects = [];
        draft.playerHit = 0;
        draft.enemyHit = 0;
        draft.tooltip = null;

        draft.gameState = GameState.EXPLORATION;
    }));
  },
  handlePurchase: (item) => {
    set(produce((state: GameStore) => {
        const { resources, player, unlockedPatterns } = state;
        if (!player) return;

        if (item.id === 'reserve_coin') {
            if (resources.echoRemnants >= state.reserveCoinShopCost && state.reserveCoins.length < MAX_RESERVE_COINS) {
                resources.echoRemnants -= state.reserveCoinShopCost;
                state.reserveCoinShopCost += 50;
                state.reserveCoins.push({ face: null, locked: false, id: Date.now() + Math.random() });
            }
        } else if ('cost' in item && typeof item.cost === 'object' && 'senseFragments' in item.cost) { // PatternUpgrade
            const upgrade = item as PatternUpgradeDefinition;
            if (resources.senseFragments >= upgrade.cost.senseFragments) {
                resources.senseFragments -= upgrade.cost.senseFragments;
                if (!unlockedPatterns.includes(upgrade.id)) {
                    unlockedPatterns.push(upgrade.id);
                }
            }
        } else { // ShopItem
            const shopItem = item as ShopItem;
            if (resources.echoRemnants >= shopItem.cost) {
                resources.echoRemnants -= shopItem.cost;
                if (shopItem.effect.heal) {
                    player.currentHp = Math.min(player.maxHp, player.currentHp + Math.floor(player.maxHp * shopItem.effect.heal));
                }
                if (shopItem.effect.senseFragments) {
                    resources.senseFragments += shopItem.effect.senseFragments;
                }
                if (shopItem.effect.statusEffect) {
                    const { type, value } = shopItem.effect.statusEffect;
                    player.statusEffects[type] = Math.max(0, (player.statusEffects[type] || 0) + value);
                }
            }
        }
    }));
  },
  handleSkillUpgradePurchase: (skill) => {
    set(produce((state: GameStore) => {
        if (!state.player || state.resources.echoRemnants < skill.cost.echoRemnants) return;

        if (state.player.acquiredSkills.length >= MAX_SKILLS) {
            // Inlined setSkillReplacementState
            state.skillReplacementState = { isModalOpen: true, newSkill: skill };
        } else {
            state.player.acquiredSkills.push(skill.id);
            state.resources.echoRemnants -= skill.cost.echoRemnants;
        }
    }));
  },
  executeSkillReplacement: (skillToForgetId) => {
    set(produce((state: GameStore) => {
        const { player, skillReplacementState } = state;
        if (!player || !skillReplacementState) return;

        const newSkill = skillReplacementState.newSkill;
        const newSkillList = player.acquiredSkills.filter(id => id !== skillToForgetId);
        newSkillList.push(newSkill.id);

        player.acquiredSkills = newSkillList;
        state.resources.echoRemnants -= newSkill.cost.echoRemnants;
        state.skillReplacementState = null;
    }));
  },
  forgetSkill: (skillId) => {
    set(produce((state: GameStore) => {
        if (state.player) {
            state.player.acquiredSkills = state.player.acquiredSkills.filter(id => id !== skillId);
        }
    }));
  },
  handleMemoryUpgrade: (upgradeType) => {
    set(produce((state: GameStore) => {
        const { player, resources, metaProgress } = state;
        if (!player) return;

        const upgradeData = MEMORY_UPGRADE_DATA[upgradeType];
        const currentLevel = metaProgress.memoryUpgrades[upgradeType];
        const cost = upgradeData.cost(currentLevel);

        if (resources.memoryPieces >= cost) {
            resources.memoryPieces -= cost;
            metaProgress.memoryUpgrades[upgradeType] += 1;

            if (upgradeType === 'maxHp') {
              player.maxHp += upgradeData.effect;
              player.currentHp += upgradeData.effect;
            }
            if (upgradeType === 'baseAtk') player.baseAtk += upgradeData.effect;
            if (upgradeType === 'baseDef') player.baseDef += upgradeData.effect;

            player.memoryUpgrades = metaProgress.memoryUpgrades;
        }
    }));
  },
  flipReserveCoin: (index) => {
    set(produce((draft: GameStore) => {
        if (!get().testMode) return;
        const coin = draft.reserveCoins[index];
        if (coin) {
            if (coin.face === null) {
                coin.face = CoinFace.HEADS;
            } else {
                coin.face = coin.face === CoinFace.HEADS ? CoinFace.TAILS : CoinFace.HEADS;
            }
        }
    }));
  },
});
