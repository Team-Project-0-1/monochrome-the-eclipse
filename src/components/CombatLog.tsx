// FIX: Populated file with the CombatLog component implementation.
import React, { useRef, useEffect } from 'react';
import { CombatLogMessage } from '../types';

interface CombatLogProps {
  messages: CombatLogMessage[];
}

const CombatLog: React.FC<CombatLogProps> = ({ messages }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const getMessageColor = (type: CombatLogMessage['type']) => {
    switch (type) {
      case 'player': return 'text-green-400';
      case 'enemy': return 'text-red-400';
      case 'damage': return 'text-orange-400';
      case 'defense': return 'text-blue-400';
      case 'heal': return 'text-lime-400';
      case 'status': return 'text-purple-400';
      case 'roll': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-900/50 p-3 rounded-lg h-full flex flex-col border border-gray-700 overflow-hidden">
      <h4 className="text-sm font-bold text-gray-300 mb-2 text-center flex-shrink-0">전투 기록</h4>
      <div ref={logContainerRef} className="flex-grow overflow-y-auto space-y-1 pr-2 text-xs">
        {messages.map((msg) => (
          <div key={msg.id} className={`${getMessageColor(msg.type)}`}>
            {msg.message}
          </div>
        ))}
        {messages.length === 0 && <p className="text-center text-gray-500 text-sm py-4">전투 시작</p>}
      </div>
    </div>
  );
};

export default CombatLog;