/* SICONEX — shared UI primitives. Exposes globals via window. */
const { useState, useEffect, useRef, useCallback, createContext, useContext } = React;

function Badge({ tone = 'neutral', dot, children, style }) {
  return (
    <span className={`badge badge-${tone} ${dot ? 'badge-dot' : ''}`} style={style}>{children}</span>
  );
}

function StatutBadge({ statut }) {
  if (statut === 'validee') return <Badge tone="success" dot>Validée</Badge>;
  if (statut === 'brouillon') return <Badge tone="warning" dot>Brouillon</Badge>;
  if (statut === 'cloture') return <Badge tone="neutral" dot>Clôturé</Badge>;
  if (statut === 'ouvert') return <Badge tone="success" dot>Ouvert</Badge>;
  if (statut === 'lettre') return <Badge tone="success" dot>Lettré</Badge>;
  if (statut === 'partiel') return <Badge tone="warning" dot>Partiel</Badge>;
  return <Badge>{statut}</Badge>;
}

/* ---- Click-outside hook ---- */
function useClickOutside(onClose) {
  const ref = useRef(null);
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  return ref;
}

/* ---- Dropdown ---- */
function Dropdown({ trigger, children, align = 'left', width }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)}>{trigger}</div>
      {open && (
        <div className="menu" style={{ top: 'calc(100% + 6px)', [align]: 0, width, minWidth: width }}
          onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ---- Modal ---- */
const MODAL_IC_TONE = { primary: 'ic-soft-orange', success: 'ic-soft-green', danger: 'ic-soft-red', warning: 'ic-soft-amber', info: 'ic-soft-blue', neutral: 'ic-soft-neutral' };
function Modal({ title, sub, eyebrow, icon, tone = 'primary', onClose, children, footer, maxWidth = 560 }) {
  useEffect(() => {
    function esc(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-head">
          {icon && <span className={`modal-ic ${MODAL_IC_TONE[tone] || 'ic-soft-orange'}`}><Icon name={icon} /></span>}
          <div className="modal-head-text">
            {eyebrow && <div className="modal-eyebrow">{eyebrow}</div>}
            <div className="modal-title">{title}</div>
            {sub && <div className="modal-sub">{sub}</div>}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fermer"><Icon name="x" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---- Confirm dialog ---- */
function ConfirmDialog({ title, message, confirmLabel = 'Confirmer', tone = 'primary', icon = 'alert', eyebrow, onConfirm, onClose }) {
  return (
    <Modal title={title} eyebrow={eyebrow} icon={icon} tone={tone === 'danger' ? 'danger' : tone} onClose={onClose} maxWidth={440}
      footer={<>
        <button className="btn btn-outline" onClick={onClose}>Annuler</button>
        <button className={`btn btn-${tone}`} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
      </>}>
      <p style={{ margin: 0, fontWeight: 500, fontSize: 14, lineHeight: 1.55, color: 'var(--secondary-foreground)' }}>{message}</p>
    </Modal>
  );
}

/* ---- Toast system ---- */
const ToastCtx = createContext(null);
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3400);
  }, []);
  const icon = { success: 'checkCircle', err: 'alert', info: 'info' };
  const iccls = { success: 'ic-soft-green', err: 'ic-soft-red', info: 'ic-soft-orange' };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <div className={`toast-ic ${iccls[t.type]}`}><Icon name={icon[t.type]} size={17} /></div>
            <div className="toast-msg">{t.msg}</div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
function useToast() { return useContext(ToastCtx); }

/* ---- KPI card ---- */
function Kpi({ label, value, cur, icon, tone = 'neutral', foot, footIcon, footTone }) {
  return (
    <div className="card kpi">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className={`kpi-ic ic-soft-${tone}`}><Icon name={icon} /></span>
      </div>
      <div className="kpi-val">{value}{cur && <span className="cur">{cur}</span>}</div>
      {foot && <div className="kpi-foot" style={footTone ? { color: `var(--${footTone})` } : null}>
        {footIcon && <Icon name={footIcon} size={14} />}{foot}
      </div>}
    </div>
  );
}

/* ---- Page header ---- */
function PageHead({ title, desc, children }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-h1">{title}</h1>
        {desc && <p className="page-desc">{desc}</p>}
      </div>
      {children && <div className="row" style={{ gap: 10 }}>{children}</div>}
    </div>
  );
}

/* ---- Empty state ---- */
function Empty({ icon = 'folder', title, children }) {
  return (
    <div className="empty">
      <div className="empty-ic"><Icon name={icon} /></div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

/* ---- Amount cell ---- */
function Amount({ value, showZero, signed, className = '' }) {
  if (!value && !showZero) return <span className="muted">—</span>;
  const cls = signed ? (value < 0 ? 'amount-neg' : value > 0 ? 'amount-pos' : 'amount-zero') : '';
  return <span className={`amount ${cls} ${className}`}>{SX.fmt(value)}</span>;
}

Object.assign(window, {
  Badge, StatutBadge, useClickOutside, Dropdown, Modal, ConfirmDialog,
  ToastProvider, useToast, Kpi, PageHead, Empty, Amount,
  useState, useEffect, useRef, useCallback,
});
