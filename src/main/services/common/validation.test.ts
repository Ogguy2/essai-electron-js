import { describe, it, expect } from 'vitest';
import { validateSocieteInput, validateMagasinInput } from './validation';

describe('validateSocieteInput', () => {
  it('exige une raison sociale', () => {
    expect(validateSocieteInput({ raison_sociale: '  ', rccm: '', adresse: '', telephone: '' }))
      .toBe('La raison sociale est obligatoire.');
  });
  it('accepte une société valide', () => {
    expect(validateSocieteInput({ raison_sociale: 'ACME', rccm: 'X', adresse: 'Y', telephone: 'Z' }))
      .toBeNull();
  });
});

describe('validateMagasinInput', () => {
  it('exige un libellé', () => {
    expect(validateMagasinInput({ libelle: '', societe_id: 1 }))
      .toBe('Le libellé du magasin est obligatoire.');
  });
  it('exige une société', () => {
    expect(validateMagasinInput({ libelle: 'M', societe_id: 0 }))
      .toBe('La société est obligatoire.');
  });
  it('accepte un magasin valide', () => {
    expect(validateMagasinInput({ libelle: 'M', societe_id: 1 })).toBeNull();
  });
});
