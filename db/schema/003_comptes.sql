-- =====================================================================
-- 003 — Plan comptable (comptes) par magasin
-- À exécuter dans le Centre de contrôle HFSQL (base : sicocompte).
-- Alimenté par le seeder (compte.json) à la création d'un magasin.
-- numero : 2 à 8 chiffres (sous-comptes tiers 4111xxxx / 4011xxxx).
-- =====================================================================

CREATE TABLE comptes (
  id         INT AUTO_INCREMENT,
  magasin_id INT,
  numero     VARCHAR(8),
  libelle    VARCHAR(150),
  classe     INT,
  collectif  BOOLEAN,
  lettrable  BOOLEAN,
  PRIMARY KEY (id)
);
