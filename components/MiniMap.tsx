import React, { useMemo } from 'react';
import { Map } from 'lucide-react';
import { StageNode, NodeType } from '../types';
import NodeIcon from './NodeIcon';
import { STAGE_TURNS } from '../constants';

interface MiniMapProps {
  nodes: StageNode[][];
  currentTurn: number;
  path: { turn: number; nodeIndex: number; nodeId: string; }[];
  availableNodeIndices?: number[];
}

const nodeTypeNames: { [key in NodeType]: string } = {
  [NodeType.COMBAT]: '전투',
  [NodeType.SHOP]: '상점',
  [NodeType.REST]: '휴식',
  [NodeType.EVENT]: '사건',
  [NodeType.MINIBOSS]: '중간 보스',
  [NodeType.BOSS]: '보스',
  [NodeType.UNKNOWN]: '미확인',
};

const isVisited = (path: MiniMapProps['path'], nodeId: string) => path.some(p => p.nodeId === nodeId);

const MINI_MAP_VIEW = {
  turnWidth: 12,
  turnLabelHeight: 8,
  nodeRowHeight: 9,
};

const MiniMap: React.FC<MiniMapProps> = ({ nodes, currentTurn, path, availableNodeIndices = [] }) => {
  const turnCount = Math.max(1, nodes.length);
  const maxNodeRows = Math.max(1, ...nodes.map(turnNodes => turnNodes.length));
  const mapWidth = turnCount * MINI_MAP_VIEW.turnWidth;
  const mapHeight = MINI_MAP_VIEW.turnLabelHeight + maxNodeRows * MINI_MAP_VIEW.nodeRowHeight;

  const getPoint = (turn: number, nodeIndex: number) => {
    const turnIndex = Math.min(Math.max(turn - 1, 0), turnCount - 1);
    const rowIndex = Math.min(Math.max(nodeIndex, 0), maxNodeRows - 1);

    return {
      x: turnIndex * MINI_MAP_VIEW.turnWidth + MINI_MAP_VIEW.turnWidth / 2,
      y: MINI_MAP_VIEW.turnLabelHeight + rowIndex * MINI_MAP_VIEW.nodeRowHeight + MINI_MAP_VIEW.nodeRowHeight / 2,
    };
  };

  const pathCoords = useMemo(() => {
    if (path.length < 1) return [];

    return path.map(p => getPoint(p.turn, p.nodeIndex));
  }, [path, turnCount, maxNodeRows]);

  const boardStyle = {
    aspectRatio: `${mapWidth} / ${mapHeight}`,
    '--mini-map-turns': turnCount,
    '--mini-map-rows': maxNodeRows,
  } as React.CSSProperties;

  return (
    <div className="mini-map-panel rounded-lg border border-gray-700/50 bg-gray-800/80 p-3 backdrop-blur-sm">
      <h3 className="mb-3 flex items-center justify-between text-sm font-bold text-white">
        <span className="flex items-center gap-2">
          <Map className="h-4 w-4" />
          런 진행도
        </span>
        <span className="text-xs text-yellow-400">
          {currentTurn} / {STAGE_TURNS}
        </span>
      </h3>
      <div className="mini-map-scroll">
        <div className="mini-map-board" style={boardStyle} aria-label="런 경로 미니맵">
          <svg
            className="mini-map-path pointer-events-none absolute left-0 top-0 z-0 h-full w-full"
            viewBox={`0 0 ${mapWidth} ${mapHeight}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <g>
              {pathCoords.slice(1).map((coord, index) => {
                const prevCoord = pathCoords[index];
                return (
                  <line
                    key={`${coord.x}-${coord.y}`}
                    x1={prevCoord.x}
                    y1={prevCoord.y}
                    x2={coord.x}
                    y2={coord.y}
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="0.6"
                    strokeDasharray="1.6 0.9"
                    strokeLinecap="round"
                  />
                );
              })}
            </g>
          </svg>

          {nodes.map((turnNodes, turnIndex) => {
            const turnNumber = turnIndex + 1;
            const isCurrentTurn = turnNumber === currentTurn;
            const isPastTurn = turnNumber < currentTurn;
            const labelPoint = getPoint(turnNumber, 0);
            const left = `${(labelPoint.x / mapWidth) * 100}%`;

            return (
              <React.Fragment key={turnNumber}>
                {isCurrentTurn && (
                  <div
                    className="mini-map-turn-zone"
                    style={{
                      left: `${(turnIndex * MINI_MAP_VIEW.turnWidth / mapWidth) * 100}%`,
                      width: `${(MINI_MAP_VIEW.turnWidth / mapWidth) * 100}%`,
                    }}
                    aria-hidden="true"
                  />
                )}
                <div
                  className={`mini-map-turn-label ${
                    isCurrentTurn ? 'is-current' : isPastTurn ? 'is-past' : 'is-future'
                  }`}
                  style={{
                    left,
                    top: `${((MINI_MAP_VIEW.turnLabelHeight / 2) / mapHeight) * 100}%`,
                  }}
                >
                  {turnNumber}
                </div>
                {turnNodes.map((node, nodeIndex) => {
                  const visited = isVisited(path, node.id);
                  const isAvailable = turnNumber !== currentTurn || availableNodeIndices.includes(nodeIndex);
                  const tooltipText = nodeTypeNames[node.type];
                  const point = getPoint(turnNumber, nodeIndex);

                  return (
                    <div
                      key={node.id}
                      title={tooltipText}
                      className={`mini-map-node flex items-center justify-center rounded-md border transition-all ${
                        visited
                          ? 'border-green-500 bg-green-700'
                          : isCurrentTurn
                            ? isAvailable
                              ? 'animate-pulse border-gray-500 bg-gray-700'
                              : 'border-gray-700 bg-gray-950 opacity-35'
                            : 'border-gray-600 bg-gray-700'
                      }`}
                      style={{
                        left: `${(point.x / mapWidth) * 100}%`,
                        top: `${(point.y / mapHeight) * 100}%`,
                      }}
                    >
                      <NodeIcon type={node.type} size="sm" />
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MiniMap;
