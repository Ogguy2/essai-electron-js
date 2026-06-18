import { describe, it, expect } from 'vitest';
import { deaccent, toAsciiUpper } from './text';

describe('deaccent', () => {
  it('retire les accents (résultat ASCII)', () => {
    expect(deaccent('Réservé à Côté')).toBe('Reserve a Cote');
    expect(deaccent('Écarts de réévaluation')).toBe('Ecarts de reevaluation');
  });
  it('gère les ligatures et garantit l’ASCII', () => {
    expect(deaccent('cœur')).toBe('coeur');
    expect(deaccent('Café — €')).toBe('Cafe  '); // tiret cadratin et € retirés
  });
  it('laisse l’ASCII inchangé', () => {
    expect(deaccent('ouvert')).toBe('ouvert');
    expect(deaccent('4011')).toBe('4011');
  });
});

describe('toAsciiUpper', () => {
  it('met en MAJUSCULES sans accents', () => {
    expect(toAsciiUpper('Écarts de réévaluation')).toBe('ECARTS DE REEVALUATION');
    expect(toAsciiUpper('Siconex - Marcory')).toBe('SICONEX - MARCORY');
  });
});
