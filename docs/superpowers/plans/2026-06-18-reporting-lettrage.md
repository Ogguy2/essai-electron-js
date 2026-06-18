# Modules finaux — Reporting (États, Consolidation, Tableau de bord) + Lettrage

> subagent-driven. Commits SANS mention d'IA. Branche `master`. Conventions habituelles (services
> dossier-par-module, types `src/types/` + façade `shared/ipc`, zod si saisie, `sqlValue`, `toBool`,
> RHF, boutons `size="lg"`+icône, NE PAS modifier `src/components/ui/*`). Montants ENTIERS FCFA.
> Ces modules sont surtout en **lecture** (agrègent les écritures **validées**). Réf de calcul :
> `docs/design/compute.js`. ⚠️ **Lecture de signe** : solde = débit − crédit (cf. domaine).
> ⚠️ Éviter les JOIN SQL (incertain sous HFSQL) → lire les tables séparément et **joindre en JS**.

---

## Task 1: Domaine reporting `src/domain/reporting.ts` (TDD)

**Files:** Create `src/domain/reporting.ts`, `src/domain/reporting.test.ts`

Type d'entrée commun (un mouvement = une ligne d'écriture validée enrichie) :
```typescript
export interface Mouvement {
  compte: string; classe: number; compte_libelle: string; tiers: string | null;
  date: string; journal: string; ref: string; ligne_libelle: string;
  debit: number; credit: number; echeance: string | null; lettrage: string | null;
}
export interface LigneBalance {
  numero: string; libelle: string; classe: number;
  debit: number; credit: number; solde_debiteur: number; solde_crediteur: number;
}
export interface SoldeCompte { debit: number; credit: number; solde: number; }
export interface MouvementGL extends Mouvement { solde_progressif: number; }
export interface Resultat {
  charges: number; produits: number; resultat: number;
  charges_detail: LigneBalance[]; produits_detail: LigneBalance[];
}
```
Fonctions (LECTURE DE SIGNE — solde = débit − crédit) :
```typescript
/** Balance : agrégat par compte (numero). solde_debiteur/crediteur selon le signe. */
export function balance(mvts: readonly Mouvement[]): LigneBalance[] {
  const map = new Map<string, LigneBalance>();
  for (const m of mvts) {
    let b = map.get(m.compte);
    if (!b) { b = { numero: m.compte, libelle: m.compte_libelle, classe: m.classe, debit: 0, credit: 0, solde_debiteur: 0, solde_crediteur: 0 }; map.set(m.compte, b); }
    b.debit += m.debit; b.credit += m.credit;
  }
  const rows = [...map.values()].sort((a, b) => a.numero.localeCompare(b.numero));
  for (const b of rows) { const s = b.debit - b.credit; b.solde_debiteur = s > 0 ? s : 0; b.solde_crediteur = s < 0 ? -s : 0; }
  return rows;
}

export function soldeCompte(mvts: readonly Mouvement[], numero: string): SoldeCompte {
  let debit = 0, credit = 0;
  for (const m of mvts) if (m.compte === numero) { debit += m.debit; credit += m.credit; }
  return { debit, credit, solde: debit - credit };
}

export function soldeComptes(mvts: readonly Mouvement[], numeros: string[]): number {
  return numeros.reduce((s, n) => s + soldeCompte(mvts, n).solde, 0);
}

/** Grand livre : mouvements filtrés (par compte OU tiers) triés par date, solde progressif signé. */
export function grandLivre(mvts: readonly Mouvement[], filtre: { compte?: string; tiers?: string }): MouvementGL[] {
  const f = mvts.filter((m) => (filtre.compte ? m.compte === filtre.compte : true) && (filtre.tiers ? m.tiers === filtre.tiers : true));
  const sorted = [...f].sort((a, b) => a.date.localeCompare(b.date) || a.ref.localeCompare(b.ref));
  let cum = 0;
  return sorted.map((m) => { cum += m.debit - m.credit; return { ...m, solde_progressif: cum }; });
}

/** Compte de résultat : charges (classe 6, sens débiteur) vs produits (classe 7, sens créditeur). */
export function resultat(mvts: readonly Mouvement[]): Resultat {
  const b = balance(mvts);
  const charges_detail = b.filter((l) => l.classe === 6);
  const produits_detail = b.filter((l) => l.classe === 7);
  const charges = charges_detail.reduce((s, l) => s + (l.debit - l.credit), 0);
  const produits = produits_detail.reduce((s, l) => s + (l.credit - l.debit), 0);
  return { charges, produits, resultat: produits - charges, charges_detail, produits_detail };
}

/** Prochain code de lettrage alphabétique (A, B, …, Z, AA, …). */
export function nextLettrageCode(existants: readonly string[]): string {
  const toNum = (s: string) => [...s].reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0);
  const toCode = (n: number) => { let s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
  const max = existants.filter(Boolean).reduce((mx, c) => Math.max(mx, toNum(c)), 0);
  return toCode(max + 1);
}
```
- [ ] Tests : balance (2 comptes, solde débiteur/créditeur correct) ; soldeCompte signé ; resultat (charges cl.6 / produits cl.7 / résultat) ; grandLivre solde progressif ; nextLettrageCode ('' → 'A', ['A','B'] → 'C', ['Z'] → 'AA'). TDD (échec→impl→succès→commit).
- [ ] **Commit** `git commit -m "domain: reporting (balance, grand livre, résultat, lettrage — lecture de signe)"`

