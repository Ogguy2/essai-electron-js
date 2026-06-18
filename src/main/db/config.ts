/**
 * Configuration de connexion HFSQL (processus principal uniquement).
 * Les valeurs viennent des variables d'environnement (fichier `.env`, chargé via
 * `dotenv` au démarrage du main). Aucun identifiant n'est exposé au renderer.
 */

export interface HfsqlConfig {
  driver: string;
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
}

export function getHfsqlConfig(): HfsqlConfig {
  return {
    driver: process.env.HFSQL_DRIVER ?? 'HFSQL',
    host: process.env.HFSQL_HOST ?? '127.0.0.1',
    port: process.env.HFSQL_PORT ?? '4900',
    database: process.env.HFSQL_DATABASE ?? 'sicocompte',
    user: process.env.HFSQL_USER ?? 'admin',
    password: process.env.HFSQL_PASSWORD ?? '',
  };
}

/** Chaîne de connexion ODBC DSN-less pour le pilote HFSQL. */
export function buildDsn(c: HfsqlConfig): string {
  return [
    `DRIVER={${c.driver}};`,
    `Server Name=${c.host};`,
    `Server Port=${c.port};`,
    `Database=${c.database};`,
    `UID=${c.user};`,
    `PWD=${c.password};`,
  ].join('');
}
