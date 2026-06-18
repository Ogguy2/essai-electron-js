import bcrypt from 'bcryptjs';
import type { User, UserCreateInput, UserUpdateInput } from '../../../shared/ipc';
import { query, execute, insertReturningId, sqlValue, toBool } from '../../db/connection';
import { requireAdmin, currentSession } from '../auth';
import { userCreateSchema, userUpdateSchema, passwordSchema, firstZodError } from '../../../shared/schemas';
import { AppError } from '../common/errors';

/** Service Utilisateurs (processus principal). Toutes les mutations sont Admin. */

export async function list(): Promise<User[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT id, username, name, email, role, active FROM app_users ORDER BY username`,
  );
  return rows.map((r) => ({
    id: Number(r.id),
    username: String(r.username ?? ''),
    name: String(r.name ?? ''),
    email: String(r.email ?? ''),
    role: String(r.role ?? 'Comptable') as User['role'],
    active: toBool(r.active),
  }));
}

async function usernameExiste(username: string, exceptId?: number): Promise<boolean> {
  const extra = exceptId !== undefined ? ` AND id <> ${sqlValue(exceptId)}` : '';
  const rows = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM app_users WHERE username = ${sqlValue(username)}${extra}`,
  );
  return (rows[0]?.n ?? 0) > 0;
}

export async function create(input: UserCreateInput): Promise<User> {
  requireAdmin();
  const parsed = userCreateSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', firstZodError(parsed.error));
  const data = parsed.data;
  if (await usernameExiste(data.username)) {
    throw new AppError('VALIDATION', "Ce nom d'utilisateur existe déjà.");
  }
  const hash = bcrypt.hashSync(data.password, 10);
  const id = await insertReturningId(
    `INSERT INTO app_users (username, password_hash, name, email, role, active) VALUES (` +
      `${sqlValue(data.username)}, ${sqlValue(hash)}, ${sqlValue(data.name)}, ` +
      `${sqlValue(data.email)}, ${sqlValue(data.role)}, 1)`,
    'app_users',
  );
  return {
    id,
    username: data.username,
    name: data.name,
    email: data.email,
    role: data.role,
    active: true,
  };
}

export async function update(id: number, input: UserUpdateInput): Promise<User> {
  requireAdmin();
  const parsed = userUpdateSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', firstZodError(parsed.error));
  const data = parsed.data;
  const rows = await query<{ username: string }>(
    `SELECT username FROM app_users WHERE id = ${sqlValue(id)}`,
  );
  if (!rows[0]) throw new AppError('NOT_FOUND', 'Utilisateur introuvable.');
  const username = rows[0].username;
  await execute(
    `UPDATE app_users SET name = ${sqlValue(data.name)}, email = ${sqlValue(data.email)}, ` +
      `role = ${sqlValue(data.role)}, active = ${data.active ? '1' : '0'} WHERE id = ${sqlValue(id)}`,
  );
  return { id, username, name: data.name, email: data.email, role: data.role, active: data.active };
}

export async function setPassword(id: number, password: string): Promise<void> {
  requireAdmin();
  const parsed = passwordSchema.safeParse({ password });
  if (!parsed.success) throw new AppError('VALIDATION', firstZodError(parsed.error));
  const hash = bcrypt.hashSync(parsed.data.password, 10);
  const rows = await query<{ id: number }>(
    `SELECT id FROM app_users WHERE id = ${sqlValue(id)}`,
  );
  if (!rows[0]) throw new AppError('NOT_FOUND', 'Utilisateur introuvable.');
  await execute(
    `UPDATE app_users SET password_hash = ${sqlValue(hash)} WHERE id = ${sqlValue(id)}`,
  );
}

export async function remove(id: number): Promise<void> {
  requireAdmin();
  const session = currentSession();
  // Garde : empêcher de se désactiver soi-même.
  const rows = await query<{ username: string }>(
    `SELECT username FROM app_users WHERE id = ${sqlValue(id)}`,
  );
  if (!rows[0]) throw new AppError('NOT_FOUND', 'Utilisateur introuvable.');
  if (session && session.username === rows[0].username) {
    throw new AppError('FORBIDDEN', 'Vous ne pouvez pas désactiver votre propre compte.');
  }
  await execute(`UPDATE app_users SET active = 0 WHERE id = ${sqlValue(id)}`);
}
