import {
  PlayerCharacter,
  EnemyCharacter,
  DetectedPattern,
  EnemyIntent,
  Coin,
  CombatLogMessage,
} from '../../types';

// --- TYPE DEFINITIONS ---
export type GameStoreDraft = {
    player: PlayerCharacter | null;
    enemy: EnemyCharacter | null;
    unlockedPatterns: string[];
    playerCoins: Coin[];
    selectedPatterns: DetectedPattern[];
    enemyIntent: EnemyIntent | null;
    combatLog: CombatLogMessage[];
    combatTurn: number;
};
export type LogFn = (message: string, type: CombatLogMessage['type']) => void;
export type Character = PlayerCharacter | EnemyCharacter;
export type MonsterPassiveId =
    | 'PASSIVE_SHADOWWRAITH_EARDRUM_BREAK'
    | 'PASSIVE_DOPPELGANGER_AFTERIMAGE'
    | 'PASSIVE_UNPLEASANTCUBE_BIND'
    | 'PASSIVE_SUBJECT162_DISGUST'
    | 'PASSIVE_CHIMERA_SAW_TEETH'
    | 'PASSIVE_AMPLIFIER_RUPTURE_SOUND'
    | 'PASSIVE_AMPLIFIER_BROAD_INTERFERENCE'
    | 'PASSIVE_AMPLIFIER_COLLAPSE_VIBRATION'
    | 'PASSIVE_CULTIVATOR_BUTCHER_INSTINCT'
    | 'PASSIVE_CULTIVATOR_FRESH_MEAT'
    | 'PASSIVE_CULTIVATOR_HOOK_RETRIEVAL'
    | 'PASSIVE_OBSERVER_VOID_GAZE'
    | 'PASSIVE_OBSERVER_MENTAL_COLLAPSE'
    | 'PASSIVE_OBSERVER_ABYSS_ECHO'
    | 'PASSIVE_APOSTLE_ADAPTIVE_EVOLUTION'
    | 'PASSIVE_APOSTLE_FLESH_REFLECTION'
    | 'PASSIVE_APOSTLE_TWISTED_REGENERATION'
    | 'PASSIVE_CHOIR_ECHO_MULTIPLICATION'
    | 'PASSIVE_CHOIR_UNHOLY_HYMN'
    | 'PASSIVE_CHOIR_DOOM_FORETELLING'
    | 'PASSIVE_CHOIR_ECLIPSE_PHENOMENON';
