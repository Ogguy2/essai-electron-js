/**
 * Types de modèles du domaine métier SicoCompte.
 * Importés ici ; réexportés via `src/shared/ipc.ts` (façade publique).
 */

export type Role = 'Admin' | 'Comptable';

/** Utilisateur authentifié (jamais de mot de passe / hash côté renderer). */
export interface AuthUser {
  name: string;
  username: string;
  email: string | null;
  role: Role;
}

export interface Societe {
  id: number;
  raison_sociale: string;
  rccm: string;
  adresse: string;
  telephone: string;
}
export type SocieteInput = Omit<Societe, 'id'>;

export interface Magasin {
  id: number;
  libelle: string;
  societe_id: number;
}
export type MagasinInput = Omit<Magasin, 'id'>;

export interface Exercice {
  id: number;
  magasin_id: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
  statut: 'ouvert' | 'cloture';
}

export interface Compte {
  id: number;
  magasin_id: number;
  numero: string;
  libelle: string;
  classe: number;
  collectif: boolean;
  lettrable: boolean;
}
export type CompteInput = Omit<Compte, 'id' | 'magasin_id'>;

export interface Journal {
  id: number;
  magasin_id: number;
  code: string;
  libelle: string;
  type: string;
  active: boolean;
}
export type JournalInput = Omit<Journal, 'id' | 'magasin_id'>;

/** Charge utile de l'événement « mise à jour téléchargée » (main → renderer). */
export interface UpdateReadyPayload {
  version: string;
}
