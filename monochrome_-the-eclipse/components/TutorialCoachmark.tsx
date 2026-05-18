import React from 'react';
import { HelpCircle, X } from 'lucide-react';
import { GameState } from '../types';
import { useGameStore } from '../store/gameStore';
import { TutorialKey } from '../store/slices/uiSlice';

interface TutorialCopy {
  key: TutorialKey;
  title: string;
  next: string;
  watch: string;
  fallback: string;
}

const tutorialByState: Partial<Record<GameState, TutorialCopy>> = {
  [GameState.MENU]: {
    key: 'menu',
    title: '로비',
    next: '이어하기 또는 새 탐험 선택',
    watch: 'Prototype v0.1, 접근성, 사운드',
    fallback: '전투 보조는 켜 둔 상태로 시작하세요.',
  },
  [GameState.CHARACTER_SELECT]: {
    key: 'character',
    title: '캐릭터 선택',
    next: 'HP와 고유 기술을 보고 한 명 선택',
    watch: '역할 태그, 액티브 스킬, 잠금 조건',
    fallback: '처음이면 HP가 높거나 조작이 단순한 캐릭터가 안정적입니다.',
  },
  [GameState.EXPLORATION]: {
    key: 'exploration',
    title: '경로 선택',
    next: '다음 노드 하나를 고르기',
    watch: '체력, 보스 거리, 보유 자원',
    fallback: '체력이 낮으면 휴식, 자원이 많으면 상점 가치가 큽니다.',
  },
  [GameState.COMBAT]: {
    key: 'combat',
    title: '동전 전투',
    next: '가능한 족보 선택 후 실행',
    watch: '받는 피해, 적 예고, 내 선택 태그',
    fallback: '받는 피해가 크면 방어 족보나 액티브를 먼저 확인하세요.',
  },
  [GameState.SHOP]: {
    key: 'shop',
    title: '상점',
    next: '구매 가능 표시가 뜬 항목만 비교',
    watch: '비용, 상태 라벨, 효과 태그',
    fallback: '막혔으면 우측 이유를 보고 다른 탭으로 이동하세요.',
  },
  [GameState.EVENT]: {
    key: 'event',
    title: '이벤트',
    next: '조건이 맞는 선택지 하나 고르기',
    watch: '성공률, 비용, 실패 위험',
    fallback: '확률이 애매하면 확정 보상이나 이탈을 우선하세요.',
  },
};

const tutorialCopyOverrides: Partial<Record<GameState, TutorialCopy>> = {
  [GameState.MENU]: {
    key: 'menu',
    title: '로비',
    next: '이어하기 또는 새 탐험 선택',
    watch: '저장된 진행, 접근성, 사운드',
    fallback: '저장된 진행이 있어도 먼저 로비에서 시작합니다.',
  },
  [GameState.CHARACTER_SELECT]: {
    key: 'character',
    title: '캐릭터 선택',
    next: 'HP와 고유 기술을 보고 한 명 선택',
    watch: '역할 태그, 액티브 스킬, 성장 조건',
    fallback: '처음이면 HP가 높거나 조작이 단순한 캐릭터가 안정적입니다.',
  },
  [GameState.EXPLORATION]: {
    key: 'exploration',
    title: '경로 선택',
    next: '현재 경로와 연결된 노드 중 하나 선택',
    watch: '체력, 보스 거리, 보유 자원',
    fallback: '잠긴 노드는 직전 선택지와 연결되지 않은 경로입니다.',
  },
  [GameState.COMBAT]: {
    key: 'combat',
    title: '동전 전투',
    next: '족보 카드 선택 후 실행',
    watch: '받는 피해, 적 예고, 패시브와 상태효과',
    fallback: '족보나 액티브에 마우스를 올리거나 길게 누르면 상세 효과가 보입니다.',
  },
  [GameState.SHOP]: {
    key: 'shop',
    title: '상점',
    next: '구매 가능한 항목만 비교',
    watch: '비용, 상태 회복, 효과 태그',
    fallback: '막혔다면 예측 이유를 보고 다른 층으로 이동하세요.',
  },
  [GameState.EVENT]: {
    key: 'event',
    title: '이벤트',
    next: '조건에 맞는 선택지 하나 고르기',
    watch: '성공률, 비용, 실패 위험',
    fallback: '확률이 애매하면 확정 보상이나 회복을 우선하세요.',
  },
};

const getTutorialCopy = (gameState: GameState): TutorialCopy | null => (
  tutorialCopyOverrides[gameState] ?? tutorialByState[gameState] ?? null
);

const TutorialCoachmark: React.FC = () => {
  const gameState = useGameStore(state => state.gameState);
  const gameOptions = useGameStore(state => state.gameOptions);
  const tutorialFlags = useGameStore(state => state.tutorialFlags);
  const dismissTutorial = useGameStore(state => state.dismissTutorial);
  const setGameOption = useGameStore(state => state.setGameOption);

  const copy = getTutorialCopy(gameState);
  if (!copy || !gameOptions.tutorialEnabled || tutorialFlags[copy.key]) {
    return null;
  }

  return (
    <aside className={`tutorial-coachmark tutorial-${copy.key}`} role="status" aria-live="polite">
      <div className="tutorial-coachmark-header">
        <span className="tutorial-coachmark-kicker">
          <HelpCircle className="h-4 w-4" />
          Tutorial
        </span>
        <button
          type="button"
          className="tutorial-coachmark-close"
          onClick={() => dismissTutorial(copy.key)}
          aria-label="튜토리얼 닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <h2>{copy.title}</h2>
      <div className="tutorial-coachmark-hints" aria-label="tutorial next steps">
        <span className="is-primary">
          <b>다음 행동</b>
          {copy.next}
        </span>
        <span>
          <b>먼저 볼 정보</b>
          {copy.watch}
        </span>
      </div>
      <p className="tutorial-coachmark-fallback">{copy.fallback}</p>
      <div className="tutorial-coachmark-actions">
        <button type="button" onClick={() => dismissTutorial(copy.key)}>
          확인
        </button>
        <button type="button" onClick={() => setGameOption('tutorialEnabled', false)}>
          튜토리얼 끄기
        </button>
      </div>
    </aside>
  );
};

export default TutorialCoachmark;
