import path from 'node:path';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Version de l'app injectée à la compilation (affichée dans l'UI).
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')) as {
  version: string;
};

// https://vitejs.dev/config
// Extension .mts : @tailwindcss/vite est ESM-only ; le projet n'étant pas
// "type": "module", la config doit être chargée en ESM (sinon Vite tente un
// require() CommonJS et échoue). N'affecte pas le format de sortie du build.
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
