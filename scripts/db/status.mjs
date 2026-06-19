/**
 * db:status — vérifie l'accès à la base SQLite et liste les tables + nombre de
 * lignes. Lecture seule (ne modifie rien). Lancement : npm run db:status
 */
import { connect, resolveDbPath, tableCount } from './lib.mjs';

const TABLES = ['app_users', 'societes', 'magasins', 'exercices', 'comptes', 'journaux', 'tiers', 'ecritures', 'ecriture_lignes'];

async function main() {
  console.log(`Base SQLite : ${resolveDbPath()}`);
  const conn = await connect();
  console.log('Accès SQLite OK.\nTables :');
  try {
    for (const t of TABLES) {
      const n = await tableCount(conn, t);
      const info = n === null ? 'ABSENTE' : `${n} ligne(s)`;
      console.log(`  ${t.padEnd(16)} : ${info}`);
    }
  } finally {
    await conn.close();
  }
}

main().catch((e) => {
  console.error('db:status — accès impossible :', e.message);
  process.exit(1);
});
