import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { loadBudgetsForValidation, submitDecision } from '../../lib/budgetApi.js';
import { budgetData } from '../../domain/budgetMapper.js';
import {
  ensureValidation, enAttenteDe, VALIDATION_STAGES, VALIDATOR_LABELS
} from '../../domain/validationEngine.js';
import { ficheDecisions, lignesFiche } from '../../domain/ficheDecisions.js';
import { euro, pct } from '../../domain/format.js';
import { useNav } from '../../context/NavContext.jsx';
import { toast as toaster } from '../Toast.jsx';

function BudgetCard({ item, role, parNom, onDecided, autres, onConsulter }) {
  const { agence, v, d } = item;
  const f = ficheDecisions(d, autres);
  const lignes = lignesFiche(f);
  const dernierRefus = (v.historique || []).filter((h) => h.type === 'refus').pop();
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const icone = { warn: '⚠', choix: '◆', ok: '✓', neutre: '·' };

  async function decide(decision) {
    if (!comment.trim()) { setMsg('Un commentaire est obligatoire.'); return; }
    if (decision === 'refuse' && !window.confirm('Confirmer le refus de ce budget ?\n\nIl retournera au REX pour correction, et toutes les validations déjà faites seront effacées.')) return;
    setBusy(true); setMsg(null);
    try {
      const res = await submitDecision({ agence, role, decision, commentaire: comment, parNom });
      if (!res.ok) { setMsg(res.message); setBusy(false); return; }
      onDecided(res.message, res.refus ? 'info' : 'success');
    } catch (err) { setMsg(err.message || 'Échec de l\'enregistrement.'); setBusy(false); }
  }

  return (
    <div className="valCard" data-testid={'val-card-' + agence}>
      <div className="valCardHead">
        <div className="valCardTitle">{agence} 2027</div>
        <button className="valCardDetail" data-testid="voir-ecrans" onClick={() => onConsulter(agence)}>▸ Voir tous les écrans</button>
      </div>
      <div className="ficheDepart">
        <span className="ficheDepartLabel">Point de départ</span>{' '}
        {f.histCA > 0 ? <>CA réalisé 2026 : <b>{euro(f.histCA)}</b> · </> : null}
        <b>{f.nbRoulants}</b> salariés roulants · activité {f.activites.length ? f.activites.join(' + ') : 'sanitaire'}
      </div>
      <div className="ficheLignes">
        {lignes.map((l) => (
          <div className="ficheLigne" key={l.titre}>
            <div className="ficheLigneTitre">{l.titre}</div>
            <div className="ficheLigneVal" dangerouslySetInnerHTML={{ __html: l.valeur }} />
            {l.verdict ? <div className={'ficheVerdict ' + l.type}><span>{icone[l.type]}</span> {l.verdict}</div> : null}
          </div>
        ))}
      </div>
      <div className="ficheConseq">
        <span className="ficheConseqLabel">Résultat de ces choix</span>{' '}
        Résultat net : <b>{euro(f.net)}</b>{f.ca ? ' (' + pct((f.net / f.ca) * 100) + ' du CA)' : ''} · MS/CA : <b>{f.tauxMS}%</b>
      </div>
      {item.updated ? <div className="valCardMeta">Mis à jour le {new Date(item.updated).toLocaleDateString('fr-FR')}</div> : null}
      {dernierRefus ? (
        <div className="valCardRefus">⚠ Déjà refusé le {new Date(dernierRefus.date).toLocaleDateString('fr-FR')} par {VALIDATOR_LABELS[dernierRefus.role] || dernierRefus.role} : « {dernierRefus.commentaire} »</div>
      ) : null}
      <label className="valCardCommentLabel">Commentaire (obligatoire)</label>
      <textarea className="valCardComment" rows={2} placeholder="Justifiez votre décision…" value={comment} disabled={busy} onChange={(e) => setComment(e.target.value)} />
      {msg ? <div style={{ fontSize: 12, color: 'var(--orange, #c45300)', margin: '6px 0' }}>{msg}</div> : null}
      <div className="valCardActions">
        <button className="valBtnValider" data-testid="val-ok" disabled={busy || !comment.trim()} onClick={() => decide('valide')}>✓ Valider</button>
        <button className="valBtnRefuser" data-testid="val-no" disabled={busy || !comment.trim()} onClick={() => decide('refuse')}>✗ Refuser</button>
      </div>
    </div>
  );
}

