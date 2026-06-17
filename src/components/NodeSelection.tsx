import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { StageNode, NodeType } from '../types';
import type { PlayerCharacter } from '../types';
import NodeIcon from './NodeIcon';
import { getNodePresentation } from '../utils/nodePresentation';
import { useGameStore } from '../store/gameStore';
import { playGameSfx, playUiSound } from '../utils/sound';
import ArchiveStamp from './archive/ArchiveStamp';

interface NodeSelectionProps {
  nodes: StageNode[];
  availableNodeIndices: number[];
  onSelect: (node: StageNode, index: number) => void;
  currentTurn: number;
  player?: PlayerCharacter | null;
}

// level 0 = 불명(미확인 노드): 거짓 등급 대신 '?'로 표기해 정보 없음을 정직하게 전달
const RatingMeter: React.FC<{ level: number; label: string }> = ({ level, label }) => {
  if (level <= 0) {
    return (
      <div className="mt-1.5 text-[11px] font-bold text-white/40" role="img" aria-label={`${label} 불명`}>
        <span aria-hidden>?</span>
      </div>
    );
  }

  return (
    <div className="mt-1.5 flex items-center gap-1" role="img" aria-label={`${label} ${level}/5`}>
      {[1, 2, 3, 4, 5].map(pip => (
        <span
          key={pip}
          aria-hidden
          className={`h-1.5 w-3 rounded-full ${pip <= level ? 'bg-current opacity-90' : 'bg-white/15'}`}
        />
      ))}
    </div>
  );
};

const NodeSelection: React.FC<NodeSelectionProps> = ({ nodes, availableNodeIndices, onSelect, currentTurn, player }) => {
  const [selectedNode, setSelectedNode] = useState<StageNode | null>(null);
  const gameOptions = useGameStore(state => state.gameOptions);
  const availableNodeSet = new Set(availableNodeIndices);
  // 같은 유형 노드가 2개 이상이면 카드 본문(타입 설명·감각 신호)이 전부 동일해진다.
  // 경로 선택은 게임적으로 동일(selectNode가 적을 랜덤 풀에서 뽑고 index를 무시)하므로
  // 공통 정보는 보드 상단에 1회만 보이고, 카드는 경로 차별 요소(이름·힌트·위험/보상)에 집중.
  const allSameType = nodes.length > 1 && nodes.every(n => n.type === nodes[0].type);
  const commonMeta = allSameType ? getNodePresentation(nodes[0], 0, player) : null;

  const handleSelect = (node: StageNode, index: number) => {
    if (selectedNode) return;
    if (!availableNodeSet.has(index)) {
      playUiSound(gameOptions.soundEnabled, 'deny');
      return;
    }

    playUiSound(gameOptions.soundEnabled, 'confirm');
    playGameSfx(gameOptions.soundEnabled, [NodeType.COMBAT, NodeType.MINIBOSS, NodeType.BOSS].includes(node.type) ? 'combatStart' : 'eventChoice');
    setSelectedNode(node);
    window.setTimeout(() => {
      onSelect(node, index);
      setSelectedNode(null);
    }, 420);
  };

  return (
    <section className="archive-contact-sheet w-full">
      <div className="archive-contact-head">
        <ArchiveStamp>{currentTurn}층 인덱스 — 다음 프레임을 고른다</ArchiveStamp>
        <span className="hidden text-xs text-slate-300/80 sm:inline">
          프레임에 마우스를 올리면 감각 기록이 떠오릅니다
        </span>
      </div>

      {allSameType && commonMeta ? (
        <div className="archive-contact-brief">
          <p>{commonMeta.description}</p>
          <p>{commonMeta.senseHint}</p>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        {nodes.map((node, index) => {
          const meta = getNodePresentation(node, index, player);
          const isSelected = selectedNode?.id === node.id;
          const isAvailable = availableNodeSet.has(index);
          const isDanger = [NodeType.COMBAT, NodeType.MINIBOSS, NodeType.BOSS].includes(node.type);

          return (
            <motion.button
              key={node.id}
              type="button"
              onClick={() => handleSelect(node, index)}
              disabled={selectedNode !== null || !isAvailable}
              aria-disabled={!isAvailable}
              data-route-available={isAvailable ? 'true' : 'false'}
              data-node-type={node.type}
              data-testid={`route-node-${index + 1}`}
              animate={isSelected ? { scale: 1.05, opacity: 0, y: -12 } : { scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: 'easeInOut' }}
              whileHover={selectedNode || !isAvailable ? undefined : { y: -3 }}
              className={`archive-film-frame group ${!isAvailable ? 'is-route-locked' : ''} disabled:cursor-wait`}
            >
              {!isAvailable ? <div className="archive-film-lock">경로 잠김</div> : null}

              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="archive-film-index">프레임 {String(index + 1).padStart(2, '0')} · {meta.routeName}</div>
                  <h3 className="mt-1 text-lg font-black text-white">{meta.label}</h3>
                </div>
                <span className="shrink-0 text-slate-200/80"><NodeIcon type={node.type} size="lg" /></span>
              </div>

              <div className="mb-3 flex items-center gap-2">
                <ArchiveStamp className="archive-stamp-mini">{meta.signal}</ArchiveStamp>
                {isDanger ? <AlertTriangle className="h-4 w-4 text-slate-200/70" /> : null}
              </div>

              <div className="archive-route-meta">
                <div>
                  <div className="archive-route-meta-key">위험</div>
                  <div className="archive-route-meta-val">{meta.risk}</div>
                  <RatingMeter level={meta.riskLevel} label="위험도" />
                </div>
                <div>
                  <div className="archive-route-meta-key">기대 보상</div>
                  <div className="archive-route-meta-val">{meta.reward}</div>
                  <RatingMeter level={meta.rewardLevel} label="보상" />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-200/80">
                <span className="truncate">{meta.routeHint} · {meta.stake}</span>
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
              </div>

              <div className="archive-film-detail">
                <p className="archive-film-detail-sense">{meta.senseHint}</p>
                {!allSameType ? <p className="archive-film-detail-desc">{meta.description}</p> : null}
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

export default NodeSelection;
