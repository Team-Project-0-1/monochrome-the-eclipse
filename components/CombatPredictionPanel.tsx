import React from 'react';
import { CombatPrediction } from '../types';
import { Shield, Swords, ArrowRight } from 'lucide-react';

interface CombatPredictionPanelProps {
  prediction: CombatPrediction | null;
}

const CombatPredictionPanel: React.FC<CombatPredictionPanelProps> = ({ prediction }) => {
  if (!prediction) {
    return (
      <div className="p-4 bg-gray-800/50 text-gray-400 text-center rounded-lg min-h-[96px] flex flex-col items-center justify-center text-sm border-2 border-dashed border-gray-600">
        <h3 className="font-bold text-lg mb-2">전투 예측</h3>
        <p>족보를 선택하여 결과를 예측하세요.</p>
      </div>
    );
  }

  const { player, enemy, damageToPlayer, damageToEnemy } = prediction;

  const renderSection = (
    title: string,
    value: number,
    colorClass: string,
    Icon: React.ElementType
  ) => (
    <div className={`p-3 rounded-md bg-black/20 flex-1 text-center`}>
      <div className="flex items-center justify-center gap-1.5 mb-1">
          <Icon size={16} className={colorClass} />
          <span className={`font-semibold text-sm text-white`}>{title}</span>
      </div>
      <span className={`font-bold text-3xl ${colorClass} font-orbitron`}>{value}</span>
    </div>
  );

  return (
    <div className="p-4 bg-gray-700/80 text-white rounded-lg shadow-inner space-y-4 border border-gray-600">
        <h3 className="text-center font-bold text-lg text-gray-300">이번 턴 파워</h3>
        <div className="flex justify-center items-stretch gap-3">
            {renderSection('나의 공격', player.attack.total, 'text-green-400', Swords)}
            {renderSection('나의 방어', player.defense.total, 'text-blue-400', Shield)}
        </div>

        <div className="border-b border-gray-600/50"></div>

        <h3 className="text-center font-bold text-lg text-gray-300">예상 결과</h3>
        <div className="flex justify-around items-center text-lg font-bold p-2 bg-black/20 rounded-md">
            <div className="flex flex-col items-center text-green-400">
                <span>가하는 피해</span>
                <span className="text-4xl font-orbitron">{damageToEnemy}</span>
            </div>
            <ArrowRight size={24} className="text-gray-400" />
            <div className="flex flex-col items-center text-red-400">
                <span>받는 피해</span>
                <span className="text-4xl font-orbitron">{damageToPlayer}</span>
            </div>
        </div>
    </div>
  );
};

export default CombatPredictionPanel;
