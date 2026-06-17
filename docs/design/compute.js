/* SICONEX — accounting computations from entries. window.CALC */
(function () {
  // flatten validated (and optionally draft) lines for a magasin
  function lines(entries, { includeDraft = false } = {}) {
    const out = [];
    entries.forEach(e => {
      if (e.statut !== 'validee' && !includeDraft) return;
      e.lines.forEach((l, i) => out.push({ ...l, entry: e, ref: e.ref, date: e.date, journal: e.journal, statut: e.statut }));
    });
    return out;
  }

  // balance per compte: returns array sorted by numero
  function balance(entries, opts = {}) {
    const map = {};
    lines(entries, opts).forEach(l => {
      const c = SX.compteByNum[l.compte];
      if (!c) return;
      if (!map[l.compte]) map[l.compte] = { numero: l.compte, libelle: c.libelle, classe: c.classe, debit: 0, credit: 0 };
      map[l.compte].debit += +l.debit || 0;
      map[l.compte].credit += +l.credit || 0;
    });
    return Object.values(map).map(r => {
      const solde = r.debit - r.credit;
      return { ...r, solde, solde_debiteur: solde > 0 ? solde : 0, solde_crediteur: solde < 0 ? -solde : 0 };
    }).sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true }));
  }

  // solde of a single compte numero
  function soldeCompte(entries, numero, opts = {}) {
    let d = 0, c = 0;
    lines(entries, opts).forEach(l => { if (l.compte === numero) { d += +l.debit || 0; c += +l.credit || 0; } });
    return { debit: d, credit: c, solde: d - c };
  }

  // sum of soldes for a set of compte numeros
  function soldeComptes(entries, numeros, opts = {}) {
    return numeros.reduce((s, n) => s + soldeCompte(entries, n, opts).solde, 0);
  }

  // grand livre for a compte (or by tiers code)
  function grandLivre(entries, { compte, tiers } = {}, opts = {}) {
    const rows = lines(entries, opts)
      .filter(l => (compte ? l.compte === compte : true) && (tiers ? l.tiers === tiers : true))
      .sort((a, b) => a.date.localeCompare(b.date) || a.ref.localeCompare(b.ref));
    let cum = 0;
    return rows.map(l => { cum += (+l.debit || 0) - (+l.credit || 0); return { ...l, solde_progressif: cum }; });
  }

  // résultat: charges (cl6), produits (cl7)
  function resultat(entries, opts = {}) {
    const b = balance(entries, opts);
    const charges_detail = b.filter(r => r.classe === 6 && (r.debit - r.credit) !== 0)
      .map(r => ({ numero: r.numero, libelle: r.libelle, montant: r.debit - r.credit }));
    const produits_detail = b.filter(r => r.classe === 7 && (r.credit - r.debit) !== 0)
      .map(r => ({ numero: r.numero, libelle: r.libelle, montant: r.credit - r.debit }));
    const charges = charges_detail.reduce((s, r) => s + r.montant, 0);
    const produits = produits_detail.reduce((s, r) => s + r.montant, 0);
    return { charges, produits, resultat: produits - charges, charges_detail, produits_detail };
  }

  // échéancier: unlettered lines with échéance
  function bucketOf(echeance, today) {
    const e = new Date(echeance), t = new Date(today);
    const days = Math.floor((t - e) / 86400000);
    if (days < 0) return 'non_echu';
    if (days <= 30) return 'j0_30';
    if (days <= 60) return 'j31_60';
    if (days <= 90) return 'j61_90';
    return 'j90_plus';
  }
  function echeancier(entries, { tiers, today = '2026-06-10' } = {}) {
    return lines(entries, {})
      .filter(l => l.echeance && !l.lettrage && (tiers ? l.tiers === tiers : l.tiers))
      .map(l => {
        const montant = (+l.debit || 0) - (+l.credit || 0);
        return { ...l, montant: Math.abs(montant), sens: montant >= 0 ? 'client' : 'fournisseur', bucket: bucketOf(l.echeance, today) };
      })
      .sort((a, b) => a.echeance.localeCompare(b.echeance));
  }

  // lines lettrables for a compte (validated)
  function lettrableLines(entries, compte) {
    return lines(entries, {}).filter(l => l.compte === compte);
  }

  window.CALC = { lines, balance, soldeCompte, soldeComptes, grandLivre, resultat, echeancier, bucketOf, lettrableLines };
})();
