import React from 'react';
import { ArrowRight, HeartPulse, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import ActionButton from './ui/ActionButton';
import Panel from './ui/Panel';
import { assetCssUrl, assetPath } from '../utils/assetPath';
import { playUiSound } from '../utils/sound';
import { MAX_RESERVE_COINS } from '../constants';
import { resourceIconPaths } from '../utils/resourceAssets';

interface RunResultScreenProps {
  tone: 'stage-clear' | 'victory' | 'defeat';
  title: string;
  subtitle: string;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

const toneClasses: Record<RunResultScreenProps['tone'], {
  eyebrow: string;
  accent: string;
  ring: string;
  icon: React.ElementType;
}> = {
  'stage-clear': {
    eyebrow: 'Layer Secured',
    accent: 'text-emerald-200',
    ring: 'border-emerald-300/30 bg-emerald-950/20',
    icon: Trophy,
  },
  victory: {
    eyebrow: 'Eclipse Broken',
    accent: 'text-yellow-200',
    ring: 'border-yellow-300/35 bg-yellow-950/20',
    icon: Sparkles,
  },
  defeat: {
    eyebrow: 'Run Ended',
    accent: 'text-red-200',
    ring: 'border-red-300/35 bg-red-950/20',
    icon: RotateCcw,
  },
};

const RunResultScreen: React.FC<RunResultScreenProps> = ({
  tone,
  title,
  subtitle,
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  secondaryLabel,
  onSecondary,
}) => {
  const player = useGameStore(state => state.player);
  const resources = useGameStore(state => state.resources);
  const reserveCoins = useGameStore(state => state.reserveCoins);
  const currentStage = useGameStore(state => state.currentStage);
  const currentTurn = useGameStore(state => state.currentTurn);
  const path = useGameStore(state => state.path);
  const metaProgress = useGameStore(state => state.metaProgress);
  const gameOptions = useGameStore(state => state.gameOptions);
  const classes = toneClasses[tone];
  const Icon = classes.icon;

  const routeText = path.length > 0
    ? path.slice(-5).map(step => `${step.turn}-${step.nodeIndex + 1}`).join(' / ')
    : '기록 없음';

  const handlePrimary = () => {
    if (primaryDisabled) {
      playUiSound(gameOptions.soundEnabled, 'deny');
      return;
    }
    playUiSound(gameOptions.soundEnabled, tone === 'defeat' ? 'deny' : 'confirm');
    onPrimary();
  };

  const handleSecondary = () => {
    playUiSound(gameOptions.soundEnabled, 'select');
    onSecondary?.();
  };

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-gray-950 p-4 text-white scanlines sm:p-6"
      style={{
        backgroundImage: `linear-gradient(180deg,rgba(2,6,23,0.24),rgba(2,6,23,0.92)),${assetCssUrl('assets/backgrounds/lobby-eclipse.png')}`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-black/48" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_18%,rgba(255,255,255,0.16),transparent_24%),linear-gradient(180deg,transparent,rgba(0,0,0,0.72))]" />

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
        <div className="min-w-0">
          <div className={`mb-5 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] ${classes.ring}`}>
            <Icon className={`h-4 w-4 ${classes.accent}`} />
            {classes.eyebrow}
          </div>
          <h1 className="font-orbitron text-[clamp(2.7rem,8vw,6.75rem)] font-black leading-none text-white drop-shadow-[0_3px_7px_rgba(0,0,0,0.65)]">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">{subtitle}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            <ActionButton onClick={handlePrimary} disabled={primaryDisabled} variant={tone === 'defeat' ? 'danger' : 'primary'} className="px-6">
              {primaryLabel}
              <ArrowRight className="h-4 w-4" />
            </ActionButton>
            {secondaryLabel && onSecondary ? (
              <ActionButton onClick={handleSecondary} variant="ghost" className="px-6">
                {secondaryLabel}
              </ActionButton>
            ) : null}
          </div>
        </div>

        <Panel className="p-4 sm:p-5" tone={tone === 'defeat' ? 'red' : tone === 'victory' ? 'gold' : 'cyan'}>
          <div className="mb-4 flex items-center gap-4">
            <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-white/10 bg-black/35">
              {player?.portraitSrc ? (
                <img src={assetPath(player.portraitSrc)} alt="" className="h-full w-full object-cover object-top" loading="lazy" decoding="async" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-black text-white/40">?</div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Runner</div>
              <div className="truncate text-2xl font-black text-white">{player?.name ?? '기록 없음'}</div>
              <div className="truncate text-sm text-slate-300">{player?.weapon ?? '무기 미기록'}</div>
            </div>
          </div>

          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2">
              <span className="inline-flex items-center gap-2 text-slate-300"><HeartPulse className="h-4 w-4 text-lime-200" />HP</span>
              <strong>{player ? `${player.currentHp}/${player.maxHp}` : '-'}</strong>
            </div>
            <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2">
              <span className="inline-flex items-center gap-2 text-slate-300">
                <img className="resource-display-icon-img" src={assetPath(resourceIconPaths.echoRemnants)} alt="" loading="lazy" />
                에코
              </span>
              <strong>{resources.echoRemnants}</strong>
            </div>
            <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2">
              <span className="inline-flex items-center gap-2 text-slate-300">
                <img className="resource-display-icon-img" src={assetPath(resourceIconPaths.senseFragments)} alt="" loading="lazy" />
                감각 조각
              </span>
              <strong>{resources.senseFragments}</strong>
            </div>
            <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2">
              <span className="inline-flex items-center gap-2 text-slate-300">
                <img className="resource-display-icon-img" src={assetPath(resourceIconPaths.memoryPieces)} alt="" loading="lazy" />
                기억 조각
              </span>
              <strong>{resources.memoryPieces}</strong>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-white/10 bg-black/28 p-3 text-xs leading-relaxed text-slate-300">
            <div className="mb-1 font-bold uppercase tracking-[0.16em] text-slate-500">런 기록</div>
            <p>STAGE {currentStage} · {currentTurn}층 · 최근 경로: {routeText}</p>
            <p className="mt-1">예비 동전 {reserveCoins.length}/{MAX_RESERVE_COINS} · 최고 도달 층 {metaProgress.highestStage} · 누적 에코 {metaProgress.totalEchoCollected}</p>
          </div>
        </Panel>
      </section>
    </main>
  );
};

export default RunResultScreen;
