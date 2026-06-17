import type { Api } from '@/shared/ipc';

declare global {
  interface Window {
    /** API exposée par le preload (contextBridge). */
    api: Api;
  }
}

export {};
