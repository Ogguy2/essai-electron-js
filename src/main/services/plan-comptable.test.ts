import { describe, it, expect } from 'vitest';
import { buildComptesPlan } from './plan-comptable';

describe('buildComptesPlan', () => {
  it('aplatit compte.json en 117 comptes', () => {
    const rows = buildComptesPlan();
    expect(rows).toHaveLength(117);
  });

  it('renseigne numero, libelle et classe numérique', () => {
    const rows = buildComptesPlan();
    const capital = rows.find((r) => r.numero === '101');
    expect(capital).toBeDefined();
    expect(capital!.libelle).toBe('Capital social');
    expect(capital!.classe).toBe(1);
  });

  it('marque 4011 et 4111 comme collectif et lettrable', () => {
    const rows = buildComptesPlan();
    const fournisseurs = rows.find((r) => r.numero === '4011');
    const clients = rows.find((r) => r.numero === '4111');
    expect(fournisseurs).toMatchObject({ collectif: true, lettrable: true });
    expect(clients).toMatchObject({ collectif: true, lettrable: true });
  });

  it('laisse les autres comptes non collectifs', () => {
    const rows = buildComptesPlan();
    expect(rows.find((r) => r.numero === '101')!.collectif).toBe(false);
  });
});
