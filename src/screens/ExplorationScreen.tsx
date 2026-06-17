import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import NodeSelection from '../components/NodeSelection';
import RunTopBar from '../components/RunTopBar';
import RouteMapOverlay from '../components/RouteMapOverlay';
import RunStatusModal from '../components/RunStatusModal';
import ArchiveSurface from '../components/archive/ArchiveSurface';
import ArchiveStamp from '../components/archive/ArchiveStamp';
import { NodeType } from '../types';
import { getNodeTypeCounts } from '../utils/nodePresentation';
import { STAGE_TURNS } from '../constants';
import { stageData } from '../data/dataStages';
import { getAvailableRouteNodeIndices } from '../utils/gameLogic';
import { getStageBackgroundCss } from '../utils/stageBackground';

const routePressureText = (counts: Record<string, number>) => {
  if ((counts[NodeType.BOSS] ?? 0) > 0) return '보스 신호가 열렸습니다. 지금 빌드가 이 층의 결론을 감당해야 합니다.';
  if ((counts[NodeType.MINIBOSS] ?? 0) > 0) return '중간 보스가 감지됩니다. 위험하지만 런을 크게 앞당길 수 있습니다.';
  if ((counts[NodeType.REST] ?? 0) > 0) return '휴식 지점이 있습니다. 체력과 성장 중 무엇을 우선할지 결정하세요.';
  if ((counts[NodeType.SHOP] ?? 0) > 0) return '보급 지점이 있습니다. 현재 자원을 바로 전투력으로 바꿀 수 있습니다.';
  return '전투 신호가 우세합니다. 체력을 지키면서 다음 보상까지 버티세요.';
};

export const ExplorationScreen = () => {
  const player = useGameStore(state => state.player);
  const stageNodes = useGameStore(state => state.stageNodes);
  const currentStage = useGameStore(state => state.currentStage);
  const currentTurn = useGameStore(state => state.currentTurn);
  const routeSeed = useGameStore(state => state.routeSeed);
  const routeGenerationLog = useGameStore(state => state.routeGenerationLog);
  const path = useGameStore(state => state.path);
  const selectNode = useGameStore(state => state.selectNode);
  const isRunStatusOpen = useGameStore(state => state.isRunStatusOpen);
  const setRunStatusOpen = useGameStore(state => state.setRunStatusOpen);

  const currentNodes = stageNodes[currentTurn - 1] || [];
  const availableNodeIndices = getAvailableRouteNodeIndices(currentTurn, path, currentNodes.length);
  const nodeCounts = getNodeTypeCounts(currentNodes);
  const progressPercent = Math.min(100, Math.round((currentTurn / STAGE_TURNS) * 100));
  const stageInfo = stageData[currentStage as keyof typeof stageData];

  if (!player) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        탐험 데이터를 불러오는 중...
      </div>
    );
  }

  const sensoryProfile = player.signature ?? '감각 동기화';
  const currentPath = path.length > 0
    ? path.map(step => `${step.turn}층-${step.nodeIndex + 1}`).join(' / ')
    : '진입 전';

  return (
    // 네거티브 콘택트 시트 — 스테이지 장면 딤 위에서 다음 프레임을 고른다(런 중 화면, 슬더스 문법).
    <ArchiveSurface
      scene={getStageBackgroundCss(currentStage)}
      className="archive-exploration-screen overflow-x-hidden p-3 sm:p-5"
    >
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col gap-4 sm:min-h-[calc(100vh-2.5rem)]">
        <RunTopBar />

        <main className="order-1 flex min-w-0 flex-col gap-4">
          {/* 콘택트 시트 라벨 — 키커/대형 타이틀/설명문단의 다이어제틱 대체물. 정보는 보존. */}
          <header className="archive-contact-sheet flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ArchiveStamp>스테이지 {currentStage} · {stageInfo?.name ?? '미확인 구역'}</ArchiveStamp>
              <span className="text-xs font-bold text-cyan-100">{progressPercent}%</span>
            </div>

            <p className="max-w-2xl text-xs leading-relaxed text-slate-300/85">
              {stageInfo?.description ?? '구역 정보를 불러오는 중입니다.'} {player.name}의 {sensoryProfile} 신호가 다음 프레임을 읽어냅니다.
            </p>

            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan-200/80" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="truncate">현재 경로: {currentPath}</span>
              <span>{currentTurn}/{STAGE_TURNS} 층</span>
            </div>

            <div className="archive-route-pressure text-slate-200/85">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
              <p className="text-xs leading-relaxed">
                <span className="font-bold text-cyan-100">현재 압력 · </span>{routePressureText(nodeCounts)}
              </p>
            </div>

            {import.meta.env.DEV ? (
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                <span>Seed: {routeSeed ?? '미기록'}</span>
                <span>생성 로그 {routeGenerationLog.length}건</span>
              </div>
            ) : null}
          </header>

          <div className="flex flex-1 items-start">
            <NodeSelection
              nodes={currentNodes}
              availableNodeIndices={availableNodeIndices}
              onSelect={(node, index) => selectNode(node, index)}
              currentTurn={currentTurn}
              player={player}
            />
          </div>
        </main>
      </div>

      <RouteMapOverlay />
      <RunStatusModal isOpen={isRunStatusOpen} onClose={() => setRunStatusOpen(false)} />
    </ArchiveSurface>
  );
};
