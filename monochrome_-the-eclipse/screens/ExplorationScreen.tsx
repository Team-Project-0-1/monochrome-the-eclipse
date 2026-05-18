import React from 'react';
import { Activity, ArrowLeft, MapPinned, Package, RadioTower, Route, ShieldAlert } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import CharacterStatus from '../components/CharacterStatus';
import ResourceDisplay from '../components/ResourceDisplay';
import MiniMap from '../components/MiniMap';
import NodeSelection from '../components/NodeSelection';
import { GameState, NodeType } from '../types';
import Panel from '../components/ui/Panel';
import ActionButton from '../components/ui/ActionButton';
import { getNodeTypeCounts } from '../utils/nodePresentation';
import { STAGE_TURNS } from '../constants';
import { stageData } from '../dataStages';
import { getAvailableRouteNodeIndices } from '../utils/gameLogic';

const routePressureText = (counts: Record<string, number>) => {
  if ((counts[NodeType.BOSS] ?? 0) > 0) return '보스 신호가 열렸습니다. 지금 빌드가 이 층의 결론을 감당해야 합니다.';
  if ((counts[NodeType.MINIBOSS] ?? 0) > 0) return '중간 보스가 감지됩니다. 위험하지만 런을 크게 앞당길 수 있습니다.';
  if ((counts[NodeType.REST] ?? 0) > 0) return '휴식 지점이 있습니다. 체력과 성장 중 무엇을 우선할지 결정하세요.';
  if ((counts[NodeType.SHOP] ?? 0) > 0) return '보급 지점이 있습니다. 현재 자원을 바로 전투력으로 바꿀 수 있습니다.';
  return '전투 신호가 우세합니다. 체력을 지키면서 다음 보상까지 버티세요.';
};

export const ExplorationScreen = () => {
  const player = useGameStore(state => state.player);
  const resources = useGameStore(state => state.resources);
  const reserveCoins = useGameStore(state => state.reserveCoins);
  const stageNodes = useGameStore(state => state.stageNodes);
  const currentStage = useGameStore(state => state.currentStage);
  const currentTurn = useGameStore(state => state.currentTurn);
  const routeSeed = useGameStore(state => state.routeSeed);
  const routeGenerationLog = useGameStore(state => state.routeGenerationLog);
  const path = useGameStore(state => state.path);
  const setInventoryOpen = useGameStore(state => state.setInventoryOpen);
  const setGameState = useGameStore(state => state.setGameState);
  const selectNode = useGameStore(state => state.selectNode);

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
  const weaponProfile = player.weapon ?? '전투 준비';
  const currentPath = path.length > 0
    ? path.map(step => `${step.turn}층-${step.nodeIndex + 1}`).join(' / ')
    : '진입 전';

  return (
    <div className="exploration-screen relative min-h-screen overflow-x-hidden bg-gray-950 p-3 text-white scanlines sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.16),transparent_30%),radial-gradient(circle_at_85%_12%,rgba(248,113,113,0.14),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(3,7,18,1))]" />
      <div className="pointer-events-none absolute inset-x-0 top-24 h-px bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" />

      <div className="exploration-layout relative z-10 grid min-h-[calc(100vh-1.5rem)] grid-cols-1 gap-4 sm:min-h-[calc(100vh-2.5rem)]">
        <aside className="exploration-rail order-2 flex min-w-0 flex-col gap-4">
          <CharacterStatus character={player} isPlayer={true} />
          <ResourceDisplay resources={resources} reserveCoins={reserveCoins} />
          <Panel className="p-3" tone="cyan">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
              <Activity className="h-4 w-4" />
              Expedition Kit
            </div>
            <div className="flex flex-col gap-2">
              <ActionButton onClick={() => setInventoryOpen(true)} variant="primary" className="w-full" data-testid="open-inventory-button">
                <Package className="h-5 w-5" />
                가방 열기
              </ActionButton>
              <ActionButton onClick={() => setGameState(GameState.MENU)} variant="ghost" className="w-full">
                <ArrowLeft className="h-5 w-5" />
                메인 메뉴
              </ActionButton>
            </div>
          </Panel>
        </aside>

        <main className="exploration-main order-1 flex min-w-0 flex-col gap-4">
          <Panel className="exploration-route-hero overflow-hidden p-4 sm:p-5" tone="neutral">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                  <MapPinned className="h-3.5 w-3.5 text-cyan-200" />
                  Stage {currentStage} Route
                </div>
                <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">
                  {stageInfo?.name ?? '미확인 구역'}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
                  {stageInfo?.description ?? '구역 정보를 불러오는 중입니다.'} {player.name}의 {sensoryProfile} 신호가 다음 선택지를 읽어냅니다.
                </p>
              </div>
              <div className="route-stat-grid grid min-w-0 gap-2 text-sm sm:grid-cols-3 xl:w-[560px]">
                <div className="border-l border-cyan-300/35 pl-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Layer</div>
                  <div className="truncate font-bold text-white">{currentTurn}/{STAGE_TURNS}</div>
                </div>
                <div className="border-l border-cyan-300/35 pl-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Threat</div>
                  <div className="route-stat-value font-bold text-cyan-100">{stageInfo?.theme ?? '미확인 신호'}</div>
                </div>
                <div className="border-l border-cyan-300/35 pl-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Weapon</div>
                  <div className="route-stat-value font-bold text-slate-100">{weaponProfile}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 border-t border-white/10 pt-3 text-xs text-slate-400 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
              <div className="min-w-0">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <RadioTower className="h-4 w-4 shrink-0 text-cyan-200" />
                    <span className="truncate">현재 경로: {currentPath}</span>
                  </span>
                  <span className="font-bold text-cyan-100">{progressPercent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-cyan-200" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                  <span>Seed: {routeSeed ?? '미기록'}</span>
                  <span>생성 로그 {routeGenerationLog.length}건</span>
                </div>
              </div>
              <div className="route-pressure-card rounded-md border border-yellow-200/20 bg-yellow-950/18 px-3 py-2 text-yellow-50">
                <div className="mb-1 flex items-center gap-2 font-bold">
                  <ShieldAlert className="h-4 w-4" />
                  현재 압력
                </div>
                <p className="route-pressure-copy leading-relaxed text-yellow-100/80">{routePressureText(nodeCounts)}</p>
              </div>
            </div>
          </Panel>

          <div className="flex flex-1 items-center">
            <NodeSelection
              nodes={currentNodes}
              availableNodeIndices={availableNodeIndices}
              onSelect={(node, index) => selectNode(node, index)}
              currentTurn={currentTurn}
              player={player}
            />
          </div>

          <div className="exploration-footer grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
            <MiniMap nodes={stageNodes} currentTurn={currentTurn} path={path} availableNodeIndices={availableNodeIndices} />
            <Panel className="exploration-route-read p-3" tone="gold">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-yellow-100">
                <Route className="h-4 w-4" />
                Route Read
              </div>
              <p className="text-sm leading-relaxed text-slate-300">
                전투를 피하기만 하면 성장 속도가 느려지고, 보상만 쫓으면 체력이 먼저 무너집니다. 좋은 런은 위험을 피하는 것이 아니라 감당 가능한 위험을 고르는 데서 시작됩니다.
              </p>
            </Panel>
          </div>
        </main>
      </div>
    </div>
  );
};
