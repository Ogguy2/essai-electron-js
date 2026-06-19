import bcrypt from 'bcryptjs';
import type BetterSqlite3 from 'better-sqlite3';
import { logInfo } from '../logger';

/**
 * Comptes par défaut créés au TOUT PREMIER lancement (base vide). Volontairement
 * limité à deux utilisateurs : aucune donnée de démo (sociétés, magasins,
 * écritures…) n'est insérée dans l'app packagée — celle-ci démarre propre.
 *
 * Identifiants (cf. CLAUDE.md) : admin/siconex (Admin), comptable/siconex (Comptable).
 * Les seeders de démo (scripts/db/*) restent réservés au dev.
 */
const DEFAULT_USERS = [
  { username: 'admin', password: 'siconex', name: 'Administrateur', email: 'admin@siconex.ci', role: 'Admin' },
  { username: 'comptable', password: 'siconex', name: 'Comptable', email: 'comptable@siconex.ci', role: 'Comptable' },
];

/** Insère les deux comptes par défaut si — et seulement si — `app_users` est vide. */
export function ensureDefaultUsers(db: BetterSqlite3.Database): void {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM app_users').get() as { n: number };
  if (n > 0) return;
  const insert = db.prepare(
    'INSERT INTO app_users (username, password_hash, name, email, role, active) VALUES (?, ?, ?, ?, ?, 1)',
  );
  const tx = db.transaction(() => {
    for (const u of DEFAULT_USERS) {
      insert.run(u.username, bcrypt.hashSync(u.password, 10), u.name, u.email, u.role);
    }
  });
  tx();
  logInfo('db.seed', `comptes par défaut créés : ${DEFAULT_USERS.map((u) => u.username).join(', ')}`);
}
