/**
 * Seeder Utilisateurs — comptes applicatifs de démonstration (table app_users).
 *
 * Login via bcrypt (cf. src/main/services/auth). Les hash sont générés au seed.
 * Identifiants démo (cf. CLAUDE.md) : admin/siconex (Admin) et comptable/siconex
 * (Comptable). Upsert : insère si absent, sinon met à jour hash/nom/rôle/actif —
 * garantit des logins prévisibles après un seed, même si le schéma a pré-inséré
 * des comptes.
 *
 * NB : `app_users` est hors DATA_TABLES (db:fresh ne le purge pas) ; l'upsert
 * suffit à remettre les comptes démo dans un état connu.
 */
import bcrypt from 'bcryptjs';
import { sqlStr, tableCount } from '../lib.mjs';

/** Comptes de démonstration. Les usernames restent en minuscules (cf. findByUsername). */
export const DEMO_USERS = [
  { username: 'admin', password: 'siconex', name: 'Administrateur', email: 'admin@siconex.ci', role: 'Admin' },
  { username: 'comptable', password: 'siconex', name: 'Comptable', email: 'comptable@siconex.ci', role: 'Comptable' },
];

/** Upsert des utilisateurs de démo. Renvoie le nombre de comptes traités. */
export async function seedUsers(conn) {
  const count = await tableCount(conn, 'app_users');
  if (count === null) {
    console.log("  ⚠ table 'app_users' absente — utilisateurs non seedés (crée db/schema/001_app_users.sql).");
    return 0;
  }
  const existing = await conn.query('SELECT id, username FROM app_users');
  const idByUsername = new Map(existing.map((r) => [String(r.username).toLowerCase(), Number(r.id)]));

  let n = 0;
  for (const u of DEMO_USERS) {
    const hash = bcrypt.hashSync(u.password, 10);
    const id = idByUsername.get(u.username.toLowerCase());
    if (id != null) {
      await conn.query(
        `UPDATE app_users SET password_hash = ${sqlStr(hash)}, name = ${sqlStr(u.name)}, ` +
          `email = ${sqlStr(u.email)}, role = ${sqlStr(u.role)}, active = 1 WHERE id = ${id}`,
      );
    } else {
      await conn.query(
        `INSERT INTO app_users (username, password_hash, name, email, role, active) VALUES (` +
          `${sqlStr(u.username)}, ${sqlStr(hash)}, ${sqlStr(u.name)}, ${sqlStr(u.email)}, ${sqlStr(u.role)}, 1)`,
      );
    }
    n++;
  }
  console.log(`  ${n} utilisateur(s) de démo (admin, comptable) — mot de passe « siconex ».`);
  return n;
}
