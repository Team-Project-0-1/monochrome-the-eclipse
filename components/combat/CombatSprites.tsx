import React, { useEffect, useState } from 'react';
import { Skull } from 'lucide-react';
import { EnemyCharacter } from '../../types';
import { assetPath } from '../../utils/assetPath';

const SPRITE_GRID_SIZE = 4;
const SPRITE_STEP = 100 / (SPRITE_GRID_SIZE - 1);
const TRANSPARENT_SPRITE_REPLACEMENTS: Record<string, string> = {
  '006_shadow_wraith-spritesheet.png': '006_shadow_wraith-spritesheet-transparent.png',
  '007_doppelganger-spritesheet.png': '007_doppelganger-spritesheet-transparent.png',
  '010_chimera-spritesheet.png': '010_chimera-spritesheet-transparent.png',
};

const resolveSpriteSrc = (src: string) => {
  const replacementKey = Object.keys(TRANSPARENT_SPRITE_REPLACEMENTS).find(key => src.includes(key));
  return replacementKey ? src.replace(replacementKey, TRANSPARENT_SPRITE_REPLACEMENTS[replacementKey]) : src;
};

type SpriteTone = 'player' | 'enemy';

interface SpriteAvatarProps {
  src: string;
  row?: number;
  className?: string;
  ariaLabel?: string;
  tone?: SpriteTone;
}

export const SpriteAvatar: React.FC<SpriteAvatarProps> = ({
  src,
  row = 0,
  className = '',
  ariaLabel,
  tone = 'player',
}) => {
  const resolvedSrc = assetPath(resolveSpriteSrc(src));
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return undefined;

    const interval = window.setInterval(() => {
      setFrame(current => (current + 1) % SPRITE_GRID_SIZE);
    }, 220);

    return () => window.clearInterval(interval);
  }, [resolvedSrc, row]);

  useEffect(() => {
    setFrame(0);
  }, [resolvedSrc, row]);

  const safeRow = Math.max(0, Math.min(SPRITE_GRID_SIZE - 1, row));
  const glow = tone === 'enemy' ? 'rgba(248,113,113,0.36)' : 'rgba(103,232,249,0.32)';
  const spriteClassName = [
    'combat-sprite-avatar',
    `tone-${tone}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
      className={spriteClassName}
      style={{
        backgroundImage: `url(${resolvedSrc})`,
        backgroundSize: `${SPRITE_GRID_SIZE * 100}% ${SPRITE_GRID_SIZE * 100}%`,
        backgroundPosition: `${frame * SPRITE_STEP}% ${safeRow * SPRITE_STEP}%`,
        imageRendering: 'pixelated',
        filter: `drop-shadow(0 0 30px ${glow}) drop-shadow(0 22px 18px rgba(0,0,0,0.8))`,
      }}
    />
  );
};

export const FallbackEnemy: React.FC<{ tier: EnemyCharacter['tier'] }> = ({ tier }) => (
  <div className={`combat-fallback-enemy ${tier === 'boss' ? 'is-boss' : ''}`} aria-hidden="true">
    <div className="combat-fallback-glow" />
    <div className="combat-fallback-body" />
    <Skull className="combat-fallback-skull" size={74} />
  </div>
);
