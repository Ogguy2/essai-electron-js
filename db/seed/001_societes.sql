-- =====================================================================
-- seed/001 — Sociétés de démo
-- À exécuter dans le Centre de contrôle HFSQL (base : sicocompte),
-- APRÈS tous les scripts db/schema/ et APRÈS avoir créé la base.
-- =====================================================================

INSERT INTO societes (id, raison_sociale, rccm, adresse, telephone)
VALUES (1, 'SICONEX SARL', 'CI-ABJ-2019-B-12480', 'Bd VGE, Zone 4, Marcory — Abidjan', '+225 27 21 35 80 14');

INSERT INTO societes (id, raison_sociale, rccm, adresse, telephone)
VALUES (2, 'SICONEX DISTRIBUTION SARL', 'CI-ABJ-2024-B-04419', 'Rue du Commerce, Yopougon — Abidjan', '+225 27 23 50 12 00');
