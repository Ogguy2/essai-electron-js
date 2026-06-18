/**
 * Sonde — encodage des chaînes via le pilote ODBC HFSQL + node-odbc.
 *
 * But : déterminer EMPIRIQUEMENT comment les accents (é, è, à…) sont corrompus,
 * et si la corruption est RÉCUPÉRABLE (mauvais décodage latin1↔utf8, réparable
 * en code) ou DESTRUCTIVE (U+FFFD « � », perte irréversible).
 *
 * Écrit TOUT son résultat dans `scripts/probe-encoding-result.txt` (en plus de la
 * console) — pour analyse directe, sans copier-coller.
 *
 * Lancement :  node scripts/probe-encoding.mjs
 * La sonde nettoie ses lignes (rccm = marqueur) à la fin.
 */
import 'dotenv/config';
import odbc from 'odbc';
import fs from 'node:fs';
import path from 'node:path';

const MARKER = '__PROBE_ENCODING__';
const SAMPLE = 'Réservé à Côté èùâêô';
const OUT_FILE = path.join('scripts', 'probe-encoding-result.txt');

const lines = [];
function out(...args) {
  const s = args.join(' ');
  console.log(s);
  lines.push(s);
}
function flush() {
  try { fs.writeFileSync(OUT_FILE, lines.join('\n') + '\n', 'utf8'); } catch { /* ignore */ }
}

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

function hex(str, enc) {
  try { return Buffer.from(str, enc).toString('hex'); } catch { return '(err)'; }
}

function analyse(label, str) {
  out(`\n${label}`);
  out('  valeur brute   :', JSON.stringify(str));
  out('  longueur       :', str.length);
  out('  code points    :', Array.from(str).map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' '));
  out('  octets (utf8)  :', hex(str, 'utf8'));
  out('  octets (latin1):', hex(str, 'latin1'));
  let r1 = '';
  let r2 = '';
  try { r1 = Buffer.from(str, 'latin1').toString('utf8'); } catch { r1 = '(err)'; }
  try { r2 = Buffer.from(str, 'utf8').toString('latin1'); } catch { r2 = '(err)'; }
  out('  ré-encode latin1→utf8 :', JSON.stringify(r1), r1 === SAMPLE ? '   <<< EGAL ORIGINAL' : '');
  out('  ré-encode utf8→latin1 :', JSON.stringify(r2), r2 === SAMPLE ? '   <<< EGAL ORIGINAL' : '');
}

async function main() {
  out('Config :', JSON.stringify({ ...getConfig(), password: '***' }));
  out('node version :', process.version);
  const conn = await odbc.connect(buildDsn(getConfig()));
  out('Connecté à HFSQL.');
  analyse('[ORIGINAL ENVOYÉ]', SAMPLE);

  try {
    await conn.query(
      `INSERT INTO societes (raison_sociale, rccm, adresse, telephone) ` +
        `VALUES ('${SAMPLE.replace(/'/g, "''")}', '${MARKER}', '', '')`,
    );
    const rows = await conn.query(`SELECT raison_sociale FROM societes WHERE rccm = '${MARKER}'`);
    const readBack = String(rows?.[0]?.raison_sociale ?? '(aucune ligne relue)');
    out('\n=================== VALEUR RELUE DEPUIS HFSQL ===================');
    analyse('[RELU]', readBack);
    out('\n=================== VERDICT (insertion brute) ===================');
    if (readBack === SAMPLE) {
      out('  ROUND-TRIP CORRECT. La corruption est ailleurs (affichage renderer ?).');
    } else if (Array.from(readBack).some((c) => c.codePointAt(0) === 0xfffd)) {
      out('  DESTRUCTIF (U+FFFD present) sur insertion brute.');
    } else {
      out('  Probable MOJIBAKE.');
    }

    // ---- TEST DU CORRECTIF : double-encodage utf8->latin1 à l'écriture ----
    const encoded = Buffer.from(SAMPLE, 'utf8').toString('latin1');
    await conn.query(
      `INSERT INTO societes (raison_sociale, rccm, adresse, telephone) ` +
        `VALUES ('${encoded.replace(/'/g, "''")}', '${MARKER}', '', '')`,
    );
    const rows2 = await conn.query(`SELECT raison_sociale FROM societes WHERE rccm = '${MARKER}'`);
    const fixed = String(rows2?.[rows2.length - 1]?.raison_sociale ?? '');
    out('\n=================== TEST CORRECTIF (write utf8->latin1) ===================');
    analyse('[RELU APRES CORRECTIF]', fixed);
    out('\nRESULTAT CORRECTIF :', fixed === SAMPLE ? '  ✅✅✅ EGAL ORIGINAL — le correctif write utf8->latin1 FONCTIONNE' : '  ❌ different de l original');
  } finally {
    try {
      await conn.query(`DELETE FROM societes WHERE rccm = '${MARKER}'`);
      out('\nNettoyage : ligne(s) de sonde supprimee(s).');
    } catch (e) {
      out('\nNettoyage impossible :', e.message.split('\n')[0]);
    }
    await conn.close();
  }
}

main()
  .then(() => flush())
  .catch((err) => {
    out('\nECHEC DE LA SONDE :', err.message);
    if (err.odbcErrors) out('  odbcErrors :', JSON.stringify(err.odbcErrors));
    flush();
    process.exit(1);
  });
