/**
 * Seeder Plan comptable — plan SYSCOHADA (117 comptes) par magasin.
 * (Re)seede systématiquement : purge puis réinsertion — sert aussi à corriger
 * l'encodage des accents sur une base existante.
 */
import fs from 'node:fs';
import { sqlStr, toAsciiUpper } from '../lib.mjs';

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

/** Purge puis réinsère le plan comptable d'un magasin. Renvoie le nb de comptes. */
export async function seedComptes(conn, magasinId) {
  const plan = buildComptesPlan();
  await conn.query(`DELETE FROM comptes WHERE magasin_id = ${Number(magasinId)}`);
  for (const c of plan) {
    await conn.query(
      `INSERT INTO comptes (magasin_id, numero, libelle, classe, collectif, lettrable) VALUES (` +
        `${Number(magasinId)}, ${sqlStr(c.numero)}, ${sqlStr(c.libelle)}, ${c.classe}, ${c.collectif ? 1 : 0}, ${c.lettrable ? 1 : 0})`,
    );
  }
  return plan.length;
}
