import React from 'react';
import { ArrowRight, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import ArchiveSurface from './archive/ArchiveSurface';
import ArchiveStamp from './archive/ArchiveStamp';
import { assetCssUrl, assetPath } from '../utils/assetPath';
import { playUiSound } from '../utils/sound';
import { MAX_RESERVE_COINS } from '../constants';
import { resourceIconPaths } from '../utils/resourceAssets';
import { summarizeRunHistory } from '../utils/runStats';
import { formatTier } from '../utils/combatPresentation';
import type { EnemyCharacter } from '../types';

const deathCauseLabels: Record<'combat' | 'event', string> = {
  combat: '전투',
  event: '사건',
};

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

const toneMeta: Record<RunResultScreenProps['tone'], { eyebrow: string; icon: React.ElementType; warn: boolean }> = {
  'stage-clear': { eyebrow: '층 확보', icon: Trophy, warn: false },
  victory: { eyebrow: '이클립스 종결', icon: Sparkles, warn: false },
  defeat: { eyebrow: '런 종료', icon: RotateCcw, warn: true },
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
  const meta = toneMeta[tone];
  const Icon = meta.icon;

  const routeText = path.length > 0
    ? path.slice(-5).map(step => `${step.turn}-${step.nodeIndex + 1}`).join(' / ')
    : '기록 없음';

  const summary = React.useMemo(() => summarizeRunHistory(metaProgress.runHistory), [metaProgress.runHistory]);
  const thisRun = summary.lastRun;
  const showDefeatCause = tone === 'defeat' && thisRun?.outcome === 'death';

  const currentWinrate = player ? summary.winrateByCharacter[player.class] : undefined;
  const topDeathStages = React.useMemo(
    () => Object.entries(summary.deathsByStage)
      .map(([stage, count]): { stage: number; count: number } => ({ stage: Number(stage), count: Number(count) }))
      .sort((a, b) => b.count - a.count || a.stage - b.stage)
      .slice(0, 3),
    [summary.deathsByStage],
  );

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
    // 사건 종결 보고서 — 일식 위에서 이번 런을 정산한다(일식 정체성 보존, 메뉴와 일관).
    // defeat=빛에 타버린 필름(§3.9 장면 구분): is-defeat가 흰빛 번짐 오버레이를 켠다.
    <ArchiveSurface scene={assetCssUrl('assets/backgrounds/lobby-eclipse.png')} className={`archive-result-screen overflow-y-auto p-4 sm:p-6 ${tone === 'defeat' ? 'is-defeat' : ''}`}>
      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-2rem)] sm:min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0">
          <ArchiveStamp className={meta.warn ? 'is-warn' : ''}>
            <span className="inline-flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" />{meta.eyebrow}</span>
          </ArchiveStamp>
          <h1 className="mt-4 text-[clamp(2.4rem,7vw,5.5rem)] font-bold leading-none text-white drop-shadow-[0_3px_7px_rgba(0,0,0,0.65)]" style={{ fontFamily: 'var(--font-family-archive)' }}>
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">{subtitle}</p>

          {/* 결재란 — 보고서 하단 행동 */}
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" className="archive-buy-btn" style={{ width: 'auto', minWidth: '9rem', marginTop: 0 }} disabled={primaryDisabled} onClick={handlePrimary}>
              {primaryLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
            {secondaryLabel && onSecondary ? (
              <button type="button" className="archive-tool-btn" onClick={handleSecondary}>{secondaryLabel}</button>
            ) : null}
          </div>
        </div>

        {/* 사건 종결 보고서 — 어두운 양식 + 타자 통계 */}
        <div className="archive-report">
          <div className="archive-report-runner">
            <div className="archive-report-portrait">
              {player?.portraitSrc ? (
                <img src={assetPath(player.portraitSrc)} alt="" loading="lazy" decoding="async" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-black text-white/40">?</div>
              )}
            </div>
            <div className="min-w-0">
              <div className="archive-report-label">Runner</div>
              <div className="archive-report-runner-name truncate">{player?.name ?? '기록 없음'}</div>
              <div className="archive-report-runner-sub truncate">{player?.weapon ?? '무기 미기록'}</div>
            </div>
          </div>

          <div className="archive-dossier-row mt-4">
            <span className="archive-tag">HP <strong>{player ? `${player.currentHp}/${player.maxHp}` : '-'}</strong></span>
            <span className="archive-tag"><img src={assetPath(resourceIconPaths.echoRemnants)} alt="" loading="lazy" />에코 <strong>{resources.echoRemnants}</strong></span>
            <span className="archive-tag"><img src={assetPath(resourceIconPaths.senseFragments)} alt="" loading="lazy" />감각 <strong>{resources.senseFragments}</strong></span>
            <span className="archive-tag"><img src={assetPath(resourceIconPaths.memoryPieces)} alt="" loading="lazy" />기억 <strong>{resources.memoryPieces}</strong></span>
          </div>

          <p className="archive-report-line">
            <span className="archive-report-label">런 기록</span><br />
            스테이지 {currentStage} · {currentTurn}층 · 최근 경로: {routeText}<br />
            예비 동전 {reserveCoins.length}/{MAX_RESERVE_COINS} · 최고 도달 층 {metaProgress.highestStage} · 누적 에코 {metaProgress.totalEchoCollected}
            {showDefeatCause ? (
              <>
                <br />패배 원인: <strong>{thisRun?.deathCause ? deathCauseLabels[thisRun.deathCause] : '미상'}</strong>
                {thisRun?.lastEnemyName ? (
                  <> · 마지막 적: <strong>{thisRun.lastEnemyName}</strong>{thisRun.lastEnemyTier ? ` (${formatTier(thisRun.lastEnemyTier as EnemyCharacter['tier'])})` : ''}</>
                ) : null}
              </>
            ) : null}
          </p>

          {summary.total > 0 ? (
            <p className="archive-report-line">
              <span className="archive-report-label">최근 기록 (최대 {summary.total}런)</span><br />
              {currentWinrate ? (
                <>이 캐릭터 승률: <strong>{currentWinrate.winrate}%</strong> ({currentWinrate.wins}승 {currentWinrate.losses}패)</>
              ) : (
                <>이 캐릭터의 최근 기록이 없습니다.</>
              )}
              {topDeathStages.length > 0 ? (
                <><br />최다 사망 스테이지: {topDeathStages.map(item => `${item.stage}스테이지 (${item.count})`).join(' · ')}</>
              ) : null}
            </p>
          ) : null}
        </div>
      </section>
    </ArchiveSurface>
  );
};

export default RunResultScreen;
