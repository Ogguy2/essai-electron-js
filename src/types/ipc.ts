/**
 * Types d'enveloppe IPC normalisée.
 * Importés ici ; réexportés via `src/shared/ipc.ts` (façade publique).
 */

export interface IpcError {
  code: string;
  message: string;
}

/** Enveloppe normalisée de toute réponse IPC. */
export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: IpcError };
