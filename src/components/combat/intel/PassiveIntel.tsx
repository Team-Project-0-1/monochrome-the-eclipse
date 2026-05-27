import React from 'react';
import { EnemyCharacter, PlayerCharacter } from '../../../types';
import { characterData } from '../../../data/dataCharacters';
import { monsterData, monsterPassiveSummaries } from '../../../data/dataMonsters';
import { patternUpgrades } from '../../../data/dataUpgrades';
import { summarizeDescription } from '../../../utils/effectSummary';
import EffectSummary from '../../EffectSummary';
import { getStatusRows, StatusStrip } from './_shared';

interface PassiveIntelProps {
  player: PlayerCharacter;
  enemy: EnemyCharacter;
  unlockedPatterns: string[];
}

export const PassiveIntel: React.FC<PassiveIntelProps> = ({ player, enemy, unlockedPatterns }) => {
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
        <div className="combat-intel-note player-cue">
          <span>연계 보기</span>
          <b>패시브는 자동 적용되고, 상태 수치는 스킬 조건과 피해/방어에 연결됩니다.</b>
          <small>족보 설명과 상태 아이콘의 같은 키워드를 맞춰 보면 됩니다.</small>
        </div>
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
            description: '이 적의 고유 패시브입니다. 전투 흐름을 보며 효과를 파악하세요.',
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
