/**
 * Sonde — le champ `comptes.libelle` est-il en vraie UNICODE ? Insère un compte
 * test SANS contournement (chaîne JS brute) puis relit. Si la colonne est
 * Unicode, node-odbc fait l'aller-retour correctement → on pourra RETIRER le hack
 * utf8→latin1. Si elle est encore ANSI, on relit du « � » (U+FFFD).
 *
 * Insère 1 ligne marquée (magasin_id = -999) puis la supprime.
 * Lancement : node scripts/probe-unicode.mjs
 */
import 'dotenv/config';
import odbc from 'odbc';

const PROBE_MAG = -999;
const PROBE_NUM = '00';
const SAMPLE = 'Réservé é à Côté — Écarts de réévaluation';

function cfg() {
  return {
    driver: process.env.HFSQL_DRIVER ?? 'HFSQL', host: process.env.HFSQL_HOST ?? '127.0.0.1',
    port: process.env.HFSQL_PORT ?? '4900', database: process.env.HFSQL_DATABASE ?? 'sicocompte',
    user: process.env.HFSQL_USER ?? 'admin', password: process.env.HFSQL_PASSWORD ?? '',
  };
}
const dsn = (c) => `DRIVER={${c.driver}};Server Name=${c.host};Server Port=${c.port};Database=${c.database};UID=${c.user};PWD=${c.password};`;

async function main() {
  const conn = await odbc.connect(dsn(cfg()));
  console.log('Connecté.');
  console.log('ORIGINAL   :', JSON.stringify(SAMPLE));
  try {
    await conn.query(`DELETE FROM comptes WHERE magasin_id = ${PROBE_MAG}`);
    // Insertion BRUTE (sans pré-encodage utf8→latin1).
    await conn.query(
      `INSERT INTO comptes (magasin_id, numero, libelle, classe, collectif, lettrable) ` +
        `VALUES (${PROBE_MAG}, '${PROBE_NUM}', '${SAMPLE.replace(/'/g, "''")}', 9, 0, 0)`,
    );
    const rows = await conn.query(
      `SELECT libelle FROM comptes WHERE magasin_id = ${PROBE_MAG} AND numero = '${PROBE_NUM}'`,
    );
    const relu = String(rows?.[0]?.libelle ?? '');
    console.log('RELU       :', JSON.stringify(relu));
    console.log('code points:', Array.from(relu).map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' '));
    console.log('\nVERDICT :', relu === SAMPLE
      ? '✅ UNICODE OK — round-trip correct SANS contournement. On peut retirer le hack.'
      : Array.from(relu).some((c) => c.codePointAt(0) === 0xfffd)
        ? '❌ Encore ANSI (U+FFFD) — comptes.libelle n’est PAS en Unicode dans HFSQL.'
        : '⚠️ Résultat inattendu — à analyser.');
  } finally {
    try { await conn.query(`DELETE FROM comptes WHERE magasin_id = ${PROBE_MAG}`); } catch { /* */ }
    await conn.close();
  }
}
main().catch((e) => { console.error('Échec :', e.message); if (e.odbcErrors) console.error(JSON.stringify(e.odbcErrors)); process.exit(1); });
