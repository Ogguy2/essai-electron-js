import type BetterSqlite3 from 'better-sqlite3';

/**
 * Schéma SQLite de l'application (DDL). Contrairement à HFSQL/ODBC, SQLite
 * supporte parfaitement le DDL programmatique : les tables sont créées au
 * démarrage (`ensureSchema`), de façon idempotente (`IF NOT EXISTS`).
 *
 * Correspondances de types depuis l'ancien schéma HFSQL (`db/schema/*.sql`) :
 *   - `INT AUTO_INCREMENT` + `PRIMARY KEY (id)` → `INTEGER PRIMARY KEY AUTOINCREMENT`
 *   - `BOOLEAN`                                 → `INTEGER` (0/1 ; cf. `toBool`)
 *   - `DATE` / `DATETIME`                       → `TEXT` (ISO 'YYYY-MM-DD' / 'YYYY-MM-DD HH:MM:SS')
 *   - `VARCHAR(n)`                              → `TEXT` (SQLite ignore la longueur)
 *
 * NB : le nom `users` n'a rien de réservé sous SQLite, mais on conserve
 * `app_users` pour rester aligné avec le code/services existants.
 */
const DDL = `
CREATE TABLE IF NOT EXISTS app_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT,
  password_hash TEXT,
  name          TEXT,
  email         TEXT,
  role          TEXT,
  active        INTEGER
);

CREATE TABLE IF NOT EXISTS societes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  raison_sociale TEXT,
  rccm           TEXT,
  adresse        TEXT,
  telephone      TEXT
);

CREATE TABLE IF NOT EXISTS magasins (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  libelle    TEXT,
  societe_id INTEGER
);

CREATE TABLE IF NOT EXISTS exercices (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  magasin_id INTEGER,
  libelle    TEXT,
  date_debut TEXT,
  date_fin   TEXT,
  statut     TEXT
);

CREATE TABLE IF NOT EXISTS comptes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  magasin_id INTEGER,
  numero     TEXT,
  libelle    TEXT,
  classe     INTEGER,
  collectif  INTEGER,
  lettrable  INTEGER
);

CREATE TABLE IF NOT EXISTS journaux (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  magasin_id INTEGER,
  code       TEXT,
  libelle    TEXT,
  type       TEXT,
  active     INTEGER
);

CREATE TABLE IF NOT EXISTS tiers (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  magasin_id          INTEGER,
  code                TEXT,
  raison_sociale      TEXT,
  est_client          INTEGER,
  est_fournisseur     INTEGER,
  telephone           TEXT,
  adresse             TEXT,
  registre_commerce   TEXT,
  plafond_credit      INTEGER,
  bloque              INTEGER,
  compte_client       TEXT,
  compte_fournisseur  TEXT,
  archived            INTEGER
);

CREATE TABLE IF NOT EXISTS ecritures (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  magasin_id      INTEGER,
  exercice_id     INTEGER,
  journal         TEXT,
  ref             TEXT,
  date_ecriture   TEXT,
  libelle         TEXT,
  statut          TEXT,
  reversal_of_id  INTEGER,
  validee_at      TEXT,
  cree_par        TEXT
);

CREATE TABLE IF NOT EXISTS ecriture_lignes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ecriture_id   INTEGER,
  compte        TEXT,
  tiers         TEXT,
  libelle       TEXT,
  debit         INTEGER,
  credit        INTEGER,
  echeance      TEXT,
  lettrage      TEXT
);
`;

export function ensureSchema(db: BetterSqlite3.Database): void {
  db.exec(DDL);
}
