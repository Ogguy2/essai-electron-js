/* SICONEX — Audit engine: contrôles de cohérence + piste d'audit. window.AUDIT */
(function () {
  const TODAY = '2026-06-10';
  const RATE = 0.18;
  const d2 = (a, b) => Math.floor((new Date(b) - new Date(a)) / 86400000);
  const fmt = (n) => window.SX.fmt(n);
  const refOf = (e) => e.ref || '(sans n°)';

  /* ---------- contrôles ---------- */
  function checkEquilibre(entries) {
    const items = [];
    entries.forEach(e => {
      let d = 0, c = 0;
      e.lines.forEach(l => { d += +l.debit || 0; c += +l.credit || 0; });
      const ecart = d - c;
      if (Math.abs(ecart) >= 0.5) {
        items.push({ entryId: e.id, ref: refOf(e), journal: e.journal, date: e.date, statut: e.statut,
          message: `Débit ${fmt(d)} ≠ Crédit ${fmt(c)} — écart de ${fmt(Math.abs(ecart))} FCFA`, montant: Math.abs(ecart) });
      } else if (d === 0 && c === 0) {
        items.push({ entryId: e.id, ref: refOf(e), journal: e.journal, date: e.date, statut: e.statut,
          message: 'Écriture sans aucun montant' });
      }
    });
    return items;
  }

  function checkPieceManquante(entries) {
    return entries.filter(e => e.statut === 'validee' && !e.ref).map(e => ({
      entryId: e.id, ref: '(sans n°)', journal: e.journal, date: e.date, statut: e.statut,
      message: 'Écriture validée ne portant aucun numéro de pièce',
    }));
  }

  function checkSequence(entries) {
    const items = [];
    const groups = {};
    entries.filter(e => e.statut === 'validee').forEach(e => {
      const m = /^([A-Z]+)-(\d{4})-(\d+)$/.exec(e.ref || '');
      if (!m) return;
      const key = `${m[1]}-${m[2]}`;
      const g = (groups[key] = groups[key] || { list: [], width: m[3].length });
      g.list.push(parseInt(m[3], 10));
      g.width = Math.max(g.width, m[3].length);
    });
    Object.keys(groups).sort().forEach(key => {
      const { list, width } = groups[key];
      const min = Math.min(...list), max = Math.max(...list);
      const pad = (n) => `${key}-${String(n).padStart(width, '0')}`;
      for (let i = min; i <= max; i++) {
        if (!list.includes(i)) {
          items.push({ entryId: null, ref: pad(i), journal: key.split('-')[0], date: null,
            message: `Pièce ${pad(i)} absente — séquence ${pad(min)} → ${pad(max)}` });
        }
      }
    });
    return items;
  }

  function checkCollectif(entries) {
    const items = [];
    entries.forEach(e => e.lines.forEach(l => {
      const c = window.SX.compteByNum[l.compte];
      if (c && c.collectif && !l.tiers) {
        items.push({ entryId: e.id, ref: refOf(e), journal: e.journal, date: e.date, statut: e.statut,
          message: `Compte collectif ${l.compte} (${c.libelle}) mouvementé sans tiers` });
      }
    }));
    return items;
  }

  function checkTva(entries) {
    const items = [];
    const cls = (num) => { const c = window.SX.compteByNum[num]; return c ? c.classe : null; };
    entries.forEach(e => {
      const tvaColl = e.lines.filter(l => l.compte === '4431').reduce((s, l) => s + (+l.credit || 0) - (+l.debit || 0), 0);
      const baseColl = e.lines.filter(l => cls(l.compte) === 7).reduce((s, l) => s + (+l.credit || 0) - (+l.debit || 0), 0);
      if (tvaColl > 1 && baseColl > 1) {
        const exp = Math.round(baseColl * RATE);
        if (Math.abs(exp - tvaColl) > 1) {
          const taux = (tvaColl / baseColl * 100).toFixed(1);
          items.push({ entryId: e.id, ref: refOf(e), journal: e.journal, date: e.date, statut: e.statut,
            message: `TVA collectée ${fmt(tvaColl)} sur base ${fmt(baseColl)} — attendu ${fmt(exp)} (taux constaté ${taux}%)`, montant: Math.abs(exp - tvaColl) });
        }
      }
      const tvaRec = e.lines.filter(l => l.compte === '4452').reduce((s, l) => s + (+l.debit || 0) - (+l.credit || 0), 0);
      const baseRec = e.lines.filter(l => cls(l.compte) === 6).reduce((s, l) => s + (+l.debit || 0) - (+l.credit || 0), 0);
      if (tvaRec > 1 && baseRec > 1) {
        const exp = Math.round(baseRec * RATE);
        if (Math.abs(exp - tvaRec) > 1) {
          const taux = (tvaRec / baseRec * 100).toFixed(1);
          items.push({ entryId: e.id, ref: refOf(e), journal: e.journal, date: e.date, statut: e.statut,
            message: `TVA récupérable ${fmt(tvaRec)} sur base ${fmt(baseRec)} — attendu ${fmt(exp)} (taux constaté ${taux}%)`, montant: Math.abs(exp - tvaRec) });
        }
      }
    });
    return items;
  }

  function checkTiersBloque(entries) {
    const items = [];
    entries.forEach(e => {
      const codes = [...new Set(e.lines.map(l => l.tiers).filter(Boolean))];
      codes.forEach(code => {
        const t = window.SX.tiersByCode[code];
        if (t && t.bloque) {
          items.push({ entryId: e.id, ref: refOf(e), journal: e.journal, date: e.date, statut: e.statut,
            message: `Mouvement sur le tiers bloqué ${code} — ${t.raison_sociale}` });
        }
      });
    });
    return items;
  }

  function checkBrouillons(entries) {
    const items = [];
    entries.filter(e => e.statut === 'brouillon').forEach(e => {
      const age = d2(e.date, TODAY);
      if (age > 30) {
        items.push({ entryId: e.id, ref: refOf(e), journal: e.journal, date: e.date, statut: e.statut,
          message: `Brouillon en attente de validation depuis ${age} jours` });
      }
    });
    return items;
  }

  function checkEcheances(entries) {
    const items = [];
    window.CALC.echeancier(entries).forEach(r => {
      if (r.bucket === 'non_echu') return;
      const age = d2(r.echeance, TODAY);
      const t = window.SX.tiersByCode[r.tiers];
      items.push({ entryId: r.entry.id, ref: r.ref, journal: r.journal, date: r.echeance,
        message: `Échéance dépassée de ${age} j — ${t ? t.raison_sociale : r.tiers} · ${fmt(r.montant)} FCFA`, montant: r.montant });
    });
    return items;
  }

  function runChecks(entries) {
    return [
      { id: 'equilibre', label: 'Équilibre des écritures', severity: 'bloquant', icon: 'scale',
        description: 'Chaque écriture doit présenter un total débit égal au total crédit.', items: checkEquilibre(entries) },
      { id: 'piece', label: 'Numérotation des pièces validées', severity: 'bloquant', icon: 'receipt',
        description: 'Toute écriture validée doit porter un numéro de pièce.', items: checkPieceManquante(entries) },
      { id: 'sequence', label: 'Continuité des séquences', severity: 'avertissement', icon: 'ledger',
        description: 'Les numéros de pièce doivent se suivre sans rupture, par journal.', items: checkSequence(entries) },
      { id: 'collectif', label: 'Comptes collectifs sans tiers', severity: 'avertissement', icon: 'users',
        description: 'Les comptes clients & fournisseurs doivent être mouvementés avec un tiers.', items: checkCollectif(entries) },
      { id: 'tva', label: 'Cohérence de la TVA', severity: 'avertissement', icon: 'receipt',
        description: 'La TVA doit correspondre au taux légal de 18 % de la base imposable.', items: checkTva(entries) },
      { id: 'tiers_bloque', label: 'Tiers bloqués mouvementés', severity: 'avertissement', icon: 'lock',
        description: 'Aucune écriture ne doit mouvementer un tiers marqué comme bloqué.', items: checkTiersBloque(entries) },
      { id: 'brouillon', label: 'Brouillons anciens', severity: 'info', icon: 'pen',
        description: 'Brouillons en attente de validation depuis plus de 30 jours.', items: checkBrouillons(entries) },
      { id: 'echeance', label: 'Échéances dépassées non lettrées', severity: 'info', icon: 'clock',
        description: 'Créances et dettes échues restant non lettrées à ce jour.', items: checkEcheances(entries) },
    ];
  }

  function summary(entries) {
    const checks = runChecks(entries);
    const s = { bloquant: 0, avertissement: 0, info: 0, total: 0, controls: checks.length, failed: 0, passed: 0 };
    checks.forEach(c => {
      const n = c.items.length;
      s[c.severity] += n; s.total += n;
      if (n > 0) s.failed++; else s.passed++;
    });
    return s;
  }

  /* ---------- piste d'audit ---------- */
  function activityLog(entries) {
    const A = 'Aïcha Koné', J = 'Jean-Marc Brou';
    const ev = []; let i = 1;
    const push = (o) => ev.push({ id: i++, ...o });
    const hasData = entries.length > 0;

    push({ ts: '2026-06-10 07:58', user: A, role: 'Admin', action: 'login', cible: 'Session', ref: '', detail: 'Connexion au poste comptable' });
    push({ ts: '2026-06-09 17:40', user: A, role: 'Admin', action: 'export', cible: 'État', ref: 'Balance', detail: 'Export PDF — Balance générale 2026' });
    push({ ts: '2026-06-09 08:12', user: J, role: 'Comptable', action: 'login', cible: 'Session', ref: '', detail: 'Connexion au poste comptable' });

    if (hasData) {
      push({ ts: '2026-04-02 10:05', user: A, role: 'Admin', action: 'delete', cible: 'Écriture', ref: 'BANQ-2026-0004', detail: 'Suppression — pièce annulée (doublon de frais bancaires)' });
      window.SX.lettrages.forEach(l => push({ ts: `${l.date} 14:30`, user: A, role: 'Admin', action: 'letter', cible: 'Lettrage', ref: l.code,
        detail: `Lettrage ${l.code} — compte ${l.compte}${l.tiers ? ' / ' + l.tiers : ''}` }));
    }

    const ex = window.SX.exercices[0];
    if (ex.clos_at) push({ ts: ex.clos_at, user: A, role: 'Admin', action: 'close', cible: 'Exercice', ref: ex.libelle,
      detail: `Clôture de l’exercice ${ex.libelle} — génération des à-nouveaux` });

    entries.forEach(e => {
      const who = ['ACHT', 'VTE', 'CAI'].includes(e.journal) ? J : A;
      const role = who === J ? 'Comptable' : 'Admin';
      const t = `${e.date} ${String(8 + (e.id % 9)).padStart(2, '0')}:${String((e.id * 13) % 60).padStart(2, '0')}`;
      push({ ts: t, user: who, role, action: 'create', cible: 'Écriture', ref: e.ref || '(brouillon)', detail: `Saisie — ${e.libelle}` });
      if (e.statut === 'validee' && e.validee_at) {
        push({ ts: e.validee_at, user: A, role: 'Admin', action: 'validate', cible: 'Écriture', ref: e.ref, detail: `Validation — ${e.libelle}` });
      }
    });

    return ev.sort((a, b) => b.ts.localeCompare(a.ts) || b.id - a.id);
  }

  window.AUDIT = { runChecks, summary, activityLog, TODAY };
})();
