const publicSafeValue = (
  import.meta.env?.VITE_STAGE3_PUBLIC_SAFE_MODE ??
  (typeof process !== "undefined" ? process.env?.VITE_STAGE3_PUBLIC_SAFE_MODE : undefined)
)?.toLowerCase();

export const isStage3PublicSafeMode = ["1", "true", "yes", "on"].includes(publicSafeValue ?? "");

export const stage3PublicSafeBackgroundCss = "linear-gradient(135deg, var(--color-bg-raised), var(--color-bg-deep))";
