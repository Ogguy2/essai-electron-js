import bcrypt from 'bcryptjs';
import type { AuthUser, Role } from '../../shared/ipc';
import { findByUsername } from './user-store';

/**
 * Service d'authentification (processus principal uniquement).
 * Vérifie les identifiants contre la table `users` HFSQL (mot de passe haché bcrypt).
 * La session courante est conservée en mémoire dans le main.
 */

let currentUser: AuthUser | null = null;

export async function authenticate(username: string, password: string): Promise<AuthUser | null> {
  const row = await findByUsername(username);
  if (!row) {
    return null;
  }
  const isActive = row.active === true || row.active === 1 || String(row.active) === '1';
  if (!isActive) {
    return null;
  }
  if (!bcrypt.compareSync(password, row.password_hash)) {
    return null;
  }
  currentUser = {
    name: row.name,
    username: row.username,
    email: row.email ? row.email : null,
    role: row.role as Role,
  };
  return currentUser;
}

export function logout(): void {
  currentUser = null;
}

export function currentSession(): AuthUser | null {
  return currentUser;
}
