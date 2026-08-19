import { useEffect, useState } from 'react';
import { loadNetworkBudgets } from '../../lib/budgetApi.js';
import { agencesOps } from '../../config/agences.js';
import { useNav } from '../../context/NavContext.jsx';

// Tableau de bord CG — vue « Préparation » (port fidèle de renderCgDashPrep).
// Agrège l'état de préparation sur toutes les agences opérationnelles du réseau.
function Kpi({ label, value, note }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="note">{note || ''}</div>
    </div>
  );
}

function ActionItem({ text, action, onClick }) {
  return (
    <button className="attentionItem" style={{ border: '1px solid var(--border)', marginBottom: 6, width: '100%' }} onClick={onClick}>
      <span className="attentionItemIcon todo">○</span>
      <span className="attentionItemText">{text}</span>
      <span className="attentionItemArrow">{action} →</span>
    </button>
  );
}

export default function CgDashScreen() {
  const navigate = useNav();
  const [state, setState] = useState({ loading: true, error: null, map: null });

  useEffect(() => {
    let active = true;
    loadNetworkBudgets()
      .then((map) => { if (active) setState({ loading: false, error: null, map }); })
      .catch((err) => { if (active) setState({ loading: false, error: err.message || 'Erreur de chargement', map: null }); });
    return () => { active = false; };
  }, []);

  if (state.loading) return <div className="card"><h2>Tableau de bord</h2><p className="hint">Chargement des budgets du réseau…</p></div>;
  if (state.error) return <div className="card"><h2>Tableau de bord</h2><p className="hint">Impossible de charger les budgets : {state.error}</p></div>;

  const map = state.map || {};
  const ops = agencesOps();
  const total = ops.length;

  // Avancement de la préparation (fidèle à renderCgDashPrep).
  let avecRef = 0, avecCharges = 0;
  const sansRef = [], sansCharges = [];
  ops.forEach((ag) => {
    const e = map[ag.nom];
    const d = e ? e.data : {};
    const hasRef = !!(d.histTXR2026 || d.costHour || d.tauxHoraireBrut);
    const hasCharges = !!(d.cgCharges && Object.keys(d.cgCharges).length);
    if (hasRef) avecRef++; else sansRef.push(ag.nom);
    if (hasCharges) avecCharges++; else sansCharges.push(ag.nom);
  });
  const periodesOk = ops.some((ag) => { const e = map[ag.nom]; return e && e.data && e.data.periodesPaie && e.data.periodesPaie.length; });

  let insight = 'Vous avez préparé les données de référence de ' + avecRef + ' agences sur ' + total + '. ';
  if (sansRef.length) insight += 'Il reste ' + sansRef.length + ' agence' + (sansRef.length > 1 ? 's' : '') + ' sans données de référence — sans elles, les REX concernés ne peuvent pas démarrer. ';
  else insight += 'Toutes les agences ont leurs données de référence. ';
  if (sansCharges.length) insight += sansCharges.length + ' agence' + (sansCharges.length > 1 ? 's' : '') + " n'ont pas encore de charges saisies.";

  return (
    <div className="card">
      <h2 style={{ marginBottom: 14 }}>Tableau de bord — Préparation réseau</h2>

      <div className="kpis" style={{ marginBottom: 16 }}>
        <Kpi label="Agences" value={total} note="dans le réseau" />
        <Kpi label="Données de référence" value={avecRef + '/' + total} note={avecRef < total ? 'à compléter' : '✓ complet'} />
        <Kpi label="Périodes de paie" value={periodesOk ? '✓' : 'à faire'} note={periodesOk ? 'configurées' : 'non configurées'} />
        <Kpi label="Charges saisies" value={avecCharges + '/' + total} note={avecCharges < total ? 'à compléter' : '✓ complet'} />
      </div>

      <div style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink65)', marginBottom: 18 }}
        dangerouslySetInnerHTML={{ __html: insight }} />

      <h3 style={{ fontSize: 14, marginBottom: 10 }}>Ce qu'il reste à préparer</h3>
      {sansRef.length ? (
        <ActionItem text={sansRef.length + ' agence' + (sansRef.length > 1 ? 's' : '') + ' sans données de référence'} action="compléter" onClick={() => navigate('refagences')} />
      ) : null}
      {sansCharges.length ? (
        <ActionItem text={sansCharges.length + ' agence' + (sansCharges.length > 1 ? 's' : '') + ' sans charges CG'} action="compléter" onClick={() => navigate('cg')} />
      ) : null}
      {!sansRef.length && !sansCharges.length ? (
        <p className="hint">✓ Toutes les agences sont prêtes côté données de référence et charges.</p>
      ) : null}

      <p className="hint" style={{ marginTop: 18, fontSize: 12 }}>
        Vue « Préparation ». La vue « Supervision » (avancement des budgets dans le circuit de validation)
        et les écrans comparatif / consolidation seront ajoutés dans les prochains incréments.
      </p>
    </div>
  );
}
