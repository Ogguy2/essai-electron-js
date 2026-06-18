import { describe, it, expect } from 'vitest';
import { formatSousCompte, prochaineSequence, SOUS_COMPTE_PREFIX } from './tiers';

describe('tiers', () => {
  it('formatSousCompte → 8 chiffres', () => {
    expect(formatSousCompte('4111', 1)).toBe('41110001');
    expect(formatSousCompte('4011', 42)).toBe('40110042');
  });
  it('prochaineSequence', () => {
    expect(prochaineSequence('41110005', '4111')).toBe(6);
    expect(prochaineSequence('4111', '4111')).toBe(1);
    expect(prochaineSequence(null, '4011')).toBe(1);
  });
  it('préfixes', () => {
    expect(SOUS_COMPTE_PREFIX.client).toBe('4111');
    expect(SOUS_COMPTE_PREFIX.fournisseur).toBe('4011');
  });
});
