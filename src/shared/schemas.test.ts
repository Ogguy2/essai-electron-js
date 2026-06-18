import { describe, it, expect } from 'vitest';
import { compteInputSchema, firstZodError, societeInputSchema, magasinInputSchema, journalInputSchema, tiersInputSchema, userCreateSchema, passwordSchema, exerciceInputSchema, ecritureInputSchema, ligneInputSchema } from './schemas';

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

describe('userCreateSchema', () => {
  const base = {
    username: 'jdupont',
    name: 'Jean Dupont',
    email: 'jd@example.com',
    role: 'Comptable' as const,
    password: 'secret1',
  };

  it('refuse un username vide', () => {
    const res = userCreateSchema.safeParse({ ...base, username: '  ' });
    expect(res.success).toBe(false);
    if (!res.success) expect(firstZodError(res.error)).toBe("Le nom d'utilisateur est obligatoire.");
  });

  it('refuse un mot de passe trop court', () => {
    const res = userCreateSchema.safeParse({ ...base, password: '123' });
    expect(res.success).toBe(false);
    if (!res.success) expect(firstZodError(res.error)).toBe('Mot de passe : 6 caractères minimum.');
  });

  it('accepte une saisie valide et nettoie username', () => {
    const res = userCreateSchema.safeParse({ ...base, username: '  jdupont  ' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.username).toBe('jdupont');
  });
});

describe('passwordSchema', () => {
  it('refuse moins de 6 caractères', () => {
    const res = passwordSchema.safeParse({ password: '12345' });
    expect(res.success).toBe(false);
    if (!res.success) expect(firstZodError(res.error)).toBe('Mot de passe : 6 caractères minimum.');
  });

  it('accepte un mot de passe valide', () => {
    const res = passwordSchema.safeParse({ password: 'abcdef' });
    expect(res.success).toBe(true);
  });
});

describe('exerciceInputSchema', () => {
  const base = { libelle: 'Exercice 2025', date_debut: '2025-01-01', date_fin: '2025-12-31' };

  it('refuse quand la date de fin est antérieure à la date de début', () => {
    const res = exerciceInputSchema.safeParse({ ...base, date_debut: '2025-06-01', date_fin: '2025-01-01' });
    expect(res.success).toBe(false);
    if (!res.success) expect(firstZodError(res.error)).toBe('La date de fin doit être postérieure à la date de début.');
  });

  it('accepte un exercice valide et nettoie le libellé', () => {
    const res = exerciceInputSchema.safeParse({ ...base, libelle: '  Exercice 2025  ' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.libelle).toBe('Exercice 2025');
  });
});

describe('ligneInputSchema', () => {
  const baseLigne = { compte: '601', tiers: null, libelle: 'Test', debit: 0, credit: 100, echeance: null, lettrage: null };

  it('refuse une ligne avec débit ET crédit non nuls', () => {
    const res = ligneInputSchema.safeParse({ ...baseLigne, debit: 100, credit: 100 });
    expect(res.success).toBe(false);
    if (!res.success) expect(firstZodError(res.error)).toBe('Chaque ligne porte un débit OU un crédit.');
  });

  it('refuse une ligne avec débit ET crédit à zéro', () => {
    const res = ligneInputSchema.safeParse({ ...baseLigne, debit: 0, credit: 0 });
    expect(res.success).toBe(false);
    if (!res.success) expect(firstZodError(res.error)).toBe('Chaque ligne porte un débit OU un crédit.');
  });

  it('accepte une ligne crédit valide', () => {
    const res = ligneInputSchema.safeParse(baseLigne);
    expect(res.success).toBe(true);
  });

  it('accepte une ligne débit valide', () => {
    const res = ligneInputSchema.safeParse({ ...baseLigne, debit: 500, credit: 0 });
    expect(res.success).toBe(true);
  });
});

describe('ecritureInputSchema', () => {
  const ligneDeb = { compte: '601', tiers: null, libelle: 'Achat', debit: 500, credit: 0, echeance: null, lettrage: null };
  const ligneCredit = { compte: '401', tiers: null, libelle: 'Fournisseur', debit: 0, credit: 500, echeance: null, lettrage: null };
  const base = {
    exercice_id: 1,
    journal: 'ACHT',
    date_ecriture: '2026-06-01',
    libelle: 'Facture',
    lignes: [ligneDeb, ligneCredit],
  };

  it('refuse une écriture déséquilibrée', () => {
    const res = ecritureInputSchema.safeParse({
      ...base,
      lignes: [ligneDeb, { ...ligneCredit, credit: 400 }],
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(firstZodError(res.error)).toBe('Écriture déséquilibrée (Σ débit ≠ Σ crédit).');
  });

  it('refuse une ligne avec débit ET crédit', () => {
    const res = ecritureInputSchema.safeParse({
      ...base,
      lignes: [{ ...ligneDeb, credit: 100 }, ligneCredit],
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(firstZodError(res.error)).toBe('Chaque ligne porte un débit OU un crédit.');
  });

  it('accepte une écriture équilibrée valide', () => {
    const res = ecritureInputSchema.safeParse(base);
    expect(res.success).toBe(true);
  });
});
