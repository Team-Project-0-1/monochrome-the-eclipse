import React from 'react';
import {
  CircleHelp,
  Clock3,
  Coins,
  GitBranch,
  HeartPulse,
  PackageCheck,
  Shield,
  Sparkles,
  Swords,
  Zap,
} from 'lucide-react';
import { effectIconPaths } from '../data/dataEffects';
import { assetPath } from '../utils/assetPath';
import {
  EffectChip,
  EffectSummary as EffectSummaryData,
  EffectTone,
  summarizeDescription,
} from '../utils/effectSummary';
import SkillDescription from './SkillDescription';

interface EffectSummaryProps {
  summary?: EffectSummaryData;
  text?: string;
  className?: string;
  chipLimit?: number;
  compact?: boolean;
  hideHeadline?: boolean;
  showCue?: boolean;
  cueLabel?: string;
  showDetail?: 'none' | 'details';
  detailLabel?: string;
}

const toneIcons: Record<EffectTone, React.ElementType> = {
  damage: Swords,
  defense: Shield,
  heal: HeartPulse,
  buff: Zap,
  debuff: Sparkles,
  coin: Coins,
  timing: Clock3,
  condition: GitBranch,
  resource: PackageCheck,
  neutral: CircleHelp,
};

const EffectChipView: React.FC<{ chip: EffectChip }> = ({ chip }) => {
  const Icon = toneIcons[chip.tone];
  const iconPath = chip.statusType ? effectIconPaths[chip.statusType] : undefined;

  return (
    <span className={`effect-chip tone-${chip.tone}`}>
      {iconPath ? (
        <img src={assetPath(iconPath)} alt="" loading="lazy" aria-hidden="true" />
      ) : (
        <Icon size={13} aria-hidden="true" />
      )}
      <span>{chip.label}</span>
      {chip.value ? <b>{chip.value}</b> : null}
    </span>
  );
};

const EffectSummary: React.FC<EffectSummaryProps> = ({
  summary,
  text,
  className = '',
  chipLimit = 5,
  compact = false,
  hideHeadline = false,
  showCue = false,
  cueLabel = '먼저 볼 것',
  showDetail = 'none',
  detailLabel = '원문',
}) => {
  const resolved = summary ?? summarizeDescription(text ?? '');
  const visibleChips = resolved.chips.slice(0, chipLimit);
  const overflowCount = resolved.chips.length - visibleChips.length;

  return (
    <div className={`effect-summary ${compact ? 'is-compact' : ''} ${className}`}>
      {showCue ? (
        <div className={`effect-summary-cue tone-${resolved.priorityTone}`}>
          <span>{cueLabel}</span>
          <b>{resolved.cue}</b>
        </div>
      ) : null}
      {!hideHeadline ? <strong className="effect-summary-headline">{resolved.headline}</strong> : null}
      <div className="effect-chip-row" aria-label={resolved.headline}>
        {visibleChips.map(chip => <EffectChipView key={chip.id} chip={chip} />)}
        {overflowCount > 0 ? <span className="effect-chip tone-neutral">+{overflowCount}</span> : null}
      </div>
      {showDetail === 'details' ? (
        <details className="effect-summary-detail">
          <summary>{detailLabel}</summary>
          <SkillDescription text={resolved.detail} className="effect-summary-detail-text" />
        </details>
      ) : null}
    </div>
  );
};

export default EffectSummary;
