/* ============================================================
   SICONEX COMPTA — Demo data (SYSCOHADA) + helpers
   Exposes window.SX
   ============================================================ */
(function () {
  // ---------- Sociétés (entité légale) ----------
  // L'identité légale (raison sociale, RCCM, adresse, téléphone) est portée par la
  // société — plus par le magasin. Une société regroupe un ou plusieurs magasins et
  // sert de périmètre de consolidation des états.
  const societes = [
    { id: 1, raison_sociale: 'SICONEX SARL', rccm: 'CI-ABJ-2019-B-12480',
      adresse: 'Bd VGE, Zone 4, Marcory — Abidjan', telephone: '+225 27 21 35 80 14' },
    { id: 2, raison_sociale: 'SICONEX DISTRIBUTION SARL', rccm: 'CI-ABJ-2024-B-04419',
      adresse: 'Rue du Commerce, Yopougon — Abidjan', telephone: '+225 27 23 50 12 00' },
  ];
  const societeById = Object.fromEntries(societes.map(s => [s.id, s]));

  // ---------- Magasins (point de vente — tient la compta) ----------
  // Le magasin ne porte plus d'identité légale : seulement un libellé et son societe_id.
  const magasins = [
    { id: 1, libelle: 'Siconex - Marcory', societe_id: 1 },
    { id: 2, libelle: 'Siconex - Ena', societe_id: 1 },
  ];
  const magasinById = Object.fromEntries(magasins.map(m => [m.id, m]));

  // Identité légale effective d'un magasin (via sa société), avec repli sur le libellé
  // du magasin si la raison sociale est absente — cf. cartouche des états PDF.
  function legalOf(magasin) {
    const s = magasin && societeById[magasin.societe_id];
    return {
      societe: s || null,
      raison_sociale: (s && s.raison_sociale) || (magasin && magasin.libelle) || '—',
      rccm: s ? s.rccm : null,
      adresse: s ? s.adresse : null,
      telephone: s ? s.telephone : null,
    };
  }
  function magasinsOfSociete(societeId) { return magasins.filter(m => m.societe_id === societeId); }

  // ---------- Plan comptable (extrait SYSCOHADA) ----------
  // classe headers + detail accounts
  const classes = {
    1: 'Comptes de ressources durables (capitaux)',
    2: 'Comptes d\u2019actif immobilis\u00e9',
    3: 'Comptes de stocks',
    4: 'Comptes de tiers',
    5: 'Comptes de tr\u00e9sorerie',
    6: 'Comptes de charges',
    7: 'Comptes de produits',
  };
  const comptes = [
    // classe 1
    { numero: '101', libelle: 'Capital social', classe: 1 },
    { numero: '106', libelle: 'R\u00e9serves', classe: 1 },
    { numero: '12', libelle: 'R\u00e9sultat net de l\u2019exercice', classe: 1 },
    { numero: '162', libelle: 'Emprunts banque', classe: 1 },
    // classe 2
    { numero: '2411', libelle: 'Mat\u00e9riel & agencement magasin', classe: 2 },
    { numero: '2444', libelle: 'Mat\u00e9riel informatique', classe: 2 },
    { numero: '245', libelle: 'Mat\u00e9riel de transport', classe: 2 },
    // classe 3
    { numero: '311', libelle: 'Marchandises', classe: 3 },
    // classe 4 — tiers
    { numero: '4011', libelle: 'Fournisseurs', classe: 4, collectif: true, lettrable: true },
    { numero: '4111', libelle: 'Clients', classe: 4, collectif: true, lettrable: true },
    { numero: '421', libelle: 'Personnel, r\u00e9mun\u00e9rations dues', classe: 4, lettrable: true },
    { numero: '4431', libelle: 'TVA factur\u00e9e (collect\u00e9e)', classe: 4 },
    { numero: '4452', libelle: 'TVA r\u00e9cup\u00e9rable sur achats', classe: 4 },
    { numero: '4454', libelle: 'TVA due \u00e0 l\u2019\u00c9tat', classe: 4 },
    { numero: '447', libelle: '\u00c9tat, imp\u00f4ts & taxes', classe: 4, lettrable: true },
    // classe 5 — trésorerie
    { numero: '521', libelle: 'Banque Ecobank CI', classe: 5, lettrable: true },
    { numero: '531', libelle: 'Ch\u00e8ques postaux', classe: 5, lettrable: true },
    { numero: '571', libelle: 'Caisse principale', classe: 5, lettrable: true },
    // classe 6 — charges
    { numero: '601', libelle: 'Achats de marchandises', classe: 6 },
    { numero: '6052', libelle: '\u00c9lectricit\u00e9 (CIE)', classe: 6 },
    { numero: '6053', libelle: 'Eau (SODECI)', classe: 6 },
    { numero: '6181', libelle: 'Transport sur achats', classe: 6 },
    { numero: '622', libelle: 'Locations immobili\u00e8res', classe: 6 },
    { numero: '627', libelle: 'Publicit\u00e9 & marketing', classe: 6 },
    { numero: '631', libelle: 'Frais bancaires', classe: 6 },
    { numero: '641', libelle: 'Imp\u00f4ts & taxes', classe: 6 },
    { numero: '661', libelle: 'Salaires & traitements', classe: 6 },
    { numero: '664', libelle: 'Charges sociales', classe: 6 },
    // classe 7 — produits
    { numero: '701', libelle: 'Ventes de marchandises', classe: 7 },
    { numero: '7071', libelle: 'Ports & emballages factur\u00e9s', classe: 7 },
    { numero: '758', libelle: 'Produits divers de gestion', classe: 7 },
  ];
  comptes.forEach((c, i) => { c.id = i + 1; c.collectif = !!c.collectif; c.lettrable = !!c.lettrable; });
  const compteByNum = Object.fromEntries(comptes.map(c => [c.numero, c]));

  // ---------- Journaux ----------
  const journaux = [
    { id: 1, code: 'VTE', libelle: 'Journal des ventes', type: 'VTE', active: true },
    { id: 2, code: 'ACHT', libelle: 'Journal des achats', type: 'ACHT', active: true },
    { id: 3, code: 'BANQ', libelle: 'Journal de banque', type: 'BANQ', active: true },
    { id: 4, code: 'CAI', libelle: 'Journal de caisse', type: 'CAI', active: true },
    { id: 5, code: 'OD', libelle: 'Op\u00e9rations diverses', type: 'OD', active: true },
    { id: 6, code: 'AN', libelle: '\u00c0-nouveaux', type: 'OD', active: true },
  ];
  const journalByCode = Object.fromEntries(journaux.map(j => [j.code, j]));

  const JOURNAL_TYPES = [
    { code: 'ACHT', libelle: 'Journal des achats' },
    { code: 'VTE', libelle: 'Journal des ventes' },
    { code: 'CAI', libelle: 'Journal de caisse' },
    { code: 'BANQ', libelle: 'Journal de banque' },
    { code: 'TVA', libelle: 'Journal de TVA' },
    { code: 'PAIE', libelle: 'Journal de paie' },
    { code: 'OD', libelle: 'Op\u00e9rations diverses' },
  ];

  // ---------- Tiers ----------
  const tiers = [
    { id: 1, code: 'C001', raison_sociale: 'Pharmacie du Plateau', est_client: true, est_fournisseur: false, telephone: '+225 07 08 11 22 33', adresse: 'Plateau, Abidjan', registre_commerce: 'CI-ABJ-2015-A-3321', plafond_credit: 2000000, bloque: false },
    { id: 2, code: 'C002', raison_sociale: 'Restaurant Le Baobab', est_client: true, est_fournisseur: false, telephone: '+225 05 64 77 80 12', adresse: 'Zone 4, Marcory', registre_commerce: 'CI-ABJ-2018-A-9087', plafond_credit: 1500000, bloque: false },
    { id: 3, code: 'C003', raison_sociale: 'H\u00f4tel Ivoire Services', est_client: true, est_fournisseur: false, telephone: '+225 27 22 48 26 26', adresse: 'Cocody, Abidjan', registre_commerce: 'CI-ABJ-2012-A-1144', plafond_credit: 5000000, bloque: false },
    { id: 4, code: 'C004', raison_sociale: 'Boutique Adjam\u00e9 Centre', est_client: true, est_fournisseur: false, telephone: '+225 01 02 03 04 05', adresse: 'Adjam\u00e9, Abidjan', registre_commerce: 'CI-ABJ-2020-A-7741', plafond_credit: 800000, bloque: true },
    { id: 5, code: 'F001', raison_sociale: 'Grossiste CDCI', est_client: false, est_fournisseur: true, telephone: '+225 27 21 75 00 00', adresse: 'Vridi, Abidjan', registre_commerce: 'CI-ABJ-2005-B-0455', plafond_credit: null, bloque: false },
    { id: 6, code: 'F002', raison_sociale: 'Nestl\u00e9 C\u00f4te d\u2019Ivoire', est_client: false, est_fournisseur: true, telephone: '+225 27 21 23 45 67', adresse: 'Zone industrielle Yopougon', registre_commerce: 'CI-ABJ-1998-B-0012', plafond_credit: null, bloque: false },
    { id: 7, code: 'F003', raison_sociale: 'CIE - \u00c9lectricit\u00e9', est_client: false, est_fournisseur: true, telephone: '+225 27 21 23 33 33', adresse: 'Treichville, Abidjan', registre_commerce: 'CI-ABJ-1990-B-0003', plafond_credit: null, bloque: false },
    { id: 8, code: 'F004', raison_sociale: 'Brasserie SOLIBRA', est_client: false, est_fournisseur: true, telephone: '+225 27 21 75 88 88', adresse: 'Vridi, Abidjan', registre_commerce: 'CI-ABJ-1985-B-0007', plafond_credit: null, bloque: false },
  ];
  const tiersByCode = Object.fromEntries(tiers.map(t => [t.code, t]));

  // ---------- Exercices ----------
  const exercices = [
    { id: 1, libelle: '2025', date_debut: '2025-01-01', date_fin: '2025-12-31', statut: 'cloture', clos_at: '2026-01-15 09:42', clos_par: 'admin' },
    { id: 2, libelle: '2026', date_debut: '2026-01-01', date_fin: '2026-12-31', statut: 'ouvert', clos_at: null, clos_par: null },
  ];

  // ---------- Écritures (magasin Marcory = 1) ----------
  // helper for a line
  function L(numero, debit, credit, opts) {
    opts = opts || {};
    return { compte: numero, tiers: opts.tiers || null, libelle: opts.libelle || '',
      debit: debit || 0, credit: credit || 0, echeance: opts.echeance || null, lettrage: opts.lettrage || null };
  }
  let entries = [
    { ref: 'AN-2026-0001', journal: 'AN', date: '2026-01-01', libelle: '\u00c0-nouveaux \u2014 reports exercice 2025', statut: 'validee', validee_at: '2026-01-15 09:42', lines: [
      L('521', 5000000, 0, { libelle: 'Solde banque au 31/12' }),
      L('571', 800000, 0, { libelle: 'Solde caisse au 31/12' }),
      L('311', 3200000, 0, { libelle: 'Stock marchandises' }),
      L('2411', 4000000, 0, { libelle: 'Mat\u00e9riel & agencement' }),
      L('101', 0, 10000000, { libelle: 'Capital social' }),
      L('106', 0, 2000000, { libelle: 'R\u00e9serves' }),
      L('162', 0, 1000000, { libelle: 'Emprunt bancaire' }),
    ]},
    { ref: 'VTE-2026-0001', journal: 'VTE', date: '2026-01-08', libelle: 'Facture FV-1042 \u2014 Pharmacie du Plateau', statut: 'validee', validee_at: '2026-01-08 16:20', lines: [
      L('4111', 1180000, 0, { tiers: 'C001', libelle: 'Pharmacie du Plateau', echeance: '2026-02-07', lettrage: 'A' }),
      L('701', 0, 1000000, { libelle: 'Ventes marchandises' }),
      L('4431', 0, 180000, { libelle: 'TVA collect\u00e9e 18%' }),
    ]},
    { ref: 'VTE-2026-0002', journal: 'VTE', date: '2026-01-15', libelle: 'Facture FV-1043 \u2014 Restaurant Le Baobab', statut: 'validee', validee_at: '2026-01-15 11:05', lines: [
      L('4111', 590000, 0, { tiers: 'C002', libelle: 'Restaurant Le Baobab', echeance: '2026-02-14' }),
      L('701', 0, 500000, { libelle: 'Ventes marchandises' }),
      L('4431', 0, 90000, { libelle: 'TVA collect\u00e9e 18%' }),
    ]},
    { ref: 'ACHT-2026-0001', journal: 'ACHT', date: '2026-01-10', libelle: 'Facture FA-7781 \u2014 Grossiste CDCI', statut: 'validee', validee_at: '2026-01-10 09:30', lines: [
      L('601', 800000, 0, { libelle: 'Achat marchandises' }),
      L('4452', 144000, 0, { libelle: 'TVA r\u00e9cup\u00e9rable 18%' }),
      L('4011', 0, 944000, { tiers: 'F001', libelle: 'Grossiste CDCI', echeance: '2026-02-09', lettrage: 'B' }),
    ]},
    { ref: 'BANQ-2026-0001', journal: 'BANQ', date: '2026-01-22', libelle: 'R\u00e8glement client Pharmacie (vir.)', statut: 'validee', validee_at: '2026-01-22 14:10', lines: [
      L('521', 1180000, 0, { libelle: 'Virement re\u00e7u' }),
      L('4111', 0, 1180000, { tiers: 'C001', libelle: 'Pharmacie du Plateau', lettrage: 'A' }),
    ]},
    { ref: 'BANQ-2026-0002', journal: 'BANQ', date: '2026-01-25', libelle: 'R\u00e8glement fournisseur CDCI (vir.)', statut: 'validee', validee_at: '2026-01-25 10:00', lines: [
      L('4011', 944000, 0, { tiers: 'F001', libelle: 'Grossiste CDCI', lettrage: 'B' }),
      L('521', 0, 944000, { libelle: 'Virement \u00e9mis' }),
    ]},
    { ref: 'ACHT-2026-0002', journal: 'ACHT', date: '2026-02-03', libelle: 'Facture \u00e9lectricit\u00e9 CIE \u2014 janvier', statut: 'validee', validee_at: '2026-02-03 08:50', lines: [
      L('6052', 85000, 0, { libelle: '\u00c9lectricit\u00e9 magasin' }),
      L('4452', 15300, 0, { libelle: 'TVA r\u00e9cup\u00e9rable' }),
      L('4011', 0, 100300, { tiers: 'F003', libelle: 'CIE', echeance: '2026-02-20' }),
    ]},
    { ref: 'CAI-2026-0001', journal: 'CAI', date: '2026-02-05', libelle: 'Recette caisse \u2014 ventes comptant', statut: 'validee', validee_at: '2026-02-05 19:30', lines: [
      L('571', 354000, 0, { libelle: 'Esp\u00e8ces encaiss\u00e9es' }),
      L('701', 0, 300000, { libelle: 'Ventes comptant' }),
      L('4431', 0, 54000, { libelle: 'TVA collect\u00e9e 18%' }),
    ]},
    { ref: 'OD-2026-0001', journal: 'OD', date: '2026-02-28', libelle: 'Paie du personnel \u2014 f\u00e9vrier', statut: 'validee', validee_at: '2026-02-28 17:00', lines: [
      L('661', 1200000, 0, { libelle: 'Salaires bruts' }),
      L('664', 240000, 0, { libelle: 'Charges sociales CNPS' }),
      L('421', 0, 1200000, { libelle: 'Net \u00e0 payer personnel' }),
      L('447', 0, 240000, { libelle: 'Cotisations dues' }),
    ]},
    { ref: 'BANQ-2026-0003', journal: 'BANQ', date: '2026-03-02', libelle: 'Paiement des salaires f\u00e9vrier', statut: 'validee', validee_at: '2026-03-02 09:15', lines: [
      L('421', 1200000, 0, { libelle: 'R\u00e8glement net' }),
      L('521', 0, 1200000, { libelle: 'Virement salaires' }),
    ]},
    { ref: 'VTE-2026-0003', journal: 'VTE', date: '2026-03-08', libelle: 'Facture FV-1051 \u2014 H\u00f4tel Ivoire Services', statut: 'validee', validee_at: '2026-03-08 15:40', lines: [
      L('4111', 826000, 0, { tiers: 'C003', libelle: 'H\u00f4tel Ivoire Services', echeance: '2026-04-07' }),
      L('701', 0, 700000, { libelle: 'Ventes marchandises' }),
      L('4431', 0, 126000, { libelle: 'TVA collect\u00e9e 18%' }),
    ]},
    { ref: 'ACHT-2026-0003', journal: 'ACHT', date: '2026-03-12', libelle: 'Facture FA-2210 \u2014 Nestl\u00e9 CI', statut: 'validee', validee_at: '2026-03-12 10:25', lines: [
      L('601', 1500000, 0, { libelle: 'Achat marchandises' }),
      L('4452', 270000, 0, { libelle: 'TVA r\u00e9cup\u00e9rable 18%' }),
      L('4011', 0, 1770000, { tiers: 'F002', libelle: 'Nestl\u00e9 CI', echeance: '2026-04-11' }),
    ]},
    { ref: 'BANQ-2026-0005', journal: 'BANQ', date: '2026-03-31', libelle: 'Frais de tenue de compte', statut: 'validee', validee_at: '2026-03-31 23:00', lines: [
      L('631', 12500, 0, { libelle: 'Commissions bancaires' }),
      L('521', 0, 12500, { libelle: 'Pr\u00e9l\u00e8vement banque' }),
    ]},
    { ref: 'CAI-2026-0002', journal: 'CAI', date: '2026-04-12', libelle: 'Recette caisse \u2014 ventes comptant', statut: 'validee', validee_at: '2026-04-12 19:45', lines: [
      L('571', 1770000, 0, { libelle: 'Esp\u00e8ces encaiss\u00e9es' }),
      L('701', 0, 1500000, { libelle: 'Ventes comptant' }),
      L('4431', 0, 270000, { libelle: 'TVA collect\u00e9e 18%' }),
    ]},
    { ref: 'CAI-2026-0003', journal: 'CAI', date: '2026-05-20', libelle: 'Recette caisse \u2014 ventes comptant', statut: 'validee', validee_at: '2026-05-20 20:10', lines: [
      L('571', 1416000, 0, { libelle: 'Esp\u00e8ces encaiss\u00e9es' }),
      L('701', 0, 1200000, { libelle: 'Ventes comptant' }),
      L('4431', 0, 216000, { libelle: 'TVA collect\u00e9e 18%' }),
    ]},
    // brouillons
    { ref: 'VTE-2026-0004', journal: 'VTE', date: '2026-06-09', libelle: 'Facture FV-1062 \u2014 Boutique Adjam\u00e9', statut: 'brouillon', validee_at: null, lines: [
      L('4111', 472000, 0, { tiers: 'C004', libelle: 'Boutique Adjam\u00e9 Centre', echeance: '2026-07-09' }),
      L('701', 0, 400000, { libelle: 'Ventes marchandises' }),
      L('4431', 0, 72000, { libelle: 'TVA collect\u00e9e 18%' }),
    ]},
    { ref: '', journal: 'OD', date: '2026-03-12', libelle: 'Loyer magasin \u2014 mars (\u00e0 saisir)', statut: 'brouillon', validee_at: null, lines: [
      L('622', 350000, 0, { libelle: 'Loyer mensuel' }),
      L('521', 0, 350000, { libelle: '\u00e0 r\u00e9gler' }),
    ]},
    // — anomalies de démonstration (brouillons : exclus des états validés) —
    { ref: 'ACHT-2026-0004', journal: 'ACHT', date: '2026-06-05', libelle: 'Facture FA-3380 \u2014 Brasserie SOLIBRA', statut: 'brouillon', validee_at: null, lines: [
      L('601', 900000, 0, { libelle: 'Achat boissons' }),
      L('4452', 162000, 0, { libelle: 'TVA r\u00e9cup\u00e9rable 18%' }),
      L('4011', 0, 1052000, { tiers: 'F004', libelle: 'SOLIBRA', echeance: '2026-07-05' }),
    ]},
    { ref: 'VTE-2026-0005', journal: 'VTE', date: '2026-06-07', libelle: 'Facture FV-1063 \u2014 vente au comptoir', statut: 'brouillon', validee_at: null, lines: [
      L('4111', 708000, 0, { libelle: 'Client divers (\u00e0 affecter)' }),
      L('701', 0, 600000, { libelle: 'Ventes marchandises' }),
      L('4431', 0, 108000, { libelle: 'TVA collect\u00e9e 18%' }),
    ]},
    { ref: 'OD-2026-0002', journal: 'OD', date: '2026-06-02', libelle: 'Campagne publicitaire \u2014 r\u00e9gularisation', statut: 'brouillon', validee_at: null, lines: [
      L('627', 500000, 0, { libelle: 'Publicit\u00e9 & marketing' }),
      L('4452', 80000, 0, { libelle: 'TVA r\u00e9cup\u00e9rable' }),
      L('4011', 0, 580000, { tiers: 'F002', libelle: 'Nestl\u00e9 CI' }),
    ]},
  ];

  // ---------- Écritures (magasin Ena = 2) ----------
  let entries2 = [
    { ref: 'AN-2026-0001', journal: 'AN', date: '2026-01-01', libelle: '\u00c0-nouveaux \u2014 reports exercice 2025', statut: 'validee', validee_at: '2026-01-15 10:10', lines: [
      L('521', 2600000, 0, { libelle: 'Solde banque au 31/12' }),
      L('571', 400000, 0, { libelle: 'Solde caisse au 31/12' }),
      L('311', 1500000, 0, { libelle: 'Stock marchandises' }),
      L('101', 0, 4000000, { libelle: 'Capital social' }),
      L('106', 0, 500000, { libelle: 'R\u00e9serves' }),
    ]},
    { ref: 'VTE-2026-0001', journal: 'VTE', date: '2026-01-12', libelle: 'Facture FV-2001 \u2014 H\u00f4tel Ivoire Services', statut: 'validee', validee_at: '2026-01-12 12:00', lines: [
      L('4111', 944000, 0, { tiers: 'C003', libelle: 'H\u00f4tel Ivoire Services', echeance: '2026-02-11' }),
      L('701', 0, 800000, { libelle: 'Ventes marchandises' }),
      L('4431', 0, 144000, { libelle: 'TVA collect\u00e9e 18%' }),
    ]},
    { ref: 'CAI-2026-0001', journal: 'CAI', date: '2026-02-10', libelle: 'Recette caisse \u2014 ventes comptant', statut: 'validee', validee_at: '2026-02-10 20:00', lines: [
      L('571', 1062000, 0, { libelle: 'Esp\u00e8ces encaiss\u00e9es' }),
      L('701', 0, 900000, { libelle: 'Ventes comptant' }),
      L('4431', 0, 162000, { libelle: 'TVA collect\u00e9e 18%' }),
    ]},
    { ref: 'ACHT-2026-0001', journal: 'ACHT', date: '2026-02-15', libelle: 'Facture FA-5500 \u2014 Nestl\u00e9 CI', statut: 'validee', validee_at: '2026-02-15 09:00', lines: [
      L('601', 700000, 0, { libelle: 'Achat marchandises' }),
      L('4452', 126000, 0, { libelle: 'TVA r\u00e9cup\u00e9rable 18%' }),
      L('4011', 0, 826000, { tiers: 'F002', libelle: 'Nestl\u00e9 CI', echeance: '2026-03-17' }),
    ]},
    { ref: 'OD-2026-0001', journal: 'OD', date: '2026-02-28', libelle: 'Paie du personnel \u2014 f\u00e9vrier', statut: 'validee', validee_at: '2026-02-28 17:30', lines: [
      L('661', 600000, 0, { libelle: 'Salaires bruts' }),
      L('664', 120000, 0, { libelle: 'Charges sociales CNPS' }),
      L('421', 0, 600000, { libelle: 'Net \u00e0 payer personnel' }),
      L('447', 0, 120000, { libelle: 'Cotisations dues' }),
    ]},
    { ref: 'BANQ-2026-0001', journal: 'BANQ', date: '2026-03-05', libelle: 'Frais de tenue de compte', statut: 'validee', validee_at: '2026-03-05 23:00', lines: [
      L('631', 8000, 0, { libelle: 'Commissions bancaires' }),
      L('521', 0, 8000, { libelle: 'Pr\u00e9l\u00e8vement banque' }),
    ]},
  ];
  entries.forEach((e, i) => { e.id = i + 1; e.magasin = 1; });
  entries2.forEach((e, i) => { e.id = entries.length + i + 1; e.magasin = 2; });
  entries = entries.concat(entries2);

  // ---------- Lettrages ----------
  const lettrages = [
    { id: 1, code: 'A', compte: '4111', tiers: 'C001', statut: 'lettre', date: '2026-01-22' },
    { id: 2, code: 'B', compte: '4011', tiers: 'F001', statut: 'lettre', date: '2026-01-25' },
  ];

  // ---------- Helpers ----------
  function fmt(n) {
    if (n === null || n === undefined || n === '' ) return '\u2014';
    const neg = n < 0; n = Math.abs(Math.round(n));
    const s = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
    return (neg ? '-' : '') + s;
  }
  function fmtCur(n) { return fmt(n) + ' FCFA'; }
  const MONTHS = ['janv.','f\u00e9vr.','mars','avr.','mai','juin','juil.','ao\u00fbt','sept.','oct.','nov.','d\u00e9c.'];
  function fmtDate(iso) {
    if (!iso) return '\u2014';
    const [y, m, d] = iso.slice(0,10).split('-');
    return `${d}/${m}/${y}`;
  }
  function fmtDateLong(iso) {
    if (!iso) return '\u2014';
    const [y, m, d] = iso.slice(0,10).split('-');
    return `${parseInt(d,10)} ${MONTHS[parseInt(m,10)-1]} ${y}`;
  }
  function entryTotals(e) {
    let d = 0, c = 0; e.lines.forEach(l => { d += +l.debit || 0; c += +l.credit || 0; });
    return { debit: d, credit: c, balanced: Math.abs(d - c) < 0.005 && d > 0 };
  }

  window.SX = {
    societes, societeById, magasins, magasinById, legalOf, magasinsOfSociete,
    classes, comptes, compteByNum, journaux, journalByCode, JOURNAL_TYPES,
    tiers, tiersByCode, exercices, entries, lettrages,
    fmt, fmtCur, fmtDate, fmtDateLong, entryTotals,
    user: { name: 'A\u00efcha Kon\u00e9', username: 'admin', email: 'a.kone@siconex.ci', role: 'Admin' },
  };
})();
