import { defineConfig } from 'vitest/config';

// Tests de la logique comptable / services (processus principal) : environnement Node.
// Pour tester des composants React, basculer un fichier en environnement "jsdom"
// via un commentaire `// @vitest-environment jsdom` en tête de fichier.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
