/**
 * Seeder Tiers — clients / fournisseurs de démonstration (cf. docs/design/data.js).
 * Idempotent : seede seulement si le magasin n'a aucun tiers.
 */
import { sqlStr, toAsciiUpper, sqlIntOrNull } from '../lib.mjs';

/** Tiers de démonstration, seedés dans chaque magasin. */
export const DEMO_TIERS = [
  { code: 'C001', raison_sociale: 'Pharmacie du Plateau', est_client: true, est_fournisseur: false, telephone: '+225 07 08 11 22 33', adresse: 'Plateau, Abidjan', registre_commerce: 'CI-ABJ-2015-A-3321', plafond_credit: 2000000, bloque: false },
  { code: 'C002', raison_sociale: 'Restaurant Le Baobab', est_client: true, est_fournisseur: false, telephone: '+225 05 64 77 80 12', adresse: 'Zone 4, Marcory', registre_commerce: 'CI-ABJ-2018-A-9087', plafond_credit: 1500000, bloque: false },
  { code: 'C003', raison_sociale: 'Hôtel Ivoire Services', est_client: true, est_fournisseur: false, telephone: '+225 27 22 48 26 26', adresse: 'Cocody, Abidjan', registre_commerce: 'CI-ABJ-2012-A-1144', plafond_credit: 5000000, bloque: false },
  { code: 'C004', raison_sociale: 'Boutique Adjamé Centre', est_client: true, est_fournisseur: false, telephone: '+225 01 02 03 04 05', adresse: 'Adjamé, Abidjan', registre_commerce: 'CI-ABJ-2020-A-7741', plafond_credit: 800000, bloque: true },
  { code: 'F001', raison_sociale: 'Grossiste CDCI', est_client: false, est_fournisseur: true, telephone: '+225 27 21 75 00 00', adresse: 'Vridi, Abidjan', registre_commerce: 'CI-ABJ-2005-B-0455', plafond_credit: null, bloque: false },
  { code: 'F002', raison_sociale: 'Nestlé Côte d’Ivoire', est_client: false, est_fournisseur: true, telephone: '+225 27 21 23 45 67', adresse: 'Zone industrielle Yopougon', registre_commerce: 'CI-ABJ-1998-B-0012', plafond_credit: null, bloque: false },
  { code: 'F003', raison_sociale: 'CIE - Électricité', est_client: false, est_fournisseur: true, telephone: '+225 27 21 23 33 33', adresse: 'Treichville, Abidjan', registre_commerce: 'CI-ABJ-1990-B-0003', plafond_credit: null, bloque: false },
  { code: 'F004', raison_sociale: 'Brasserie SOLIBRA', est_client: false, est_fournisseur: true, telephone: '+225 27 21 75 88 88', adresse: 'Vridi, Abidjan', registre_commerce: 'CI-ABJ-1985-B-0007', plafond_credit: null, bloque: false },
];

/** Seede les tiers de démo si le magasin n'en a aucun. Renvoie le nb inséré. */
export async function seedTiers(conn, magasinId) {
  const rows = await conn.query(`SELECT COUNT(*) AS n FROM tiers WHERE magasin_id = ${Number(magasinId)}`);
  if (Number(rows?.[0]?.n ?? 0) > 0) return 0;
  for (const t of DEMO_TIERS) {
    await conn.query(
      `INSERT INTO tiers (magasin_id, code, raison_sociale, est_client, est_fournisseur, telephone, adresse, registre_commerce, plafond_credit, bloque, compte_client, compte_fournisseur, archived) VALUES (` +
        `${Number(magasinId)}, ${sqlStr(t.code)}, ${sqlStr(toAsciiUpper(t.raison_sociale))}, ` +
        `${t.est_client ? 1 : 0}, ${t.est_fournisseur ? 1 : 0}, ${sqlStr(t.telephone)}, ` +
        `${sqlStr(toAsciiUpper(t.adresse))}, ${sqlStr(t.registre_commerce)}, ${sqlIntOrNull(t.plafond_credit)}, ` +
        `${t.bloque ? 1 : 0}, ${t.est_client ? sqlStr('4111') : 'NULL'}, ${t.est_fournisseur ? sqlStr('4011') : 'NULL'}, 0)`,
    );
  }
  return DEMO_TIERS.length;
}