export default function ValidationScreen() {
  const { profile } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, aValider: [], traites: [], noRegion: false, tous: [] });
  const navigate = useNav();
  const parNom = profile.nom || profile.email || profile.role;

  const load = useCallback(() => {
    let active = { on: true };
    setState((prev) => ({ ...prev, loading: true }));
    loadBudgetsForValidation(profile)
      .then(({ budgets, noRegion }) => {
        if (!active.on) return;
        const role = profile.role;
        const aValider = [], traites = [];
        const tous = budgets.map((b) => ({ agence: b.agence, d: budgetData(b.data) }));
        budgets.forEach((b) => {
          // Jamais soumis (pas de data.validation) : rien à valider. Avant, une validation
          // neuve « en cours, étage 1 » le faisait apparaître « à valider » chez le DR.
          if (!b.data || !b.data.validation) return;
          const v = ensureValidation(b.data.validation);
          const item = { agence: b.agence, v, d: budgetData(b.data), updated: b.updated_at };
          if (enAttenteDe(v, role)) aValider.push(item);
          else if (v.decisions[role] && v.decisions[role].decision) traites.push(item);
        });
        setState({ loading: false, error: null, aValider, traites, noRegion, tous });
      })
      .catch((err) => { if (active.on) setState({ loading: false, error: err.message || 'Erreur de chargement', aValider: [], traites: [], noRegion: false }); });
    return active;
  }, [profile]);

  useEffect(() => {
    const active = load();
    return () => { active.on = false; };
  }, [load]);

  const onDecided = useCallback((message, type) => { toaster(message, type || 'success'); load(); }, [load]);
  const nbValides = state.traites.filter((it) => it.v.decisions[profile.role].decision === 'valide').length;
  const nbRefuses = state.traites.length - nbValides;

  if (state.loading) return <div className="card"><h2>Budgets à valider</h2><p className="hint">Chargement…</p></div>;
  if (state.error) return <div className="card"><h2>Budgets à valider</h2><p className="hint">Erreur : {state.error}</p></div>;
  if (state.noRegion) return <div className="card"><h2>Budgets à valider</h2><p className="hint">Aucune agence affectée à votre région. Contactez le contrôleur de gestion.</p></div>;

  const monEtage = VALIDATION_STAGES.find((x) => x.validateurs.includes(profile.role));
  return (
    <div className="card">
      <h2 style={{ marginBottom: 4 }}>Validation des budgets</h2>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--ink65)' }}>
        Vous validez à l'étape : {monEtage ? monEtage.label : '—'} ({VALIDATOR_LABELS[profile.role] || profile.role})
      </p>
      <div className="kpis" style={{ marginBottom: 16 }} data-testid="val-kpis">
        {[['À valider', state.aValider.length, state.aValider.length ? 'en attente de vous' : '✓ rien'], ['Validés par vous', nbValides, ''], ['Refusés par vous', nbRefuses, '']].map(([l, v, n]) => (
          <div className="kpi" key={l}><div className="label">{l}</div><div className="value">{v}</div><div className="note">{n}</div></div>
        ))}
      </div>
      <div style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--ink65)', marginBottom: 16 }}>
        💬 {state.aValider.length ? <><b>{state.aValider.length} budget{state.aValider.length > 1 ? 's' : ''}</b> attend{state.aValider.length > 1 ? 'ent' : ''} votre décision.</> : 'Aucun budget n\'attend votre décision pour le moment.'}
      </div>

      {state.aValider.map((it) => (
        <BudgetCard key={it.agence} item={it} role={profile.role} parNom={parNom} onDecided={onDecided}
          autres={state.tous.filter((x) => x.agence !== it.agence).map((x) => x.d)}
          onConsulter={(ag) => navigate('__consulter', ag)} />
      ))}

      {state.traites.length ? (
        <details style={{ border: '1px solid var(--border)', marginTop: 16 }} data-testid="val-traites">
          <summary style={{ cursor: 'pointer', padding: '10px 14px', fontWeight: 600, fontSize: 14 }}>Budgets déjà traités</summary>
          <div style={{ padding: '0 14px 10px' }}>
            {state.traites.map((it) => {
              const dec = it.v.decisions[profile.role];
              return (
                <div key={it.agence} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <b>{it.agence}</b> — {dec.decision === 'valide' ? <span style={{ color: 'var(--green)' }}>✓ validé</span> : <span style={{ color: 'var(--orange)' }}>✗ refusé</span>}
                  <span style={{ color: 'var(--ink65)' }}> · {dec.commentaire || ''}</span>
                </div>
              );
            })}
          </div>
        </details>
      ) : null}
    </div>
  );
}
