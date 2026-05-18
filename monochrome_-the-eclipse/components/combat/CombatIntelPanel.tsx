import React from 'react';
import { BookOpen, Calculator, Crosshair, Sparkles, X } from 'lucide-react';
import { characterActiveSkills, characterData } from '../../dataCharacters';
import { getPlayerAbility } from '../../dataSkills';
import { getMonsterPhase, monsterData, monsterPatterns } from '../../dataMonsters';
import { patternUpgrades } from '../../dataUpgrades';
import {
  CoinFace,
  CombatPrediction,
  DetectedPattern,
  EnemyCharacter,
  EnemyIntent,
  PatternType,
  PlayerCharacter,
  StatusEffectType,
} from '../../types';
import {
  faceClass,
  faceLabel,
  getIntentPatternLabel,
  patternLabels,
  patternOrder,
  statusLabels,
} from '../../utils/combatPresentation';
import { assetPath } from '../../utils/assetPath';
import EffectSummary from '../EffectSummary';
import { summarizeAbility, summarizeDescription } from '../../utils/effectSummary';

export type CombatIntelView = 'player' | 'enemy' | 'calc' | 'passives';

interface CombatIntelBarProps {
  player: PlayerCharacter;
  enemy: EnemyCharacter;
  detectedPatterns: DetectedPattern[];
  selectedPatterns: DetectedPattern[];
  prediction: CombatPrediction | null;
  intent: EnemyIntent | null;
  unlockedPatterns: string[];
  activeView: CombatIntelView | null;
  onOpen: (view: CombatIntelView) => void;
  onClose: () => void;
}

const patternTypes = [
  PatternType.PAIR,
  PatternType.TRIPLE,
  PatternType.QUAD,
  PatternType.PENTA,
  PatternType.UNIQUE,
  PatternType.AWAKENING,
];

const patternFaces = [CoinFace.HEADS, CoinFace.TAILS];

const patternIconPaths: Record<PatternType, string> = {
  [PatternType.PAIR]: 'assets/icons/combat/pattern-pair.png',
  [PatternType.TRIPLE]: 'assets/icons/combat/pattern-triple.png',
  [PatternType.QUAD]: 'assets/icons/combat/pattern-quad.png',
  [PatternType.PENTA]: 'assets/icons/combat/pattern-penta.png',
  [PatternType.UNIQUE]: 'assets/icons/combat/pattern-unique.png',
  [PatternType.AWAKENING]: 'assets/icons/combat/pattern-awakening.png',
};

const monsterPassiveSummaries: Record<string, { name: string; description: string }> = {
  PASSIVE_MARAUDER1_CRUEL_INTERIOR: {
    name: '잔혹한 내면',
    description: '추적을 쌓은 뒤 난도질로 연속 피해를 노립니다.',
  },
  PASSIVE_MARAUDER2_MUSCLE_GROWTH: {
    name: '근육 성장',
    description: '증폭을 쌓고, 파괴전차로 증폭을 피해로 전환합니다.',
  },
  PASSIVE_LEADER_HARD_SKIN: {
    name: '단단한 피부',
    description: '반격과 방어 기술로 버티며 분쇄 조건을 만듭니다.',
  },
  PASSIVE_REAPER_FLOWING_DARKNESS: {
    name: '흐르는 어둠',
    description: '저주를 누적해 밤의 약탈 피해를 키웁니다.',
  },
  PASSIVE_REAPER_AMBUSH: {
    name: '기습',
    description: '동전 흐름을 방해해 다음 턴의 안전한 조합을 흔듭니다.',
  },
  PASSIVE_REAPER_VITAL_STRIKE: {
    name: '급소 타격',
    description: '저주가 쌓인 대상을 강하게 압박합니다.',
  },
  PASSIVE_SHADOWWRAITH_EARDRUM_BREAK: {
    name: '고막 파괴',
    description: '대상의 표식이 4 이상이면 출혈을 추가로 부여합니다.',
  },
  PASSIVE_DOPPELGANGER_AFTERIMAGE: {
    name: '잔상',
    description: '증폭이 3 이상인 공격은 공명을 추가로 남깁니다.',
  },
  PASSIVE_UNPLEASANTCUBE_BIND: {
    name: '휘감기',
    description: '반격이 3 이상인 공격은 분쇄를 추가로 남깁니다.',
  },
  PASSIVE_SUBJECT162_DISGUST: {
    name: '혐오 유발',
    description: '대상의 저주가 5 이상이면 저주를 봉인으로 전환합니다.',
  },
  PASSIVE_CHIMERA_SAW_TEETH: {
    name: '톱날 이빨',
    description: '10 이상의 피해를 주면 출혈을 추가로 부여합니다.',
  },
};

