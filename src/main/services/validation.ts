import type { SocieteInput, MagasinInput } from '../../shared/ipc';

/** Renvoie un message d'erreur, ou null si valide. */
export function validateSocieteInput(input: SocieteInput): string | null {
  if (!input.raison_sociale || !input.raison_sociale.trim()) {
    return 'La raison sociale est obligatoire.';
  }
  return null;
}

export function validateMagasinInput(input: MagasinInput): string | null {
  if (!input.libelle || !input.libelle.trim()) {
    return 'Le libellé du magasin est obligatoire.';
  }
  if (!input.societe_id) {
    return 'La société est obligatoire.';
  }
  return null;
}
