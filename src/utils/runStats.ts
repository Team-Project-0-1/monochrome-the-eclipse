import { CharacterClass, RunRecord } from '../types';

export interface CharacterWinrate {
  wins: number;
  losses: number;
  /** Win percentage 0~100. 0 when the character has no recorded runs. */
  winrate: number;
}

export interface RunHistorySummary {
  total: number;
  /** Aggregate winrate across every character in the window (lobby uses this — no character is selected yet). */
  overall: CharacterWinrate;
  winrateByCharacter: Partial<Record<CharacterClass, CharacterWinrate>>;
  /** Death count keyed by the stage the run ended on (deaths only). */
  deathsByStage: Record<number, number>;
  lastRun: RunRecord | null;
}

/**
 * Pure derivation over the recent run-history window. Winrate denominator is
 * wins+losses for that character (0 → 0, never NaN). deathsByStage counts only
 * outcome==='death'. Reads the bounded window as-is; no time filtering.
 */
export const summarizeRunHistory = (history: RunRecord[]): RunHistorySummary => {
  const winrateByCharacter: Partial<Record<CharacterClass, CharacterWinrate>> = {};
  const deathsByStage: Record<number, number> = {};

  for (const run of history) {
    const entry = (winrateByCharacter[run.characterClass] ??= { wins: 0, losses: 0, winrate: 0 });
    if (run.outcome === 'victory') {
      entry.wins += 1;
    } else {
      entry.losses += 1;
      deathsByStage[run.finalStage] = (deathsByStage[run.finalStage] ?? 0) + 1;
    }
  }

  const overall: CharacterWinrate = { wins: 0, losses: 0, winrate: 0 };
  for (const entry of Object.values(winrateByCharacter)) {
    const played = entry.wins + entry.losses;
    entry.winrate = played > 0 ? Math.round((entry.wins / played) * 100) : 0;
    overall.wins += entry.wins;
    overall.losses += entry.losses;
  }
  const overallPlayed = overall.wins + overall.losses;
  overall.winrate = overallPlayed > 0 ? Math.round((overall.wins / overallPlayed) * 100) : 0;

  return {
    total: history.length,
    overall,
    winrateByCharacter,
    deathsByStage,
    lastRun: history.at(-1) ?? null,
  };
};
