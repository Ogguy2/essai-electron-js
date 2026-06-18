import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';

// Modules à NE PAS bundler (résolus depuis node_modules au runtime).
// `odbc` est natif : le bundler casse la résolution de son binaire .node,
// il doit donc rester externe. On réinclut electron + builtins pour ne pas
// écraser l'externalisation par défaut du plugin Forge.
const external = [
  'electron',
  'electron/common',
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
  'odbc',
];

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external,
    },
  },
});
