; Script NSIS personnalisé injecté par electron-builder (nsis.include).
; Objectif : embarquer le pack driver ODBC HFSQL (docs/ODBC25PACK090f.exe) dans
; l'installeur et le proposer si aucun driver HFSQL n'est déjà enregistré.
; L'installeur tourne déjà en élévation admin (perMachine:true), donc le pack ODBC
; — qui enregistre un driver système — hérite des droits nécessaires.

!macro customInstall
  ; --- Détection d'un driver ODBC HFSQL déjà installé (vue registre 64 bits) ---
  SetRegView 64
  ReadRegStr $0 HKLM "SOFTWARE\ODBC\ODBCINST.INI\ODBC Drivers" "HFSQL"
  SetRegView lastused

  ; Cas 1 — un driver HFSQL existe déjà : on informe et on saute l'installation.
  StrCmp $0 "" hfsql_absent 0
    MessageBox MB_OK|MB_ICONINFORMATION \
      "Driver ODBC HFSQL : déjà installé sur ce poste.$\nAucune installation supplémentaire n'est nécessaire."
    Goto hfsql_done

  hfsql_absent:
  ; Driver absent : on propose de l'installer.
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Le driver ODBC HFSQL ne semble pas installé sur ce poste.$\n$\nSicoCompte en a besoin pour se connecter à la base de données.$\n$\nVoulez-vous l'installer maintenant ?" \
    IDNO hfsql_refuse

  ; Extrait le pack ODBC embarqué vers le dossier temporaire NSIS ($PLUGINSDIR,
  ; auto-nettoyé) puis le lance et attend la fin de son installeur.
  DetailPrint "Installation du driver ODBC HFSQL..."
  SetOutPath "$PLUGINSDIR"
  File "${PROJECT_DIR}\docs\ODBC25PACK090f.exe"
  ClearErrors
  ExecWait '"$PLUGINSDIR\ODBC25PACK090f.exe"' $1

  ; Cas erreur de lancement (impossible d'exécuter le processus).
  IfErrors 0 hfsql_launched
    MessageBox MB_OK|MB_ICONSTOP \
      "Driver ODBC HFSQL : échec du lancement de l'installeur du driver.$\nVous pourrez l'installer manuellement plus tard."
    Goto hfsql_done

  hfsql_launched:
  ; Cas 2 — installeur terminé avec succès (code de sortie 0).
  StrCmp $1 "0" 0 hfsql_err
    MessageBox MB_OK|MB_ICONINFORMATION \
      "Driver ODBC HFSQL : installé avec succès."
    Goto hfsql_done

  ; Cas 3 — installeur terminé avec un code d'erreur.
  hfsql_err:
    MessageBox MB_OK|MB_ICONEXCLAMATION \
      "Driver ODBC HFSQL : l'installation s'est terminée avec un code inattendu ($1).$\nVérifiez le driver ; au besoin, relancez son installation manuellement."
    Goto hfsql_done

  hfsql_refuse:
    MessageBox MB_OK|MB_ICONINFORMATION \
      "Driver ODBC HFSQL : installation ignorée.$\nSicoCompte ne pourra pas se connecter à la base tant que le driver n'est pas installé."

  hfsql_done:
!macroend
