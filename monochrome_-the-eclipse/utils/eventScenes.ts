export interface EventScenePresentation {
  className: string;
  backgroundPath: string;
  mobileBackgroundPath?: string;
  /**
   * 이미 처리된 CSS 값(예: `linear-gradient(...)`)을 직접 넣고 싶을 때.
   * EventScreen은 scene.backgroundCss가 있으면 그것을, 없으면 assetCssUrl(backgroundPath)를 사용한다.
   * (stage3 public-safe mode 같은 후속 통합 PR에서 fallback 배경을 주입할 자리)
   */
  backgroundCss?: string;
  kicker: string;
  location: string;
  speaker: string;
  line: string;
  propLabel: string;
}

const defaultEncounterBackground = 'assets/backgrounds/event-encounter.png';
const streetCacheBackground = 'assets/backgrounds/event-street-cache-v2.png';
const humanSignalBackground = 'assets/backgrounds/event-human-signal-ruins.png';
const anomalyDeviceBackground = 'assets/backgrounds/event-anomaly-device.png';
const blackWellBackground = 'assets/backgrounds/event-black-well.png';
const coinPouchBackground = 'assets/backgrounds/event-coin-pouch-alley.png';
const survivorShelterBackground = 'assets/backgrounds/event-survivor-shelter.png';
const stage3ResonanceRelayBackground = 'assets/backgrounds/event-stage3-resonance-relay.png';
const stage3FleshVatBackground = 'assets/backgrounds/event-stage3-flesh-vat.png';
const stage3EclipseSanctuaryBackground = 'assets/backgrounds/event-stage3-eclipse-sanctuary.png';

const defaultScene: EventScenePresentation = {
  className: 'scene-signal',
  backgroundPath: defaultEncounterBackground,
  kicker: 'Encounter Signal',
  location: '폐허의 교차로',
  speaker: '무전 잔향',
  line: '응답 없는 주파수 사이로 선택을 요구하는 신호가 흘러듭니다.',
  propLabel: '불안정한 신호',
};

const scenes: Record<string, EventScenePresentation> = {
  event_supplies: {
    className: 'scene-supplies',
    backgroundPath: streetCacheBackground,
    kicker: 'Supply Cache',
    location: '무너진 보급 통로',
    speaker: '녹슨 상자',
    line: '상자 안쪽에서 아직 꺼지지 않은 경고등이 희미하게 떨립니다.',
    propLabel: '봉인된 보급품',
  },
  event_survivor: {
    className: 'scene-survivor',
    backgroundPath: humanSignalBackground,
    kicker: 'Human Signal',
    location: '붕괴된 주거 블록',
    speaker: '낡은 송신기',
    line: '끊어진 목소리가 같은 좌표를 반복합니다. 신호가 진짜인지는 아직 알 수 없습니다.',
    propLabel: '생존자의 신호',
  },
  event_trap: {
    className: 'scene-device',
    backgroundPath: anomalyDeviceBackground,
    kicker: 'Anomaly Device',
    location: '감응 장치 구역',
    speaker: '검은 장치',
    line: '금속 고리가 동전처럼 맞물리며 당신의 감각에 공명합니다.',
    propLabel: '공명 장치',
  },
  event_survivor_reward: {
    className: 'scene-shelter',
    backgroundPath: survivorShelterBackground,
    kicker: 'After Signal',
    location: '임시 은신처',
    speaker: '구조된 생존자',
    line: '작은 금속 표식이 손바닥 위에서 희미한 기억빛을 냅니다.',
    propLabel: '감사의 표식',
  },
  event_coin_pouch: {
    className: 'scene-pouch',
    backgroundPath: coinPouchBackground,
    kicker: 'Coin Trace',
    location: '끊어진 보도',
    speaker: '낡은 주머니',
    line: '가죽 주머니 안쪽에서 아직 던져지지 않은 동전들이 서로 부딪힙니다.',
    propLabel: '동전 주머니',
  },
  event_wishing_well: {
    className: 'scene-well',
    backgroundPath: blackWellBackground,
    kicker: 'Old Well',
    location: '검은 안뜰',
    speaker: '오래된 우물',
    line: '깊은 물 아래에서 백색 반점이 일식처럼 깜빡입니다.',
    propLabel: '오래된 우물',
  },
  event_stage3_resonance_relay: {
    className: 'scene-stage3-relay',
    backgroundPath: stage3ResonanceRelayBackground,
    kicker: 'Resonance Relay',
    location: '월식 중계교',
    speaker: '공명 중계탑',
    line: '동전형 공명판이 서로 맞물릴 때마다 탑 안쪽의 신호가 낮게 떨립니다.',
    propLabel: '송신핵',
  },
  event_stage3_flesh_vat: {
    className: 'scene-stage3-vat',
    backgroundPath: stage3FleshVatBackground,
    kicker: 'Flesh Cultivation',
    location: '성당 지하 배양실',
    speaker: '장의 배양조',
    line: '갈고리와 배양액 사이에서 아직 이름 없는 조직이 느리게 호흡합니다.',
    propLabel: '배양 결정',
  },
  event_stage3_eclipse_sanctuary: {
    className: 'scene-stage3-sanctuary',
    backgroundPath: stage3EclipseSanctuaryBackground,
    kicker: 'Silent Sanctuary',
    location: '검은 성역',
    speaker: '봉인된 제단',
    line: '합창은 멈췄지만 제단을 도는 동전들은 아직 선택을 요구합니다.',
    propLabel: '봉인 동전',
  },
};

export const getEventScenePresentation = (eventId: string): EventScenePresentation => (
  scenes[eventId] ?? defaultScene
);
