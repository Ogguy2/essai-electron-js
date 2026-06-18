import { describe, it, expect } from 'vitest';
import { validateSocieteInput, validateMagasinInput, validateCompteInput } from './validation';

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

describe('validateCompteInput', () => {
  it('exige un numéro valide (2-8 chiffres)', () => {
    expect(validateCompteInput({ numero: '6', libelle: 'X', classe: 6, collectif: false, lettrable: false }))
      .toBe('Le numéro de compte doit comporter 2 à 8 chiffres.');
  });
  it('exige un intitulé', () => {
    expect(validateCompteInput({ numero: '601', libelle: '  ', classe: 6, collectif: false, lettrable: false }))
      .toBe("L'intitulé du compte est obligatoire.");
  });
  it('exige une classe cohérente avec le numéro', () => {
    expect(validateCompteInput({ numero: '601', libelle: 'Achats', classe: 5, collectif: false, lettrable: false }))
      .toBe('La classe doit correspondre au premier chiffre du numéro.');
  });
  it('accepte un compte valide', () => {
    expect(validateCompteInput({ numero: '601', libelle: 'Achats', classe: 6, collectif: false, lettrable: false }))
      .toBeNull();
  });
});
