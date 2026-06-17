# Cahier des Charges — SicoCompte (Application desktop Electron)

> **Statut du document** : 🟢 STABILISÉ pour la nouvelle architecture — pivot majeur du 2026-06-17 intégré (reste quelques points 🟡/❓ mineurs, cf. §7)
> **Dernière mise à jour** : 2026-06-17
> **Type d'application** : **Application desktop Electron** (client lourd, multi-poste) de **gestion de la comptabilité** multi-sociétés / multi-supermarchés, **accédant directement à une base HFSQL centrale** (sans API).
> **Légende** : ✅ = décidé · 🟡 = à confirmer · ❓ = **à définir ensemble** · 🆕 = proposition (à valider, comble un vide laissé par le pivot)

> **⚠️ Pivot d'architecture (2026-06-17)**
> Ce cahier des charges **remplace** la version « API REST Laravel + front Next.js + synchro HFSQL legacy ».
> Les décisions structurantes sont désormais :
> 1. **Plus d'API.** L'application **Electron** est l'application **complète** : interface, logique comptable et accès aux données dans un seul produit desktop. Il n'y a **plus de back-end Laravel, ni de serveur HTTP**.
> 2. **Accès direct HFSQL.** L'application se connecte **directement** à une base **HFSQL** (via ODBC), sans couche intermédiaire.
> 3. **Base neuve.** Il **n'existe aucune base aujourd'hui** : on part d'une **base HFSQL vierge** dont **l'application est le maître** (et non plus une copie ETL d'un legacy). Toute la mécanique de **synchronisation / ETL / import legacy / lecture seule des tiers / multi-sources** est donc **supprimée** — elle n'existait que pour composer avec un HFSQL legacy pré-rempli.
> 4. **Multi-poste, base centrale.** Plusieurs **clients Electron** (postes / magasins) se connectent à **un même serveur HFSQL central** partagé.
>
> Le **domaine comptable** (multi-société/magasin, plan SYSCOHADA, écritures en partie double, lettrage, états OHADA, rôles, audit, FCFA, TVA CI) est **conservé**. Ce qui change, c'est **où** vit la logique (dans le processus principal Electron, plus dans Laravel) et **comment** on atteint les données (ODBC direct, plus HTTP).

---

## 1. Présentation générale

### 1.1 Objectif
Développer une **application desktop** (Electron) de **gestion de la comptabilité** capable de gérer la comptabilité de **plusieurs sociétés**, chacune possédant **plusieurs supermarchés** (hiérarchie `Société → Magasin`). La comptabilité est tenue **par magasin**, avec des **états consolidés au niveau société** (cf. §2). L'application est installée sur **plusieurs postes** qui partagent **une base de données HFSQL centrale**.

### 1.2 Contexte
- ✅ **Projet greenfield** : aucune base existante, aucun code existant à reprendre. On construit l'application **et** le schéma de la base **de zéro**.
- ✅ **Base de données : HFSQL** (PC SOFT / WinDev), en mode **Client/Serveur**, accédée **directement** depuis l'application via **ODBC** (port `4900`).
- ✅ **Une seule base centrale** partagée par tous les postes (le cloisonnement multi-magasins est **logique**, par colonne `magasin_id`, et non plus par bases physiques séparées).
- ✅ **L'application est la source de vérité** : elle crée, modifie et lit les données directement dans HFSQL. Pas de synchronisation, pas d'import, pas de second moteur (plus de MySQL).

### 1.3 Périmètre
- ✅ **Dans le périmètre** : interface utilisateur desktop, logique comptable complète, accès direct HFSQL, reporting (PDF + Excel), authentification & rôles, audit.
- ✅ **Hors périmètre** : toute API REST/HTTP, tout front web (Next.js), toute synchronisation avec un système legacy, tout second SGBD.

### 1.4 Utilisateurs cibles
- ✅ Deux profils : **Administrateur** (gère utilisateurs/rôles + toutes fonctions) et **Comptable** (toutes fonctions comptables). Détail des droits en §4.1.

---

## 2. Gestion multi-sociétés & multi-supermarchés ✅

> Section structurante (inchangée sur le fond, adaptée au modèle desktop).

### 2.1 Hiérarchie Société → Magasin ✅
- ✅ **Couche Société au-dessus du magasin** : la plateforme gère **plusieurs sociétés** (au moins une), et **chaque société possède plusieurs magasins** (au moins un). Hiérarchie : `Société (1..n) → Magasin (1..n)`. _(Schéma cible : table `societes`, FK `societe_id` non nullable sur `magasins`.)_
- ✅ **Identité légale portée par la SOCIÉTÉ** : `raison_sociale`, `rccm`, `adresse`, `telephone` vivent sur la société. Le **magasin ne garde que son `libelle`** (point de vente). Les en-têtes/cartouches des états affichent la raison sociale de la société du magasin.
- ✅ **Garde-fou** : une société possédant encore des magasins **ne peut pas être supprimée**.

### 2.2 Comptabilité cloisonnée par magasin ✅
- ✅ **Comptabilité tenue par MAGASIN** : chaque supermarché possède sa propre comptabilité cloisonnée (plan comptable, journaux, exercices, écritures). Pas de mélange entre magasins. La société est une **couche de regroupement**.
- ✅ **Cloisonnement logique par `magasin_id`** : toute donnée comptable porte une colonne `magasin_id`. Le filtrage s'applique systématiquement dans les **services du processus principal**.
- 🆕 **Magasin courant = état applicatif** (et non plus un en-tête HTTP `X-Magasin-Id`). L'utilisateur **sélectionne** la société/le magasin actif dans l'interface ; le processus principal applique ce contexte à toutes les requêtes.
- ✅ Les **rôles** des utilisateurs sont **centraux/globaux** (non redéfinis par magasin) (cf. §4.1).
- ✅ Les **données** comptables restent rattachées à un magasin, mais **tout utilisateur authentifié peut consulter tous les magasins** ; seul le rôle limite les actions (cf. §4.1).

### 2.3 Consolidation au niveau société ✅
- ✅ **Consolidation multi-magasins** : production d'**états agrégés sur tous les magasins d'une société** (en plus des états par magasin). États consolidés : **Balance consolidée** et **Compte de résultat consolidé**.
- ✅ **Principe technique** : agrégation des lignes d'écriture de tous les magasins de la société, **groupées par `comptes.numero`** (chaque magasin ayant son propre plan, on ne consolide pas par `compte_id`), filtrées par **plage de dates** (`du … au …`) plutôt que par `exercice_id`. Logique portée par un **service de consolidation** dans le processus principal.
- 🆕 **Sélection de la société** pour la consolidation = état applicatif (remplace l'en-tête `X-Societe-Id`).
- 🟡 **Bilan consolidé** non couvert pour l'instant (reporté, cf. §3.7).

---

## 3. Exigences fonctionnelles

### 3.0 Découpage en modules ✅

> **But** : structurer l'application en **modules logiques** à responsabilité unique, chacun compris et testé isolément. Dans une application Electron, un module = un ensemble cohérent de **services du processus principal** (accès données + règles métier) + les **écrans** correspondants côté interface + les **canaux IPC** qui les relient.
>
> **Légende État** : 🟢 prévu/à construire · 🔴 nouveau à concevoir.

#### Vue d'ensemble

| # | Module | Section CDC |
|---|---|---|
| 1 | Auth & Autorisation | §4.1 |
| 2 | Sociétés & Multi-magasins (Tenancy) + Consolidation | §2 |
| 3 | Plan comptable (Comptes) | §3.1 |
| 4 | Journaux | §3.2 |
| 5 | Écritures comptables | §3.3 |
| 6 | Tiers (Clients / Fournisseurs) | §3.4 |
| 7 | Lettrage / Rapprochement | §3.5 |
| 8 | Reporting & États | §3.6 |
| 9 | Audit & traçabilité | §4.2 |

> **Socle transverse** (commun à tous) : accès données HFSQL (couche ODBC unique dans le processus principal), référentiel comptable (FCFA / XOF, SYSCOHADA, TVA CI 18 %/9 % — §3.7), contexte société/magasin courant, contrats IPC typés (§5.4).
>
> **Disparu vs version précédente** : ❌ *Module Synchronisation HFSQL* (ETL/import legacy/multi-sources). Sans legacy ni base existante, il n'y a rien à synchroniser : l'application écrit directement la donnée de référence.

---

#### Module 1 — Auth & Autorisation
- **Responsabilité** — Authentifier les utilisateurs au démarrage et autoriser leurs actions selon le rôle.
- **Périmètre** — Connexion par **`username` + mot de passe** (mot de passe **haché** en base) ; **session applicative** locale (pas de token HTTP) ; rôles **globaux** `Admin` / `Comptable` ; matrice de permissions (§4.1.1) ; gestion utilisateurs & rôles (réservée à `Admin`). Toute action sensible passe par une vérification de permission dans le processus principal.
- **Dépend de** — *(socle, aucun module métier)*.
- **Interfaces (IPC)** — `auth:login`, `auth:logout`, `auth:me`, `users:*` (CRUD, Admin uniquement).
- **État** — 🔴 À concevoir intégralement (les briques Laravel/Sanctum/`spatie/laravel-permission` n'existent plus). 🆕 **Proposition** : table `users` (username unique, hash de mot de passe via `argon2`/`bcrypt` côté Node), table `roles`/`permissions`, vérification centralisée dans le processus principal.

#### Module 2 — Sociétés & Multi-magasins (Tenancy) + Consolidation
- **Responsabilité** — Gérer la hiérarchie `Société → Magasin`, cloisonner la donnée comptable par `magasin_id`, produire les états consolidés par société.
- **Périmètre** — Référentiel des **sociétés** (identité légale) ; référentiel des **magasins** rattachés à une société ; application systématique du contexte magasin courant ; pré-chargement du plan comptable à la création d'un magasin (délégué au module 3) ; **consolidation** (balance + compte de résultat) sur tous les magasins d'une société. *Ne gère pas* : le bilan consolidé (reporté).
- **Dépend de** — Auth ; Écritures & Plan comptable (pour la consolidation).
- **Interfaces (IPC)** — `societes:*`, `magasins:*`, `consolidation:balance`, `consolidation:resultat`.
- **État** — 🔴 À construire. Le service de consolidation contourne explicitement le filtre magasin et agrège par `comptes.numero` sur une plage de dates.

#### Module 3 — Plan comptable (Comptes)
- **Responsabilité** — Gérer le plan comptable hiérarchique SYSCOHADA, par magasin.
- **Périmètre** — CRUD comptes ; hiérarchie parent/enfant ; **pré-chargement auto SYSCOHADA** (classes 1→9) à la création d'un magasin, depuis [`compte.json`](./compte.json) ; auto-génération des sous-comptes tiers (`4111xxxx` clients / `4011xxxx` fournisseurs) ; recherche/filtre par classe. *Ne gère pas* : les écritures (module 5).
- **Dépend de** — Multi-magasins (`magasin_id`), Auth.
- **Interfaces (IPC)** — `comptes:*`, `comptes:journalentries`, `comptes:journalentrylines`.
- **État** — 🔴 À construire. 🆕 Un **seeder** lit `compte.json` et insère le plan principal (classes + comptes à 2/3 chiffres) ; sous-comptes détaillés créés à la demande. Format de numéros **SYSCOHADA standard** ; sous-comptes tiers sur 8 chiffres (`4111xxxx`, `4011xxxx`).

#### Module 4 — Journaux
- **Responsabilité** — Gérer les journaux comptables et leurs types.
- **Périmètre** — Types ACHT, VTE, CAI, BANQ, TVA, PAIE, OD ; journaux par période (mois) avec dates d'ouverture/fermeture ; CRUD + filtre par type.
- **Dépend de** — Multi-magasins, Auth.
- **Interfaces (IPC)** — `journals:*`, `journaltypes:*`.
- **État** — 🔴 À construire.

#### Module 5 — Écritures comptables
- **Responsabilité** — Tenir les écritures en partie double et leur cycle de vie.
- **Périmètre** — En-tête + lignes (≥ 2) ; contrôle débit/crédit ; **équilibre bloquant** à la validation ; statuts BROUILLON → VALIDÉE → INVALIDÉE ; référence auto-générée. Les écritures sont **saisies dans l'application** (plus de génération automatique depuis des mouvements legacy).
- **Dépend de** — Journaux, Plan comptable, Multi-magasins, Auth ; émet vers Audit (module 9) et Lettrage (module 7).
- **Interfaces (IPC)** — `journalentries:*`, `journalentries:validate`, `journalentries:comptes`, `journalentrylines:comptes`.
- **État** — 🔴 À construire. Le contrôle d'équilibre est une **règle métier du processus principal** : une écriture déséquilibrée (Σ débit ≠ Σ crédit) **ne peut pas être validée**.

#### Module 6 — Tiers (Clients / Fournisseurs)
- **Responsabilité** — Gérer les données maîtres clients/fournisseurs.
- **Périmètre** — **CRUD complet dans l'application** (création/modification/suppression) — _changement vs version précédente_ : les tiers ne sont plus importés en lecture seule d'un HFSQL legacy ; l'application en est désormais maître. **Suppression = archivage (soft delete)** : un tiers archivé conserve son historique comptable et son compte `4111/4011`. Auto-rattachement d'un sous-compte tiers à la création.
- **Dépend de** — Plan comptable (comptes tiers), Multi-magasins, Auth.
- **Interfaces (IPC)** — `clients:*`, `fournisseurs:*`.
- **État** — 🔴 À construire. ❌ Supprimés : upsert/réconciliation/détection de disparus (étaient liés à l'import legacy).

#### Module 7 — Lettrage / Rapprochement
- **Responsabilité** — Rapprocher les lignes d'écriture par un code de lettrage commun.
- **Périmètre** — Génération automatique de code ; assignation manuelle de lignes à un code.
- **Dépend de** — Écritures, Auth.
- **Interfaces (IPC)** — `lettering:generator`, `lettering:validate`.
- **État** — 🔴 À construire.

#### Module 8 — Reporting & États
- **Responsabilité** — Produire les états comptables OHADA (Système Normal), par magasin et consolidés.
- **Périmètre** — **Bilan**, **Grand Livre**, **Balance**, **Compte de résultat**, **Déclaration TVA** ; comparaison **N vs N-1** ; sortie **PDF et Excel**. États consolidés par société : **Balance** + **Compte de résultat**.
- **Dépend de** — Écritures, Plan comptable, Journaux, Multi-magasins, Auth.
- **Interfaces (IPC)** — `reports:bilan`, `reports:grand-livre`, `reports:balance`, `reports:compte-resultat`, `reports:tva` (génèrent un fichier PDF/xlsx local que l'utilisateur enregistre/ouvre).
- **État** — 🔴 À construire. 🆕 Génération **dans le processus principal** : PDF via `pdfmake` ou `puppeteer`, Excel via `exceljs` _(à valider — remplacent dompdf/maatwebsite côté Laravel)_.

#### Module 9 — Audit & traçabilité
- **Responsabilité** — Tracer chaque action sensible (qui, quoi, quand).
- **Périmètre** — Journal d'audit des actions sur les écritures (création, modification, validation, suppression) a minima, extensible aux comptes/journaux/tiers ; utilisateur + horodatage, écrits dans une table `audit_logs`.
- **Dépend de** — Auth (identité) ; observe les modules 3, 4, 5, 6 (transverse).
- **Interfaces (IPC)** — `audit:list` (consultation) ; enregistrement passif déclenché par les services du processus principal.
- **État** — 🔴 À construire. 🆕 Sans `spatie/laravel-activitylog`, l'audit est écrit explicitement par les services (table `audit_logs`). ✅ Entités auditées : **écritures, comptes, journaux, tiers** (cf. §4.2).

---

### 3.1 Plan comptable (Comptes) ✅
- ✅ Plan comptable hiérarchique (parent/enfant), conforme au **référentiel SYSCOHADA / OHADA**.
- ✅ **Référence officielle** : plan cible défini dans **[`compte.json`](./compte.json)** (source du seeder) et sa version lisible **[`compte.md`](./compte.md)**.
- ✅ **Classes 1 à 9** du SYSCOHADA (ressources durables, actif immobilisé, stocks, tiers, trésorerie, charges, produits, HAO, engagements/analytique).
- ✅ **Pré-chargement automatique** à la **création d'un magasin** (plan propre à chaque magasin).
- ✅ **Profondeur** : comptes principaux (classes + comptes 2/3 chiffres) ; sous-comptes détaillés à la demande (tiers `4111xxxx` / `4011xxxx`).
- ✅ Comptes liés à un magasin (`magasin_id`) ; CRUD + recherche/filtre par classe.

### 3.2 Journaux (Journals) ✅
- ✅ Types : ACHT, VTE, CAI, BANQ, TVA, PAIE, OD.
- ✅ Journaux par période (mois) avec dates d'ouverture/fermeture ; CRUD + filtre par type.

### 3.3 Écritures comptables ✅
- ✅ Écriture = en-tête + lignes (partie double débit/crédit), minimum 2 lignes.
- ✅ Statuts : BROUILLON → VALIDÉE → INVALIDÉE ; référence auto-générée.
- ✅ **Contrôle d'équilibre bloquant** : une écriture déséquilibrée ne peut pas être validée (règle stricte de partie double).

### 3.4 Tiers — Clients & Fournisseurs ✅
- ✅ **CRUD complet dans l'application** (l'app est maître de la donnée).
- ✅ **Suppression → archivage/soft delete** : historique comptable et compte `4111/4011` préservés.
- ✅ Sous-comptes tiers auto-générés au format 8 chiffres.

### 3.5 Lettrage / Rapprochement ✅
- ✅ Association de lignes d'écriture par un code commun ; génération automatique + assignation manuelle.

### 3.6 Reporting & éditions ✅
États comptables attendus, **par magasin** :
- ✅ **Bilan**, **Grand Livre**, **Balance**, **Compte de résultat**, **Déclaration TVA** (collectée/déductible).
- ✅ **Système comptable : OHADA Système Normal (SN)**.
- ✅ **États consolidés par société** : **Balance consolidée** + **Compte de résultat consolidé** (agrégés sur tous les magasins, plage de dates `du … au …`, groupés par numéro de compte). 🟡 **Bilan consolidé** reporté.
- ✅ **Formats de sortie : PDF et Excel (xlsx)**.
- ✅ **Comparaison multi-périodes : N vs N-1**.

### 3.7 Devise & référentiel comptable ✅
- ✅ **Pays : Côte d'Ivoire** · **Devise unique : Franc CFA (FCFA / XOF)** (pas de multi-devises).
- ✅ **Référentiel : SYSCOHADA (OHADA révisé)**.
- ✅ **TVA Côte d'Ivoire : taux normal 18 % + taux réduit 9 %** (et exonéré/0 % le cas échéant).

---

## 4. Exigences non fonctionnelles

### 4.1 Authentification & autorisation ✅
- ✅ **Authentification locale** : `username` + mot de passe (mot de passe **haché** en base HFSQL). Le `username` est unique et obligatoire ; l'email est un champ de profil **optionnel**.
- 🆕 **Session applicative** : après connexion, l'identité et le rôle sont conservés en mémoire dans le processus principal pour la durée de la session (plus de token HTTP, plus de Sanctum).
- ✅ **Rôles CENTRAUX (globaux)** : un rôle s'applique à l'utilisateur indépendamment du magasin.
- ✅ **Accès aux magasins : tous** ; seul le rôle limite les actions.
- ✅ **Deux rôles uniquement : `Admin` et `Comptable`.**
- 🆕 **Gestion rôles/permissions « maison »** : tables `roles`/`permissions` en base + vérification centralisée dans le processus principal (les paquets `spatie/laravel-permission` n'existent plus).

#### 4.1.1 Matrice des permissions ✅
La seule différence entre les deux rôles est la **gestion des utilisateurs & rôles**, réservée à l'`Admin`.

| Fonctionnalité | Admin | Comptable |
|---|:---:|:---:|
| Gérer les utilisateurs & rôles | ✅ | ❌ |
| Gérer le plan comptable (CRUD comptes) | ✅ | ✅ |
| Gérer les journaux | ✅ | ✅ |
| Créer / modifier des écritures | ✅ | ✅ |
| Valider / invalider des écritures | ✅ | ✅ |
| Gérer les tiers (CRUD) | ✅ | ✅ |
| Lettrage / rapprochement | ✅ | ✅ |
| Générer les états | ✅ | ✅ |
| Consulter (lecture) | ✅ | ✅ |

### 4.2 Audit & traçabilité ✅
- ✅ **Journal d'audit** : tracer chaque action sur les écritures (création, modification, validation, suppression) avec **utilisateur + horodatage**, en table `audit_logs`.
- 🆕 Audit écrit explicitement par les services du processus principal (plus d'`activitylog` Laravel).
- ✅ **Entités auditées : écritures, comptes, journaux, tiers** (création / modification / suppression ; + validation / invalidation pour les écritures).

### 4.3 Performance ✅
- ✅ **Volumétrie : petite** (< 10 000 écritures/mois). Pas de contrainte de scalabilité forte.
- 🆕 Pagination des listes côté requêtes ODBC (LIMIT/OFFSET HFSQL) — à implémenter dans la couche données.
- ❓ **À définir** (indicatif) : nombre de magasins, de postes et d'utilisateurs attendus.

### 4.4 Sécurité 🟡
- 🆕 **Identifiants de connexion HFSQL** stockés **uniquement côté processus principal** (config locale / variables d'environnement), **jamais** exposés au renderer.
- 🆕 **Isolation Electron** : `contextIsolation` activé, `nodeIntegration` désactivé, accès aux fonctions sensibles uniquement via `preload` (contextBridge) et IPC. _(Les fuses Electron Forge durcissent déjà le packaging — cf. §5.)_
- 🟡 **À définir plus tard** : stratégie de sauvegarde de la base HFSQL, chiffrement au repos, mises à jour applicatives, gestion fine des secrets.

### 4.5 Qualité & tests ✅
- ✅ **Couverture large** : tester la logique comptable (équilibre, lettrage, consolidation, états), la couche d'accès données et les permissions.
- ✅ **Framework de test : Vitest** (natif Vite, TypeScript out-of-the-box). _(PHPUnit/Pest n'ont plus lieu d'être.)_

---

## 5. Architecture technique

> Détail (topologie réseau, configuration HFSQL/ODBC) dans [`architecture.md`](./architecture.md).

### 5.1 Stack ✅
- ✅ **Application** : **Electron** + **TypeScript**, packagée par **Electron Forge** (plugin **Vite**).
- ✅ **Base de données** : **HFSQL Client/Serveur** (PC SOFT), accès **direct via ODBC** (port `4900`).
- 🆕 **Accès données depuis Node** : pilote **ODBC HFSQL** + paquet npm **`odbc`** _(à valider)_, encapsulé dans une couche d'accès unique du processus principal.
- 🆕 **PDF** : `pdfmake` ou `puppeteer` · **Excel** : `exceljs` _(à valider)_.
- ❌ **Supprimés** : Laravel/PHP, Sanctum, paquets `spatie/*`, MySQL, Next.js/Vercel, et toute la chaîne de synchronisation legacy.

### 5.2 Découpage Electron (processus & couches) ✅
- ✅ **Processus principal (`main`, Node.js)** — **seul** à parler à HFSQL. Détient la **couche d'accès données (ODBC)**, les **services métier** (un par module §3.0 : comptes, journaux, écritures, lettrage, consolidation, reporting, audit, auth), la vérification des **permissions** et le **contexte société/magasin courant**. Expose des **handlers IPC** (`ipcMain.handle`).
- ✅ **Préchargement (`preload`, contextBridge)** — expose au renderer une **API typée et restreinte** (pas d'accès Node/DB direct). Pont unique entre interface et processus principal.
- ✅ **Processus de rendu (`renderer`, UI)** — l'**interface** (Vite + TS). Ne touche **jamais** la base : tout passe par l'API exposée par le preload, qui relaie en IPC vers les services.
- ✅ **Framework UI du renderer : React** (avec Vite + TypeScript). _À câbler : ajouter `react` / `react-dom` + `@vitejs/plugin-react` dans `vite.renderer.config.ts`, et passer le renderer en `.tsx`._

```
┌─────────────────────────────┐      ┌──────────────────────────────────────────┐
│  Renderer (UI, Vite + TS)   │ IPC  │  Main (Node.js)                            │
│  écrans, formulaires, états │◄────►│  services métier + permissions + contexte  │
└──────────────┬──────────────┘ via  │  ┌──────────────────────────────────────┐  │
               │            preload   │  │ Couche d'accès données (ODBC unique) │  │
               │  (contextBridge)     │  └───────────────────┬──────────────────┘  │
               └──────────────────────┴──────────────────────┼──────────────────────┘
                                                              │ ODBC :4900
                                                   ┌──────────▼───────────┐
                                                   │  Serveur HFSQL central │  (base unique, partagée)
                                                   └────────────────────────┘
```

### 5.3 Topologie de déploiement ✅
- ✅ **N postes clients Electron → 1 serveur HFSQL central** partagé (base unique).
- ✅ Chaque poste se connecte au serveur HFSQL central (port `4900`) via ODBC.
- 🟡 Si des postes sont **physiquement distants** (magasins éloignés du serveur central), la connectivité réseau peut passer par un **VPN** (ex. Tailscale) — détail de déploiement, **optionnel**, à trancher selon l'implantation réelle (§6).
- 🆕 **Configuration de connexion** (hôte, port, base, identifiants) lue côté processus principal (variables d'environnement / fichier de config local), jamais embarquée dans l'interface.

### 5.4 Modèle de données (cible, base neuve) ✅
Tables cibles : `societes`, `magasins`, `exercices`, `comptes`, `journaux`, `journaltypes`, `journalentries`, `journalentrylines`, `lettering`, `clients`, `fournisseurs`, `users`, `roles`, `permissions`, `audit_logs`.
- ✅ **Hiérarchie société** : `societes (1..n) → magasins` (FK `societe_id` non nullable). Identité légale sur `societes` ; `magasins` ne portent que `libelle`. Entités comptables cloisonnées par `magasin_id`.
- ❌ Tables **supprimées** vs version précédente : `mouvements`, `synch`, et les modèles « siège » (`*Main`) — liés à la synchro legacy.
- ✅ **Création & évolution du schéma** : **runner de migrations « maison » versionné** — une **table de versions de schéma** + des **scripts de migration numérotés** (`001_…`, `002_…`), appliqués dans l'ordre et **une seule fois chacun** (idempotent par version). Permet de faire évoluer le schéma HFSQL dans le temps de façon traçable.
- ✅ **Seeding SYSCOHADA** : le plan comptable est alimenté depuis [`compte.json`](./compte.json) à la **création d'un magasin** (cf. §3.1).

### 5.5 Communication interne (IPC) ✅
- 🆕 **Contrats IPC typés** : chaque module expose un ensemble de canaux nommés (`<module>:<action>`, cf. §3.0). Le preload expose des méthodes typées correspondantes ; les types des entrées/sorties sont partagés entre `main` et `renderer`.
- 🆕 **Réponses normalisées** : enveloppe interne unique pour les appels IPC, ex. `{ success: boolean, data?: T, error?: { code, message, details? } }` — équivalent desktop de l'ancienne enveloppe API. _(Forme à valider.)_

---

## 6. Contraintes et hypothèses
- ✅ **Base HFSQL Client/Serveur** disponible (serveur central) ; pilote ODBC HFSQL installé sur chaque poste.
- ✅ **Environnements : Dev + Prod** (recette ajoutée plus tard si besoin).
- 🟡 **Connectivité** : si postes distants, dépend d'un VPN éventuel (§5.3).
- ✅ **Délais / jalons : non définis** pour l'instant.

---

## 7. Décisions du pivot (2026-06-17)
1. ✅ **Plus d'API** — l'application Electron est complète (UI + logique comptable + accès direct BDD), sans back-end Laravel.
2. ✅ **Accès direct HFSQL** via ODBC depuis le processus principal.
3. ✅ **Base neuve** — l'application est maître de la donnée ; suppression de toute la synchro/ETL/legacy/multi-sources.
4. ✅ **Multi-poste, base centrale** — N clients Electron, 1 serveur HFSQL partagé.
5. ✅ **Tiers en CRUD complet** (plus de lecture seule legacy ; soft-delete conservé).
6. ✅ **Domaine comptable conservé** : multi-société/magasin, SYSCOHADA, écritures partie double + équilibre bloquant, lettrage, états OHADA SN, consolidation société (balance + résultat), FCFA/XOF, TVA CI 18 %/9 %, rôles Admin/Comptable, audit.

**Décisions complémentaires (2026-06-17, après pivot) :**
- ✅ Framework UI : **React** (§5.2) · ✅ Schéma : **runner de migrations versionné** (§5.4) · ✅ Audit : **écritures + comptes + journaux + tiers** (§4.2) · ✅ Tests : **Vitest** (§4.5).

**Points encore ouverts (❓/🟡) :**
- ❓ Nombre de magasins / postes / utilisateurs attendus (§4.3, indicatif).
- 🟡 VPN si postes distants (§5.3) · 🟡 Sauvegarde/chiffrement/MAJ applicatives (§4.4) · 🟡 Bilan consolidé par société (§2.3, §3.6) · 🟡 Choix exacts des paquets (`odbc`, PDF, Excel) (§5.1).
- 🆕 Toutes les propositions marquées 🆕 ci-dessus sont **à valider** (elles comblent des vides créés par le pivot, elles ne sont pas figées).

---

## 8. Documents de référence
- 📄 **[`compte.json`](./compte.json)** — Plan comptable **SYSCOHADA / OHADA** structuré. Source du seeder (cf. §3.1). _(Toujours valable.)_
- 📄 **[`compte.md`](./compte.md)** — Version lisible du plan comptable. _(Toujours valable.)_
- 📄 **[`fonctionnement-des-comptes.md`](./fonctionnement-des-comptes.md)** — Fonctionnement détaillé de chaque compte SYSCOHADA. _(Toujours valable.)_
- 📄 **[`architecture.md`](./architecture.md)** — Architecture desktop : couches Electron, accès ODBC HFSQL, topologie multi-poste / base centrale.

---

*Ce document est vivant : on le complète et on valide les points 🆕/🟡/❓ section par section.*
