import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { loadBudgetsForValidation, submitDecision } from '../../lib/budgetApi.js';
import { budgetData } from '../../domain/budgetMapper.js';
import {
  ensureValidation, enAttenteDe, validateursEtage, VALIDATION_STAGES, VALIDATOR_LABELS
} from '../../domain/validationEngine.js';
import { budgetDecisionSupport } from '../../domain/decisionSupport.js';
import { euro } from '../../domain/format.js';

function Metric({ label, value, sub, color }) {
  return (
    <div style={{ padding: 10, background: 'var(--bg3, var(--bg2))', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 10, color: 'var(--ink65)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 15, fontWeight: 700, color: color || 'var(--ink)' }}>{value}</div>
      {sub ? <div style={{ fontSize: 10, color: 'var(--ink65)', marginTop: 2 }}>{sub}</div> : null}
    </div>
  );
}

function BudgetCard({ item, role, canDecide, parNom, onDecided }) {
  const { agence, v, d } = item;
  const s = budgetDecisionSupport(d);
  const stage = VALIDATION_STAGES.find((x) => x.etage === v.etage);
  const attendus = validateursEtage(v.etage)
    .filter((r) => !(v.decisions[r] && v.decisions[r].decision === 'valide'))
    .map((r) => VALIDATOR_LABELS[r]);
  const txColor = s.txCharge > 115 ? 'var(--orange, #c45300)' : s.txCharge > 100 ? '#FF8F00' : s.txCharge > 85 ? 'var(--accent-blue, #3d6fd6)' : 'var(--green, #2e7d6f)';
  const refus = (v.historique || []).filter((h) => h.type === 'refus');

  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function decide(decision) {
    if (!comment.trim()) { setMsg({ type: 'error', text: 'Un commentaire est obligatoire pour justifier votre décision.' }); return; }
    if (decision === 'refuse' && !window.confirm('Confirmer le refus de ce budget ?\n\nIl retournera au REX pour correction, et toutes les validations déjà faites seront effacées.')) return;
    setBusy(true); setMsg(null);
    try {
      const res = await submitDecision({ agence, role, decision, commentaire: comment, parNom });
      if (!res.ok) { setMsg({ type: 'error', text: res.message }); setBusy(false); return; }
      onDecided(res.message);
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Échec de l\'enregistrement.' });
      setBusy(false);
    }
  }

  return (
    <div style={{ border: '1px solid var(--border)', padding: 16, marginBottom: 14, background: 'var(--card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <b style={{ fontSize: 16 }}>{agence}</b>
        <span style={{ fontSize: 12, color: 'var(--ink65)' }}>Étape : {stage ? stage.label : '—'}</span>
        {s.alertes.length
          ? <span style={{ fontSize: 11, color: 'var(--orange, #c45300)' }}>⚠ {s.alertes.length} alerte(s)</span>
          : <span style={{ fontSize: 11, color: 'var(--green, #2e7d6f)' }}>✓ OK</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 12 }}>
        <Metric label="CA budgété 2027" value={euro(s.caBudget)} sub={s.ca2026 > 0 ? '2026 : ' + euro(s.ca2026) : null} />
        <Metric label="Évolution CA"
          value={s.evoCA !== null ? (s.evoCA > 0 ? '+' : '') + s.evoCA + '%' : '—'}
          sub={s.evoCA !== null ? (s.hasMovements ? 'avec mouvements RH' : 'effectif constant') : 'CA 2026 absent'}
          color={s.evoCA !== null ? (s.evoCA > 10 ? 'var(--orange, #c45300)' : s.evoCA < -5 ? '#FF8F00' : 'var(--green, #2e7d6f)') : 'var(--ink30)'} />
        <Metric label="Taux de charge" value={s.txCharge > 0 ? s.txCharge + '%' : '—'} color={txColor} />
        <Metric label="Effectif" value={s.nbSal + ' (' + s.nbRoulants + ' roul.)'} />
        <Metric label="TXR / Coût h." value={(s.txr || '—') + ' / ' + (s.coutHoraire ? s.coutHoraire.toFixed(1) : '—')} />
      </div>

      {s.alertes.length ? (
        <div style={{ marginBottom: 10 }}>
          {s.alertes.map((al, i) => <span key={i} style={{ display: 'block', fontSize: 11, color: 'var(--orange, #c45300)' }}>⚠ {al}</span>)}
        </div>
      ) : null}

      {refus.length ? (
        <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--ink65)' }}>
          {refus.map((h, i) => <div key={i}>↩ Refus antérieur ({VALIDATOR_LABELS[h.role] || h.role}) : {h.commentaire}</div>)}
        </div>
      ) : null}

      <div style={{ fontSize: 12, color: 'var(--ink65)', marginBottom: canDecide ? 12 : 0 }}>
        En attente de : <b>{attendus.length ? attendus.join(', ') : '—'}</b>
      </div>

      {canDecide ? (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <textarea
            value={comment} onChange={(e) => setComment(e.target.value)} disabled={busy}
            placeholder="Commentaire (obligatoire) — justifiez votre décision"
            rows={2} style={{ width: '100%', marginBottom: 8, fontFamily: 'inherit', fontSize: 13 }}
          />
          {msg ? <div style={{ fontSize: 12, color: 'var(--orange, #c45300)', marginBottom: 8 }}>{msg.text}</div> : null}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="ok" disabled={busy} onClick={() => decide('valide')}>✓ Valider</button>
            <button className="danger" disabled={busy} onClick={() => decide('refuse')}>✕ Refuser</button>
            <button className="warn" disabled={busy} onClick={() => decide('complement')}>Demander un complément</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ValidationScreen() {
  const { profile } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, aValider: [], traites: [], noRegion: false });
  const [toast, setToast] = useState(null);
  const parNom = profile.nom || profile.email || profile.role;

  const load = useCallback(() => {
    let active = { on: true };
    setState((prev) => ({ ...prev, loading: true }));
    loadBudgetsForValidation(profile)
      .then(({ budgets, noRegion }) => {
        if (!active.on) return;
        const role = profile.role;
        const aValider = [], traites = [];
        budgets.forEach((b) => {
          const v = ensureValidation(b.data && b.data.validation);
          const item = { agence: b.agence, v, d: budgetData(b.data), updated: b.updated_at };
          if (enAttenteDe(v, role)) aValider.push(item);
          else if (v.decisions[role] && v.decisions[role].decision) traites.push(item);
        });
        setState({ loading: false, error: null, aValider, traites, noRegion });
      })
      .catch((err) => { if (active.on) setState({ loading: false, error: err.message || 'Erreur de chargement', aValider: [], traites: [], noRegion: false }); });
    return active;
  }, [profile]);

  useEffect(() => {
    const active = load();
    return () => { active.on = false; };
  }, [load]);

  const onDecided = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 5000);
    load();
  }, [load]);

  if (state.loading) return <div className="card"><h2>Budgets à valider</h2><p className="hint">Chargement…</p></div>;
  if (state.error) return <div className="card"><h2>Budgets à valider</h2><p className="hint">Erreur : {state.error}</p></div>;
  if (state.noRegion) return <div className="card"><h2>Budgets à valider</h2><p className="hint">Aucune agence affectée à votre région. Contactez le contrôleur de gestion.</p></div>;

  return (
    <div className="card">
      <h2 style={{ marginBottom: 6 }}>Budgets à valider</h2>
      <p className="hint" style={{ marginBottom: 16 }}>
        Vous validez à l'étape : <b>{(VALIDATION_STAGES.find((s) => s.validateurs.includes(profile.role)) || {}).label || '—'}</b>.
      </p>

      {toast ? (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(46,125,111,.12)', border: '1px solid var(--green, #2e7d6f)', fontSize: 13, color: 'var(--green, #2e7d6f)' }}>
          ✓ {toast}
        </div>
      ) : null}

      <h3 style={{ fontSize: 14, marginBottom: 10 }}>En attente de votre décision ({state.aValider.length})</h3>
      {state.aValider.length
        ? state.aValider.map((it) => <BudgetCard key={it.agence} item={it} role={profile.role} canDecide parNom={parNom} onDecided={onDecided} />)
        : <p className="hint">Aucun budget en attente de votre décision pour le moment.</p>}

      {state.traites.length ? (
        <>
          <h3 style={{ fontSize: 14, margin: '18px 0 10px' }}>Déjà traités par vous ({state.traites.length})</h3>
          {state.traites.map((it) => <BudgetCard key={it.agence} item={it} role={profile.role} canDecide={false} />)}
        </>
      ) : null}
    </div>
  );
}
