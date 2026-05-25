import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Heart, Shield, Swords, X } from 'lucide-react';
import { MAX_RESERVE_COINS, MAX_SKILLS } from '../constants';
import { patternUpgrades } from '../data/dataUpgrades';
import { playerAbilities, playerSkillUnlocks } from '../data/dataSkills';
import { effectConfig, effectIconPaths } from '../data/dataEffects';
import { useGameStore } from '../store/gameStore';
import { CoinFace, PatternType, PatternUpgradeDefinition, SkillUpgradeDefinition, StatusEffectType } from '../types';
import { assetPath } from '../utils/assetPath';
import { resourceIconPaths } from '../utils/resourceAssets';
import EffectSummary from './EffectSummary';
import { summarizeDescription } from '../utils/effectSummary';

interface RunStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const coinFaceLabel = (face: CoinFace | null) => {
  if (face === CoinFace.HEADS) return '앞';
  if (face === CoinFace.TAILS) return '뒤';
  return '?';
};

const patternLabels: Record<PatternType, string> = {
  [PatternType.PAIR]: '2연',
  [PatternType.TRIPLE]: '3연',
  [PatternType.QUAD]: '4연',
  [PatternType.PENTA]: '5연',
  [PatternType.UNIQUE]: '유일',
  [PatternType.AWAKENING]: '각성',
};

const patternOrder = [
  PatternType.PAIR,
  PatternType.TRIPLE,
  PatternType.QUAD,
  PatternType.PENTA,
  PatternType.UNIQUE,
  PatternType.AWAKENING,
];

const faceOrder = [CoinFace.HEADS, CoinFace.TAILS];

