/**
 * db:status — vérifie la connexion HFSQL et liste les tables + nombre de lignes.
 * Lecture seule (ne modifie rien). Lancement : npm run db:status
 */
import { connect, getConfig, tableCount } from './lib.mjs';

const TABLES = ['app_users', 'societes', 'magasins', 'exercices', 'comptes', 'journaux', 'tiers', 'ecritures', 'ecriture_lignes'];

async function main() {
  const c = getConfig();
  console.log(`Connexion : ${c.user}@${c.host}:${c.port}/${c.database} (driver « ${c.driver} »)`);
  const conn = await connect();
  console.log('Connexion HFSQL OK.\nTables :');
  try {
    for (const t of TABLES) {
      const n = await tableCount(conn, t);
      const info = n === null ? 'ABSENTE (à créer dans le Centre de contrôle)' : `${n} ligne(s)`;
      console.log(`  ${t.padEnd(12)} : ${info}`);
    }
  } finally {
    await conn.close();
  }
}

main().catch((e) => {
  console.error('db:status — connexion impossible :', e.message);
  if (e.odbcErrors) console.error(JSON.stringify(e.odbcErrors));
  process.exit(1);
});