const formatCoinIndices = (indices: number[]) => (
  indices.length > 0 ? indices.map(index => `#${index + 1}`).join(' ') : '-'
);

const getStatusRows = (character: PlayerCharacter | EnemyCharacter) => (
  Object.entries(character.statusEffects)
    .map(([key, value]) => ({ key: key as StatusEffectType, value }))
    .filter((entry): entry is { key: StatusEffectType; value: number } => (
      typeof entry.value === 'number' && entry.value !== 0
    ))
);

const getEffectiveDefense = (attack: number, damage: number) => Math.max(0, attack - damage);

const getCombatNextCue = (
  player: PlayerCharacter,
  enemy: EnemyCharacter,
  selectedPatterns: DetectedPattern[],
  prediction: CombatPrediction | null,
) => {
  if (selectedPatterns.length === 0) return '족보 1개 선택';
  if (!prediction) return '결과 확인 후 실행';
  if (prediction.damageToEnemy >= enemy.currentHp) return '실행하면 처치';
  if (prediction.damageToPlayer >= player.currentHp) return '방어/회복 먼저';
  if (prediction.damageToPlayer > prediction.damageToEnemy) return '받는 피해 줄이기';
  return '행운/액티브 확인 후 실행';
};

export const CombatIntelBar: React.FC<CombatIntelBarProps> = ({
  player,
  enemy,
  detectedPatterns,
  selectedPatterns,
  prediction,
  intent,
  unlockedPatterns,
  activeView,
  onOpen,
  onClose,
}) => {
  const enemyPatternLabel = getIntentPatternLabel(intent, enemy);
  const damageToEnemy = prediction?.damageToEnemy ?? 0;
  const damageToPlayer = prediction?.damageToPlayer ?? 0;
  const currentIntent = intent?.description ?? '대기';
  const nextCue = getCombatNextCue(player, enemy, selectedPatterns, prediction);
  const selectedAbilityNames = selectedPatterns
    .slice(0, 2)
    .map(pattern => getPlayerAbility(player.class, player.acquiredSkills, pattern.type, pattern.face).name);
  const playerStatusRows = getStatusRows(player).slice(0, 3);
  const enemyStatusRows = getStatusRows(enemy).slice(0, 2);
  const passiveCount = (characterData[player.class]?.innatePassives?.length ?? 0) + unlockedPatterns.length;

  const toggleView = (view: CombatIntelView) => {
    if (activeView === view) {
      onClose();
      return;
    }
    onOpen(view);
  };

  return (
    <>
      <nav className="combat-intel-bar" aria-label="combat information">
        <div className="combat-intel-snapshot">
          <span>예상</span>
          <b className="player">적 -{damageToEnemy}</b>
          <b className="enemy">내 -{damageToPlayer}</b>
        </div>
        <div className="combat-intel-snapshot is-next">
          <span>다음</span>
          <b>{nextCue}</b>
        </div>
        <div className="combat-intel-snapshot is-wide">
          <span>적 예고</span>
          <b>{enemyPatternLabel ?? currentIntent}</b>
        </div>
        <div className="combat-synergy-strip" aria-label="active status and pattern synergy">
          <span className="combat-synergy-passive">
            <b>패시브</b>
            <em>{passiveCount}</em>
          </span>
          {playerStatusRows.map(row => (
            <span key={`player-${row.key}`} className="combat-synergy-token player">
              <b>{statusLabels[row.key] ?? row.key}</b>
              <em>{row.value}</em>
            </span>
          ))}
          {enemyStatusRows.map(row => (
            <span key={`enemy-${row.key}`} className="combat-synergy-token enemy">
              <b>{statusLabels[row.key] ?? row.key}</b>
              <em>{row.value}</em>
            </span>
          ))}
          <strong>{selectedAbilityNames.length > 0 ? selectedAbilityNames.join(' + ') : `사용 가능 족보 ${detectedPatterns.length}`}</strong>
        </div>
        <div className="combat-intel-buttons">
          <button type="button" className={activeView === 'player' ? 'is-active' : ''} onClick={() => toggleView('player')}>
            <BookOpen size={15} />
            <span>쓸 기술</span>
          </button>
          <button type="button" className={activeView === 'enemy' ? 'is-active' : ''} onClick={() => toggleView('enemy')}>
            <Crosshair size={15} />
            <span>적 읽기</span>
          </button>
          <button type="button" className={activeView === 'calc' ? 'is-active' : ''} onClick={() => toggleView('calc')}>
            <Calculator size={15} />
            <span>결과</span>
          </button>
          <button type="button" className={activeView === 'passives' ? 'is-active' : ''} onClick={() => toggleView('passives')}>
            <Sparkles size={15} />
            <span>상태</span>
          </button>
        </div>
      </nav>

      {activeView ? (
        <section className={`combat-intel-modal view-${activeView}`} role="dialog" aria-label="combat detail panel">
          <header className="combat-intel-modal-head">
            <div>
              <span>전투 정보</span>
              <strong>{getViewTitle(activeView)}</strong>
            </div>
            <button type="button" onClick={onClose} aria-label="close combat information">
              <X size={18} />
            </button>
          </header>
          <div className="combat-intel-modal-body">
            {activeView === 'player' ? (
              <PlayerPatternIntel
                player={player}
                detectedPatterns={detectedPatterns}
                selectedPatterns={selectedPatterns}
              />
            ) : null}
            {activeView === 'enemy' ? (
              <EnemyPatternIntel enemy={enemy} intent={intent} />
            ) : null}
            {activeView === 'calc' ? (
              <CalculationIntel
                player={player}
                enemy={enemy}
                selectedPatterns={selectedPatterns}
                prediction={prediction}
                intent={intent}
              />
            ) : null}
            {activeView === 'passives' ? (
              <PassiveIntel player={player} enemy={enemy} unlockedPatterns={unlockedPatterns} />
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );
};

const getViewTitle = (view: CombatIntelView) => {
  if (view === 'player') return '내 족보와 효과';
  if (view === 'enemy') return '적 족보와 사용 가능 기술';
  if (view === 'calc') return '피해 계산과 선택 결과';
  return '상태 효과와 패시브';
};

const PlayerPatternIntel: React.FC<{
  player: PlayerCharacter;
  detectedPatterns: DetectedPattern[];
  selectedPatterns: DetectedPattern[];
}> = ({ player, detectedPatterns, selectedPatterns }) => (
  <div className="combat-intel-stack">
    <div className="combat-intel-note player-cue">
      <span>다음 행동</span>
      <b>{selectedPatterns.length > 0 ? '선택한 기술의 태그를 확인하고 실행' : '밝게 표시된 족보부터 선택'}</b>
      <small>원문은 필요할 때만 펼칩니다.</small>
    </div>
    <div className="combat-intel-grid player-patterns">
      {patternTypes.flatMap(type => patternFaces.map(face => {
      const ability = getPlayerAbility(player.class, player.acquiredSkills, type, face);
      const matches = detectedPatterns.filter(pattern => pattern.type === type && pattern.face === face);
      const selected = selectedPatterns.filter(pattern => pattern.type === type && pattern.face === face);
      const bestMatch = selected[0] ?? matches[0];
      const statusClass = selected.length > 0 ? 'is-selected' : matches.length > 0 ? 'is-ready' : '';

      return (
        <article key={`${type}-${face}`} className={`combat-intel-row ${faceClass(face)} ${statusClass}`} title={ability.description}>
          <img src={assetPath(patternIconPaths[type])} alt="" loading="lazy" aria-hidden="true" />
          <div className="combat-intel-row-main">
            <div className="combat-intel-row-title">
              <span>{patternLabels[type]} {faceLabel(face)}</span>
                <strong>{ability.name}</strong>
              </div>
              <EffectSummary
                summary={summarizeAbility(ability)}
                compact
                chipLimit={4}
                showCue
                cueLabel="판단"
                showDetail="details"
              />
          </div>
          <div className="combat-intel-tags">
            {selected.length > 0 ? <b>선택 {selected.length}</b> : null}
            {matches.length > 0 ? <span>가능 {matches.length}</span> : <span>미충족</span>}
            <em>{formatCoinIndices(bestMatch?.indices ?? [])}</em>
          </div>
        </article>
      );
      }))}
    </div>
  </div>
);

const EnemyPatternIntel: React.FC<{
  enemy: EnemyCharacter;
  intent: EnemyIntent | null;
}> = ({ enemy, intent }) => {
  const enemyDef = monsterData[enemy.key];
  const phase = getMonsterPhase(enemy);
  const phaseSkillKeys = phase?.patterns ?? [];
  const skillKeys = enemyDef?.patterns ?? [];
  const sourceKeys = new Set(intent?.sourcePatternKeys ?? []);

  return (
    <div className="combat-intel-stack">
      {phase ? (
        <div className="combat-intel-note">
          <span>현재 페이즈</span>
          <b>{phase.label}</b>
        </div>
      ) : null}
      <div className="combat-intel-grid enemy-patterns">
        {skillKeys.map(key => {
          const skill = monsterPatterns[key];
          if (!skill) return null;
          const matches = enemy.detectedPatterns.filter(pattern => (
            pattern.type === skill.type && (!skill.face || pattern.face === skill.face)
          ));
          const isIntent = sourceKeys.has(key);
          const isPhasePreferred = phaseSkillKeys.includes(key);
          const bestMatch = isIntent
            ? enemy.detectedPatterns.find(pattern => intent?.sourceCoinIndices?.every(index => pattern.indices.includes(index)))
            : matches[0];
          const statusClass = isIntent ? 'is-selected' : matches.length > 0 ? 'is-ready' : '';

          return (
            <article key={key} className={`combat-intel-row ${faceClass(skill.face)} ${statusClass}`} title={skill.description}>
              <img src={assetPath(patternIconPaths[skill.type])} alt="" loading="lazy" aria-hidden="true" />
              <div className="combat-intel-row-main">
                <div className="combat-intel-row-title">
                  <span>{patternLabels[skill.type]} {faceLabel(skill.face)}</span>
                  <strong>{skill.name}</strong>
                </div>
                <EffectSummary summary={summarizeAbility(skill)} compact chipLimit={4} showDetail="details" />
              </div>
              <div className="combat-intel-tags">
                {isIntent ? <b>예고</b> : null}
                {isPhasePreferred ? <b>페이즈</b> : null}
                {matches.length > 0 ? <span>가능</span> : <span>미충족</span>}
                <em>{formatCoinIndices(bestMatch?.indices ?? [])}</em>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

const CalculationIntel: React.FC<{
  player: PlayerCharacter;
  enemy: EnemyCharacter;
  selectedPatterns: DetectedPattern[];
  prediction: CombatPrediction | null;
  intent: EnemyIntent | null;
}> = ({ player, enemy, selectedPatterns, prediction, intent }) => {
  const playerAttack = prediction?.player.attack.total ?? 0;
  const playerDefense = prediction?.player.defense.total ?? 0;
  const enemyAttack = prediction?.enemy.attack.total ?? intent?.damage ?? 0;
  const enemyDefense = getEffectiveDefense(playerAttack, prediction?.damageToEnemy ?? 0);
  const selectedRows = selectedPatterns.map(pattern => ({
    pattern,
    ability: getPlayerAbility(player.class, player.acquiredSkills, pattern.type, pattern.face),
  }));

  return (
    <div className="combat-intel-calc">
      <div className="combat-calc-scoreboard">
        <div>
          <span>내 공격</span>
          <b>{playerAttack}</b>
          <small>적 방어 {enemyDefense}</small>
        </div>
        <div className="is-result">
          <span>적 피해</span>
          <b>{prediction?.damageToEnemy ?? 0}</b>
          <small>max(0, 공격 - 방어)</small>
        </div>
        <div>
          <span>적 공격</span>
          <b>{enemyAttack}</b>
          <small>내 방어 {playerDefense}</small>
        </div>
        <div className="is-result enemy">
          <span>받는 피해</span>
          <b>{prediction?.damageToPlayer ?? 0}</b>
          <small>예고 기술 기준</small>
        </div>
      </div>

      <div className="combat-intel-split">
        <section>
          <h3>선택한 족보</h3>
          {selectedRows.length > 0 ? selectedRows.map(({ pattern, ability }) => (
            <article key={pattern.id} className={`combat-intel-row compact ${faceClass(pattern.face)}`} title={ability.description}>
              <img src={assetPath(patternIconPaths[pattern.type])} alt="" loading="lazy" aria-hidden="true" />
              <div className="combat-intel-row-main">
                <div className="combat-intel-row-title">
                  <span>{patternLabels[pattern.type]} {faceLabel(pattern.face)} · {formatCoinIndices(pattern.indices)}</span>
                  <strong>{ability.name}</strong>
                </div>
                <EffectSummary summary={summarizeAbility(ability)} compact chipLimit={3} showCue cueLabel="판단" showDetail="details" />
              </div>
            </article>
          )) : <p className="combat-intel-empty">아직 선택한 족보가 없습니다.</p>}
        </section>
        <section>
          <h3>적 예고</h3>
          <article className="combat-intel-note danger">
            <span>{getIntentPatternLabel(intent, enemy) ?? '패턴 없음'}</span>
            <b>{intent?.description ?? '대기'}</b>
            <small>공격 {intent?.damage ?? 0} / 방어 {intent?.defense ?? 0}</small>
          </article>
        </section>
      </div>
    </div>
  );
};

const PassiveIntel: React.FC<{
  player: PlayerCharacter;
  enemy: EnemyCharacter;
  unlockedPatterns: string[];
}> = ({ player, enemy, unlockedPatterns }) => {
  const innatePassives = characterData[player.class]?.innatePassives ?? [];
  const playerPassiveRows = unlockedPatterns
    .map(id => patternUpgrades[player.class]?.[id])
    .filter((passive): passive is NonNullable<typeof passive> => Boolean(passive));
  const enemyPassiveIds = monsterData[enemy.key]?.passives ?? [];
  const playerStatuses = getStatusRows(player);
  const enemyStatuses = getStatusRows(enemy);

  return (
    <div className="combat-intel-split">
      <section>
        <h3>내 상태와 패시브</h3>
        <StatusStrip rows={playerStatuses} emptyText="적용 중인 내 상태 없음" />
        {innatePassives.map((description, index) => (
          <article key={`innate-${index}`} className="combat-intel-passive">
            <strong>고유 패시브</strong>
            <EffectSummary summary={summarizeDescription(description)} compact chipLimit={4} showCue cueLabel="역할" showDetail="details" />
          </article>
        ))}
        {playerPassiveRows.length > 0 ? playerPassiveRows.map(passive => (
          <article key={passive.id} className="combat-intel-passive">
            <strong>{passive.name}</strong>
            <EffectSummary summary={summarizeDescription(passive.description)} compact chipLimit={4} showCue cueLabel="역할" showDetail="details" />
          </article>
        )) : <p className="combat-intel-empty">습득한 추가 패시브가 없습니다.</p>}
      </section>
      <section>
        <h3>적 상태와 패시브</h3>
        <StatusStrip rows={enemyStatuses} emptyText="적용 중인 적 상태 없음" />
        {enemyPassiveIds.length > 0 ? enemyPassiveIds.map(id => {
          const passive = monsterPassiveSummaries[id] ?? {
            name: id.replace(/^PASSIVE_/, '').replace(/_/g, ' '),
            description: '상세 효과 설명이 아직 전투 정보 테이블에 연결되지 않았습니다.',
          };
          return (
            <article key={id} className="combat-intel-passive danger">
              <strong>{passive.name}</strong>
              <EffectSummary summary={summarizeDescription(passive.description)} compact chipLimit={4} showDetail="details" />
            </article>
          );
        }) : <p className="combat-intel-empty">적 패시브가 없습니다.</p>}
      </section>
    </div>
  );
};

const StatusStrip: React.FC<{
  rows: { key: StatusEffectType; value: number }[];
  emptyText: string;
}> = ({ rows, emptyText }) => {
  if (rows.length === 0) {
    return <p className="combat-intel-empty">{emptyText}</p>;
  }

  return (
    <div className="combat-status-intel-strip">
      {rows.map(row => (
        <span key={row.key}>
          <b>{statusLabels[row.key] ?? row.key}</b>
          <em>{row.value}</em>
        </span>
      ))}
    </div>
  );
};
