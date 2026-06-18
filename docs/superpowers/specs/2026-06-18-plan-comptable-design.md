# Spec — Module Plan comptable / Comptes

**Date** : 2026-06-18
**Statut** : validé (design)
**Branche** : `master`

## Contexte

La table `comptes` est déjà créée (`db/schema/003_comptes.sql`) et **alimentée par le seeder**
à la création d'un magasin (`buildComptesPlan()` depuis `docs/compte.json`, 117 comptes
SYSCOHADA). Il manque la **consultation et le CRUD** du plan comptable d'un magasin :
service de lecture/écriture, IPC, et écran. C'est le socle des futurs modules Tiers et
Écritures.

## Décisions

- **Pas de soldes** (Débit/Crédit/Solde par compte) : ils dépendent des écritures, pas encore
  implémentées. On ajoutera ces colonnes quand le module Écritures existera.
- **Mutations réservées au rôle Admin** (`requireAdmin`) ; le Comptable consulte.
- **Cloisonnement par magasin** : la liste et les créations portent le `magasin_id` du
  magasin courant (état UI du shell), passé en prop au module.
- **Règles de numérotation SYSCOHADA en domaine pur** : `src/domain/compte.ts` (testé),
  réutilisé par le service et l'UI.
- Hors périmètre (YAGNI) : « Recharger SYSCOHADA », génération des sous-comptes tiers
  (`4111xxxx`/`4011xxxx` → module Tiers), soldes, import/export.

## Domaine pur — `src/domain/compte.ts` (+ test, TDD)

Règles SYSCOHADA réutilisables, sans dépendance (style `domain/ecriture.ts`) :
- `classeFromNumero(numero: string): number | null` — la classe est le **premier chiffre**
  (1–9) ; `null` si le numéro est invalide.
- `isNumeroValide(numero: string): boolean` — **2 à 8 chiffres**, uniquement des chiffres.
- `COMPTES_COLLECTIFS = ['4011', '4111']` + `estAncreCollectif(numero): boolean` — comptes
  collectifs « ancres » des tiers (non supprimables).

## Schéma

Aucun changement DDL — `comptes(id, magasin_id, numero VARCHAR(8), libelle, classe, collectif,
lettrable)` existe déjà.

## Types & IPC — `src/shared/ipc.ts`

```ts
export interface Compte {
  id: number; magasin_id: number; numero: string; libelle: string;
  classe: number; collectif: boolean; lettrable: boolean;
}
export type CompteInput = Omit<Compte, 'id' | 'magasin_id'>; // magasin_id = contexte
```
Canaux : `comptes:list|create|update|delete`. Surface `Api.comptes` :
- `list(magasinId): Promise<IpcResult<Compte[]>>`
- `create(magasinId, input): Promise<IpcResult<Compte>>`
- `update(id, input): Promise<IpcResult<Compte>>`
- `delete(id): Promise<IpcResult<null>>`

## Service — `src/main/services/comptes/index.ts` (dossier par module)

- `list(magasinId)` → `SELECT id, magasin_id, numero, libelle, classe, collectif, lettrable
  FROM comptes WHERE magasin_id = … ORDER BY numero`.
- `create(magasinId, input)` — `requireAdmin` ; validation (`validateCompteInput`) ; **unicité
  du `numero` dans le magasin** (sinon `AppError('VALIDATION', …)`) ; `nextId('comptes')` ;
  `execute(INSERT …)`.
- `update(id, input)` — `requireAdmin` ; validation ; unicité du `numero` (hors lui-même) ;
  `execute(UPDATE …)`.
- `remove(id)` — `requireAdmin` ; **bloque si le compte est un ancre collectif**
  (`estAncreCollectif(numero)` → `AppError('COMPTE_COLLECTIF', …)`). (Garde « utilisé dans une
  écriture » à ajouter avec le module Écritures.) Sinon `execute(DELETE …)`.
- Validation pure `validateCompteInput` (dans `common/validation.ts`, **TDD**) : `numero`
  via `isNumeroValide`, `libelle` requis, `classe` ∈ 1–9 et cohérente avec `classeFromNumero`.

## UI — `src/features/comptes/ComptesModule.tsx`

Fidèle à `docs/design/referentiel.jsx`, avec shadcn + Tailwind.
- Props : `{ user: AuthUser; magasin: Magasin | null; }`. Si `magasin === null` → état vide
  « Sélectionnez un magasin ».
- En-tête : titre « Plan comptable » + sous-texte « Référentiel SYSCOHADA — N comptes pour
  {magasin.libelle} » + bouton **Nouveau compte** (Admin, `size="lg"` + icône `Plus`).
- **Recherche** (numéro/intitulé) + **filtre par classe** (`Select` 1–9 avec libellés).
- Liste **groupée par classe**, sections **repliables** (état local `collapsed`, pas de
  nouveau composant) ; en-tête de classe = « Classe N — {libellé} » + compteur. Par compte :
  **Numéro** (`font-mono text-primary`), **Intitulé**, **badges** collectif/lettrable, et un
  `DropdownMenu` d'actions (Modifier `Pencil` / Supprimer `Trash2`, **Admin only**).
- **Modal** (`Dialog` stylé comme Sociétés : pastille icône `BookOpen` + eyebrow « Plan
  comptable » + titre + sous-titre) : champ **Numéro** (`font-mono`), **Classe** (`Select`,
  auto-dérivée du numéro via `classeFromNumero`, modifiable), **Intitulé**, cases
  **collectif/lettrable** (composant shadcn **`checkbox`** → à installer via
  `npx shadcn@latest add checkbox`). Erreurs `VALIDATION` **inline sous les champs** (pas de
  toast), autres erreurs → `toast.error`. Suppression via **AlertDialog**.
- Boutons footer : Annuler (`X`) / Enregistrer (`Save`), `size="lg"`.

## Shell — `src/components/layout/AppShell.tsx`

`renderRoute()` : `case 'plan': return <ComptesModule user={user} magasin={magasin} />;`.

## Conventions (déjà actées)

Boutons `size="lg"` + icône + `cursor-pointer` ; toasts haut-centre ; validation inline ;
**ne pas modifier `src/components/ui/*`** (sauf `npx shadcn add checkbox`) ; services par
module ; commits sans mention d'IA.

## Vérification

1. `npm run typecheck`, `npm run lint`, `npm test` (domain/compte + validation), build renderer.
2. Manuelle (base réelle, côté utilisateur) : sélectionner un magasin → Plan comptable affiche
   les 117 comptes groupés par classe ; recherche/filtre OK ; créer un compte (numéro unique) ;
   doublon → erreur inline ; suppression d'un compte collectif (4011/4111) bloquée ; en
   Comptable, mutations indisponibles.
