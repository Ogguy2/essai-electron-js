/** Règles de numérotation des sous-comptes tiers (logique pure). */
export const SOUS_COMPTE_PREFIX = { client: '4111', fournisseur: '4011' } as const;

/** Numéro 8 chiffres : préfixe (4) + séquence (4). */
export function formatSousCompte(prefix: string, seq: number): string {
  return prefix + String(seq).padStart(4, '0');
}

/** Prochaine séquence à partir du plus grand numéro existant pour ce préfixe. */
export function prochaineSequence(maxNumero: string | null, prefix: string): number {
  if (maxNumero && maxNumero.length === 8 && maxNumero.startsWith(prefix)) {
    return parseInt(maxNumero.slice(4), 10) + 1;
  }
  return 1;
}
