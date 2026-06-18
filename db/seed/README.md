# db/seed — Données de démarrage / démo

## Principe

Les fichiers de ce dossier contiennent des **données de démarrage** (INSERT uniquement).
Ils ne contiennent **aucun DDL** (pas de CREATE TABLE, pas d'ALTER).

## Ordre d'application

1. Exécuter d'abord tous les scripts `db/schema/` (dans l'ordre numérique).
2. Ensuite exécuter les fichiers présents ici, **dans l'ordre numérique** :
   - `001_societes.sql` — 2 sociétés de démo SICONEX
   - `002_magasins.sql` — commentaire uniquement (voir ci-dessous)

## Comment appliquer

Ouvrir le **Centre de contrôle HFSQL**, sélectionner la base `sicocompte`, et exécuter chaque fichier via l'éditeur SQL.

## Évolution au fil des modules

Cette collection a vocation à **grandir** au fur et à mesure que de nouveaux modules sont développés.
Quand un nouveau module ajoute des tables (journaux, tiers, exercices…), un nouveau fichier seed
numéroté doit être ajouté ici avec les données de démo correspondantes.

Convention de nommage : `NNN_<table_ou_domaine>.sql` (ex. `003_journaux.sql`, `004_tiers.sql`).

## Important — Table `comptes` (plan comptable)

**Ne PAS seeder la table `comptes` via SQL.**

Le plan comptable SYSCOHADA est inséré **automatiquement par l'application** (depuis `docs/compte.json`)
au moment de la création d'un magasin via l'interface Administration → Magasins.
Seeder cette table manuellement entraînerait des doublons ou des incohérences.

## Important — Magasins

**Créer les magasins via l'application** (Administration → Magasins), pas via SQL.
C'est l'application qui insère à la fois le magasin ET son plan comptable SYSCOHADA complet.
Un magasin inséré directement en SQL n'aura pas de plan comptable et sera inutilisable.
