import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config
// Extension .mts : @tailwindcss/vite est ESM-only ; le projet n'étant pas
// "type": "module", la config doit être chargée en ESM (sinon Vite tente un
// require() CommonJS et échoue). N'affecte pas le format de sortie du build.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
