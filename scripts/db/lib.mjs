/**
 * Lib partagée des commandes BD (DML) — connexion HFSQL, encodage, données de
 * démo et helpers communs à db:status / db:seed / db:fresh.
 *
 * ⚠️ HFSQL/ODBC ne permet PAS de DDL programmatique fiable (tables créées par
 * ODBC non visibles ailleurs — cf. probe-ddl). Le SCHÉMA reste donc créé à la
 * main dans le Centre de contrôle (db/schema/*.sql). Ces commandes ne font que
 * du DML (données). Les `id` sont auto-incrémentés (insertion SANS id) et les
 * chaînes sont pré-encodées utf8→latin1 (contournement d'encodage, cf.
 * src/main/db/connection.ts).
 */
import 'dotenv/config';
import odbc from 'odbc';
import fs from 'node:fs';

export function getConfig() {
  return {
    driver: process.env.HFSQL_DRIVER ?? 'HFSQL',
    host: process.env.HFSQL_HOST ?? '127.0.0.1',
    port: process.env.HFSQL_PORT ?? '4900',
    database: process.env.HFSQL_DATABASE ?? 'sicocompte',
    user: process.env.HFSQL_USER ?? 'admin',
    password: process.env.HFSQL_PASSWORD ?? '',
  };
}

export const dsn = (c) =>
  `DRIVER={${c.driver}};Server Name=${c.host};Server Port=${c.port};Database=${c.database};UID=${c.user};PWD=${c.password};`;

export async function connect() {
  return odbc.connect(dsn(getConfig()));
}

/** Pré-encodage utf8→latin1 (même contournement que l'app pour les accents). */
export const enc = (s) => Buffer.from(String(s), 'utf8').toString('latin1');
/** Littéral SQL chaîne, encodé + échappé. */
export const sqlStr = (s) => `'${enc(s).replace(/'/g, "''")}'`;

const TIERS_COLLECTIFS = new Set(['4011', '4111']);

/** Plan SYSCOHADA aplati depuis docs/compte.json (117 comptes). */
export function buildComptesPlan() {
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

/** Insère une ligne (sans id) et renvoie l'id auto-incrémenté (via MAX(id)). */
export async function insertGetId(conn, insertSql, table) {
  await conn.query(insertSql);
  const rows = await conn.query(`SELECT MAX(id) AS id FROM ${table}`);
  return Number(rows?.[0]?.id ?? 0);
}

/** COUNT(*) d'une table, ou null si la table n'existe pas. */
export async function tableCount(conn, table) {
  try {
    const rows = await conn.query(`SELECT COUNT(*) AS n FROM ${table}`);
    return Number(rows?.[0]?.n ?? 0);
  } catch {
    return null;
  }
}

/** Tables de DONNÉES gérées par seed/fresh (app_users est hors périmètre). */
export const DATA_TABLES = ['comptes', 'exercices', 'magasins', 'societes'];

/** Sociétés de démonstration (cf. src/lib/mock-data.ts). */
export const DEMO_SOCIETES = [
  { raison_sociale: 'SICONEX SARL', rccm: 'CI-ABJ-2019-B-12480', adresse: 'Bd VGE, Zone 4, Marcory - Abidjan', telephone: '+225 27 21 35 80 14' },
  { raison_sociale: 'SICONEX DISTRIBUTION SARL', rccm: 'CI-ABJ-2024-B-04419', adresse: 'Rue du Commerce, Yopougon - Abidjan', telephone: '+225 27 23 50 12 00' },
];

/** Magasins de démonstration (societeIndex = index dans DEMO_SOCIETES). */
export const DEMO_MAGASINS = [
  { libelle: 'Siconex - Marcory', societeIndex: 0 },
  { libelle: 'Siconex - Ena', societeIndex: 0 },
];

/** Insère un magasin + son exercice par défaut + les 117 comptes (encodés). */
export async function seedMagasin(conn, libelle, societeId) {
  const id = await insertGetId(
    conn,
    `INSERT INTO magasins (libelle, societe_id) VALUES (${sqlStr(libelle)}, ${Number(societeId)})`,
    'magasins',
  );
  const year = new Date().getFullYear();
  await conn.query(
    `INSERT INTO exercices (magasin_id, libelle, date_debut, date_fin, statut) VALUES (` +
      `${id}, ${sqlStr(String(year))}, ${sqlStr(`${year}-01-01`)}, ${sqlStr(`${year}-12-31`)}, ${sqlStr('ouvert')})`,
  );
  const plan = buildComptesPlan();
  for (const c of plan) {
    await conn.query(
      `INSERT INTO comptes (magasin_id, numero, libelle, classe, collectif, lettrable) VALUES (` +
        `${id}, ${sqlStr(c.numero)}, ${sqlStr(c.libelle)}, ${c.classe}, ${c.collectif ? 1 : 0}, ${c.lettrable ? 1 : 0})`,
    );
  }
  return { id, comptes: plan.length };
}
