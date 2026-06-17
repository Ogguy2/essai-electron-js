# Architecture — Application desktop multi-poste

> **Mise à jour 2026-06-17** : ce document remplace l'ancienne architecture
> « Laravel + Next.js + synchro HFSQL legacy par magasin via Tailscale ».
> Voir le pivot dans [`CAHIER_DES_CHARGES.md`](./CAHIER_DES_CHARGES.md) (§ pivot + §5).

## Vue d'ensemble

| Couche | Technologie | Rôle |
|--------|-------------|------|
| Interface (renderer) | Electron + Vite + TypeScript | Écrans, formulaires, affichage des états |
| Cœur applicatif (main) | Electron / Node.js (TypeScript) | Logique comptable, permissions, contexte société/magasin, accès données |
| Accès données | ODBC (pilote HFSQL) | Connexion directe au serveur HFSQL |
| Base de données | HFSQL Client/Serveur | Source de vérité unique, partagée par tous les postes |

L'application **est** le maître de la donnée : elle lit et écrit directement dans une **base HFSQL neuve**. Pas d'API, pas d'ETL, pas de second SGBD.

---

## Topologie réseau

```
   Poste 1 (Electron)     Poste 2 (Electron)     Poste N (Electron)
          │                       │                      │
          └───────────────┬───────┴──────────────┬───────┘
                          ODBC :4900 (connexion directe)
                                  │
                      ┌───────────▼────────────┐
                      │  Serveur HFSQL central  │   ← base unique partagée
                      └─────────────────────────┘
```

- Plusieurs **postes clients Electron** se connectent au **même serveur HFSQL central**.
- Le cloisonnement multi-magasins est **logique** (colonne `magasin_id`), pas physique : une seule base.
- Si des postes sont **physiquement distants** du serveur central (magasins éloignés), la connectivité peut passer par un **VPN** (ex. Tailscale en subnet router). C'est un **détail de déploiement optionnel**, à trancher selon l'implantation réelle.

---

## Architecture interne Electron

```
┌──────────────────────────────────────────────────────────────┐
│ RENDERER (UI)                                                  │
│  src/renderer.ts (+ écrans)                                    │
│  - aucun accès Node ni base                                    │
│  - appelle window.api.<module>.<action>(...)                   │
└───────────────────────────┬──────────────────────────────────┘
                            │ contextBridge (preload)
┌───────────────────────────▼──────────────────────────────────┐
│ PRELOAD  (src/preload.ts)                                      │
│  - expose une API typée et restreinte au renderer              │
│  - relaie chaque appel en IPC vers le main                     │
└───────────────────────────┬──────────────────────────────────┘
                            │ ipcRenderer.invoke / ipcMain.handle
┌───────────────────────────▼──────────────────────────────────┐
│ MAIN  (src/main.ts + services)                                 │
│  - handlers IPC  ("<module>:<action>")                          │
│  - services métier : auth, societes, magasins, comptes,        │
│    journaux, ecritures, lettrage, consolidation, reporting,    │
│    audit                                                        │
│  - vérification des permissions (rôle Admin/Comptable)          │
│  - contexte société/magasin courant (état applicatif)          │
│  - couche d'accès données ODBC (UNIQUE point de contact BDD)    │
└───────────────────────────┬──────────────────────────────────┘
                            │ ODBC :4900
                  ┌──────────▼───────────┐
                  │  Serveur HFSQL central │
                  └────────────────────────┘
```

**Règle d'or** : seul le processus **main** touche la base. Le renderer ne fait que de l'IPC via le preload. `contextIsolation` activé, `nodeIntegration` désactivé.

---

## Connexion HFSQL via ODBC (depuis Node)

> 🆕 Esquisse à valider. Nécessite le **pilote ODBC HFSQL** (PC SOFT) installé sur le poste, et le paquet npm **`odbc`**.

### Configuration (processus principal uniquement)

Les identifiants ne sont **jamais** exposés au renderer. Lecture via variables d'environnement / fichier de config local du `main` :

```env
# Serveur HFSQL central
HFSQL_HOST=192.168.1.10        # ou IP VPN si poste distant
HFSQL_PORT=4900
HFSQL_DB=sicocompte
HFSQL_USER=admin
HFSQL_PASS=
```

### Couche d'accès (esquisse TypeScript, processus principal)

```ts
import odbc from 'odbc';

let pool: odbc.Pool | null = null;

function dsn(): string {
  return [
    'DRIVER={HFSQL};',
    `Server Name=${process.env.HFSQL_HOST};`,
    `Server Port=${process.env.HFSQL_PORT ?? '4900'};`,
    `Database=${process.env.HFSQL_DB};`,
    `UID=${process.env.HFSQL_USER};`,
    `PWD=${process.env.HFSQL_PASS ?? ''};`,
  ].join('');
}

export async function db(): Promise<odbc.Pool> {
  if (!pool) pool = await odbc.pool(dsn());
  return pool;
}

// Exemple d'usage dans un service métier
export async function listMagasins(societeId: number) {
  const conn = await db();
  return conn.query('SELECT * FROM magasins WHERE societe_id = ?', [societeId]);
}
```

Les **requêtes sont toujours paramétrées** (jamais de concaténation de valeurs) pour éviter l'injection.

---

## Création & initialisation de la base (base neuve)

> ❓ Mécanisme exact à définir (cf. CDC §5.4). Pistes :
> - **Scripts SQL de création de schéma** (tables `societes`, `magasins`, `comptes`, … `audit_logs`) joués à l'initialisation, **idempotents**.
> - **Seeder SYSCOHADA** : lit [`compte.json`](./compte.json) et insère le plan comptable principal lors de la création d'un magasin.
> - Éventuel petit **runner de migrations « maison »** (table de versions de schéma) si le schéma doit évoluer dans le temps.

---

## Sécurité (rappel)

- Identifiants HFSQL côté `main` uniquement (jamais dans le renderer ni dans l'asar exposé à l'UI).
- `contextIsolation: true`, `nodeIntegration: false`, accès via `preload`/IPC.
- Fuses Electron Forge déjà actives (cf. `forge.config.ts`) : `OnlyLoadAppFromAsar`, `EnableCookieEncryption`, désactivation de `RunAsNode` / inspection Node, intégrité ASAR.
- 🟡 À définir : sauvegarde du serveur HFSQL, chiffrement au repos, stratégie de mise à jour des postes.
