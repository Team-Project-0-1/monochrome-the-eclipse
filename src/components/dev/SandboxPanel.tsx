import React, { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CharacterClass } from '../../types';
import { characterData, getCharacterMaxHp } from '../../data/dataCharacters';
import { monsterData } from '../../data/dataMonsters';
import { getSandboxLoadoutCandidates } from '../../store/slices/playerSlice';
import { patternLabels, faceLabel } from '../../utils/combatPresentation';
import Panel from '../ui/Panel';
import ActionButton from '../ui/ActionButton';
import { FlaskConical, Swords } from 'lucide-react';

interface SandboxPanelProps {
  sandboxClass: CharacterClass;
  onBack: () => void;
}

const tierLabels: Record<'normal' | 'miniboss' | 'boss', string> = {
  normal: '일반',
  miniboss: '미니보스',
  boss: '보스',
};

// 다중선택 토글 항목 1개를 재사용으로 그린다(패시브·스킬 공용). aria-pressed로 선택 상태를 노출한다.
const LoadoutChip: React.FC<{
  active: boolean;
  title: string;
  subtitle: string;
  description: string;
  testId: string;
  onToggle: () => void;
}> = ({ active, title, subtitle, description, testId, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={active}
    data-testid={testId}
    className={`rounded-lg border px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300
      ${active
        ? 'border-cyan-300 bg-cyan-400/15'
        : 'border-white/10 bg-black/30 hover:border-cyan-300/60 hover:bg-white/5'}`}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="font-bold text-white">{title}</span>
      <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-bold text-gray-200">{subtitle}</span>
    </div>
    <p className="mt-1 text-xs leading-snug text-gray-400">{description}</p>
  </button>
);

// DEV 전용 밸런스 시험 패널. testMode에서 캐릭터를 고른 뒤 임의의 적·자원·로드아웃으로 즉석 전투를 연다.
// "전투 시작"은 한 핸들러에서 selectCharacter(런 생성·unlockedPatterns/acquiredSkills를 []로 리셋)→
// setSandboxPlayerState(자원 보정 + 선택한 패시브/스킬 부여)→startSandboxCombat(COMBAT 진입)을
// 순서대로 호출한다(세팅은 반드시 selectCharacter 후). React 배치로 EXPLORATION 깜빡임이 없다.
//
// 클래스 변경: 클래스를 바꾸려면 "캐릭터 다시 선택"으로 패널을 언마운트 → 그리드 → 재선택하므로,
// 이 컴포넌트가 새로 마운트되어 아래 useState/useMemo가 sandboxClass 기준으로 초기화된다(별도 reset 불필요).
const SandboxPanel: React.FC<SandboxPanelProps> = ({ sandboxClass, onBack }) => {
  const selectCharacter = useGameStore(state => state.selectCharacter);
  const setSandboxPlayerState = useGameStore(state => state.setSandboxPlayerState);
  const startSandboxCombat = useGameStore(state => state.startSandboxCombat);
  const metaProgress = useGameStore(state => state.metaProgress);

  const data = characterData[sandboxClass];
  const previewMaxHp = getCharacterMaxHp(data.hp, metaProgress.memoryUpgrades.maxHp);

  // 적 목록은 monsterData 삽입 순서(스테이지순) 그대로 평탄화한다.
  const monsters = useMemo(() => Object.entries(monsterData), []);
  // 선택 클래스의 패시브·스킬 후보 전체(랜덤 draft가 아니라 ShopScreen과 동일한 원천 전량).
  const { passives, skills } = useMemo(() => getSandboxLoadoutCandidates(sandboxClass), [sandboxClass]);

  const [selectedKey, setSelectedKey] = useState<string>(() => monsters[0]?.[0] ?? '');
  const [hp, setHp] = useState<number>(previewMaxHp);
  const [echo, setEcho] = useState<number>(100);
  const [selectedPassives, setSelectedPassives] = useState<Set<string>>(() => new Set());
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(() => new Set());

  const toggleId = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setter(prev => {
      const nextSet = new Set(prev);
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      return nextSet;
    });
  };

  const startCombat = () => {
    if (!selectedKey) return;
    selectCharacter(sandboxClass);
    setSandboxPlayerState({
      currentHp: hp,
      echoRemnants: echo,
      unlockedPatterns: [...selectedPassives],
      acquiredSkills: [...selectedSkills],
    });
    startSandboxCombat(selectedKey);
  };

  return (
    <Panel className="p-5 lg:p-6" tone="cyan" data-testid="sandbox-panel">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <h3 className="flex items-center gap-2 text-xl font-bold text-cyan-200">
          <FlaskConical className="h-5 w-5" />
          밸런스 시험 ({data.name})
        </h3>
        <ActionButton onClick={onBack} variant="ghost">캐릭터 다시 선택</ActionButton>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="sandbox-hp" className="text-sm font-bold text-gray-200">시작 체력</label>
            <input
              id="sandbox-hp"
              type="number"
              min={1}
              max={previewMaxHp}
              value={hp}
              onChange={(e) => setHp(Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            />
            <p className="text-xs text-gray-400">최대 {previewMaxHp} (1~{previewMaxHp}로 보정)</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sandbox-echo" className="text-sm font-bold text-gray-200">에코 잔재 (골드)</label>
            <input
              id="sandbox-echo"
              type="number"
              min={0}
              value={echo}
              onChange={(e) => setEcho(Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            />
            <p className="text-xs text-gray-400">0 이상으로 보정</p>
          </div>

          <ActionButton
            variant="primary"
            className="w-full"
            onClick={startCombat}
            disabled={!selectedKey}
            data-testid="sandbox-start-combat"
          >
            <Swords className="h-4 w-4" />
            전투 시작
          </ActionButton>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-200">적 선택 ({monsters.length})</p>
            <div className="grid max-h-[280px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {monsters.map(([key, monster]) => {
                const isSelected = key === selectedKey;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedKey(key)}
                    aria-pressed={isSelected}
                    data-testid={`sandbox-monster-${key}`}
                    className={`rounded-lg border px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300
                      ${isSelected
                        ? 'border-cyan-300 bg-cyan-400/15'
                        : 'border-white/10 bg-black/30 hover:border-cyan-300/60 hover:bg-white/5'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white">{monster.name}</span>
                      <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-bold text-gray-200">{tierLabels[monster.tier]}</span>
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-gray-400">
                      <span>HP {monster.hp}</span>
                      <span>ATK {monster.baseAtk}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-200">패시브 부여 ({selectedPassives.size}/{passives.length})</p>
            <div className="grid max-h-[240px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {passives.map((passive) => (
                <LoadoutChip
                  key={passive.id}
                  active={selectedPassives.has(passive.id)}
                  title={passive.name}
                  subtitle="패시브"
                  description={passive.description}
                  testId={`sandbox-passive-${passive.id}`}
                  onToggle={() => toggleId(setSelectedPassives, passive.id)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-200">스킬 부여 ({selectedSkills.size}/{skills.length})</p>
            <div className="grid max-h-[240px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {skills.map((skill) => (
                <LoadoutChip
                  key={skill.id}
                  active={selectedSkills.has(skill.id)}
                  title={skill.name}
                  subtitle={`${patternLabels[skill.replaces.type]} ${faceLabel(skill.replaces.face)}`}
                  description={skill.description}
                  testId={`sandbox-skill-${skill.id}`}
                  onToggle={() => toggleId(setSelectedSkills, skill.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
};

export default SandboxPanel;
