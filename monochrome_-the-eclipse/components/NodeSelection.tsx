import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, RadioTower, Sparkles } from 'lucide-react';
import { StageNode, NodeType } from '../types';
import type { PlayerCharacter } from '../types';
import NodeIcon from './NodeIcon';
import { getNodePresentation } from '../utils/nodePresentation';
import { useGameStore } from '../store/gameStore';
import { playGameSfx, playUiSound } from '../utils/sound';

interface NodeSelectionProps {
  nodes: StageNode[];
  onSelect: (node: StageNode, index: number) => void;
  currentTurn: number;
  player?: PlayerCharacter | null;
}

const NodeSelection: React.FC<NodeSelectionProps> = ({ nodes, onSelect, currentTurn, player }) => {
  const [selectedNode, setSelectedNode] = useState<StageNode | null>(null);
  const gameOptions = useGameStore(state => state.gameOptions);

  const handleSelect = (node: StageNode, index: number) => {
    if (selectedNode) return;
    playUiSound(gameOptions.soundEnabled, 'confirm');
    playGameSfx(gameOptions.soundEnabled, [NodeType.COMBAT, NodeType.MINIBOSS, NodeType.BOSS].includes(node.type) ? 'combatStart' : 'eventChoice');
    setSelectedNode(node);
    window.setTimeout(() => {
      onSelect(node, index);
      setSelectedNode(null);
    }, 420);
  };

  return (
    <section className="route-signal-board relative w-full overflow-hidden rounded-lg border border-white/10 bg-gray-950/80 p-4 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.05)_0,transparent_28%)]" />
      <div className="pointer-events-none absolute left-6 right-6 top-16 h-px bg-gradient-to-r from-transparent via-cyan-200/40 to-transparent" />

      <div className="relative z-10 mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-cyan-300/30 bg-cyan-950/40 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
            <RadioTower className="h-3.5 w-3.5" />
            Floor {currentTurn} Signal
          </div>
          <h2 className="text-2xl font-black text-white sm:text-3xl">다음 신호를 고르세요</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-300">
            같은 전투라도 경로에 따라 체력, 보상, 빌드 방향이 달라집니다. 지금 필요한 것은 생존, 성장, 변수 중 무엇인지 판단하세요.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300">
          <Sparkles className="h-4 w-4 text-amber-200" />
          선택 즉시 다음 장면으로 진입합니다.
        </div>
      </div>

      <div className="relative z-10 grid gap-3 md:grid-cols-3">
        {nodes.map((node, index) => {
          const meta = getNodePresentation(node, index, player);
          const isSelected = selectedNode?.id === node.id;
          const isDanger = [NodeType.COMBAT, NodeType.MINIBOSS, NodeType.BOSS].includes(node.type);

          return (
            <motion.button
              key={node.id}
              type="button"
              onClick={() => handleSelect(node, index)}
              disabled={selectedNode !== null}
              data-testid={`route-node-${index + 1}`}
              animate={isSelected ? { scale: 1.05, opacity: 0, y: -12 } : { scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: 'easeInOut' }}
              whileHover={selectedNode ? undefined : { y: -3 }}
              className={`route-node-card group relative min-h-[230px] overflow-hidden rounded-lg border p-4 text-left shadow-lg transition-all duration-200 disabled:cursor-wait ${meta.className}`}
            >
              <div className={`absolute inset-x-4 top-0 h-px bg-gradient-to-r ${meta.lineClassName}`} />
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl transition-opacity group-hover:opacity-80" />

              <div className="relative flex h-full flex-col">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                      Path {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="mt-1 text-sm font-bold text-white">{meta.routeName}</div>
                  </div>
                  <div className={`rounded-md border border-white/15 bg-black/30 p-2 ${meta.iconClassName}`}>
                    <NodeIcon type={node.type} size="lg" />
                  </div>
                </div>

                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded bg-white/10 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">
                    {meta.signal}
                  </span>
                  {isDanger ? <AlertTriangle className="h-4 w-4 text-current opacity-80" /> : null}
                </div>

                <h3 className="text-xl font-black text-white">{meta.label}</h3>
                <p className="route-node-description mt-2 flex-1 text-sm leading-relaxed text-white/75">{meta.description}</p>
                <p className="mt-3 rounded-md border border-white/10 bg-black/20 px-2.5 py-2 text-xs font-semibold leading-relaxed text-white/70">
                  {meta.senseHint}
                </p>

                <div className="route-node-meta mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md border border-white/10 bg-black/25 px-2.5 py-2">
                    <div className="text-white/45">위험</div>
                    <div className="font-bold text-white">{meta.risk}</div>
                  </div>
                  <div className="rounded-md border border-white/10 bg-black/25 px-2.5 py-2">
                    <div className="text-white/45">기대 보상</div>
                    <div className="font-bold text-white">{meta.reward}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs font-bold text-white/80">
                  <span>{meta.routeHint} · {meta.stake}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

export default NodeSelection;
