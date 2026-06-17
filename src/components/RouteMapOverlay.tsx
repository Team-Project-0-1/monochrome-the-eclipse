import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Map, X } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import MiniMap from './MiniMap';
import { getAvailableRouteNodeIndices } from '../utils/gameLogic';

// 콩알 미니맵을 대체하는 호출형 전체 지도. RunStatusModal의 오버레이 셸 패턴을 따른다.
const RouteMapOverlay: React.FC = () => {
  const isMapOpen = useGameStore(s => s.isMapOpen);
  const setMapOpen = useGameStore(s => s.setMapOpen);
  const stageNodes = useGameStore(s => s.stageNodes);
  const currentTurn = useGameStore(s => s.currentTurn);
  const path = useGameStore(s => s.path);
  const reducedMotion = useGameStore(s => s.gameOptions.reducedMotion);

  const currentNodes = stageNodes[currentTurn - 1] || [];
  const availableNodeIndices = getAvailableRouteNodeIndices(currentTurn, path, currentNodes.length);

  // Escape로 닫기 (App의 툴팁 Escape 핸들러와 동일 관례).
  useEffect(() => {
    if (!isMapOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMapOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMapOpen, setMapOpen]);

  // framer-motion은 JS 애니메이션이라 CSS reduced-motion 가드가 안 먹음 → 여기서 직접 게이팅.
  const dur = reducedMotion ? 0 : 0.18;
  const cardMotion = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, y: 16, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 10, scale: 0.98 } };

  return (
    <AnimatePresence>
      {isMapOpen ? (
        <motion.div
          className="route-map-overlay fixed inset-0 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: dur }}
          role="dialog" aria-modal="true" aria-label="런 경로 지도"
          onClick={() => setMapOpen(false)}
        >
          <motion.div
            className="route-map-overlay-card w-full max-w-3xl rounded-lg border border-cyan-200/24 p-4 shadow-2xl shadow-black/60"
            {...cardMotion}
            transition={{ duration: dur, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            data-testid="route-map-overlay"
          >
            <header className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-black text-white">
                <Map className="h-5 w-5 text-cyan-200" /> 런 경로
              </h2>
              <button
                type="button"
                autoFocus
                onClick={() => setMapOpen(false)}
                aria-label="지도 닫기"
                data-testid="route-map-close"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/6 text-slate-200 transition-colors hover:bg-white/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <MiniMap nodes={stageNodes} currentTurn={currentTurn} path={path} availableNodeIndices={availableNodeIndices} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default RouteMapOverlay;
