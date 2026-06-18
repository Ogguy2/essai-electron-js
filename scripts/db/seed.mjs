/**
 * db:seed — insère les données de démonstration.
 *
 * - Sociétés de démo si la table `societes` est vide (sinon conservées).
 * - Si aucun magasin : crée les magasins de démo + leur exercice + 117 comptes.
 * - Si des magasins existent : RE-SEEDE leurs comptes (utile pour corriger des
 *   comptes encodés avant le correctif d'encodage).
 *
 * Lancement : npm run db:seed
 */
import { pathToFileURL } from 'node:url';
import {
  connect, sqlStr, toAsciiUpper, tableCount, insertGetId, seedMagasin, buildComptesPlan,
  DEMO_SOCIETES, DEMO_MAGASINS,
} from './lib.mjs';

/** Exécute le seed sur une connexion ouverte (réutilisé par db:fresh). */
export async function seed(conn) {
  // 1) Sociétés
  const socCount = await tableCount(conn, 'societes');
  if (socCount === null) {
    throw new Error("Table 'societes' absente — crée d'abord le schéma (db/schema/*.sql) dans le Centre de contrôle HFSQL.");
  }
  let societeIds;
  if (socCount === 0) {
    societeIds = [];
    for (const s of DEMO_SOCIETES) {
      const id = await insertGetId(
        conn,
        `INSERT INTO societes (raison_sociale, rccm, adresse, telephone) VALUES (` +
          `${sqlStr(toAsciiUpper(s.raison_sociale))}, ${sqlStr(toAsciiUpper(s.rccm))}, ` +
          `${sqlStr(toAsciiUpper(s.adresse))}, ${sqlStr(toAsciiUpper(s.telephone))})`,
        'societes',
      );
      societeIds.push(id);
    }
    console.log(`  ${DEMO_SOCIETES.length} société(s) de démo insérée(s).`);
  } else {
    const rows = await conn.query('SELECT id FROM societes ORDER BY id');
    societeIds = rows.map((r) => Number(r.id));
    console.log(`  ${societeIds.length} société(s) déjà présente(s) — conservées.`);
  }

  // 2) Magasins
  const magCount = await tableCount(conn, 'magasins');
  if (magCount === 0) {
    for (const m of DEMO_MAGASINS) {
      const societeId = societeIds[m.societeIndex] ?? societeIds[0];
      const { comptes } = await seedMagasin(conn, m.libelle, societeId);
      console.log(`  magasin « ${m.libelle} » créé (${comptes} comptes).`);
    }
  } else {
    const mags = await conn.query('SELECT id, libelle FROM magasins ORDER BY id');
    const plan = buildComptesPlan();
    for (const mg of mags) {
      await conn.query(`DELETE FROM comptes WHERE magasin_id = ${Number(mg.id)}`);
      for (const c of plan) {
        await conn.query(
          `INSERT INTO comptes (magasin_id, numero, libelle, classe, collectif, lettrable) VALUES (` +
            `${Number(mg.id)}, ${sqlStr(c.numero)}, ${sqlStr(c.libelle)}, ${c.classe}, ${c.collectif ? 1 : 0}, ${c.lettrable ? 1 : 0})`,
        );
      }
      console.log(`  comptes re-seedés pour « ${mg.libelle} » (${plan.length}).`);
    }
  }
}

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
    if (e.odbcErrors) console.error(JSON.stringify(e.odbcErrors));
    process.exit(1);
  });
}
