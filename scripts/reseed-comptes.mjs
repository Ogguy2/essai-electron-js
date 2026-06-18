/**
 * Re-seed des comptes (plan SYSCOHADA) pour TOUS les magasins existants.
 *
 * Pourquoi : les comptes seedés AVANT le correctif d'encodage sont corrompus
 * (accents → « � »). Ce script supprime puis réinsère les 117 comptes de chaque
 * magasin via le MÊME pré-encodage `utf8 → latin1` que l'app (cf. sqlValue dans
 * src/main/db/connection.ts) → les accents sont alors corrects à la lecture.
 *
 * - N'insère PAS d'`id` (colonne en AUTO_INCREMENT, cf. db/schema/003).
 * - Ne touche qu'à la table `comptes` (par `magasin_id`).
 *
 * Lancement : node scripts/reseed-comptes.mjs
 */
import 'dotenv/config';
import odbc from 'odbc';
import fs from 'node:fs';

const TIERS_COLLECTIFS = new Set(['4011', '4111']);

function buildComptesPlan() {
  const plan = JSON.parse(fs.readFileSync('docs/compte.json', 'utf8'));
  const rows = [];
  for (const cls of plan.classes) {
    const classe = parseInt(cls.classe, 10);
    for (const c of cls.comptes) {
      const tiers = TIERS_COLLECTIFS.has(c.compte);
      rows.push({ numero: c.compte, libelle: c.libelle, classe, collectif: tiers, lettrable: tiers });
    }
  }
  return rows;
}

/** Même contournement d'encodage que l'app : pré-encode utf8 -> latin1. */
function enc(s) {
  return Buffer.from(String(s), 'utf8').toString('latin1');
}
function sqlStr(s) {
  return `'${enc(s).replace(/'/g, "''")}'`;
}

function cfg() {
  return {
    driver: process.env.HFSQL_DRIVER ?? 'HFSQL', host: process.env.HFSQL_HOST ?? '127.0.0.1',
    port: process.env.HFSQL_PORT ?? '4900', database: process.env.HFSQL_DATABASE ?? 'sicocompte',
    user: process.env.HFSQL_USER ?? 'admin', password: process.env.HFSQL_PASSWORD ?? '',
  };
}
const dsn = (c) => `DRIVER={${c.driver}};Server Name=${c.host};Server Port=${c.port};Database=${c.database};UID=${c.user};PWD=${c.password};`;

async function main() {
  const plan = buildComptesPlan();
  console.log(`Plan SYSCOHADA chargé : ${plan.length} comptes.`);
  const conn = await odbc.connect(dsn(cfg()));
  console.log('Connecté à HFSQL.');

  try {
    const magasins = await conn.query('SELECT id, libelle FROM magasins ORDER BY id');
    if (!magasins.length) {
      console.log('Aucun magasin → rien à re-seeder. (Crée un magasin via l’app d’abord.)');
      return;
    }
    console.log(`${magasins.length} magasin(s) trouvé(s).`);

    for (const m of magasins) {
      process.stdout.write(`\n[magasin ${m.id}] ${m.libelle} : suppression des comptes… `);
      await conn.query(`DELETE FROM comptes WHERE magasin_id = ${Number(m.id)}`);
      let n = 0;
      for (const c of plan) {
        await conn.query(
          `INSERT INTO comptes (magasin_id, numero, libelle, classe, collectif, lettrable) VALUES (` +
            `${Number(m.id)}, ${sqlStr(c.numero)}, ${sqlStr(c.libelle)}, ${c.classe}, ` +
            `${c.collectif ? 1 : 0}, ${c.lettrable ? 1 : 0})`,
        );
        n++;
      }
      // Contrôle : relit un compte accentué pour prouver l'encodage.
      const check = await conn.query(
        `SELECT libelle FROM comptes WHERE magasin_id = ${Number(m.id)} AND numero = '106'`,
      );
      process.stdout.write(`${n} comptes réinsérés. Contrôle 106 = ${JSON.stringify(check?.[0]?.libelle ?? '(absent)')}`);
    }
    console.log('\n\nTerminé. Réouvre le Plan comptable dans l’app : les accents doivent être nets.');
  } finally {
    await conn.close();
  }
}

main().catch((err) => {
  console.error('\nÉchec du re-seed :', err.message);
  if (err.odbcErrors) console.error(JSON.stringify(err.odbcErrors));
  process.exit(1);
});