const RunStatusModal: React.FC<RunStatusModalProps> = ({ isOpen, onClose }) => {
  const player = useGameStore(state => state.player);
  const resources = useGameStore(state => state.resources);
  const reserveCoins = useGameStore(state => state.reserveCoins);
  const unlockedPatterns = useGameStore(state => state.unlockedPatterns);
  const currentStage = useGameStore(state => state.currentStage);
  const currentTurn = useGameStore(state => state.currentTurn);

  if (!player) return null;

  const skills = player.acquiredSkills
    .map(id => playerSkillUnlocks[player.class]?.[id])
    .filter((skill): skill is SkillUpgradeDefinition => Boolean(skill));
  const replacedSlots = new Map(skills.map(skill => [`${skill.replaces.type}-${skill.replaces.face ?? ''}`, skill]));
  const classAbilities = playerAbilities[player.class] ?? {};
  const ownedPatternSlots = patternOrder.flatMap(patternType => {
    const abilitiesByFace = classAbilities[patternType];
    if (!abilitiesByFace) return [];

    return faceOrder
      .map(face => {
        const baseAbility = abilitiesByFace[face];
        if (!baseAbility) return null;

        const replacement = replacedSlots.get(`${patternType}-${face}`);
        const activeAbility = replacement ?? baseAbility;
        return {
          id: `${patternType}-${face}`,
          label: `${patternLabels[patternType]} ${face === CoinFace.HEADS ? '앞면' : '뒷면'}`,
          name: activeAbility.name,
          description: activeAbility.description,
          isReplaced: Boolean(replacement),
        };
      })
      .filter((slot): slot is { id: string; label: string; name: string; description: string; isReplaced: boolean } => Boolean(slot));
  });
  const passives = unlockedPatterns
    .map(id => patternUpgrades[player.class]?.[id])
    .filter((passive): passive is PatternUpgradeDefinition => Boolean(passive));
  const statuses = Object.entries(player.statusEffects).filter(
    (entry): entry is [StatusEffectType, number] => typeof entry[1] === 'number' && entry[1] > 0,
  );
  const hpPercent = player.maxHp > 0 ? Math.max(0, Math.min(100, (player.currentHp / player.maxHp) * 100)) : 0;
  const portraitSrc = player.portraitSrc ? assetPath(player.portraitSrc) : null;

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="run-status-modal fixed inset-0 flex items-center justify-center p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="run-status-title"
        >
          <motion.div
            className="run-status-modal-card flex w-full flex-col overflow-hidden rounded-lg border border-cyan-200/24 shadow-2xl shadow-black/60"
            data-testid="run-status-modal"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <header className="run-status-modal-header flex items-start justify-between gap-3 border-b border-white/10 p-4">
              <div>
                <div className="mb-1 inline-flex items-center gap-2 rounded-md border border-cyan-300/26 bg-cyan-950/28 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-100">
                  <Activity className="h-4 w-4" />
                  Run Snapshot
                </div>
                <h2 id="run-status-title" className="font-orbitron text-2xl font-black text-white">
                  현재 상태
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/6 text-slate-200 transition-colors hover:bg-white/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                aria-label="현재 상태 닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="run-status-modal-body min-h-0 flex-1 overflow-y-auto p-4">
              <aside className="space-y-3">
                <div className="rounded-lg border border-white/10 bg-white/6 p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 overflow-hidden rounded-md border border-white/10 bg-black/30">
                      {portraitSrc ? (
                        <img src={portraitSrc} alt="" className="h-full w-full object-cover object-center" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-xl font-black text-white">{player.name}</h3>
                      <p className="truncate text-xs font-semibold text-cyan-100/80">{player.title}</p>
                      <p className="mt-1 truncate text-xs text-slate-400">{player.weapon ?? player.signature}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-300">
                      <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-red-300" />HP</span>
                      <span>{player.currentHp}/{player.maxHp}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-red-400 to-lime-300" style={{ width: `${hpPercent}%` }} />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-md border border-white/10 bg-black/24 px-3 py-2">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-red-200/80"><Swords className="h-3.5 w-3.5" />공격</span>
                      <strong className="font-orbitron text-lg text-white">{player.baseAtk}</strong>
                    </div>
                    <div className="rounded-md border border-white/10 bg-black/24 px-3 py-2">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-blue-200/80"><Shield className="h-3.5 w-3.5" />방어</span>
                      <strong className="font-orbitron text-lg text-white">{player.baseDef}</strong>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { imagePath: resourceIconPaths.echoRemnants, label: '에코', value: resources.echoRemnants, color: 'text-yellow-200' },
                    { imagePath: resourceIconPaths.senseFragments, label: '감각', value: resources.senseFragments, color: 'text-purple-200' },
                    { imagePath: resourceIconPaths.memoryPieces, label: '기억', value: resources.memoryPieces, color: 'text-blue-200' },
                    { imagePath: resourceIconPaths.reserveCoin, label: '예비 동전', value: `${reserveCoins.length}/${MAX_RESERVE_COINS}`, color: 'text-orange-200' },
                  ].map(({ imagePath, label, value, color }) => (
                    <div key={label} className="rounded-md border border-white/10 bg-white/6 p-3">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                        <img className="run-status-resource-icon-img" src={assetPath(imagePath)} alt="" loading="lazy" />
                        {label}
                      </span>
                      <strong className={`mt-1 block font-orbitron text-lg ${color}`}>{value}</strong>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-white/10 bg-white/6 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>진행도</span>
                    <span>Stage {currentStage} / Route {currentTurn}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {reserveCoins.length > 0 ? reserveCoins.map((coin, index) => (
                      <span key={coin.id} className="rounded-full border border-white/10 bg-black/28 px-2 py-1 text-xs font-black text-slate-200">
                        #{index + 1} {coinFaceLabel(coin.face)}
                      </span>
                    )) : (
                      <span className="text-xs text-slate-500">예비 동전 없음</span>
                    )}
                  </div>
                </div>
              </aside>

              <section className="grid min-h-0 gap-4">
                <div className="rounded-lg border border-white/10 bg-white/6 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-black text-white">보유 족보</h3>
                    <span className="text-xs font-bold text-slate-400">{ownedPatternSlots.length} 슬롯</span>
                  </div>
                  <div className="grid gap-2">
                    {ownedPatternSlots.map(slot => (
                      <div key={slot.id} className="rounded-md border border-white/10 bg-black/20 p-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-full border border-cyan-200/18 bg-cyan-950/20 px-2 py-0.5 text-[11px] font-black text-cyan-100">
                            {slot.label}
                          </span>
                          {slot.isReplaced ? (
                            <span className="rounded-full border border-yellow-200/20 bg-yellow-950/20 px-2 py-0.5 text-[10px] font-black text-yellow-100">
                              교체됨
                            </span>
                          ) : null}
                        </div>
                        <strong className="mt-1.5 block text-sm text-white">{slot.name}</strong>
                        <EffectSummary
                          summary={summarizeDescription(slot.description)}
                          compact
                          hideHeadline
                          chipLimit={4}
                          showCue
                          cueLabel={slot.isReplaced ? '현재 역할' : '기본 역할'}
                          showDetail="details"
                          detailLabel="상세"
                          className="run-status-effect-summary"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/6 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-black text-white">습득 기술</h3>
                    <span className="text-xs font-bold text-slate-400">{skills.length}/{MAX_SKILLS}</span>
                  </div>
                  <div className="space-y-2">
                    {skills.length > 0 ? skills.map(skill => (
                      <div key={skill.id} className="rounded-md border border-cyan-200/16 bg-cyan-950/16 p-3">
                        <strong className="block text-sm text-cyan-50">{skill.name}</strong>
                        <EffectSummary
                          summary={summarizeDescription(skill.description)}
                          compact
                          chipLimit={4}
                          showCue
                          cueLabel="기술 역할"
                          showDetail="details"
                          detailLabel="상세"
                          className="run-status-effect-summary"
                        />
                      </div>
                    )) : (
                      <p className="rounded-md border border-white/10 bg-black/20 p-3 text-sm text-slate-400">아직 추가 습득 기술이 없습니다. 기본 기술 중심 빌드입니다.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/6 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-black text-white">패시브 / 상태</h3>
                    <span className="text-xs font-bold text-slate-400">{passives.length}개</span>
                  </div>
                  <div className="space-y-2">
                    {passives.length > 0 ? passives.map(passive => (
                      <div key={passive.id} className="rounded-md border border-purple-200/16 bg-purple-950/16 p-3">
                        <strong className="block text-sm text-purple-50">{passive.name}</strong>
                        <EffectSummary
                          summary={summarizeDescription(passive.description)}
                          compact
                          chipLimit={4}
                          showCue
                          cueLabel="패시브 역할"
                          showDetail="details"
                          detailLabel="상세"
                          className="run-status-effect-summary"
                        />
                      </div>
                    )) : (
                      <p className="rounded-md border border-white/10 bg-black/20 p-3 text-sm text-slate-400">아직 패시브 강화가 없습니다.</p>
                    )}
                    <div className="pt-1">
                      <div className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Active Status</div>
                      <div className="flex flex-wrap gap-2">
                        {statuses.length > 0 ? statuses.map(([type, value]) => {
                          const config = effectConfig[type];
                          if (!config) return null;
                          const iconPath = effectIconPaths[type];
                          return (
                            <span key={type} className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-bold ${config.color}`}>
                              {iconPath ? (
                                <img className="status-effect-icon-img is-compact" src={assetPath(iconPath)} alt="" loading="lazy" />
                              ) : (
                                <span>{config.icon}</span>
                              )}
                              <span>{config.name} {value}</span>
                            </span>
                          );
                        }) : (
                          <span className="text-xs text-slate-500">활성 상태 효과 없음</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default RunStatusModal;
