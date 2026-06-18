import { describe, it, expect } from 'vitest';
import { classeFromNumero, isNumeroValide, estAncreCollectif } from './compte';

describe('classeFromNumero', () => {
  it('retourne le premier chiffre comme classe', () => {
    expect(classeFromNumero('601')).toBe(6);
    expect(classeFromNumero('4111')).toBe(4);
  });
  it('retourne null si invalide', () => {
    expect(classeFromNumero('')).toBeNull();
    expect(classeFromNumero('0abc')).toBeNull();
    expect(classeFromNumero('0')).toBeNull();
  });
});

describe('isNumeroValide', () => {
  it('accepte 2 à 8 chiffres', () => {
    expect(isNumeroValide('10')).toBe(true);
    expect(isNumeroValide('41110001')).toBe(true);
  });
  it('refuse < 2, > 8, non-chiffres', () => {
    expect(isNumeroValide('1')).toBe(false);
    expect(isNumeroValide('123456789')).toBe(false);
    expect(isNumeroValide('60A')).toBe(false);
    expect(isNumeroValide('')).toBe(false);
  });
});

describe('estAncreCollectif', () => {
  it('vrai pour 4011 et 4111', () => {
    expect(estAncreCollectif('4011')).toBe(true);
    expect(estAncreCollectif('4111')).toBe(true);
  });
  it('faux sinon', () => {
    expect(estAncreCollectif('601')).toBe(false);
  });
});
