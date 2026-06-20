import path from 'node:path';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')) as {
  version: string;
};

// NOTE : config "racine" présente surtout pour l'outillage qui attend un
// vite.config standard (ex. CLI shadcn/ui) et pour valider le build du renderer
// hors Electron. Le build Electron Forge utilise vite.main/preload/renderer.config
// (référencés dans forge.config.ts) et IGNORE ce fichier.
// Extension .mts : @tailwindcss/vite est ESM-only (cf. vite.renderer.config.mts).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
