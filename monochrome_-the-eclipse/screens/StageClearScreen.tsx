import React from 'react';
import { useGameStore } from '../store/gameStore';
import RunResultScreen from '../components/RunResultScreen';
import { GameState } from '../types';
import { isStagePlayable } from '../utils/stageProgression';
import { stageData } from '../data/dataStages';

export const StageClearScreen = () => {
  const startStage = useGameStore(state => state.startStage);
  const currentStage = useGameStore(state => state.currentStage);
  const setGameState = useGameStore(state => state.setGameState);
  const nextStage = currentStage + 1;
  const nextStagePlayable = isStagePlayable(nextStage);
  const nextStageInfo = stageData[nextStage as keyof typeof stageData];

  return (
    <RunResultScreen
      tone="stage-clear"
      title="층 돌파"
      subtitle={nextStagePlayable
        ? `다음 구역은 ${nextStageInfo?.name ?? `Stage ${nextStage}`}입니다. 지금 얻은 자원과 체력으로 다음 층의 리스크를 감당해야 합니다.`
        : `${nextStageInfo?.name ?? `Stage ${nextStage}`}은 현재 프로토타입 범위 밖입니다. 지금 런은 여기서 정산하세요.`}
      primaryLabel={nextStagePlayable ? `${nextStageInfo?.name ?? '다음 층'}으로` : '다음 층 준비 중'}
      primaryDisabled={!nextStagePlayable}
      onPrimary={() => startStage(nextStage)}
      secondaryLabel="로비로 돌아가기"
      onSecondary={() => setGameState(GameState.MENU)}
    />
  );
};
