/* db:help — aide des commandes BD. Lancement : npm run db:help */
console.log(`
Commandes base de données (DML uniquement)
==========================================

  npm run db:status   Vérifie la connexion HFSQL et liste les tables + nb de lignes.
                      (lecture seule)

  npm run db:seed     Insère les données de démo via des seeders séparés par
                      entité (scripts/db/seeders/) : sociétés, magasins+exercice,
                      plan comptable (117 comptes), journaux, tiers et écritures.
                      Idempotent : re-seede les comptes (corrige l'encodage) et
                      complète tiers/écritures s'ils sont absents, sans écraser
                      de données saisies.

  npm run db:fresh    « Refresh » : vide les tables de données (comptes, exercices,
                      magasins, sociétés) puis relance db:seed. NE touche pas à
                      app_users ni au schéma.

  npm run db:help     Affiche cette aide.

Pourquoi pas de migrate/rollback de schéma ?
  HFSQL/ODBC ne supporte pas le DDL programmatique fiable (une table créée via
  ODBC n'est pas visible des autres connexions — vérifié). Le SCHÉMA reste donc
  créé/évolué à la main dans le Centre de contrôle HFSQL, à partir des scripts
  db/schema/*.sql. Ces commandes ne gèrent que les DONNÉES.

Toutes les écritures pré-encodent les chaînes (utf8→latin1) et laissent HFSQL
auto-incrémenter les id — cohérent avec le code de l'application.
`);
