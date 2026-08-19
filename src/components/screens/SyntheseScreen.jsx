import { useBudget } from '../../context/BudgetContext.jsx';
import { ann, hsTot } from '../../domain/calculations.js';
import { euro, pct } from '../../domain/format.js';

// Écran Synthèse — port fidèle des KPI de renderFinance().
// Prouve la chaîne complète : Supabase → mapper → noyau de calcul → affichage.
// Lecture seule à ce stade.
function KpiCard({ label, value, note }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="note">{note || ''}</div>
    </div>
  );
}

export default function SyntheseScreen() {
  const { agency, loading, error, agenceNom } = useBudget();
  const state = { agency, loading, error };

  if (!agenceNom) {
    return (
      <div className="card">
        <h2>Synthèse</h2>
        <p className="hint">Aucune agence n'est rattachée à votre profil.</p>
      </div>
    );
  }
  if (state.loading) {
    return <div className="card"><h2>Synthèse</h2><p className="hint">Chargement du budget…</p></div>;
  }
  if (state.error) {
    return <div className="card"><h2>Synthèse</h2><p className="hint">Impossible de charger le budget : {state.error}</p></div>;
  }
  if (!state.agency) {
    return (
      <div className="card">
        <h2>Synthèse — {agenceNom}</h2>
        <p className="hint">Budget non commencé pour cette agence.</p>
      </div>
    );
  }

  // Calculs identiques à renderFinance (mêmes fonctions du noyau).
  const a = state.agency;
  const ca = ann(a, "Chiffre d'affaires");
  const ms = ann(a, 'Charges de personnel');
  const rex = ann(a, "RESULTAT D'EXPLOITATION");
  const net = ann(a, 'RESULTAT NET');
  const t = hsTot(a);

  const kpis = [
    { label: 'CA calendrier', value: euro(ca) },
    { label: 'Charges personnel', value: euro(ms), note: 'présence + HS' },
    { label: 'REX', value: euro(rex), note: pct(ca ? (rex / ca) * 100 : 0) },
    { label: 'Résultat net', value: euro(net), note: pct(ca ? (net / ca) * 100 : 0) },
    { label: 'MS / CA', value: pct(ca ? (ms / ca) * 100 : 0) },
    { label: 'HS', value: t.hs.toFixed(0) + ' h' }
  ];

  return (
    <div className="card">
      <h2 style={{ marginBottom: 14 }}>Synthèse — {agenceNom}</h2>
      <div className="kpis">
        {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
      </div>
    </div>
  );
}
