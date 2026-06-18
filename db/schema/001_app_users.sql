-- =====================================================================
-- 001 — Table des utilisateurs de l'application
-- À exécuter dans le Centre de contrôle HFSQL (base : sicocompte).
-- NB : le nom `users` est RÉSERVÉ sous HFSQL → on utilise `app_users`.
-- =====================================================================

CREATE TABLE app_users (
  id            INT,
  username      VARCHAR(50),
  password_hash VARCHAR(100),
  name          VARCHAR(100),
  email         VARCHAR(150),
  role          VARCHAR(20),
  active        BOOLEAN,
  PRIMARY KEY (id)
);

-- Comptes initiaux — mot de passe « password » (haché en bcrypt).
-- admin → rôle Admin ; user → rôle Comptable.
INSERT INTO app_users (id, username, password_hash, name, email, role, active)
VALUES (1, 'admin', '$2b$10$7ZRlrlAYTSqevXxTK6WWVedSB8cncAi41SszRLOHI9CywcQVcCok.', 'Administrateur', '', 'Admin', 1);

INSERT INTO app_users (id, username, password_hash, name, email, role, active)
VALUES (2, 'user', '$2b$10$t47BrVosppFxNSAUsTuA8O2tUfmYxWaL5Z.RRVEng8I/xMf2R4mie', 'Comptable', '', 'Comptable', 1);
