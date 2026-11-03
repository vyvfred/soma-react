import { useEffect, useState } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import { alertesBudgetSoumis } from '../domain/alertesCG.js';

// Anomalies affichées au CG à l'ouverture d'un budget soumis (port de afficherAlertesCG) :
// fermeture manuelle ou automatique après 15 secondes.
const COUL = { crit: 'var(--orange)', warn: '#FF8F00', info: 'var(--blue2)' };
export default function CgAlertes() {
  const { agency, agenceNom, statut, loading } = useBudget();
  const [vue, setVue] = useState(null);
  const cle = agenceNom + '|' + statut;
  const actif = !loading && agency && statut && statut.includes('soumis') && vue !== cle;
  useEffect(() => {
    if (!actif) return undefined;
    const t = setTimeout(() => setVue(cle), 15000);
    return () => clearTimeout(t);
  }, [actif, cle]);
  if (!actif) return null;
  const l = alertesBudgetSoumis(agency);
  if (!l.length) return null;
  return (
    <div data-testid="cg-alertes" style={{ position: 'fixed', top: 70, right: 16, width: 380, maxWidth: 'calc(100vw - 32px)', zIndex: 150, background: 'var(--card)', border: '1px solid var(--border2)', borderTop: '3px solid var(--orange)', padding: '12px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <b style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--orange)' }}>⚠ Anomalies détectées</b>
        <button onClick={() => setVue(cle)} style={{ width: 'auto', margin: 0, fontSize: 11, padding: '2px 8px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--ink65)' }}>✕</button>
      </div>
      {l.map((al, i) => <div key={i} style={{ fontSize: 12, color: COUL[al.t], padding: '4px 0', borderBottom: '1px solid var(--border)' }}>{al.m}</div>)}
    </div>
  );
}
