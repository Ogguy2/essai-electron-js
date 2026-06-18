/**
 * Sonde — récupération de l'`id` auto-incrémenté après un INSERT (HFSQL/ODBC).
 *
 * But : déterminer EMPIRIQUEMENT quelle stratégie remonte le nouvel `id` avec le
 * pilote ODBC HFSQL, pour ensuite câbler la bonne dans le helper de production.
 *
 * Pré-requis : la table `societes` doit avoir été (re)créée dans le Centre de
 * contrôle HFSQL avec `id` en « identifiant automatique » (cf. db/schema/002).
 *
 * Lancement :  node scripts/probe-autoincrement.mjs
 * La sonde insère 1 ligne marquée puis la supprime — aucune donnée résiduelle.
 */
import 'dotenv/config';
import odbc from 'odbc';

const MARKER = '__PROBE_AUTOINC__';

function getConfig() {
  return {
    driver: process.env.HFSQL_DRIVER ?? 'HFSQL',
    host: process.env.HFSQL_HOST ?? '127.0.0.1',
    port: process.env.HFSQL_PORT ?? '4900',
    database: process.env.HFSQL_DATABASE ?? 'sicocompte',
    user: process.env.HFSQL_USER ?? 'admin',
    password: process.env.HFSQL_PASSWORD ?? '',
  };
}

function buildDsn(c) {
  return [
    `DRIVER={${c.driver}};`,
    `Server Name=${c.host};`,
    `Server Port=${c.port};`,
    `Database=${c.database};`,
    `UID=${c.user};`,
    `PWD=${c.password};`,
  ].join('');
}

/** Essaie une requête de récupération d'id ; renvoie un compte-rendu lisible. */
async function tryStrategy(conn, label, sql) {
  try {
    const rows = await conn.query(sql);
    const first = Array.isArray(rows) ? rows[0] : undefined;
    const value = first ? first[Object.keys(first)[0]] : undefined;
    console.log(`  [OK]   ${label.padEnd(22)} → ${JSON.stringify(value)}   (${sql})`);
    return value;
  } catch (err) {
    console.log(`  [FAIL] ${label.padEnd(22)} → ${err.message.split('\n')[0]}`);
    return undefined;
  }
}

async function main() {
  const dsn = buildDsn(getConfig());
  console.log('Connexion HFSQL…');
  const conn = await odbc.connect(dsn);
  console.log('Connecté.\n');

  try {
    // 1) INSERT marqué (id NON fourni → auto-incrément attendu).
    const insertSql =
      `INSERT INTO societes (raison_sociale, rccm, adresse, telephone) ` +
      `VALUES ('${MARKER}', '${MARKER}', '', '')`;
    const insertResult = await conn.query(insertSql);
    console.log('INSERT effectué. Objet de résultat node-odbc :');
    console.log('  count      =', insertResult?.count);
    console.log('  insertId   =', insertResult?.insertId, '(propriété éventuelle du driver)');
    console.log('  brut       =', JSON.stringify(insertResult));
    console.log('\nStratégies de récupération de l\'id (même connexion) :');

    // 2) Toutes les pistes, sur la MÊME connexion que l'INSERT.
    await tryStrategy(conn, 'LAST_INSERT_ID()', 'SELECT LAST_INSERT_ID() AS id');
    await tryStrategy(conn, '@@IDENTITY', 'SELECT @@IDENTITY AS id');
    await tryStrategy(conn, 'IDENT_CURRENT', "SELECT IDENT_CURRENT('societes') AS id");
    await tryStrategy(conn, 'MAX(id)', 'SELECT MAX(id) AS id FROM societes');

    // 3) Relit la ligne marquée pour montrer l'id réellement attribué.
    const check = await conn.query(
      `SELECT id, raison_sociale FROM societes WHERE rccm = '${MARKER}'`,
    );
    console.log('\nLigne(s) marquée(s) réellement présente(s) :', JSON.stringify(check));
  } finally {
    // 4) Nettoyage systématique.
    try {
      await conn.query(`DELETE FROM societes WHERE rccm = '${MARKER}'`);
      console.log('\nNettoyage : ligne(s) de sonde supprimée(s).');
    } catch (e) {
      console.log('\n⚠️ Nettoyage impossible :', e.message.split('\n')[0]);
    }
    await conn.close();
    console.log('Connexion fermée.');
  }
}

main().catch((err) => {
  console.error('\nÉchec de la sonde :', err.message);
  process.exit(1);
});
