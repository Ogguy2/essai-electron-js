/**
 * Seeder Journaux — journaux par défaut d'un magasin.
 * Idempotent : seede seulement si le magasin n'a aucun journal.
 */
import { sqlStr, toAsciiUpper } from '../lib.mjs';

export const DEFAULT_JOURNAUX = [
  { code: 'AN', libelle: 'A-nouveaux', type: 'OD' },
  { code: 'VTE', libelle: 'Journal des ventes', type: 'VTE' },
  { code: 'ACHT', libelle: 'Journal des achats', type: 'ACHT' },
  { code: 'BANQ', libelle: 'Journal de banque', type: 'BANQ' },
  { code: 'CAI', libelle: 'Journal de caisse', type: 'CAI' },
  { code: 'OD', libelle: 'Operations diverses', type: 'OD' },
];

/** Seede les journaux par défaut si le magasin n'en a aucun. Renvoie le nb inséré. */
export async function seedJournaux(conn, magasinId) {
  const rows = await conn.query(`SELECT COUNT(*) AS n FROM journaux WHERE magasin_id = ${Number(magasinId)}`);
  if (Number(rows?.[0]?.n ?? 0) > 0) return 0;
  for (const j of DEFAULT_JOURNAUX) {
    await conn.query(
      `INSERT INTO journaux (magasin_id, code, libelle, type, active) VALUES (` +
        `${Number(magasinId)}, ${sqlStr(toAsciiUpper(j.code))}, ${sqlStr(toAsciiUpper(j.libelle))}, ${sqlStr(j.type)}, 1)`,
    );
  }
  return DEFAULT_JOURNAUX.length;
}
