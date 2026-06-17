import React from 'react';
import { Map, Package, ScrollText, Home, Heart } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { GameState } from '../types';
import { resourceIconPaths } from '../utils/resourceAssets';
import { assetPath } from '../utils/assetPath';
import { clamp } from '../utils/math';

// "필수는 상시, 상세는 호출" — 컴팩트 HP/자원 + 호출 버튼. 배경을 가리지 않는 얇은 바.
const RunTopBar: React.FC = () => {
  const player = useGameStore(s => s.player);
  const resources = useGameStore(s => s.resources);
  const setMapOpen = useGameStore(s => s.setMapOpen);
  const setInventoryOpen = useGameStore(s => s.setInventoryOpen);
  const setRunStatusOpen = useGameStore(s => s.setRunStatusOpen);
  const setGameState = useGameStore(s => s.setGameState);

  if (!player) return null;
  const hpPercent = player.maxHp > 0 ? clamp((player.currentHp / player.maxHp) * 100, 0, 100) : 0;

  return (
    <header className="run-top-bar" data-testid="run-top-bar">
      <div className="run-top-bar-vitals">
        <span className="run-top-bar-hp" aria-label={`체력 ${player.currentHp}/${player.maxHp}`}>
          <Heart className="h-4 w-4 text-red-300" />
          <span className="run-top-bar-hp-track"><i style={{ width: `${hpPercent}%` }} /></span>
          <strong>{player.currentHp}/{player.maxHp}</strong>
        </span>
        <span className="run-top-bar-res">
          <img src={assetPath(resourceIconPaths.echoRemnants)} alt="" loading="lazy" />{resources.echoRemnants}
        </span>
        <span className="run-top-bar-res">
          <img src={assetPath(resourceIconPaths.senseFragments)} alt="" loading="lazy" />{resources.senseFragments}
        </span>
        <span className="run-top-bar-res">
          <img src={assetPath(resourceIconPaths.memoryPieces)} alt="" loading="lazy" />{resources.memoryPieces}
        </span>
      </div>

      <nav className="run-top-bar-actions" aria-label="런 도구">
        <button type="button" className="run-top-bar-btn" data-testid="top-bar-map-button" aria-label="지도" onClick={() => setMapOpen(true)}>
          <Map className="h-4 w-4" /><span>지도</span>
        </button>
        <button type="button" className="run-top-bar-btn" data-testid="top-bar-deck-button" aria-label="가방" onClick={() => setInventoryOpen(true)}>
          <Package className="h-4 w-4" /><span>가방</span>
        </button>
        <button type="button" className="run-top-bar-btn" data-testid="top-bar-status-button" aria-label="상태" onClick={() => setRunStatusOpen(true)}>
          <ScrollText className="h-4 w-4" /><span>상태</span>
        </button>
        <button type="button" className="run-top-bar-btn is-muted" data-testid="top-bar-menu-button" aria-label="메뉴" onClick={() => setGameState(GameState.MENU)}>
          <Home className="h-4 w-4" /><span>메뉴</span>
        </button>
      </nav>
    </header>
  );
};

export default RunTopBar;
