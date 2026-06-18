-- =====================================================================
-- 005 — Tiers (clients / fournisseurs)
-- À exécuter dans le Centre de contrôle HFSQL (base : sicocompte).
-- =====================================================================

CREATE TABLE tiers (
  id                  INT AUTO_INCREMENT,
  magasin_id          INT,
  code                VARCHAR(20),
  raison_sociale      VARCHAR(200),
  est_client          BOOLEAN,
  est_fournisseur     BOOLEAN,
  telephone           VARCHAR(50),
  adresse             VARCHAR(300),
  registre_commerce   VARCHAR(50),
  plafond_credit      INT,
  bloque              BOOLEAN,
  compte_client       VARCHAR(8),
  compte_fournisseur  VARCHAR(8),
  archived            BOOLEAN,
  PRIMARY KEY (id)
);
