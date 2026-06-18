-- =====================================================================
-- 004 — Journaux comptables par magasin
-- À exécuter dans le Centre de contrôle HFSQL (base : sicocompte).
-- =====================================================================

CREATE TABLE journaux (
  id         INT AUTO_INCREMENT,
  magasin_id INT,
  code       VARCHAR(8),
  libelle    VARCHAR(150),
  type       VARCHAR(10),
  active     BOOLEAN,
  PRIMARY KEY (id)
);
