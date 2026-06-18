# Spec — Module Écritures (partie double)

**Date** : 2026-06-18
**Statut** : validé (design)
**Branche** : `master`

## Contexte

Cœur comptable : saisie d'écritures en partie double (en-tête + lignes), **équilibre bloquant**,
statuts BROUILLON→VALIDÉE→INVALIDÉE, extourne. Pierre angulaire dont dépendent lettrage, états,
consolidation, tableau de bord. Par magasin.

## Décisions

- Tables **`ecritures`** (en-tête) + **`ecriture_lignes`** (lignes), noms FR. Colonne date nommée
  **`date_ecriture`** (le mot `date` est réservé HFSQL — cf. le piège `type` déjà rencontré).
- **Lecture de signe** (important) : montants **entiers FCFA**, toujours **positifs** ; une ligne
  porte **débit OU crédit** (jamais les deux, jamais 0/0) ; solde signé = `débit − crédit`.
- Permissions : **Admin ET Comptable** (saisie/validation/extourne) ; **invalidation** réservée Admin.
- Traçabilité **légère** sur l'écriture (`validee_at`, `cree_par`) — pas de table `audit_logs`
  (module Audit abandonné).
- Conventions : `sqlValue` (de-accent), `toAsciiUpper` (libellés), `toBool` (lecture), AUTO_INCREMENT,
  `withTransaction`, zod partagé, RHF côté UI.

## Domaine — `src/domain/ecriture.ts` (étendu, TDD)

Déjà présents : `totalDebit`, `totalCredit`, `estEquilibree` (≥2 lignes & Σd=Σc). Ajouter :
```ts
export interface LigneSaisie { compte: string; tiers: string | null; libelle: string; debit: number; credit: number; }

/** Solde signé d'une ligne (débit − crédit). */
export function soldeLigne(l: { debit: number; credit: number }): number { return l.debit - l.credit; }

/** Ligne valide : montants ≥ 0, débit XOR crédit, et non nulle. */
export function ligneValide(l: { debit: number; credit: number }): boolean {
  if (l.debit < 0 || l.credit < 0) return false;
  if (l.debit > 0 && l.credit > 0) return false;
  return l.debit > 0 || l.credit > 0;
}

/** Référence : JOURNAL-EXERCICE-0001. */
export function numeroRef(journal: string, exerciceLibelle: string, seq: number): string {
  return `${journal}-${exerciceLibelle}-${String(seq).padStart(4, '0')}`;
}

/** Extourne : inverse débit/crédit de chaque ligne. */
export function inverseLignes<T extends { debit: number; credit: number }>(lignes: readonly T[]): T[] {
  return lignes.map((l) => ({ ...l, debit: l.credit, credit: l.debit }));
}

/** Date ISO dans la période [debut, fin] (comparaison lexicographique). */
export function dateDansPeriode(date: string, debut: string, fin: string): boolean {
  return date >= debut && date <= fin;
}
```
Tests : soldeLigne signé ; ligneValide (rejette 0/0, débit+crédit, négatif) ; numeroRef ; inverseLignes ;
dateDansPeriode bornes.

## Schéma — `db/schema/006_ecritures.sql`

```sql
CREATE TABLE ecritures (
  id             INT AUTO_INCREMENT,
  magasin_id     INT,
  exercice_id    INT,
  journal        VARCHAR(8),
  ref            VARCHAR(50),
  date_ecriture  VARCHAR(10),
  libelle        VARCHAR(200),
  statut         VARCHAR(10),
  reversal_of_id INT,
  validee_at     VARCHAR(19),
  cree_par       VARCHAR(50),
  PRIMARY KEY (id)
);
CREATE TABLE ecriture_lignes (
  id          INT AUTO_INCREMENT,
  ecriture_id INT,
  compte      VARCHAR(8),
  tiers       VARCHAR(20),
  libelle     VARCHAR(150),
  debit       INT,
  credit      INT,
  echeance    VARCHAR(10),
  lettrage    VARCHAR(20),
  PRIMARY KEY (id)
);
```

## Types & IPC

- `src/types/domain.ts` :
  `StatutEcriture = 'brouillon' | 'validee' | 'invalidee'` ;
  `EcritureLigne { id, ecriture_id, compte, tiers, libelle, debit, credit, echeance, lettrage }` ;
  `Ecriture { id, magasin_id, exercice_id, journal, ref, date_ecriture, libelle, statut,
  reversal_of_id, validee_at, cree_par }` ;
  `EcritureAvecLignes = Ecriture & { lignes: EcritureLigne[]; total_debit: number; total_credit: number }` ;
  `LigneInput { compte, tiers, libelle, debit, credit, echeance, lettrage }` (tiers/echeance/lettrage nullable) ;
  `EcritureInput { exercice_id, journal, date_ecriture, libelle, lignes: LigneInput[] }`.
- `src/shared/schemas.ts` : `ligneInputSchema` (compte requis, debit/credit ≥0 entiers, refine débit XOR
  crédit) ; `ecritureInputSchema` (journal requis, date_ecriture ISO, libelle requis, lignes ≥2,
  refine Σdébit=Σcrédit & Σ>0). + tests.
