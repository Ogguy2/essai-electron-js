/**
 * Seeder Sociétés — données de démonstration.
 * Idempotent : si la table contient déjà des sociétés, on les conserve.
 */
import { sqlStr, toAsciiUpper, insertGetId, tableCount } from '../lib.mjs';

/** Sociétés de démonstration (cf. src/lib/mock-data.ts). */
export const DEMO_SOCIETES = [
  { raison_sociale: 'SICONEX SARL', rccm: 'CI-ABJ-2019-B-12480', adresse: 'Bd VGE, Zone 4, Marcory - Abidjan', telephone: '+225 27 21 35 80 14' },
  { raison_sociale: 'SICONEX DISTRIBUTION SARL', rccm: 'CI-ABJ-2024-B-04419', adresse: 'Rue du Commerce, Yopougon - Abidjan', telephone: '+225 27 23 50 12 00' },
];

/**
 * Insère les sociétés de démo si la table est vide. Renvoie la liste des ids
 * (existants si la table était déjà peuplée).
 */
export async function seedSocietes(conn) {
  const count = await tableCount(conn, 'societes');
  if (count === null) {
    throw new Error("Table 'societes' absente — crée d'abord le schéma (db/schema/*.sql) dans le Centre de contrôle HFSQL.");
  }
  if (count === 0) {
    const ids = [];
    for (const s of DEMO_SOCIETES) {
      const id = await insertGetId(
        conn,
        `INSERT INTO societes (raison_sociale, rccm, adresse, telephone) VALUES (` +
          `${sqlStr(toAsciiUpper(s.raison_sociale))}, ${sqlStr(toAsciiUpper(s.rccm))}, ` +
          `${sqlStr(toAsciiUpper(s.adresse))}, ${sqlStr(toAsciiUpper(s.telephone))})`,
        'societes',
      );
      ids.push(id);
    }
    console.log(`  ${DEMO_SOCIETES.length} société(s) de démo insérée(s).`);
    return ids;
  }
  const rows = await conn.query('SELECT id FROM societes ORDER BY id');
  const ids = rows.map((r) => Number(r.id));
  console.log(`  ${ids.length} société(s) déjà présente(s) — conservées.`);
  return ids;
}
