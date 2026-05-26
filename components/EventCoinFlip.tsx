import React, { useState, useEffect } from 'react';
import { Coin, CoinFace } from '../types';
import { COIN_COUNT } from '../constants';
import { flipCoin } from '../utils/gameLogic';

interface EventCoinFlipProps {
  targetHeads: number;
  onComplete: (headsCount: number) => void;
}

const EventCoinFlip: React.FC<EventCoinFlipProps> = ({ targetHeads, onComplete }) => {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [heads, setHeads] = useState(0);

  useEffect(() => {
    setCoins(
      Array(COIN_COUNT)
        .fill(null)
        .map((_, i) => ({ face: CoinFace.TAILS, id: i, locked: false }))
    );
  }, []);

  const flipAllCoins = () => {
    if (flipped) return;
    const newCoins = coins.map((coin) => ({ ...coin, face: flipCoin() }));
    const headsCount = newCoins.filter((c) => c.face === CoinFace.HEADS).length;
    setCoins(newCoins);
    setHeads(headsCount);
    setFlipped(true);
    setTimeout(() => {
      onComplete(headsCount);
    }, 2000);
  };

  return (
    <div className="text-center">
      <h3 className="text-xl font-bold mb-4 text-yellow-300">운명의 동전 던지기</h3>
      <p className="mb-4 text-gray-300">
        성공하려면 {targetHeads}개 이상의 앞면이 필요합니다.
      </p>
      <div className="flex justify-center gap-2 mb-6">
        {coins.map((coin) => (
          <div
            key={coin.id}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 flex items-center justify-center font-bold text-xl transition-all duration-500 transform
                        ${flipped ? (coin.face === CoinFace.HEADS ? 'rotate-y-0 bg-yellow-400 border-yellow-600 text-black' : 'rotate-y-0 bg-gray-600 border-gray-700 text-white')
                                 : 'bg-gray-700 border-gray-500 text-gray-400 animate-pulse'}
                        ${flipped && coin.face === CoinFace.HEADS ? 'shadow-lg shadow-yellow-500/50' : ''}
                        ${flipped && coin.face === CoinFace.TAILS ? 'shadow-md' : ''}
                        `}
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="transform transition-transform duration-1000">
                {flipped ? (coin.face === CoinFace.HEADS ? "H" : "T") : "?"}
            </div>
          </div>
        ))}
      </div>
      {!flipped ? (
        <button
          onClick={flipAllCoins}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
        >
          동전 던지기
        </button>
      ) : (
        <div className="space-y-2 mt-4">
          <p className="text-lg font-bold text-gray-200">결과: {heads}개의 앞면</p>
          <p
            className={`text-2xl font-bold ${
              heads >= targetHeads ? "text-green-400" : "text-red-400"
            }`}
          >
            {heads >= targetHeads ? "성공!" : "실패..."}
          </p>
        </div>
      )}
    </div>
  );
};
export default EventCoinFlip;
