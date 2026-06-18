import { describe, it, expect } from 'vitest';
import { compteInputSchema, firstZodError, societeInputSchema, magasinInputSchema, journalInputSchema, tiersInputSchema } from './schemas';

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

describe('societeInputSchema', () => {
  it('refuse une raison sociale vide', () => {
    const res = societeInputSchema.safeParse({ raison_sociale: '  ', rccm: '', adresse: '', telephone: '' });
    expect(res.success).toBe(false);
    if (!res.success) expect(firstZodError(res.error)).toBe('La raison sociale est obligatoire.');
  });
  it('accepte une société valide et nettoie la raison sociale', () => {
    const res = societeInputSchema.safeParse({ raison_sociale: '  ACME  ', rccm: 'X', adresse: 'Y', telephone: 'Z' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.raison_sociale).toBe('ACME');
  });
});

describe('magasinInputSchema', () => {
  it('refuse un libellé vide', () => {
    const res = magasinInputSchema.safeParse({ libelle: '  ', societe_id: 1 });
    expect(res.success).toBe(false);
    if (!res.success) expect(firstZodError(res.error)).toBe('Le libellé du magasin est obligatoire.');
  });
  it('refuse societe_id = 0', () => {
    const res = magasinInputSchema.safeParse({ libelle: 'M', societe_id: 0 });
    expect(res.success).toBe(false);
    if (!res.success) expect(firstZodError(res.error)).toBe('La société est obligatoire.');
  });
  it('accepte un magasin valide et nettoie le libellé', () => {
    const res = magasinInputSchema.safeParse({ libelle: '  Super  ', societe_id: 1 });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.libelle).toBe('Super');
  });
});

describe('journalInputSchema', () => {
  const base = { code: 'VTE', libelle: 'Ventes', type: 'VTE', active: true };
  it('refuse un type invalide', () => {
    const res = journalInputSchema.safeParse({ ...base, type: 'XXX' });
    expect(res.success).toBe(false);
    if (!res.success) expect(firstZodError(res.error)).toBe('Type de journal invalide.');
  });
  it('accepte un journal valide', () => {
    const res = journalInputSchema.safeParse(base);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.code).toBe('VTE');
      expect(res.data.type).toBe('VTE');
    }
  });
});

describe('tiersInputSchema', () => {
  const base = {
    code: 'CLI001',
    raison_sociale: 'Client Test',
    est_client: true,
    est_fournisseur: false,
    telephone: '',
    adresse: '',
    registre_commerce: '',
    plafond_credit: 0,
    bloque: false,
  };
  it('refuse si aucun flag client/fournisseur', () => {
    const res = tiersInputSchema.safeParse({ ...base, est_client: false, est_fournisseur: false });
    expect(res.success).toBe(false);
    if (!res.success) expect(firstZodError(res.error)).toBe('Cochez « Client » et/ou « Fournisseur ».');
  });
  it('accepte un tiers valide', () => {
    const res = tiersInputSchema.safeParse(base);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.code).toBe('CLI001');
      expect(res.data.est_client).toBe(true);
    }
  });
});
