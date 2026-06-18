import { query, sqlValue } from '../db/connection';

/**
 * Accès en lecture à la table `app_users` (HFSQL).
 * La table et les comptes initiaux sont créés via `db/schema/001_app_users.sql`
 * dans le Centre de contrôle HFSQL.
 */

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  name: string;
  email: string | null;
  role: string;
  active: number | boolean;
}

export async function findByUsername(username: string): Promise<UserRow | null> {
  const rows = await query<UserRow>(
    `SELECT id, username, password_hash, name, email, role, active FROM app_users WHERE username = ${sqlValue(username.trim().toLowerCase())}`,
  );
  return rows[0] ?? null;
}
