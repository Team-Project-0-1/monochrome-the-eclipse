import {
  CharacterClass,
  EventDefinition,
} from "../types";
import { isStage3PublicSafeMode } from "../utils/stage3PublicSafeMode";

export const eventData: { [key: string]: EventDefinition } = {
  event_supplies: {
    id: "event_supplies",
    title: "버려진 보급품",
    description:
      "폐허가 된 지하 통로에서 낡은 군용 상자를 발견했습니다. 안에는 에코 잔재가 남아 있을 수도 있지만, 경보 장치가 아직 살아 있을 수도 있습니다.",
    choices: [
      {
        text: "조심스럽게 열어본다",
        baseSuccessRate: 50,
        senseBonus: { [CharacterClass.TANK]: 30 },
        success: { echoRemnants: 30, message: "상자 안에서 쓸 만한 에코 잔재를 찾아냈습니다." },
        failure: {
          damage: 10,
          message: "상자 안쪽의 경보 장치가 폭발했습니다. 파편이 갑옷 틈을 파고듭니다.",
        },
      },
      {
        text: "냄새와 먼지의 흐름을 읽는다",
        requiredSense: CharacterClass.ROGUE,
        baseSuccessRate: 80,
        success: {
          echoRemnants: 20,
          senseFragments: 1,
          message: "함정의 호흡을 읽고 안전한 수납칸만 열었습니다.",
        },
        failure: null,
      },
      {
        text: "표식을 남기고 지나간다",
        guaranteed: true,
        result: { message: "위험한 보급품을 건드리지 않았습니다. 대신 다음 탐험자를 위한 표식을 남겼습니다." },
      },
    ],
  },
  event_survivor: {
    id: "event_survivor",
    title: "생존자의 신호",
    description:
      "무너진 벽 너머에서 작은 두드림이 반복됩니다. 구조 신호일 수도 있고, 약탈자가 흉내 내는 미끼일 수도 있습니다.",
    choices: [
      {
        text: "소리를 따라간다",
        baseSuccessRate: 60,
        senseBonus: { [CharacterClass.WARRIOR]: 20 },
        success: {
          echoRemnants: -10,
          memoryPieces: 1,
          message:
            "소리의 떨림이 사람의 호흡과 맞물려 있음을 알아냈습니다. 생존자는 작은 기억 조각을 보답으로 건넵니다.",
          followUp: "event_survivor_reward",
        },
        failure: {
          combat: "marauder1",
          message: "신호는 미끼였습니다. 매복한 약탈자가 그림자 속에서 튀어나옵니다.",
        },
      },
      {
        text: "마력의 잔향을 확인한다",
        requiredSense: CharacterClass.MAGE,
        baseSuccessRate: 90,
        success: {
          message: "신호 주변의 악의를 미리 감지했습니다. 위험한 골목을 피해 돌아갑니다.",
          echoRemnants: 10,
        },
        failure: null,
      },
      {
        text: "응답하지 않고 지나간다",
        guaranteed: true,
        result: { message: "알 수 없는 신호를 뒤로하고 조용히 자리를 떠났습니다." },
      },
    ],
  },
  event_trap: {
    id: "event_trap",
    title: "이상한 장치",
    description:
      "바닥에 박힌 오래된 감응 장치가 희미하게 깜빡입니다. 가까이 다가가면 감각을 증폭시킬 수도, 저주를 흘려보낼 수도 있습니다.",
    choices: [
      {
        text: "장치를 조사한다",
        baseSuccessRate: 40,
        senseBonus: {
          [CharacterClass.WARRIOR]: 10,
          [CharacterClass.TANK]: 20,
          [CharacterClass.MAGE]: 15,
        },
        success: {
          senseFragments: 2,
          message: "장치의 공명 주기를 맞춰 감각 조각을 추출했습니다.",
        },
        failure: {
          damage: 15,
          curse: 2,
          message: "검은 파장이 손끝을 타고 올라옵니다. 저주의 잔향이 남았습니다.",
        },
      },
      {
        text: "도둑의 흔적을 추적한다",
        requiredSense: CharacterClass.ROGUE,
        baseSuccessRate: 70,
        success: {
          echoRemnants: 25,
          message: "누군가 장치를 털다 흘린 에코 잔재를 찾아냈습니다.",
        },
        failure: {
          damage: 5,
          message: "흔적을 쫓다 느슨한 철판에 발을 베였습니다.",
        },
      },
      {
        text: "부숴서 잔재만 회수한다",
        guaranteed: true,
        result: {
          echoRemnants: 5,
          message: "장치를 망가뜨리고 남은 부품에서 적은 양의 에코를 회수했습니다.",
        },
      },
    ],
  },
  event_survivor_reward: {
    id: "event_survivor_reward",
    title: "생존자의 보답",
    description: "구조한 생존자가 흔들리는 손으로 낡은 금속 표식을 내밉니다. 표식 안쪽에는 기억의 결이 남아 있습니다.",
    isFollowUp: true,
    choices: [
      {
        text: "감사의 표식을 받는다",
        guaranteed: true,
        result: {
          echoRemnants: 50,
          senseFragments: 1,
          message: "생존자는 당신의 이름을 기억하겠다고 말했습니다. 작은 감사가 에코로 되돌아옵니다.",
        },
      },
    ],
  },
  event_coin_pouch: {
    id: "event_coin_pouch",
    title: "낡은 동전 주머니",
    description: "끊어진 가죽끈에 매달린 동전 주머니를 발견했습니다. 안쪽에서 아직 굴러가지 않은 동전의 무게가 느껴집니다.",
    choices: [
      {
        text: "열어본다",
        guaranteed: true,
        result: {
          message: "주머니 안에서 예비 동전 하나를 얻었습니다.",
          reserveCoinsGained: 1,
        },
      },
      {
        text: "그대로 지나간다",
        guaranteed: true,
        result: { message: "불길한 주머니를 건드리지 않고 길을 계속 갑니다." },
      },
    ],
  },
  event_wishing_well: {
    id: "event_wishing_well",
    title: "오래된 우물",
    description: "건물 안뜰에 오래된 우물이 남아 있습니다. 밑바닥에서 빛이 깜빡이고, 동전을 던지면 무언가 되돌아올 것 같습니다.",
    choices: [
      {
        text: "에코 10개를 던져본다",
        requiredResources: { echoRemnants: 10 },
        baseSuccessRate: 50,
        success: {
          echoRemnants: -10,
          message: "우물 속 빛이 반응하며 예비 동전 하나를 밀어 올렸습니다.",
          reserveCoinsGained: 1,
        },
        failure: {
          echoRemnants: -10,
          message: "에코가 물속으로 사라졌습니다. 되돌아온 것은 차가운 메아리뿐입니다.",
        },
      },
      {
        text: "소원 없이 지나간다",
        guaranteed: true,
        result: { message: "우물을 바라보다가, 아직 빌 소원이 없다는 사실만 확인했습니다." },
      },
    ],
  },
  event_stage3_resonance_relay: isStage3PublicSafeMode ? {
    id: "event_stage3_resonance_relay",
    title: "심층 중계기",
    description:
      "최종 심층의 낡은 중계기가 낮은 주파수로 깜빡입니다. 동전 모양의 표식들이 겹치며 다음 전투의 규칙을 예고합니다.",
    choices: [
      {
        text: "공명판의 박자를 안정시킨다",
        baseSuccessRate: 55,
        senseBonus: { [CharacterClass.MAGE]: 25, [CharacterClass.WARRIOR]: 10 },
        success: {
          senseFragments: 2,
          message: "중계기의 박자가 정리되고 남은 파동이 감각 조각으로 굳었습니다.",
        },
        failure: {
          curse: 2,
          message: "되돌아온 신호가 몸 안쪽에서 울립니다. 저주가 따라붙었습니다.",
        },
      },
      {
        text: "송신핵을 회수한다",
        baseSuccessRate: 45,
        senseBonus: { [CharacterClass.TANK]: 25 },
        success: {
          echoRemnants: 35,
          reserveCoinsGained: 1,
          message: "송신핵은 아직 따뜻했습니다. 에코 잔재와 뒤틀린 예비 동전 하나를 확보했습니다.",
        },
        failure: {
          combat: "annihilationAmplifier",
          message: "송신핵을 건드리는 순간, 심층 신호체 A가 전투 형태로 응답합니다.",
        },
      },
      {
        text: "간섭 범위 밖으로 빠져나간다",
        guaranteed: true,
        result: {
          message: "중계기는 계속 울리지만, 지금은 그 신호를 등지고 지나갑니다.",
        },
      },
    ],
  } : {
    id: "event_stage3_resonance_relay",
    title: "공명 중계탑",
    description:
      "월식 아래 무너진 중계탑이 아직도 낮은 음으로 진동합니다. 동전 모양의 공명판이 허공에서 맞물리고, 그 틈마다 괴멸 증폭기의 신호가 새어 나옵니다.",
    choices: [
      {
        text: "공명판의 박자를 끊는다",
        baseSuccessRate: 55,
        senseBonus: { [CharacterClass.MAGE]: 25, [CharacterClass.WARRIOR]: 10 },
        success: {
          senseFragments: 2,
          message: "중계탑의 박자가 무너지고 남은 파동이 감각 조각으로 굳었습니다.",
        },
        failure: {
          curse: 2,
          message: "끊어낸 박자가 되돌아와 몸 안쪽에서 울립니다. 저주가 따라붙었습니다.",
        },
      },
      {
        text: "송신핵을 뜯어낸다",
        baseSuccessRate: 45,
        senseBonus: { [CharacterClass.TANK]: 25 },
        success: {
          echoRemnants: 35,
          reserveCoinsGained: 1,
          message: "송신핵은 아직 따뜻했습니다. 에코 잔재와 뒤틀린 예비 동전 하나를 확보했습니다.",
        },
        failure: {
          combat: "annihilationAmplifier",
          message: "송신핵을 건드리는 순간, 중계탑 뒤에서 괴멸 증폭기의 잔향이 실체를 얻습니다.",
        },
      },
      {
        text: "간섭 범위 밖으로 빠져나간다",
        guaranteed: true,
        result: {
          message: "탑은 계속 울리지만, 지금은 그 신호를 등지고 지나갑니다.",
        },
      },
    ],
  },
  event_stage3_flesh_vat: isStage3PublicSafeMode ? {
    id: "event_stage3_flesh_vat",
    title: "심층 조율실",
    description:
      "차가운 조율 장치들이 일정한 리듬으로 켜졌다 꺼집니다. 하얀 결정들이 안전 케이스 안에서 흔들립니다.",
    choices: [
      {
        text: "결정을 조심스럽게 회수한다",
        baseSuccessRate: 50,
        senseBonus: { [CharacterClass.ROGUE]: 30 },
        success: {
          memoryPieces: 2,
          message: "장치의 박자보다 빠르게 손을 빼냈습니다. 기억 조각이 손바닥에 남았습니다.",
        },
        failure: {
          damage: 12,
          message: "잠들어 있던 장치가 반응했습니다. 뒤늦은 통증이 따라옵니다.",
        },
      },
      {
        text: "조율 장치를 정지시킨다",
        baseSuccessRate: 60,
        senseBonus: { [CharacterClass.WARRIOR]: 15, [CharacterClass.MAGE]: 15 },
        success: {
          echoRemnants: 28,
          message: "장치가 꺼지며 남은 에코가 재처럼 흩어졌습니다.",
        },
        failure: {
          combat: "fleshCultivator",
          message: "불안정한 신호가 심층 신호체 B를 불러냈습니다.",
        },
      },
      {
        text: "작동 중인 장치를 건드리지 않는다",
        guaranteed: true,
        result: {
          message: "조율실은 계속 박동합니다. 지금은 그 리듬에 이름을 붙이지 않기로 합니다.",
        },
      },
    ],
  } : {
    id: "event_stage3_flesh_vat",
    title: "장의 배양조",
    description:
      "성당 지하의 배양조 안에서 살점과 갈고리가 느리게 호흡합니다. 아직 깨어나지 않은 조직 사이로 기억 조각 같은 하얀 결정이 박혀 있습니다.",
    choices: [
      {
        text: "결정을 조심스럽게 도려낸다",
        baseSuccessRate: 50,
        senseBonus: { [CharacterClass.ROGUE]: 30 },
        success: {
          memoryPieces: 2,
          message: "갈고리의 움직임보다 빠르게 손을 빼냈습니다. 기억 조각이 손바닥에 남았습니다.",
        },
        failure: {
          damage: 12,
          message: "잠들어 있던 갈고리가 팔을 스쳤습니다. 상처가 늦게 벌어집니다.",
        },
      },
      {
        text: "배양액을 태워 흔적을 지운다",
        baseSuccessRate: 60,
        senseBonus: { [CharacterClass.WARRIOR]: 15, [CharacterClass.MAGE]: 15 },
        success: {
          echoRemnants: 28,
          message: "배양조가 꺼지며 남은 에코가 재처럼 흩어졌습니다.",
        },
        failure: {
          combat: "fleshCultivator",
          message: "불꽃 속에서 사육자의 갈고리가 먼저 움직였습니다.",
        },
      },
      {
        text: "살아 있는 장치를 건드리지 않는다",
        guaranteed: true,
        result: {
          message: "배양조는 계속 호흡합니다. 지금은 그 리듬에 이름을 붙이지 않기로 합니다.",
        },
      },
    ],
  },
  event_stage3_eclipse_sanctuary: isStage3PublicSafeMode ? {
    id: "event_stage3_eclipse_sanctuary",
    title: "무채 제단",
    description:
      "밝기를 잃은 제단 위로 희미한 원형 표식이 내려앉습니다. 봉인된 동전들이 둘레를 돌며 선택을 재촉합니다.",
    choices: [
      {
        text: "봉인 동전의 궤도를 읽는다",
        baseSuccessRate: 50,
        senseBonus: { [CharacterClass.MAGE]: 25 },
        success: {
          senseFragments: 1,
          memoryPieces: 1,
          message: "동전의 궤도가 잠깐 멈추고, 감각과 기억이 같은 문양으로 겹쳤습니다.",
        },
        failure: {
          curse: 1,
          damage: 8,
          message: "읽는 순간 제단이 당신의 박자를 먼저 읽었습니다.",
        },
      },
      {
        text: "제단에 에코를 바친다",
        requiredResources: { echoRemnants: 15 },
        baseSuccessRate: 70,
        success: {
          echoRemnants: -15,
          reserveCoinsGained: 1,
          message: "에코가 사라진 자리에 무채색 예비 동전 하나가 남았습니다.",
        },
        failure: {
          echoRemnants: -15,
          combat: "abyssObserver",
          message: "제단은 대가만 삼키고, 심층 관측 신호를 깨웠습니다.",
        },
      },
      {
        text: "기도가 시작되기 전에 떠난다",
        guaranteed: true,
        result: {
          message: "침묵은 깨지지 않았습니다. 그 사실만으로도 충분한 보상일 수 있습니다.",
        },
      },
    ],
  } : {
    id: "event_stage3_eclipse_sanctuary",
    title: "침묵 성역",
    description:
      "검은 제단 위로 월식의 코로나가 떨어집니다. 합창은 들리지 않지만, 봉인된 동전들이 제단 둘레를 돌며 선택을 재촉합니다.",
    choices: [
      {
        text: "봉인 동전의 궤도를 읽는다",
        baseSuccessRate: 50,
        senseBonus: { [CharacterClass.MAGE]: 25 },
        success: {
          senseFragments: 1,
          memoryPieces: 1,
          message: "동전의 궤도가 잠깐 멈추고, 감각과 기억이 같은 문양으로 겹쳤습니다.",
        },
        failure: {
          curse: 1,
          damage: 8,
          message: "읽는 순간 제단이 당신의 박자를 먼저 읽었습니다.",
        },
      },
      {
        text: "검은 제단에 에코를 바친다",
        requiredResources: { echoRemnants: 15 },
        baseSuccessRate: 70,
        success: {
          echoRemnants: -15,
          reserveCoinsGained: 1,
          message: "에코가 사라진 자리에 무채색 예비 동전 하나가 남았습니다.",
        },
        failure: {
          echoRemnants: -15,
          combat: "abyssObserver",
          message: "성역은 대가만 삼키고, 심연 관측체의 눈을 열었습니다.",
        },
      },
      {
        text: "기도가 시작되기 전에 떠난다",
        guaranteed: true,
        result: {
          message: "침묵은 깨지지 않았습니다. 그 사실만으로도 충분한 보상일 수 있습니다.",
        },
      },
    ],
  },
};
