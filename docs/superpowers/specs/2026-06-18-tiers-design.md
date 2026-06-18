# Spec — Module Tiers (clients / fournisseurs)

**Date** : 2026-06-18
**Statut** : validé (design)
**Branche** : `master`

## Contexte

Données maîtres clients/fournisseurs **par magasin**, avec **auto-génération des sous-comptes
tiers** (`4111xxxx` clients / `4011xxxx` fournisseurs) dans le plan comptable, et **archivage
(soft delete)** préservant l'historique. Dépend du module Comptes (déjà fait).

## Décisions

- **Une seule table `tiers`** avec flags `est_client` / `est_fournisseur` (un tiers peut être les
  deux). Pas de tables séparées clients/fournisseurs.
- **Permissions** : Admin **ET** Comptable (toute session authentifiée) — pas `requireAdmin`.
- **Sous-comptes** auto-générés en transaction à la création (4111/4011, séquentiels par magasin).
- **Soft delete** : « Supprimer » = `archived = true` ; la liste n'affiche que les actifs.
- Conventions : texte humain en MAJUSCULES ASCII (`toAsciiUpper`), booléens normalisés (`toBool`)
  en lecture, ids `AUTO_INCREMENT` (`insertReturningId`/MAX), zod partagé, RHF côté UI.
- **Hors périmètre (YAGNI)** : désarchivage, code tiers auto-généré (code saisi, unique/magasin),
  KPIs / soldes / plafonds-utilisés / grand-livre auxiliaire (dépendent des écritures).

## Domaine — `src/domain/tiers.ts` (+ test)

```ts
export const SOUS_COMPTE_PREFIX = { client: '4111', fournisseur: '4011' } as const;

/** Numéro de sous-compte 8 chiffres : préfixe (4 ch.) + séquence (4 ch.). */
export function formatSousCompte(prefix: string, seq: number): string {
  return prefix + String(seq).padStart(4, '0');
}

/** Prochaine séquence à partir du plus grand numéro existant pour ce préfixe. */
export function prochaineSequence(maxNumero: string | null, prefix: string): number {
  if (maxNumero && maxNumero.length === 8 && maxNumero.startsWith(prefix)) {
    return parseInt(maxNumero.slice(4), 10) + 1;
  }
  return 1;
}
```
Tests : `formatSousCompte('4111', 1) === '41110001'` ; `prochaineSequence('41110005','4111') === 6` ;
`prochaineSequence('4111','4111') === 1` ; `prochaineSequence(null,'4011') === 1`.

## Schéma — `db/schema/005_tiers.sql` (création manuelle HFSQL)

```sql
CREATE TABLE tiers (
  id                 INT AUTO_INCREMENT,
  magasin_id         INT,
  code               VARCHAR(20),
  raison_sociale     VARCHAR(150),
  est_client         BOOLEAN,
  est_fournisseur    BOOLEAN,
  telephone          VARCHAR(30),
  adresse            VARCHAR(200),
  registre_commerce  VARCHAR(50),
  plafond_credit     INT,
  bloque             BOOLEAN,
  compte_client      VARCHAR(8),
  compte_fournisseur VARCHAR(8),
  archived           BOOLEAN,
  PRIMARY KEY (id)
);
```

## Types & IPC

- `src/types/domain.ts` : `Tiers { id, magasin_id, code, raison_sociale, est_client,
  est_fournisseur, telephone, adresse, registre_commerce, plafond_credit, bloque,
  compte_client, compte_fournisseur, archived }` ;
  `TiersInput = Omit<Tiers, 'id'|'magasin_id'|'compte_client'|'compte_fournisseur'|'archived'>`.
- `src/shared/schemas.ts` : `tiersInputSchema` =
  `{ code: 1–20, raison_sociale: min1, est_client: bool, est_fournisseur: bool, telephone: string,
  adresse: string, registre_commerce: string, plafond_credit: number ≥0, bloque: bool }`
  **+ refine** : `est_client || est_fournisseur` (« Cochez client et/ou fournisseur. »). `TiersFormValues`.
