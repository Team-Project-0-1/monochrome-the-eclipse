/// <reference types="vite/client" />

// Augment Vite's ImportMetaEnv via interface merging so `import.meta.env.VITE_E2E`
// typechecks. Set to "1" only by the E2E build (scripts/run-e2e-smoke.mjs); unset
// in dev/deploy builds, where the gated test-hook block is tree-shaken away.
interface ImportMetaEnv {
  readonly VITE_E2E?: string;
}
