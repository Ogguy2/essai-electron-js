; Script NSIS personnalisé injecté par electron-builder (auto-inclus depuis
; build/installer.nsh).
;
; Migration HFSQL → SQLite : l'ancienne macro installait le pilote ODBC HFSQL
; (pack docs/ODBC25PACK090f.exe). SQLite est désormais EMBARQUÉ dans l'app
; (better-sqlite3, binaire natif dépaqueté) — aucun pilote système à installer.
; La macro est donc volontairement vide ; on la conserve pour garder le point
; d'extension si un besoin d'installation personnalisée réapparaît.

!macro customInstall
!macroend
