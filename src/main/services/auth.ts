import type { AuthUser } from '../../shared/ipc';

/**
 * Service d'authentification (processus principal uniquement).
 *
 * ⚠️ PROVISOIRE : table d'utilisateurs **en dur**, comparaison en clair.
 * À remplacer par une vérification contre la table `users` de la base HFSQL,
 * avec mots de passe **hachés** (argon2/bcrypt) — cf. CDC §4.1. La signature
 * publique (`authenticate` / `logout` / `currentSession`) restera identique.
 */

interface StoredUser extends AuthUser {
  password: string;
}

const USERS: StoredUser[] = [
  { username: 'admin', password: 'siconex', name: 'Aïcha Koné', email: 'a.kone@siconex.ci', role: 'Admin' },
  { username: 'comptable', password: 'siconex', name: 'Koffi Yao', email: null, role: 'Comptable' },
];

let currentUser: AuthUser | null = null;

/** Vérifie les identifiants ; renvoie l'utilisateur (sans secret) ou null. */
export function authenticate(username: string, password: string): AuthUser | null {
  const match = USERS.find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password,
  );
  if (!match) {
    currentUser = null;
    return null;
  }
  const { password: _password, ...safe } = match;
  currentUser = safe;
  return safe;
}

export function logout(): void {
  currentUser = null;
}

export function currentSession(): AuthUser | null {
  return currentUser;
}
