/**
 * Seeder Magasins — crée les magasins de démo + leur exercice courant.
 * Idempotent : si des magasins existent, on les conserve et on récupère leur
 * contexte (exercice courant) pour les seeders par-magasin en aval.
 */
import { sqlStr, toAsciiUpper, insertGetId, tableCount } from '../lib.mjs';

/** Magasins de démonstration : 2 par société (societeIndex = index dans DEMO_SOCIETES). */
export const DEMO_MAGASINS = [
  // Société 0 — SICONEX SARL
  { libelle: 'Siconex - Marcory', societeIndex: 0 },
  { libelle: 'Siconex - Ena', societeIndex: 0 },
  // Société 1 — SICONEX DISTRIBUTION SARL
  { libelle: 'Siconex Distribution - Yopougon', societeIndex: 1 },
  { libelle: 'Siconex Distribution - Cocody', societeIndex: 1 },
];

/** Crée l'exercice de l'année courante (ouvert) et renvoie son id. */
async function createExercice(conn, magasinId) {
  const year = new Date().getFullYear();
  return insertGetId(
    conn,
    `INSERT INTO exercices (magasin_id, libelle, date_debut, date_fin, statut) VALUES (` +
      `${magasinId}, ${sqlStr(String(year))}, ${sqlStr(`${year}-01-01`)}, ${sqlStr(`${year}-12-31`)}, ${sqlStr('ouvert')})`,
    'exercices',
  );
}

/** Renvoie l'id du plus ancien exercice d'un magasin, ou 0 s'il n'y en a pas. */
async function firstExerciceId(conn, magasinId) {
  const rows = await conn.query(`SELECT MIN(id) AS id FROM exercices WHERE magasin_id = ${magasinId}`);
  return Number(rows?.[0]?.id ?? 0);
}

/**
 * Crée les magasins de démo (+ exercice) s'ils n'existent pas, sinon récupère
 * l'existant. Renvoie le contexte par magasin :
 * `{ id, exerciceId, demoIndex, libelle }` (demoIndex = jeu d'écritures de démo).
 */
export async function seedMagasins(conn, societeIds) {
  const count = await tableCount(conn, 'magasins');
  if (count === 0) {
    const ctx = [];
    for (let i = 0; i < DEMO_MAGASINS.length; i++) {
      const m = DEMO_MAGASINS[i];
      const societeId = societeIds[m.societeIndex] ?? societeIds[0];
      const id = await insertGetId(
        conn,
        `INSERT INTO magasins (libelle, societe_id) VALUES (${sqlStr(toAsciiUpper(m.libelle))}, ${Number(societeId)})`,
        'magasins',
      );
      const exerciceId = await createExercice(conn, id);
      ctx.push({ id, exerciceId, demoIndex: i, libelle: m.libelle });
      console.log(`  magasin « ${m.libelle} » créé (exercice ${exerciceId}).`);
    }
    return ctx;
  }
  // Magasins déjà présents : on les conserve et récupère leur exercice courant.
  const rows = await conn.query('SELECT id, libelle FROM magasins ORDER BY id');
  const ctx = [];
  let i = 0;
  for (const r of rows) {
    const id = Number(r.id);
    ctx.push({ id, exerciceId: await firstExerciceId(conn, id), demoIndex: i, libelle: String(r.libelle) });
    i++;
  }
  console.log(`  ${ctx.length} magasin(s) déjà présent(s) — conservés.`);
  return ctx;
}