- Canaux `IPC` : `tiersList|Create|Update|Delete`. `Api.tiers` :
  `list(magasinId)`, `create(magasinId, input)`, `update(id, input)`, `delete(id)`.

## Service — `src/main/services/tiers/index.ts`

- Guard `requireAuth()` (à ajouter dans `auth`) : lève `AppError('FORBIDDEN')` si pas de session.
- `list(magasinId)` → `SELECT … WHERE magasin_id = … AND archived <> 1 ORDER BY code` ; normalise
  `est_client/est_fournisseur/bloque/archived` via `toBool`.
- `nextSousCompte(run, magasinId, prefix)` : `SELECT MAX(numero) AS m FROM comptes WHERE
  magasin_id = … AND numero LIKE '<prefix>%'` → `prochaineSequence` → `formatSousCompte`.
- `create(magasinId, input)` — `requireAuth` ; parse zod ; `toAsciiUpper` sur code/raison_sociale/
  adresse/registre_commerce ; **unicité du code** par magasin (sinon VALIDATION) ; **transaction** :
  - si `est_client` : numéro 4111 via `nextSousCompte`, INSERT dans `comptes`
    (magasin_id, numero, libelle=raison_sociale, classe=4, collectif=0, lettrable=1) ;
  - si `est_fournisseur` : idem 4011 ;
  - INSERT `tiers` (avec `compte_client`/`compte_fournisseur`, `archived=0`) ; récupérer l'id (MAX).
  Retourne le `Tiers` complet.
- `update(id, input)` — `requireAuth` ; parse ; unicité code (hors soi-même) ; UPDATE des champs.
  Si un flag passe de false→true et le sous-compte est absent, le générer (transaction) et MAJ le
  champ `compte_*`. Les sous-comptes existants ne sont jamais supprimés.
- `remove(id)` — `requireAuth` ; `UPDATE tiers SET archived = 1 WHERE id = …` (soft delete).

## UI — `src/features/tiers/TiersModule.tsx`

Maquette `referentiel.jsx` (en **tableau**), patrons de `ComptesModule` (RHF + zod, garde anti-race,
état vide si pas de magasin, erreurs `VALIDATION` sous les champs, `AlertDialog`, modal stylé).
- En-tête : « Tiers » + « N tiers pour {magasin.libelle} » + **Nouveau tiers** (`size="lg"`+icône).
- **Filtres segmentés** Tous / Clients / Fournisseurs (boutons, état local) + **recherche**
  (code/raison sociale).
- **Tableau** (`table` shadcn) : Code (`font-mono`), Raison sociale (+ badges **Client**/
  **Fournisseur**, badge **Bloqué** si `bloque`), Téléphone, Comptes (`compte_client`/
  `compte_fournisseur` en `font-mono`), actions (`DropdownMenu` Modifier/Supprimer).
- **Modal** RHF + `zodResolver(tiersInputSchema)` : Code, Raison sociale, cases **Client** /
  **Fournisseur** (`Checkbox`), Téléphone, Adresse, RCCM, **Plafond crédit** (`Input` number),
  **Bloqué** (`Checkbox`). Erreurs sous les champs ; serveur `VALIDATION` → `setError('code', …)`.
  Mutations visibles pour Admin **et** Comptable.
- `AppShell` : `case 'tiers': return <TiersModule user={user} magasin={magasin} />;`.

## db / seed

- `scripts/db/lib.mjs` : ajouter `'tiers'` en tête de `DATA_TABLES` (purge `db:fresh`).
- Pas de seed de tiers à la création d'un magasin (donnée opérationnelle).

## Vérification

1. `npm run typecheck`, `npm run lint`, `npm test` (domain/tiers + schémas), build renderer.
2. Manuelle (base réelle) : exécuter `db/schema/005_tiers.sql` ; créer un tiers client → un compte
   `41110001` apparaît dans le Plan comptable (libellé = raison sociale) ; un tiers « les deux » →
   `4111xxxx` + `4011xxxx` ; « Supprimer » → disparaît de la liste mais le sous-compte reste ;
   doublon de code → erreur inline ; un Comptable peut créer/éditer.
