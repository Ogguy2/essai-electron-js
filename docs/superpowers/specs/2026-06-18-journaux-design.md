# Spec — Module Journaux

**Date** : 2026-06-18
**Statut** : validé (design)
**Branche** : `master`

## Contexte

Référentiel des **journaux comptables par magasin** (codes AN, VTE, ACHT, BANQ, CAI, OD…),
utilisés ensuite par les écritures. Structure quasi identique au module Comptes. 🔴 À construire.

## Décisions

- Journaux **par magasin** (`magasin_id`). CRUD ; **code unique par magasin** ; mutations **Admin only**.
- **Types de journaux** = liste **fixe** (constante domaine), pas de table `journaltypes`.
- **Seed** d'un jeu standard de journaux **à la création d'un magasin** (comme le plan comptable).
- Texte stocké en **ASCII MAJUSCULES** (de-accent global déjà en place ; code/libellé uppercased).
- **Hors périmètre (YAGNI)** : journaux « par période/mois » avec dates d'ouverture/fermeture ;
  KPIs / volumes / compteurs d'écritures de la maquette (dépendent des écritures, pas encore là).

## Domaine — `src/domain/journal.ts` (+ test)

```ts
export interface JournalType { code: string; libelle: string; }
export const JOURNAL_TYPES: JournalType[] = [
  { code: 'ACHT', libelle: 'Journal des achats' },
  { code: 'VTE',  libelle: 'Journal des ventes' },
  { code: 'CAI',  libelle: 'Journal de caisse' },
  { code: 'BANQ', libelle: 'Journal de banque' },
  { code: 'TVA',  libelle: 'Journal de TVA' },
  { code: 'PAIE', libelle: 'Journal de paie' },
  { code: 'OD',   libelle: 'Opérations diverses' },
];
export const JOURNAL_TYPE_CODES = JOURNAL_TYPES.map((t) => t.code);
export function isJournalType(code: string): boolean { return JOURNAL_TYPE_CODES.includes(code); }

/** Jeu standard seedé à la création d'un magasin. */
export const DEFAULT_JOURNAUX = [
  { code: 'AN',   libelle: 'A-nouveaux',          type: 'OD'   },
  { code: 'VTE',  libelle: 'Journal des ventes',  type: 'VTE'  },
  { code: 'ACHT', libelle: 'Journal des achats',  type: 'ACHT' },
  { code: 'BANQ', libelle: 'Journal de banque',   type: 'BANQ' },
  { code: 'CAI',  libelle: 'Journal de caisse',   type: 'CAI'  },
  { code: 'OD',   libelle: 'Operations diverses', type: 'OD'   },
];
```
Test : `isJournalType('VTE')` vrai, `isJournalType('XXX')` faux ; `DEFAULT_JOURNAUX` cohérent
(types ∈ JOURNAL_TYPE_CODES).

## Schéma — `db/schema/004_journaux.sql` (création manuelle HFSQL)

```sql
CREATE TABLE journaux (
  id         INT AUTO_INCREMENT,
  magasin_id INT,
  code       VARCHAR(8),
  libelle    VARCHAR(150),
  type       VARCHAR(10),
  active     BOOLEAN,
  PRIMARY KEY (id)
);
```

## Types & IPC

- `src/types/domain.ts` : `Journal { id, magasin_id, code, libelle, type, active }`,
  `JournalInput = Omit<Journal, 'id' | 'magasin_id'>`. Re-exportés par `shared/ipc.ts`.
- `src/shared/schemas.ts` : `journalInputSchema` = `{ code: string 1–8, libelle: string min1,
  type: refine(isJournalType), active: boolean }` + `JournalFormValues`.
- Canaux `IPC` : `journauxList|Create|Update|Delete`. Surface `Api.journaux` :
  `list(magasinId)`, `create(magasinId, input)`, `update(id, input)`, `delete(id)`.

## Service — `src/main/services/journaux/index.ts`

- `list(magasinId)` → `SELECT … WHERE magasin_id ORDER BY code`.
- `create(magasinId, input)` — `requireAdmin` ; parse zod ; `code`/`libelle` via `toAsciiUpper` ;
  **unicité du `code` par magasin** (sinon `AppError('VALIDATION', …)`) ; `insertReturningId`.
- `update(id, input)` — idem, unicité hors soi-même.
- `remove(id)` — `requireAdmin` ; (garde « utilisé dans une écriture » à ajouter avec Écritures).
- Helper `seedDefaults(run, magasinId)` réutilisé par `magasins.create` : insère les
  `DEFAULT_JOURNAUX` (sans id) pour le magasin.

## Intégration seed magasin

- `src/main/services/magasins/index.ts` `create()` : dans la transaction existante, après les
  comptes, **insérer aussi les `DEFAULT_JOURNAUX`** (sans id, libellés en MAJUSCULES ASCII).
- `scripts/db/lib.mjs` `seedMagasin()` : idem (DEFAULT_JOURNAUX dupliqué côté JS, comme le plan
  comptable l'est déjà).

## UI — `src/features/journaux/JournauxModule.tsx`

Fidèle à `docs/design/referentiel.jsx` (sans les KPIs/volumes). Mêmes patrons que ComptesModule :
- En-tête : « Journaux » + « N journaux pour {magasin.libelle} » + bouton **Nouveau journal**
  (Admin, `size="lg"` + icône).
- **Grille de cartes** (grid-2) : pastille icône, **code** (`font-mono`), libellé, badge **type**,
  badge « Inactif » si `!active` ; `DropdownMenu` d'actions (Modifier/Supprimer, Admin).
- **Modal** (react-hook-form + `zodResolver(journalInputSchema)`) : **Code** (`font-mono`,
  forcé en MAJUSCULES à la saisie), **Type** (`Select` sur `JOURNAL_TYPES`), **Libellé**, case
  **Actif** (`Checkbox` via Controller). Erreurs `VALIDATION` sous les champs ; suppression via
  `AlertDialog` ; mutations masquées si non-Admin ; état vide si pas de magasin.
- `AppShell` : `case 'journaux': return <JournauxModule user={user} magasin={magasin} />;`.

## Vérification

1. `npm run typecheck`, `npm run lint`, `npm test` (domain/journal + schémas), build renderer.
2. Manuelle (base réelle) : créer `db/schema/004_journaux.sql` ; `npm run db:fresh` → chaque
   magasin a 6 journaux (AN/VTE/ACHT/BANQ/CAI/OD) ; écran Journaux affiche les cartes ; créer un
   journal (code unique) ; doublon → erreur inline ; en Comptable, mutations indisponibles.
