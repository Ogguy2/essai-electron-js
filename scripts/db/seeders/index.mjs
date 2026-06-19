/**
 * DatabaseSeeder — orchestre les seeders dans l'ordre des dépendances
 * (utilisateurs → sociétés → magasins/exercices → puis, par magasin : comptes,
 * journaux, tiers, écritures). Chaque seeder est idempotent : ré-exécutable sans
 * casse.
 *
 * Réutilisé par db:seed (scripts/db/seed.mjs) et db:fresh (scripts/db/fresh.mjs).
 */
import { seedUsers } from './users.mjs';
import { seedSocietes } from './societes.mjs';
import { seedMagasins } from './magasins.mjs';
import { seedComptes } from './comptes.mjs';
import { seedJournaux } from './journaux.mjs';
import { seedTiers } from './tiers.mjs';
import { seedEcritures } from './ecritures.mjs';

/** Exécute tous les seeders sur une connexion ouverte. */
export async function seed(conn) {
  await seedUsers(conn);
  const societeIds = await seedSocietes(conn);
  const magasins = await seedMagasins(conn, societeIds);
  for (const m of magasins) {
    const comptes = await seedComptes(conn, m.id);
    const journaux = await seedJournaux(conn, m.id);
    const tiers = await seedTiers(conn, m.id);
    const ecritures = await seedEcritures(conn, m.id, m.exerciceId, m.demoIndex);
    console.log(
      `  « ${m.libelle} » : ${comptes} comptes` +
        `${journaux ? `, ${journaux} journaux` : ''}` +
        `${tiers ? `, ${tiers} tiers` : ''}` +
        `${ecritures ? `, ${ecritures} écritures` : ''}.`,
    );
  }
}
