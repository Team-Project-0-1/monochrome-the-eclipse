
import React from 'react';
import { NodeType, LucideIcon } from '../types';
import { Swords, ShoppingBag, Coffee, HelpCircle, Star, Skull, Circle } from 'lucide-react';

interface NodeIconProps {
  type: NodeType;
  size?: 'sm' | 'md' | 'lg';
}

const NodeIcon: React.FC<NodeIconProps> = ({ type, size = 'md' }) => {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  const iconClass = sizeClasses[size];
  
  const icons: { [key in NodeType]?: LucideIcon } = {
    [NodeType.COMBAT]: Swords,
    [NodeType.SHOP]: ShoppingBag,
    [NodeType.REST]: Coffee,
    [NodeType.EVENT]: HelpCircle,
    [NodeType.MINIBOSS]: Star,
    [NodeType.BOSS]: Skull,
    [NodeType.UNKNOWN]: Circle,
  };

  const IconComponent = icons[type] || Circle;
  return <IconComponent className={iconClass} />;
};

export default NodeIcon;