---

## Task 2: Service reporting `src/main/services/reporting/index.ts`

**Files:** Create the service.

- [ ] **Lecture des mouvements** (helper interne, jointure en JS — PAS de JOIN SQL) :
  `mouvements(magasinIds: number[]): Promise<Mouvement[]>` :
  1. `SELECT id, date_ecriture, journal, ref FROM ecritures WHERE magasin_id IN (...) AND statut = 'validee'` → map id→en-tête.
  2. `SELECT id, ecriture_id, compte, tiers, libelle, debit, credit, echeance, lettrage FROM ecriture_lignes WHERE ecriture_id IN (<ids>)`.
  3. `SELECT numero, classe, libelle FROM comptes WHERE magasin_id IN (...)` → map (par numero, en prenant le 1er) pour `classe`/`compte_libelle`.
  4. Construit `Mouvement[]` (montants `Number`), en filtrant par plage de dates si fournie.
- [ ] Expose (avec `requireAuth`) :
  - `getBalance(magasinId)` → `balance(mvts)`.
  - `getGrandLivre(magasinId, { compte?, tiers? })` → `grandLivre`.
  - `getResultat(magasinId)` → `resultat`.
  - `getEcheancier(magasinId)` → lignes `lettrage == null && echeance` (calcul d'antériorité simple en JS, buckets non_echu/0-30/31-60/61-90/+90 via comparaison de dates ; `today` passé en argument ou `new Date()`).
  - **Consolidation** : `getConsolidationBalance(societeId, dateDebut, dateFin)` et `getConsolidationResultat(...)` : récupère les magasins de la société (`SELECT id FROM magasins WHERE societe_id = …`), `mouvements(magasinIds)` filtré sur la plage de dates, puis `balance`/`resultat` (agrégés par `comptes.numero` — c'est déjà le cas puisque `balance` groupe par numéro). 
- [ ] Types de retour ajoutés dans `src/types/domain.ts` (réexport `Mouvement`, `LigneBalance`, `SoldeCompte`, `MouvementGL`, `Resultat`, + `LigneEcheance`) ; canaux IPC `reporting:balance|grand-livre|resultat|echeancier`, `consolidation:balance|resultat` ; `Api.reporting` + `Api.consolidation` ; preload ; handlers `main/ipc.ts` (via `wrap`).
- [ ] **Typecheck**. **Commit** `git commit -m "services: reporting + consolidation (balance, grand livre, résultat, échéancier)"`

---

## Task 3: Service lettrage `src/main/services/lettrage/index.ts`

**Files:** Create the service.

- [ ] `lignesLettrables(magasinId, compte, tiers?)` : lignes des écritures **validées** sur ce `compte`
  (et `tiers` si fourni), avec date/ref de l'en-tête (jointure JS), triées par date. Renvoie un type
  `LigneLettrable { ecriture_id, ligne_id, date, ref, tiers, libelle, debit, credit, lettrage }`.
- [ ] `lettrer(ligneIds: number[], code?)` : `requireAuth` ; si `code` absent, calcule le prochain via
  `nextLettrageCode` (lit les `lettrage` existants du compte) ; `UPDATE ecriture_lignes SET lettrage = <code>
  WHERE id IN (...)` (transaction). Retourne le code.
- [ ] `delettrer(ligneIds: number[])` : `requireAuth` ; `UPDATE ecriture_lignes SET lettrage = NULL WHERE id IN (...)`.
- [ ] Types + canaux `lettrage:lignes|lettrer|delettrer` + `Api.lettrage` + preload + handlers.
- [ ] **Typecheck**. **Commit** `git commit -m "services: lettrage (lignes lettrables, lettrer, délettrer)"`

---

## Task 4: UI États `src/features/etats/EtatsModule.tsx`

Maquette `docs/design/etats.jsx`. Props `{ magasin }`. Onglets (boutons segmentés) : **Balance**,
**Grand livre**, **Compte de résultat**, **Échéancier**.
- Balance : `Table` (N°, Intitulé, Mvt débit, Mvt crédit, Solde débiteur, Solde créditeur), groupée par
  classe avec sous-totaux + total général. Données via `window.api.reporting.balance(magasin.id)`.
- Grand livre : `Select` compte (depuis comptes), `Table` (Date, Jnl, Réf, Libellé, Débit, Crédit, Solde
  progressif, Let.). Via `reporting.grandLivre(magasin.id, { compte })`.
- Compte de résultat : 2 colonnes Charges/Produits + Résultat net (vert si bénéfice). Via `reporting.resultat`.
- Échéancier : `Table` (Tiers, Échéance, Réf, Montant, Antériorité badge). Via `reporting.echeancier`.
- État vide si pas de magasin. Bouton « Imprimer » (`window.print()`) optionnel.
- [ ] Brancher `case 'etats'`. **Commit** `git commit -m "ui: module États (balance, grand livre, résultat, échéancier)"`

---

## Task 5: UI Consolidation `src/features/consolidation/ConsolidationModule.tsx`

Maquette `docs/design/consolidation.jsx`. Props `{ }` (charge les sociétés via `window.api.societes.list`).
- Sélecteur **société** + **date début** + **date fin** (`Input type=date`). Onglets **Balance consolidée**
  / **Compte de résultat consolidé**. Via `window.api.consolidation.balance(societeId, dd, df)` et
  `.resultat(...)`. Bandeau : raison sociale + magasins de la société (chips).
- [ ] Brancher `case 'consolidation'`. **Commit** `git commit -m "ui: module Consolidation (société + plage de dates)"`

---

## Task 6: UI Tableau de bord `src/features/dashboard/DashboardModule.tsx`

Maquette `docs/design/dashboard.jsx`. Props `{ magasin }`. KPIs (CA = produits, Achats = charges,
Trésorerie = solde 521+571, Résultat), graphique CA mensuel (barres simples depuis les mouvements),
dernières écritures validées (via `ecritures.list`), position trésorerie (521/571), créances 4111 /
dettes 4011, alerte brouillons. Réutilise `reporting.resultat`/`reporting.balance` + un petit composant Kpi local.
- [ ] Brancher `case 'dashboard'`. **Commit** `git commit -m "ui: tableau de bord (KPIs, CA mensuel, écritures récentes, trésorerie)"`

---

## Task 7: UI Lettrage `src/features/lettrage/LettrageModule.tsx`

Maquette `docs/design/lettrage.jsx`. Props `{ magasin }`. Sélecteur **compte lettrable** (comptes
`lettrable=true`) + filtre tiers optionnel. `Table` des lignes (date, réf, tiers, libellé, débit, crédit,
lettrage) avec **checkboxes** de sélection. Panneau : Σ débit / Σ crédit / écart + bouton **Lettrer**
(appelle `window.api.lettrage.lettrer(ligneIds)`), et **Délettrer** sur un groupe existant. Via
`window.api.lettrage.lignes(magasin.id, compte, tiers?)`.
- [ ] Brancher `case 'lettrage'`. **Commit** `git commit -m "ui: module Lettrage (sélection + rapprochement)"`

---

## Task 8: db scripts + vérification
- [ ] `scripts/db/status.mjs` : ajouter `ecritures`, `ecriture_lignes` à la liste des tables affichées.
- [ ] `npm run typecheck && npm run lint && npm test` verts ; build renderer OK.
- [ ] **Commit** `git commit -m "db: db:status liste ecritures/ecriture_lignes"`

## Self-Review
- Lecture de signe centralisée dans `domain/reporting.ts` (solde = débit − crédit ; débiteur/créditeur ;
  charges/produits). ✅ Consolidation par `comptes.numero` + plage de dates (pas exercice_id). ✅
- Jointures en JS (pas de JOIN SQL HFSQL). ✅ Lettrage = champ `lettrage` sur les lignes. ✅
