import type { Exercice } from '../../shared/ipc';
import { query, sqlValue } from '../db/connection';

/** Service Exercices (lecture). La clôture est gérée par le futur module Exercices. */
export async function list(magasinId: number): Promise<Exercice[]> {
  return query<Exercice>(
    `SELECT id, magasin_id, libelle, date_debut, date_fin, statut FROM exercices ` +
      `WHERE magasin_id = ${sqlValue(magasinId)} ORDER BY date_debut DESC`,
  );
}
