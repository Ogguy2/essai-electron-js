-- =====================================================================
-- 006 — Écritures comptables (en-têtes + lignes)
-- À exécuter dans le Centre de contrôle HFSQL (base : sicocompte).
-- =====================================================================

CREATE TABLE ecritures (
  id              INT AUTO_INCREMENT,
  magasin_id      INT,
  exercice_id     INT,
  journal         VARCHAR(8),
  ref             VARCHAR(30),
  date_ecriture   DATE,
  libelle         VARCHAR(200),
  statut          VARCHAR(20),
  reversal_of_id  INT,
  validee_at      DATETIME,
  cree_par        VARCHAR(50),
  PRIMARY KEY (id)
);

CREATE TABLE ecriture_lignes (
  id            INT AUTO_INCREMENT,
  ecriture_id   INT,
  compte        VARCHAR(8),
  tiers         VARCHAR(50),
  libelle       VARCHAR(200),
  debit         INT,
  credit        INT,
  echeance      DATE,
  lettrage      VARCHAR(10),
  PRIMARY KEY (id)
);