- Canaux : `ecrituresList`, `ecrituresGet`, `ecrituresCreate`, `ecrituresUpdate`, `ecrituresValidate`,
  `ecrituresInvalidate`, `ecrituresReverse`, `ecrituresDelete`. `Api.ecritures` correspondante :
  `list(magasinId)`, `get(id)`, `create(magasinId, input)`, `update(id, input)`, `validate(id)`,
  `invalidate(id)`, `reverse(id)`, `delete(id)`.

## Service — `src/main/services/ecritures/index.ts`

- `requireAuth` (Admin/Comptable) sur les mutations ; `requireAdmin` sur `invalidate`.
- `list(magasinId)` → en-têtes (statut/journal/etc.) + `total_debit`/`total_credit` par agrégat des
  lignes ; tri date desc. Normalise rien de booléen (pas de bool ici).
- `get(id)` → en-tête + lignes (montants `Number`).
- `create(magasinId, input)` — parse zod ; libellés `toAsciiUpper` ; **transaction** : INSERT `ecritures`
  (statut `brouillon`, ref provisoire `''`), récupère l'id (MAX), INSERT chaque ligne. Retourne `EcritureAvecLignes`.
- `update(id, input)` — refuse si statut ≠ `brouillon` (`AppError('IMMUABLE', …)`) ; transaction :
  re-remplace les lignes (DELETE puis INSERT) + UPDATE en-tête.
- `validate(id)` — récupère écriture+lignes+exercice ; **règles bloquantes** (via domaine) :
  ≥2 lignes ; chaque `ligneValide` ; `estEquilibree` & Σdébit>0 ; tous `compte` renseignés ;
  pour toute ligne `estAncreCollectif(compte)` → `tiers` requis ; exercice `statut='ouvert'` &
  `dateDansPeriode(date, exercice.date_debut, exercice.date_fin)`. Si échec → `AppError('VALIDATION', <message précis>)`.
  Sinon : `ref = numeroRef(journal, exerciceLibelle, prochaineSeq)` (séquence = nb d'écritures
  validées du journal dans l'exercice + 1), UPDATE `statut='validee'`, `ref`, `validee_at` (horodatage),
  `cree_par = currentSession().username`.
- `remove(id)` — refuse si statut ≠ `brouillon` ; DELETE lignes + en-tête (transaction).
- `reverse(id)` (extourne) — exige statut `validee` ; crée une **nouvelle écriture validée** avec
  `inverseLignes`, `reversal_of_id = id`, ref propre, immédiatement validée.
- `invalidate(id)` — `requireAdmin` ; statut `validee` → `invalidee`.

## UI — `src/features/ecritures/EcrituresModule.tsx`

Maquette `docs/design/ecritures.jsx`. Props `{ user, magasin, exercice }`.
- **Liste** (`Table`) : Réf, Date, Journal (`Badge`), Libellé, Débit, Crédit (totaux), Statut (`Badge`
  brouillon/validee/invalidee) ; filtres **statut** (segmenté) + **journal** (`Select`) + recherche.
- **Saisie** (`Dialog` large) : en-tête Journal (`Select` journaux), Date (`Input type=date`), Libellé ;
  **lignes dynamiques** (RHF `useFieldArray`) : Compte (`combobox` shadcn sur les comptes), Tiers
  (`Select`, actif/exigé si compte collectif), Libellé, Débit, Crédit (saisie ≥0, l'un vide l'autre),
  bouton suppression (min 2 lignes) ; **pied** : Σdébit / Σcrédit / écart en live + indicateur
  Équilibrée/Déséquilibrée. Boutons : Annuler, Enregistrer en brouillon, **Valider** (désactivé si non
  équilibrée). Erreurs serveur `VALIDATION` → message global du modal.
- **Détail** : lignes + actions selon statut (brouillon : Modifier/Valider/Supprimer ; validée :
  Extourner ; + Invalider si Admin). Badge « Extourne » si `reversal_of_id`.
- Mutations ouvertes Admin **et** Comptable. `AppShell` : `case 'ecritures': return <EcrituresModule
  user={user} magasin={magasin} exercice={exercice} />;`.

## db / seed

- `scripts/db/lib.mjs` : ajouter `'ecriture_lignes'` puis `'ecritures'` en tête de `DATA_TABLES`
  (purge des lignes avant les en-têtes). Pas de seed d'écritures (donnée opérationnelle).

## Vérification

1. typecheck/lint/test (domaine + schémas) + build renderer.
2. Manuelle : exécuter `006_ecritures.sql` ; saisir une écriture déséquilibrée → Valider bloqué ;
   équilibrée → validée avec réf `VTE-2026-0001` ; ligne sur compte collectif sans tiers → refus ;
   date hors exercice ouvert → refus ; extourne d'une validée → écriture inverse validée ;
   modification/suppression d'une validée → refus.
