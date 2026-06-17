import { describe, it, expect } from 'vitest';
import { estEquilibree, totalDebit, totalCredit } from './ecriture';

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
