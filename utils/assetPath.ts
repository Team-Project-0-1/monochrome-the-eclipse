import { optimizedAssetPaths } from './generatedAssetManifest';

const getBaseUrl = (): string => {
  const baseUrl = import.meta.env?.BASE_URL || '/';
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
};

export const assetPath = (path: string): string => {
  if (/^(?:https?:|data:|blob:)/.test(path)) {
    throw new Error(`External asset paths are not allowed: ${path}`);
  }

  const baseUrl = getBaseUrl();
  const basePrefix = baseUrl.replace(/^\/+|\/+$/g, '');
  let normalizedPath = path.replace(/^\.?\//, '').replace(/^\/+/, '');

  if (basePrefix && normalizedPath.startsWith(`${basePrefix}/`)) {
    normalizedPath = normalizedPath.slice(basePrefix.length + 1);
  }

  return `${baseUrl}${optimizedAssetPaths[normalizedPath] ?? normalizedPath}`;
};

export const assetCssUrl = (path: string): string => `url('${assetPath(path)}')`;
