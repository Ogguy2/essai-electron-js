import type { SocieteInput, MagasinInput, CompteInput } from '../../../shared/ipc';
import { isNumeroValide, classeFromNumero } from '../../../domain/compte';

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

export function validateCompteInput(input: CompteInput): string | null {
  if (!isNumeroValide(input.numero)) {
    return 'Le numéro de compte doit comporter 2 à 8 chiffres.';
  }
  if (!input.libelle || !input.libelle.trim()) {
    return "L'intitulé du compte est obligatoire.";
  }
  if (input.classe !== classeFromNumero(input.numero)) {
    return 'La classe doit correspondre au premier chiffre du numéro.';
  }
  return null;
}
