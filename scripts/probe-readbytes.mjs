/**
 * Sonde — peut-on récupérer les OCTETS BRUTS d'une colonne texte HFSQL via
 * node-odbc (avant son décodage UTF-8 destructeur) ? Si oui, on peut réparer la
 * LECTURE (y compris les données existantes) en décodant nous-mêmes en latin1.
 *
 * Insère une chaîne accentuée en ANSI BRUT (comme les anciennes données), puis
 * tente plusieurs lectures pour obtenir un Buffer.
 *
 * Lancement : node scripts/probe-readbytes.mjs  (écrit scripts/probe-readbytes-result.txt)
 */
import 'dotenv/config';
import odbc from 'odbc';
import fs from 'node:fs';
import path from 'node:path';

const MARKER = '__PROBE_READBYTES__';
const SAMPLE = 'Réservé é à';
const OUT = path.join('scripts', 'probe-readbytes-result.txt');
const lines = [];
const out = (...a) => { const s = a.join(' '); console.log(s); lines.push(s); };
const flush = () => { try { fs.writeFileSync(OUT, lines.join('\n') + '\n'); } catch { /* */ } };

function cfg() {
  return {
    driver: process.env.HFSQL_DRIVER ?? 'HFSQL', host: process.env.HFSQL_HOST ?? '127.0.0.1',
    port: process.env.HFSQL_PORT ?? '4900', database: process.env.HFSQL_DATABASE ?? 'sicocompte',
    user: process.env.HFSQL_USER ?? 'admin', password: process.env.HFSQL_PASSWORD ?? '',
  };
}
const dsn = (c) => `DRIVER={${c.driver}};Server Name=${c.host};Server Port=${c.port};Database=${c.database};UID=${c.user};PWD=${c.password};`;

function describe(label, v) {
  out(`\n${label}`);
  out('  typeof        :', typeof v, '| isBuffer:', Buffer.isBuffer(v));
  if (Buffer.isBuffer(v)) {
    out('  hex           :', v.toString('hex'));
    out('  décodé latin1 :', JSON.stringify(v.toString('latin1')), v.toString('latin1') === SAMPLE ? '  <<< EGAL ORIGINAL' : '');
  } else if (typeof v === 'string') {
    out('  valeur        :', JSON.stringify(v));
    out('  code points   :', Array.from(v).map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' '));
  } else {
    out('  valeur        :', JSON.stringify(v));
  }
}

async function tryRead(conn, label, sql) {
  try {
    const rows = await conn.query(sql);
    const r = rows?.[0];
    const key = r ? Object.keys(r)[0] : null;
    describe(label + '  (' + sql + ')', key ? r[key] : r);
  } catch (e) {
    out(`\n${label}  (${sql})\n  [FAIL] ${e.message.split('\n')[0]}`);
  }
}

async function main() {
  const conn = await odbc.connect(dsn(cfg()));
  out('Connecté. SAMPLE =', JSON.stringify(SAMPLE), '| latin1 hex =', Buffer.from(SAMPLE, 'latin1').toString('hex'));
  try {
    // Insère en ANSI BRUT (PAS de pré-encodage) → simule les données existantes.
    await conn.query(`INSERT INTO societes (raison_sociale, rccm, adresse, telephone) VALUES ('${SAMPLE.replace(/'/g, "''")}', '${MARKER}', '', '')`);

    await tryRead(conn, '[1] SELECT direct', `SELECT raison_sociale FROM societes WHERE rccm='${MARKER}'`);
    await tryRead(conn, '[2] CAST AS BINARY', `SELECT CAST(raison_sociale AS BINARY) AS v FROM societes WHERE rccm='${MARKER}'`);
    await tryRead(conn, '[3] CAST AS VARBINARY', `SELECT CAST(raison_sociale AS VARBINARY(200)) AS v FROM societes WHERE rccm='${MARKER}'`);
    await tryRead(conn, '[4] CAST AS BLOB', `SELECT CAST(raison_sociale AS BLOB) AS v FROM societes WHERE rccm='${MARKER}'`);
    await tryRead(conn, '[5] HEX()', `SELECT HEX(raison_sociale) AS v FROM societes WHERE rccm='${MARKER}'`);
    await tryRead(conn, '[6] TO_HEX()', `SELECT TO_HEX(raison_sociale) AS v FROM societes WHERE rccm='${MARKER}'`);
  } finally {
    try { await conn.query(`DELETE FROM societes WHERE rccm='${MARKER}'`); out('\nNettoyage OK.'); } catch { /* */ }
    await conn.close();
  }
}
main().then(flush).catch((e) => { out('\nECHEC :', e.message); if (e.odbcErrors) out(JSON.stringify(e.odbcErrors)); flush(); process.exit(1); });
