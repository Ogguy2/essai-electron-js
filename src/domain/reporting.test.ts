import { describe, it, expect } from 'vitest';
import {
  balance, soldeCompte, resultat, grandLivre, nextLettrageCode,
  type Mouvement,
} from './reporting';

function mvt(overrides: Partial<Mouvement> & { compte: string; debit: number; credit: number }): Mouvement {
  return {
    classe: Number(overrides.compte[0]),
    compte_libelle: `Compte ${overrides.compte}`,
    tiers: null,
    date: '2026-01-01',
    journal: 'AC',
    ref: 'REF001',
    ligne_libelle: 'Libelle test',
    echeance: null,
    lettrage: null,
    ...overrides,
  };
}

describe('balance', () => {
  it('agrège deux comptes distincts et calcule solde_debiteur / solde_crediteur', () => {
    const mvts: Mouvement[] = [
      mvt({ compte: '411100', debit: 1000, credit: 0 }),
      mvt({ compte: '411100', debit: 200, credit: 500 }),
      mvt({ compte: '401100', debit: 0, credit: 800 }),
    ];
    const b = balance(mvts);
    expect(b).toHaveLength(2);

    const b411 = b.find((l) => l.numero === '411100')!;
    expect(b411.debit).toBe(1200);
    expect(b411.credit).toBe(500);
    expect(b411.solde_debiteur).toBe(700);
    expect(b411.solde_crediteur).toBe(0);

    const b401 = b.find((l) => l.numero === '401100')!;
    expect(b401.debit).toBe(0);
    expect(b401.credit).toBe(800);
    expect(b401.solde_debiteur).toBe(0);
    expect(b401.solde_crediteur).toBe(800);
  });

  it('renvoie [] pour une liste vide', () => {
    expect(balance([])).toEqual([]);
  });
});

describe('soldeCompte', () => {
  it('renvoie le solde signé (débit − crédit)', () => {
    const mvts: Mouvement[] = [
      mvt({ compte: '521000', debit: 5000, credit: 2000 }),
      mvt({ compte: '521000', debit: 0, credit: 1000 }),
    ];
    const s = soldeCompte(mvts, '521000');
    expect(s.debit).toBe(5000);
    expect(s.credit).toBe(3000);
    expect(s.solde).toBe(2000);
  });

  it('renvoie solde négatif si créditeur', () => {
    const mvts: Mouvement[] = [
      mvt({ compte: '401100', debit: 0, credit: 1500 }),
    ];
    const s = soldeCompte(mvts, '401100');
    expect(s.solde).toBe(-1500);
  });

  it('renvoie zéros pour un compte absent', () => {
    const s = soldeCompte([], '999999');
    expect(s).toEqual({ debit: 0, credit: 0, solde: 0 });
  });
});

describe('resultat', () => {
  it('calcule charges (cl.6) et produits (cl.7) et résultat', () => {
    const mvts: Mouvement[] = [
      mvt({ compte: '601000', classe: 6, debit: 3000, credit: 0 }),
      mvt({ compte: '701000', classe: 7, debit: 0, credit: 5000 }),
    ];
    const r = resultat(mvts);
    expect(r.charges).toBe(3000);
    expect(r.produits).toBe(5000);
    expect(r.resultat).toBe(2000); // bénéfice
    expect(r.charges_detail).toHaveLength(1);
    expect(r.produits_detail).toHaveLength(1);
  });

  it('résultat négatif si charges > produits', () => {
    const mvts: Mouvement[] = [
      mvt({ compte: '631000', classe: 6, debit: 8000, credit: 0 }),
      mvt({ compte: '706000', classe: 7, debit: 0, credit: 4000 }),
    ];
    const r = resultat(mvts);
    expect(r.resultat).toBe(-4000);
  });
});

describe('grandLivre', () => {
  it('filtre par compte et calcule le solde progressif', () => {
    const mvts: Mouvement[] = [
      mvt({ compte: '521000', debit: 10000, credit: 0, date: '2026-01-01', ref: 'R1' }),
      mvt({ compte: '401100', debit: 0, credit: 3000, date: '2026-01-02', ref: 'R2' }),
      mvt({ compte: '521000', debit: 0, credit: 2000, date: '2026-01-03', ref: 'R3' }),
    ];
    const gl = grandLivre(mvts, { compte: '521000' });
    expect(gl).toHaveLength(2);
    expect(gl[0].solde_progressif).toBe(10000);
    expect(gl[1].solde_progressif).toBe(8000);
  });

  it('renvoie [] si aucun mouvement sur ce compte', () => {
    const mvts: Mouvement[] = [
      mvt({ compte: '411100', debit: 500, credit: 0 }),
    ];
    expect(grandLivre(mvts, { compte: '999999' })).toEqual([]);
  });
});

describe('nextLettrageCode', () => {
  it("renvoie 'A' pour une liste vide", () => {
    expect(nextLettrageCode([])).toBe('A');
  });

  it("renvoie 'C' après ['A','B']", () => {
    expect(nextLettrageCode(['A', 'B'])).toBe('C');
  });

  it("renvoie 'AA' après ['Z']", () => {
    expect(nextLettrageCode(['Z'])).toBe('AA');
  });

  it("renvoie 'AB' après ['AA']", () => {
    expect(nextLettrageCode(['AA'])).toBe('AB');
  });
});
