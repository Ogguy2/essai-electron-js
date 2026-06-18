import comptePlan from '../../../../docs/compte.json';

export interface CompteSeedRow {
  numero: string;
  libelle: string;
  classe: number;
  collectif: boolean;
  lettrable: boolean;
}

const TIERS_COLLECTIFS = new Set(['4011', '4111']);

/** Aplatit le plan SYSCOHADA (compte.json) en lignes prêtes à insérer. */
export function buildComptesPlan(): CompteSeedRow[] {
  const rows: CompteSeedRow[] = [];
  for (const cls of comptePlan.classes) {
    const classe = parseInt(cls.classe, 10);
    for (const c of cls.comptes) {
      const tiers = TIERS_COLLECTIFS.has(c.compte);
      rows.push({
        numero: c.compte,
        libelle: c.libelle,
        classe,
        collectif: tiers,
        lettrable: tiers,
      });
    }
  }
  return rows;
}
