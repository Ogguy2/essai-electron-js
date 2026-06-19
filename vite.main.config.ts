import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';

// Modules à NE PAS bundler (résolus depuis node_modules au runtime).
// `better-sqlite3` est natif : le bundler casse la résolution de son binaire
// .node, il doit donc rester externe. On réinclut electron + builtins pour ne
// pas écraser l'externalisation par défaut du plugin Forge.
const external = [
  'electron',
  'electron/common',
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
  'better-sqlite3',
  // electron-updater + ses deps (lazy-val, js-yaml…) : chargés depuis node_modules
  // au runtime plutôt que bundlés.
  'electron-updater',
];

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external,
    },
  },
});
