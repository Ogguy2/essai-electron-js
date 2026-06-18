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

/** Dé-accentue → ASCII pur (même logique que src/domain/text.ts). */
export const deaccent = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
    .replace(/[^\x00-\x7F]/g, '');
/** De-accent + MAJUSCULES (texte humain). */
export const toAsciiUpper = (s) => deaccent(s).toUpperCase();
/** Littéral SQL chaîne, dé-accentué (ASCII) + échappé. */
export const sqlStr = (s) => `'${deaccent(s).replace(/'/g, "''")}'`;

const TIERS_COLLECTIFS = new Set(['4011', '4111']);

/** Plan SYSCOHADA aplati depuis docs/compte.json (117 comptes). */
export function buildComptesPlan() {
  const plan = JSON.parse(fs.readFileSync('docs/compte.json', 'utf8'));
  const rows = [];
  for (const cls of plan.classes) {
    const classe = parseInt(cls.classe, 10);
    for (const c of cls.comptes) {
      const tiers = TIERS_COLLECTIFS.has(c.compte);
      rows.push({ numero: c.compte, libelle: toAsciiUpper(c.libelle), classe, collectif: tiers, lettrable: tiers });
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
export const DATA_TABLES = ['journaux', 'comptes', 'exercices', 'magasins', 'societes'];

export const DEFAULT_JOURNAUX = [
  { code: 'AN', libelle: 'A-nouveaux', type: 'OD' },
  { code: 'VTE', libelle: 'Journal des ventes', type: 'VTE' },
  { code: 'ACHT', libelle: 'Journal des achats', type: 'ACHT' },
  { code: 'BANQ', libelle: 'Journal de banque', type: 'BANQ' },
  { code: 'CAI', libelle: 'Journal de caisse', type: 'CAI' },
  { code: 'OD', libelle: 'Operations diverses', type: 'OD' },
];

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
    `INSERT INTO magasins (libelle, societe_id) VALUES (${sqlStr(toAsciiUpper(libelle))}, ${Number(societeId)})`,
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
  for (const j of DEFAULT_JOURNAUX) {
    await conn.query(
      `INSERT INTO journaux (magasin_id, code, libelle, type, active) VALUES (` +
        `${id}, ${sqlStr(toAsciiUpper(j.code))}, ${sqlStr(toAsciiUpper(j.libelle))}, ${sqlStr(j.type)}, 1)`,
    );
  }
  return { id, comptes: plan.length };
}
