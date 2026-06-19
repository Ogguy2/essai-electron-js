/**
 * db:fresh — « refresh » de la base : vide les tables de DONNÉES puis re-seede.
 *
 * Supprime les lignes de comptes, exercices, magasins, sociétés (dans cet ordre,
 * sûr vis-à-vis des dépendances) — NE touche PAS à `app_users` ni au schéma —
 * puis relance db:seed. Pratique pour repartir d'un jeu de données propre en dev.
 *
 * Lancement : npm run db:fresh
 */
import { connect, DATA_TABLES } from './lib.mjs';
import { seed } from './seed.mjs';

async function main() {
  const conn = await connect();
  console.log('db:fresh — purge des données puis re-seed…');
  try {
    for (const t of DATA_TABLES) {
      await conn.query(`DELETE FROM ${t}`);
      console.log(`  purge ${t}`);
    }
    await seed(conn);
    console.log('Terminé.');
  } finally {
    await conn.close();
  }
}

main().catch((e) => {
  console.error('Échec db:fresh :', e.message);
  process.exit(1);
});
