import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

/**
 * Logger fichier minimaliste du processus principal.
 *
 * Objectifs :
 *  - Tracer les tentatives de connexion à la base HFSQL (début, succès, échec).
 *  - Consigner TOUTES les erreurs dans un fichier `error.log`.
 *
 * Le fichier est écrit dans le dossier `userData` d'Electron (fonctionne en dev
 * comme en build packagé). Le chemin est résolu paresseusement (l'app n'est pas
 * forcément prête au moment de l'import de ce module).
 *
 * RÈGLE CRITIQUE : la journalisation ne doit JAMAIS lever d'exception ni faire
 * planter l'application — toutes les opérations `fs` sont protégées par try/catch.
 */

const LOG_FILE_NAME = 'error.log';

let cachedLogPath: string | null = null;
let pathLogged = false;

/** Résout (paresseusement) le chemin absolu de `error.log`. */
function resolveLogPath(): string | null {
  if (cachedLogPath) {
    return cachedLogPath;
  }
  try {
    // `app.getPath('userData')` n'est disponible qu'une fois l'app initialisée.
    const dir = app.getPath('userData');
    fs.mkdirSync(dir, { recursive: true });
    cachedLogPath = path.join(dir, LOG_FILE_NAME);
    if (!pathLogged) {
      pathLogged = true;
      // Affiche une seule fois le chemin absolu pour pouvoir retrouver le fichier.
      console.log(`[logger] Journal des erreurs : ${cachedLogPath}`);
    }
    return cachedLogPath;
  } catch {
    // Si l'app n'est pas prête ou si userData est inaccessible, on n'écrit pas.
    return null;
  }
}

/** Écrit une ligne brute dans `error.log` (jamais bloquant, jamais throw). */
function appendLine(line: string): void {
  try {
    const logPath = resolveLogPath();
    if (!logPath) {
      return;
    }
    fs.appendFileSync(logPath, line + '\n', { encoding: 'utf8' });
  } catch {
    // On avale toute erreur d'écriture : la journalisation ne doit pas crasher l'app.
  }
}

/** Journalise un message d'information. */
export function logInfo(context: string, message: string): void {
  const timestamp = new Date().toISOString();
  appendLine(`${timestamp} [INFO] [${context}] ${message}`);
}

/** Journalise une erreur (message + stack sur les lignes suivantes). */
export function logError(context: string, error: unknown): void {
  const timestamp = new Date().toISOString();
  let message: string;
  let stack: string | null = null;

  if (error instanceof Error) {
    message = error.message;
    stack = error.stack ?? null;
  } else if (typeof error === 'string') {
    message = error;
  } else {
    try {
      message = JSON.stringify(error);
    } catch {
      message = String(error);
    }
  }

  let line = `${timestamp} [ERROR] [${context}] ${message}`;
  if (stack) {
    line += `\n${stack}`;
  }
  appendLine(line);
}
