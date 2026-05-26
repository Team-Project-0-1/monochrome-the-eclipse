import React from 'react';
import { Zap } from 'lucide-react';
import CombatEffect from './CombatEffect';
import { CombatOverheadVitals, CombatStatusTray, EnemyCoinStrip } from './CombatHud';
import { ResultBanner } from './CombatReadouts';
import { FallbackEnemy, SpriteAvatar } from './CombatSprites';
import {
  CombatEffect as CombatEffectData,
  EnemyCharacter,
  EnemyIntent,
  PlayerCharacter,
} from '../../types';
import { assetPath } from '../../utils/assetPath';
import {
  characterClassTokens,
  CombatResultBanner,
  getSkillMotionToken,
  getSpriteRow,
  isPositiveDamage,
} from '../../utils/combatPresentation';

interface CombatStageProps {
  player: PlayerCharacter;
  enemy: EnemyCharacter;
  intent: EnemyIntent | null;
  resultBanner: CombatResultBanner | null;
  combatEffects: CombatEffectData[];
  removeCombatEffect: (id: number) => void;
  currentStage: number;
}

export const CombatStage: React.FC<CombatStageProps> = ({
  player,
  enemy,
  intent,
  resultBanner,
  combatEffects,
  removeCombatEffect,
  currentStage,
}) => {
  const playerSpriteRow = getSpriteRow(player, true, combatEffects);
  const enemySpriteRow = getSpriteRow(enemy, false, combatEffects);
  const playerSkillEffect = combatEffects.find(effect => effect.target === 'player' && effect.type === 'skill');
  const enemySkillEffect = combatEffects.find(effect => effect.target === 'enemy' && effect.type === 'skill');
  const playerSkill = Boolean(playerSkillEffect);
  const enemySkill = Boolean(enemySkillEffect);
  const playerAttack = playerSkill || combatEffects.some(effect => effect.target === 'enemy' && isPositiveDamage(effect));
  const enemyAttack = enemySkill || combatEffects.some(effect => effect.target === 'player' && isPositiveDamage(effect));
  const playerHit = combatEffects.some(effect => effect.target === 'player' && isPositiveDamage(effect));
  const enemyHit = combatEffects.some(effect => effect.target === 'enemy' && isPositiveDamage(effect));
  const playerClassToken = characterClassTokens[player.class];
  const playerMotionToken = getSkillMotionToken(playerSkillEffect);
  const enemyMotionToken = getSkillMotionToken(enemySkillEffect);
  const backgroundStage = Math.min(Math.max(currentStage, 1), 3);
  const backgroundPath = backgroundStage === 3
    ? 'assets/backgrounds/combat-stage-3-eclipse-sanctum.png'
    : `assets/backgrounds/combat-stage-${backgroundStage}.webp`;
  const combatBackgroundImage = `url("${assetPath(backgroundPath)}")`;
  const stageClassName = [
    'combat-stage',
    `stage-${currentStage}`,
    `player-class-${playerClassToken}`,
    `enemy-tier-${enemy.tier}`,
    playerAttack ? 'player-attacking' : '',
    enemyAttack ? 'enemy-attacking' : '',
    playerHit ? 'player-hit' : '',
    enemyHit ? 'enemy-hit' : '',
    playerSkill || enemySkill ? 'skill-beat' : '',
  ].filter(Boolean).join(' ');

  return (
    <section
      className={stageClassName}
      aria-label="combat battlefield"
      style={{ '--combat-bg-image': combatBackgroundImage } as React.CSSProperties}
    >
      <div className="combat-backdrop" />
      <div className="combat-horizon" />
      <div className="combat-floor" />
      <div className={`combat-motion-arc player ${playerAttack ? 'is-active' : ''}`} />
      <div className={`combat-motion-arc enemy ${enemyAttack ? 'is-active' : ''}`} />
      <div className={`combat-class-effect player ${playerClassToken} motion-${playerMotionToken} ${playerAttack ? 'is-active' : ''}`} />
      <div className={`combat-class-effect enemy motion-${enemyMotionToken} ${enemySkill ? 'is-active' : ''}`} />
      <div className={`combat-impact-burst player ${playerHit ? 'is-active' : ''}`} />
      <div className={`combat-impact-burst enemy ${enemyHit ? 'is-active' : ''}`} />

      <div className={`combat-sprite-slot player ${playerAttack ? 'is-attacking' : ''} ${playerHit ? 'is-hit' : ''} ${playerSkill ? 'is-casting' : ''}`}>
        <CombatOverheadVitals character={player} side="player" />
        <div className="combat-sprite-ground player" />
        {player.spriteSheetSrc ? (
          <SpriteAvatar src={player.spriteSheetSrc} row={playerSpriteRow} tone="player" ariaLabel={`${player.name} sprite`} />
        ) : player.portraitSrc ? (
          <img src={assetPath(player.portraitSrc)} alt="" className="combat-portrait-fallback" />
        ) : (
          <div className="combat-fallback-player"><Zap size={80} /></div>
        )}
        <CombatStatusTray character={player} side="player" />
      </div>

      <div className={`combat-sprite-slot enemy ${enemyAttack ? 'is-attacking' : ''} ${enemyHit ? 'is-hit' : ''} ${enemySkill ? 'is-casting' : ''} ${intent?.dangerLevel === 'high' ? 'is-danger-intent' : ''}`}>
        <div className="combat-enemy-overhead-stack">
          <EnemyCoinStrip enemy={enemy} intent={intent} />
          <CombatOverheadVitals character={enemy} side="enemy" />
        </div>
        <div className="combat-sprite-ground enemy" />
        {enemy.spriteSheetSrc ? (
          <SpriteAvatar src={enemy.spriteSheetSrc} row={enemySpriteRow} tone="enemy" ariaLabel={`${enemy.name} sprite`} />
        ) : enemy.portraitSrc ? (
          <img src={assetPath(enemy.portraitSrc)} alt="" className="combat-portrait-fallback enemy" />
        ) : (
          <FallbackEnemy tier={enemy.tier} />
        )}
        <CombatStatusTray character={enemy} side="enemy" />
      </div>

      <ResultBanner banner={resultBanner} />

      <div className="combat-effect-anchor player">
        {combatEffects.filter(effect => effect.target === 'player').map(effect => (
          <CombatEffect key={effect.id} effect={effect} onComplete={removeCombatEffect} />
        ))}
      </div>
      <div className="combat-effect-anchor enemy">
        {combatEffects.filter(effect => effect.target === 'enemy').map(effect => (
          <CombatEffect key={effect.id} effect={effect} onComplete={removeCombatEffect} />
        ))}
      </div>
    </section>
  );
};
