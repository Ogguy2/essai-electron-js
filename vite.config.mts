import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// NOTE : config "racine" présente surtout pour l'outillage qui attend un
// vite.config standard (ex. CLI shadcn/ui) et pour valider le build du renderer
// hors Electron. Le build Electron Forge utilise vite.main/preload/renderer.config
// (référencés dans forge.config.ts) et IGNORE ce fichier.
// Extension .mts : @tailwindcss/vite est ESM-only (cf. vite.renderer.config.mts).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
