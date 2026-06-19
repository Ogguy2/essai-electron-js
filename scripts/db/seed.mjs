/**
 * db:seed — exécute le DatabaseSeeder (scripts/db/seeders/).
 *
 * Les seeders sont séparés par entité (sociétés, magasins, comptes, journaux,
 * tiers, écritures) et idempotents : ré-exécutable sans écraser de données
 * saisies (cf. scripts/db/seeders/index.mjs pour l'ordre d'orchestration).
 *
 * Lancement : npm run db:seed
 */
import { pathToFileURL } from 'node:url';
import { connect } from './lib.mjs';
import { seed } from './seeders/index.mjs';

export { seed };

async function main() {
  const conn = await connect();
  console.log('db:seed — données de démonstration…');
  try {
    await seed(conn);
    console.log('Terminé.');
  } finally {
    await conn.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error('Échec db:seed :', e.message);
    process.exit(1);
  });
}
