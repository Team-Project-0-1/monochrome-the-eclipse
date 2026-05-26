import React from 'react';
import { useGameStore } from '../store/gameStore';
import RunResultScreen from '../components/RunResultScreen';

export const GameOverScreen = () => {
  const resetGame = useGameStore(state => state.resetGame);

  return (
    <RunResultScreen
      tone="defeat"
      title="실패한 런"
      subtitle="이번 신호는 끊겼습니다. 남은 기록은 다음 탐험의 기준이 됩니다. 어떤 선택에서 체력이 무너졌는지 경로와 자원 흐름을 확인하세요."
      primaryLabel="로비로"
      onPrimary={() => resetGame()}
    />
  );
};
