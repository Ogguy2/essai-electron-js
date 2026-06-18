/**
 * Sonde — le DDL (CREATE/DROP TABLE) passe-t-il et PERSISTE-t-il via node-odbc
 * sur HFSQL ? (CLAUDE.md indique que ça avait été abandonné.) Décisif pour savoir
 * si un système de migrations programmatique est viable.
 *
 * Étapes : CREATE TABLE → INSERT → relit dans une NOUVELLE connexion (preuve de
 * commit) → DROP TABLE → vérifie la disparition. Nettoie quoi qu'il arrive.
 *
 * Lancement : node scripts/probe-ddl.mjs
 */
import 'dotenv/config';
import odbc from 'odbc';

const T = '__probe_ddl__';
function cfg() {
  return {
    driver: process.env.HFSQL_DRIVER ?? 'HFSQL', host: process.env.HFSQL_HOST ?? '127.0.0.1',
    port: process.env.HFSQL_PORT ?? '4900', database: process.env.HFSQL_DATABASE ?? 'sicocompte',
    user: process.env.HFSQL_USER ?? 'admin', password: process.env.HFSQL_PASSWORD ?? '',
  };
}
const dsn = (c) => `DRIVER={${c.driver}};Server Name=${c.host};Server Port=${c.port};Database=${c.database};UID=${c.user};PWD=${c.password};`;
const ok = (m) => console.log('  [OK]  ', m);
const ko = (m, e) => console.log('  [FAIL]', m, '→', (e?.message ?? '').split('\n')[0]);

async function main() {
  const d = dsn(cfg());
  const conn = await odbc.connect(d);
  console.log('Connecté.');
  try {
    try { await conn.query(`CREATE TABLE ${T} (id INT AUTO_INCREMENT, val VARCHAR(20), PRIMARY KEY (id))`); ok('CREATE TABLE'); }
    catch (e) { ko('CREATE TABLE', e); return; }

    try { await conn.query(`INSERT INTO ${T} (val) VALUES ('x')`); ok('INSERT'); }
    catch (e) { ko('INSERT', e); }

    // (A) Relecture 2e connexion PENDANT que conn1 est ouverte.
    try {
      const c2 = await odbc.connect(d);
      const rows = await c2.query(`SELECT COUNT(*) AS n FROM ${T}`);
      ok(`(A) 2e connexion, conn1 ENCORE OUVERTE : COUNT = ${rows?.[0]?.n}`);
      await c2.close();
    } catch (e) { ko('(A) 2e connexion (conn1 ouverte)', e); }

    // (B) On FERME conn1 (commit au close ?) puis on relit depuis une 3e connexion.
    await conn.close();
    ok('conn1 fermée.');
    try {
      const c3 = await odbc.connect(d);
      const rows = await c3.query(`SELECT COUNT(*) AS n FROM ${T}`);
      ok(`(B) APRÈS fermeture de conn1 : COUNT = ${rows?.[0]?.n}  ← si OK, le DDL PERSISTE`);
      await c3.query(`DROP TABLE ${T}`);
      await c3.close();
    } catch (e) { ko('(B) relecture après fermeture conn1', e); }

    console.log('\nVERDICT : DDL viable seulement si (B) est [OK] (table visible après fermeture de la connexion créatrice).');
  } finally {
    try { const c = await odbc.connect(d); await c.query(`DROP TABLE ${T}`); await c.close(); } catch { /* déjà drop */ }
  }
}
main().catch((e) => { console.error('Échec sonde DDL :', e.message); process.exit(1); });
