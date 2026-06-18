-- =====================================================================
-- 002 — Sociétés, magasins et exercices comptables
-- À exécuter dans le Centre de contrôle HFSQL (base : sicocompte).
-- Hiérarchie : societes (1..n) -> magasins ; exercices rattachés au magasin.
-- Dates stockées en VARCHAR(10) ISO 'YYYY-MM-DD' (comparables en plage).
-- =====================================================================

CREATE TABLE societes (
  id             INT,
  raison_sociale VARCHAR(150),
  rccm           VARCHAR(50),
  adresse        VARCHAR(200),
  telephone      VARCHAR(30),
  PRIMARY KEY (id)
);

CREATE TABLE magasins (
  id         INT,
  libelle    VARCHAR(100),
  societe_id INT,
  PRIMARY KEY (id)
);

CREATE TABLE exercices (
  id         INT,
  magasin_id INT,
  libelle    VARCHAR(50),
  date_debut VARCHAR(10),
  date_fin   VARCHAR(10),
  statut     VARCHAR(10),
  PRIMARY KEY (id)
);
