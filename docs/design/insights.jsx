/* SICONEX — Composants de synthèse réutilisables
   (panneaux, barres horizontales, balance âgée, mini-graphe mensuel)
   Restent strictement dans le langage visuel du tableau de bord.
   Exposés via window. */

/* ---- Panneau encadré (réutilise .card / .card-head) ---- */
function Panel({ title, sub, right, children, pad = true, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {(title || right) && (
        <div className="card-head">
          <div>
            {title && <div className="card-title">{title}</div>}
            {sub && <div className="card-sub">{sub}</div>}
          </div>
          {right}
        </div>
      )}
      <div className={pad ? 'card-pad' : ''}>{children}</div>
    </div>
  );
}

/* ---- Liste de barres horizontales (top encours, répartition…) ----
   items: [{ label, value, color, avatar, sub, badge, onClick }] */
function BarList({ items, empty = 'Aucune donnée à afficher.' }) {
  if (!items || !items.length)
    return <div className="muted" style={{ padding: '14px 2px', fontWeight: 600, fontSize: 13 }}>{empty}</div>;
  const max = Math.max(1, ...items.map(i => Math.abs(i.value)));
  return (
    <div className="hbars">
      {items.map((it, i) => {
        const Row = it.onClick ? 'button' : 'div';
        return (
          <Row className={`hbar-row ${it.onClick ? 'hbar-click' : ''}`} key={i} onClick={it.onClick}>
            <div className="hbar-head">
              <span className="hbar-lbl">
                {it.avatar && <span className="avatar" style={{ width: 26, height: 26, fontSize: 11, background: it.color }}>{it.avatar}</span>}
                <span className="hbar-name">{it.label}</span>
                {it.badge}
              </span>
              <span className="amount hbar-val">{SX.fmt(it.value)}</span>
            </div>
            <div className="bar">
              <span style={{ width: `${Math.max((Math.abs(it.value) / max) * 100, 2)}%`, background: it.color }} />
            </div>
            {it.sub && <div className="hbar-sub">{it.sub}</div>}
          </Row>
        );
      })}
    </div>
  );
}

/* ---- Balance âgée : barre segmentée + légende ----
   rows: lignes d'échéancier ({ bucket, montant }) */
const AGE_BUCKETS = [
  { key: 'non_echu', label: 'Non échu', color: 'var(--success)' },
  { key: 'j0_30', label: '0 – 30 j', color: 'var(--info)' },
  { key: 'j31_60', label: '31 – 60 j', color: 'var(--warning)' },
  { key: 'j61_90', label: '61 – 90 j', color: 'oklch(0.64 0.13 48)' },
  { key: 'j90_plus', label: '+ 90 j', color: 'var(--destructive)' },
];
function AgedBalance({ rows, empty = 'Aucune échéance ouverte.' }) {
  const tot = {}; let grand = 0; const cnt = {};
  AGE_BUCKETS.forEach(b => { tot[b.key] = 0; cnt[b.key] = 0; });
  (rows || []).forEach(r => { tot[r.bucket] = (tot[r.bucket] || 0) + r.montant; cnt[r.bucket] = (cnt[r.bucket] || 0) + 1; grand += r.montant; });
  if (!grand) return <div className="muted" style={{ padding: '14px 2px', fontWeight: 600, fontSize: 13 }}>{empty}</div>;
  const visible = AGE_BUCKETS.filter(b => tot[b.key] > 0);
  return (
    <div>
      <div className="agg-bar">
        {visible.map(b => (
          <span key={b.key} style={{ width: `${(tot[b.key] / grand) * 100}%`, background: b.color }} title={`${b.label} · ${SX.fmtCur(tot[b.key])}`} />
        ))}
      </div>
      <div className="agg-legend">
        {AGE_BUCKETS.map(b => (
          <div className="agg-lrow" key={b.key} style={{ opacity: tot[b.key] ? 1 : 0.42 }}>
            <span className="agg-dot" style={{ background: b.color }} />
            <span className="agg-name">{b.label}</span>
            <span className="agg-count">{cnt[b.key]} ligne{cnt[b.key] > 1 ? 's' : ''}</span>
            <span className="amount agg-amt">{tot[b.key] ? SX.fmt(tot[b.key]) : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Mini-graphe à barres verticales (réutilise .chart du dashboard) ----
   data: [{ label, value }] ; fmtVal optionnel */
function MiniBarChart({ data, fmtVal }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="chart" style={{ height: 168 }}>
      {data.map((d, i) => (
        <div className="chart-col" key={i}>
          <div className="chart-bar-wrap">
            <div className="chart-val">{d.value ? (fmtVal ? fmtVal(d.value) : SX.fmt(d.value)) : ''}</div>
            <div className="chart-bar" style={{ height: `${Math.max((d.value / max) * 100, 2)}%` }} />
          </div>
          <div className="chart-lbl">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { Panel, BarList, AgedBalance, MiniBarChart, AGE_BUCKETS });

/* ---- styles ---- */
(function () {
  const css = `
    .ins-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 16px; align-items: start; margin-bottom: 16px; }
    @media (max-width: 1100px){ .ins-grid { grid-template-columns: 1fr; } }
    .ins-grid .stack { gap: 16px; }

    .hbars { display: flex; flex-direction: column; gap: 15px; }
    .hbar-row { width: 100%; text-align: left; background: none; border: none; padding: 0; display: block; }
    .hbar-click { cursor: pointer; border-radius: 8px; transition: background .12s; padding: 6px; margin: -6px; }
    .hbar-click:hover { background: var(--secondary); }
    .hbar-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 7px; }
    .hbar-lbl { display: flex; align-items: center; gap: 9px; min-width: 0; }
    .hbar-name { font-weight: 700; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hbar-val { font-size: 13px; flex: none; }
    .hbar-sub { font-size: 11.5px; font-weight: 600; color: var(--muted-foreground); margin-top: 5px; }

    .agg-bar { display: flex; height: 14px; border-radius: 999px; overflow: hidden; background: var(--secondary); }
    .agg-bar > span { height: 100%; transition: width .35s ease; }
    .agg-bar > span + span { box-shadow: -1px 0 0 var(--card); }
    .agg-legend { display: flex; flex-direction: column; margin-top: 16px; }
    .agg-lrow { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-top: 1px solid var(--border); }
    .agg-lrow:first-child { border-top: none; }
    .agg-dot { width: 11px; height: 11px; border-radius: 3px; flex: none; }
    .agg-name { font-weight: 700; font-size: 13px; }
    .agg-count { font-size: 11.5px; font-weight: 600; color: var(--muted-foreground); }
    .agg-amt { margin-left: auto; font-size: 13px; }

    /* utilisation plafond (cellule tableau) */
    .util-cell { display: inline-flex; flex-direction: column; align-items: flex-end; gap: 6px; min-width: 116px; }
    .util-bar { width: 110px; }

    /* barre de volume sur carte journal */
    .jrn-vol { margin-top: 12px; }
    .jrn-vol-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .jrn-vol-head span { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted-foreground); }
    .jrn-vol-head b { font-size: 13px; }
  `;
  const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
})();
