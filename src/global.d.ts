import type { Api } from '@/shared/ipc';

declare global {
  interface Window {
    /** API exposée par le preload (contextBridge). */
    api: Api;
  }

  /** Version de l'app (package.json) injectée à la compilation par Vite. */
  const __APP_VERSION__: string;
}

export {};
