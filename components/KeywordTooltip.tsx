import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { assetPath } from '../utils/assetPath';

const KeywordTooltip: React.FC = () => {
  const tooltip = useGameStore(state => state.tooltip);

  if (!tooltip) {
    return null;
  }

  const { content, position } = tooltip;

  const getDynamicStyles = (colorClass: string) => {
    // This is a simplified map for styling. A more robust solution would be to use style objects directly in effectConfig.
    const colorMap: { [key: string]: { backgroundColor: string; borderColor: string } } = {
        "bg-yellow-500 border-yellow-700 text-yellow-100": { backgroundColor: 'rgba(234, 179, 8, 0.2)', borderColor: '#b45309' },
        "bg-purple-500 border-purple-700 text-purple-100": { backgroundColor: 'rgba(168, 85, 247, 0.2)', borderColor: '#7e22ce' },
        "bg-orange-500 border-orange-700 text-orange-100": { backgroundColor: 'rgba(249, 115, 22, 0.2)', borderColor: '#c2410c' },
        "bg-red-600 border-red-800 text-red-100": { backgroundColor: 'rgba(220, 38, 38, 0.2)', borderColor: '#991b1b' },
        "bg-blue-500 border-blue-700 text-blue-100": { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#1d4ed8' },
        "bg-gray-500 border-gray-700 text-gray-100": { backgroundColor: 'rgba(107, 114, 128, 0.2)', borderColor: '#374151' },
        "bg-indigo-500 border-indigo-700 text-indigo-100": { backgroundColor: 'rgba(99, 102, 241, 0.2)', borderColor: '#4338ca' },
        "bg-slate-500 border-slate-700 text-slate-100": { backgroundColor: 'rgba(100, 116, 139, 0.2)', borderColor: '#334155' },
        "bg-orange-600 border-orange-800 text-orange-100": { backgroundColor: 'rgba(234, 88, 12, 0.2)', borderColor: '#9a3412' },
    };
    const defaultStyle = { backgroundColor: 'rgba(31, 41, 55, 0.9)', borderColor: '#4b5563', backdropFilter: 'blur(4px)' };

    return colorMap[colorClass] ? { ...defaultStyle, ...colorMap[colorClass] } : defaultStyle;
  };

  return (
    <motion.div
      className="fixed p-4 rounded-lg shadow-2xl border text-sm w-full max-w-xs z-50 pointer-events-none"
      style={{
        top: position.top,
        left: position.left,
        right: position.right,
        bottom: position.bottom,
        ...getDynamicStyles(content.color),
      }}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      <div className="flex items-center gap-2 mb-2 pb-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        {content.imagePath ? (
          <img className="status-effect-tooltip-icon" src={assetPath(content.imagePath)} alt="" />
        ) : (
          <span className="text-2xl">{content.icon}</span>
        )}
        <h4 className="font-bold text-lg text-white">{content.name}</h4>
      </div>
      <p className="text-gray-300 leading-relaxed">{content.description}</p>
    </motion.div>
  );
};

export default KeywordTooltip;
