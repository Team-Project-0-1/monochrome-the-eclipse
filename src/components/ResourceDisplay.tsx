import React from 'react';
import { MAX_RESERVE_COINS } from '../constants';
import { assetPath } from '../utils/assetPath';
import { resourceIconPaths } from '../utils/resourceAssets';

interface ResourceDisplayProps {
  resources: {
    echoRemnants: number;
    senseFragments: number;
    memoryPieces: number;
  };
  reserveCoins?: { face: string | null; locked: boolean; id: number }[];
}

const ResourceDisplay: React.FC<ResourceDisplayProps> = ({ resources, reserveCoins = [] }) => {
  const resourceItems = [
    {
      name: '에코',
      value: resources.echoRemnants,
      imagePath: resourceIconPaths.echoRemnants,
      color: 'text-yellow-300',
      description: '상점과 일부 이벤트에서 사용하는 주 자원입니다.',
    },
    {
      name: '감각',
      value: resources.senseFragments,
      imagePath: resourceIconPaths.senseFragments,
      color: 'text-purple-300',
      description: '족보 강화에 사용하는 특수 자원입니다.',
    },
    {
      name: '기억',
      value: resources.memoryPieces,
      imagePath: resourceIconPaths.memoryPieces,
      color: 'text-blue-300',
      description: '기억의 제단에서 영구 능력 강화에 사용합니다.',
    },
    {
      name: '예비 동전',
      value: `${reserveCoins.length}/${MAX_RESERVE_COINS}`,
      imagePath: resourceIconPaths.reserveCoin,
      color: 'text-orange-300',
      description: '전투 중 동전 교체에 사용하는 예비 동전입니다.',
    },
  ];

  return (
    <section className="resource-status-panel rounded-lg border border-white/10 bg-black/35 p-4 text-white shadow-xl backdrop-blur-md">
      <h3 className="mb-3 text-center text-xs font-black uppercase tracking-[0.18em] text-slate-400">자원 현황</h3>
      <div className="grid gap-2">
        {resourceItems.map(({ name, value, imagePath, color, description }) => (
          <div
            key={name}
            className="resource-status-row group relative flex items-center justify-between rounded-md border border-white/10 bg-white/5 p-2.5 transition-colors hover:bg-white/10"
            title={description}
          >
            <div className="flex items-center gap-2">
              <img className="resource-display-icon-img" src={assetPath(imagePath)} alt="" loading="lazy" />
              <span className="text-sm font-semibold text-slate-200">{name}</span>
            </div>
            <span className={`text-base font-black ${color}`}>{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ResourceDisplay;
