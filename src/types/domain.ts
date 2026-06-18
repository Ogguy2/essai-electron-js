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
export type ExerciceInput = Omit<Exercice, 'id' | 'magasin_id' | 'statut'>;

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

export interface Tiers {
  id: number;
  magasin_id: number;
  code: string;
  raison_sociale: string;
  est_client: boolean;
  est_fournisseur: boolean;
  telephone: string;
  adresse: string;
  registre_commerce: string;
  plafond_credit: number;
  bloque: boolean;
  compte_client: string;
  compte_fournisseur: string;
  archived: boolean;
}
export type TiersInput = Omit<Tiers, 'id' | 'magasin_id' | 'compte_client' | 'compte_fournisseur' | 'archived'>;

/** Charge utile de l'événement « mise à jour téléchargée » (main → renderer). */
export interface UpdateReadyPayload {
  version: string;
}

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface UserCreateInput {
  username: string;
  name: string;
  email: string;
  role: Role;
  password: string;
}

export interface UserUpdateInput {
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export type StatutEcriture = 'brouillon' | 'validee' | 'invalidee';

export interface EcritureLigne {
  id: number; ecriture_id: number; compte: string; tiers: string | null;
  libelle: string; debit: number; credit: number; echeance: string | null; lettrage: string | null;
}

export interface Ecriture {
  id: number; magasin_id: number; exercice_id: number; journal: string; ref: string;
  date_ecriture: string; libelle: string; statut: StatutEcriture;
  reversal_of_id: number | null; validee_at: string | null; cree_par: string;
}

export interface EcritureListItem extends Ecriture { total_debit: number; total_credit: number; }

export interface EcritureAvecLignes extends EcritureListItem { lignes: EcritureLigne[]; }

export interface LigneInput {
  compte: string; tiers: string | null; libelle: string;
  debit: number; credit: number; echeance: string | null; lettrage: string | null;
}

export interface EcritureInput {
  exercice_id: number; journal: string; date_ecriture: string; libelle: string; lignes: LigneInput[];
}
