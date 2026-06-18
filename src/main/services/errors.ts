/**
 * Erreur métier portant un `code` stable (mappé en IpcResult.error.code).
 * Distingue les échecs attendus (FORBIDDEN, VALIDATION, HAS_MAGASINS…) des
 * erreurs techniques (DB_ERROR) côté handlers IPC.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
