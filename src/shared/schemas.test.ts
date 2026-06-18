import { describe, it, expect } from 'vitest';
import { compteInputSchema, firstZodError } from './schemas';

const base = { numero: '601', libelle: 'Achats', classe: 6, collectif: false, lettrable: false };

describe('compteInputSchema', () => {
  it('refuse un numéro invalide (< 2 chiffres)', () => {
    const res = compteInputSchema.safeParse({ ...base, numero: '6', classe: 6 });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(firstZodError(res.error)).toBe('Le numéro de compte doit comporter 2 à 8 chiffres.');
    }
  });

  it('refuse un intitulé vide', () => {
    const res = compteInputSchema.safeParse({ ...base, libelle: '   ' });
    expect(res.success).toBe(false);
    if (!res.success) expect(firstZodError(res.error)).toBe("L'intitulé du compte est obligatoire.");
  });

  it('refuse une classe incohérente avec le numéro', () => {
    const res = compteInputSchema.safeParse({ ...base, classe: 5 });
    expect(res.success).toBe(false);
    if (!res.success) expect(firstZodError(res.error)).toBe('La classe doit correspondre au premier chiffre du numéro.');
  });

  it('accepte un compte valide et nettoie le libellé', () => {
    const res = compteInputSchema.safeParse({ ...base, libelle: '  Achats  ' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.libelle).toBe('Achats');
  });
});
