import { describe, it, expect } from 'vitest';
import { estEquilibree, totalDebit, totalCredit, soldeLigne, ligneValide, numeroRef, inverseLignes, dateDansPeriode } from './ecriture';

describe('estEquilibree', () => {
  it('rejette une écriture de moins de 2 lignes', () => {
    expect(estEquilibree([{ debit: 100, credit: 0 }])).toBe(false);
  });

  it('accepte une écriture équilibrée (Σ débit = Σ crédit)', () => {
    const lignes = [
      { debit: 100, credit: 0 },
      { debit: 0, credit: 100 },
    ];
    expect(estEquilibree(lignes)).toBe(true);
  });

  it('rejette une écriture déséquilibrée', () => {
    const lignes = [
      { debit: 100, credit: 0 },
      { debit: 0, credit: 90 },
    ];
    expect(estEquilibree(lignes)).toBe(false);
  });

  it('calcule les totaux débit/crédit', () => {
    const lignes = [
      { debit: 60, credit: 0 },
      { debit: 40, credit: 0 },
      { debit: 0, credit: 100 },
    ];
    expect(totalDebit(lignes)).toBe(100);
    expect(totalCredit(lignes)).toBe(100);
  });
});

describe('lecture de signe & règles', () => {
  it('soldeLigne signé', () => {
    expect(soldeLigne({ debit: 1000, credit: 0 })).toBe(1000);
    expect(soldeLigne({ debit: 0, credit: 700 })).toBe(-700);
  });
  it('ligneValide : débit XOR crédit, positif', () => {
    expect(ligneValide({ debit: 100, credit: 0 })).toBe(true);
    expect(ligneValide({ debit: 0, credit: 100 })).toBe(true);
    expect(ligneValide({ debit: 0, credit: 0 })).toBe(false);
    expect(ligneValide({ debit: 100, credit: 100 })).toBe(false);
    expect(ligneValide({ debit: -5, credit: 0 })).toBe(false);
  });
  it('numeroRef', () => { expect(numeroRef('VTE', '2026', 1)).toBe('VTE-2026-0001'); });
  it('inverseLignes', () => {
    expect(inverseLignes([{ debit: 100, credit: 0 }])).toEqual([{ debit: 0, credit: 100 }]);
  });
  it('dateDansPeriode', () => {
    expect(dateDansPeriode('2026-06-01', '2026-01-01', '2026-12-31')).toBe(true);
    expect(dateDansPeriode('2027-01-01', '2026-01-01', '2026-12-31')).toBe(false);
  });
});
