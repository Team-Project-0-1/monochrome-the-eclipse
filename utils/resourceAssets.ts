import type { ShopCurrency } from './shopPresentation';

export type ResourceAssetKey = 'echoRemnants' | 'senseFragments' | 'memoryPieces' | 'reserveCoin';

export const resourceIconPaths: Record<ResourceAssetKey, string> = {
  echoRemnants: 'assets/items/echo-remnant.svg',
  senseFragments: 'assets/items/sense-fragment.svg',
  memoryPieces: 'assets/items/memory-piece.svg',
  reserveCoin: 'assets/items/reserve-coin.png',
};

export const currencyIconPaths: Record<ShopCurrency | 'memory', string> = {
  echo: resourceIconPaths.echoRemnants,
  sense: resourceIconPaths.senseFragments,
  memory: resourceIconPaths.memoryPieces,
};

export const getRewardIconPath = (key: string): string | undefined => {
  if (key === 'echoRemnants' || key === 'senseFragments' || key === 'memoryPieces' || key === 'reserveCoin') {
    return resourceIconPaths[key];
  }

  return undefined;
};
