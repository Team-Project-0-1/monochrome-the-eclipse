import React from 'react';
import { useGameStore } from '../store/gameStore';
import RunResultScreen from '../components/RunResultScreen';

export const VictoryScreen = () => {
  const resetGame = useGameStore(state => state.resetGame);

  return (
    <RunResultScreen
      tone="victory"
      title="이클립스 붕괴"
      subtitle="도시의 중심 신호가 무너졌습니다. 이번 빌드의 선택, 경로, 자원 흐름은 다음 콘텐츠 확장의 기준 데이터가 됩니다."
      primaryLabel="로비로"
      onPrimary={() => resetGame()}
    />
  );
};
