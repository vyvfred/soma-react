import { useBudget } from '../../context/BudgetContext.jsx';
import { ann, amount, isRoulant, M, lignesSIG, resultatAffiche } from '../../domain/calculations.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { euro, pct } from '../../domain/format.js';

// Écran Prévisionnel — port fidèle de renderPrevisionnel() : 4 KPI décisifs,
// interprétation, et tableau complet du compte de résultat mois par mois (lecture seule).

// Texte d'interprétation — port fidèle de renderPrevInsight() (mêmes seuils, mêmes messages).
function previsionnelInsight(a, ca, net, tauxMS, libMin = 'résultat') {
  if (!ca) {
    const nbRoulants = a.employees ? a.employees.filter((e) => isRoulant(e.qual)).length : 0;
    if (nbRoulants === 0) {
      return 'Le prévisionnel se remplit automatiquement à partir de votre objectif, votre équipe et vos charges. Commencez par <b>renseigner votre objectif et votre équipe</b> — les montants apparaîtront ici.';
    }
    if (!(+a.targetCA > 0)) {
      return 'Renseignez votre <b>objectif de chiffre d\u2019affaires</b> (étape Objectif) pour que le compte de résultat prévisionnel se calcule.';
    }
    return 'Les charges ne sont pas encore saisies. Le contrôleur de gestion renseigne les charges de chaque poste ; le résultat prévisionnel se complètera au fur et à mesure.';
  }
  let phrase;
  if (net > 0) phrase = 'Votre budget dégage un ' + libMin + ' positif de <b>' + euro(net) + '</b>. ';
  else if (net < 0) phrase = 'Votre budget présente un ' + libMin + ' déficitaire de <b>' + euro(Math.abs(net)) + '</b>. ';
  else phrase = 'Votre budget est à l\u2019équilibre. ';

  if (tauxMS > 85) {
    phrase += 'La masse salariale représente <b>' + pct(tauxMS) + '</b> du chiffre d\u2019affaires, un niveau élevé qui pèse sur la rentabilité. Vérifiez vos charges de personnel ou votre objectif de CA.';
  } else if (tauxMS > 75) {
    phrase += 'La masse salariale représente <b>' + pct(tauxMS) + '</b> du chiffre d\u2019affaires, à surveiller mais dans une fourchette acceptable.';
  } else if (tauxMS > 0) {
    phrase += 'La masse salariale représente <b>' + pct(tauxMS) + '</b> du chiffre d\u2019affaires, un niveau maîtrisé. ';
    if (net > 0) phrase += 'Ce budget est équilibré et peut être présenté à votre Directeur Régional.';
  }
  return phrase;
}

function KpiCard({ label, value, note }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="note">{note || ''}</div>
    </div>
  );
}

export default function PrevisionnelScreen({ vueCG = false }) {
  const { loading, error, agency: a, agenceNom } = useBudget();
  const { profile } = useAuth();
  const role = vueCG ? 'cg' : profile.role;

  if (!agenceNom) return <div className="card"><h2>Prévisionnel</h2><p className="hint">Aucune agence n'est rattachée à votre profil.</p></div>;
  if (loading) return <div className="card"><h2>Prévisionnel</h2><p className="hint">Chargement du budget…</p></div>;
  if (error) return <div className="card"><h2>Prévisionnel</h2><p className="hint">Impossible de charger le budget : {error}</p></div>;
  if (!a) return <div className="card"><h2>Prévisionnel — {agenceNom}</h2><p className="hint">Budget non commencé pour cette agence.</p></div>;

  const ca = ann(a, "Chiffre d'affaires");
  const res = resultatAffiche(a, role);
  const net = vueCG ? ann(a, 'RESULTAT NET') : res.val;
  const ms = ann(a, 'Charges de personnel');
  const ebe = ann(a, "EXCEDENT BRUT D'EXPLOITATION");
  const tauxMS = ca ? (ms / ca) * 100 : 0;

  const rexR = ann(a, "RESULTAT D'EXPLOITATION");
  // Vue CG (port de renderREX) : 6 indicateurs du SIG
  const kpis = vueCG ? [
    { label: 'CA', value: euro(ca) },
    { label: 'Charges personnel', value: euro(ms), note: pct(tauxMS) },
    { label: 'VA', value: euro(ann(a, 'VALEUR AJOUTEE')) },
    { label: 'EBE', value: euro(ebe) },
    { label: 'REX', value: euro(rexR), note: pct(ca ? (rexR / ca) * 100 : 0) },
    { label: 'Résultat net', value: euro(net), note: pct(ca ? (net / ca) * 100 : 0) }
  ] : [
    { label: 'CA budgété', value: euro(ca) },
    { label: res.lib, value: euro(net), note: ca ? pct((net / ca) * 100) : '' },
    { label: 'Masse salariale / CA', value: pct(tauxMS), note: tauxMS > 85 ? '⚠ élevé' : tauxMS > 75 ? 'à surveiller' : 'maîtrisé' },
    { label: 'EBE', value: euro(ebe), note: ca ? pct((ebe / ca) * 100) : '' }
  ];

  return (
    <div className="card">
      <h2 style={{ marginBottom: 14 }}>Prévisionnel — {agenceNom}</h2>
      {vueCG ? <p className="hint" style={{ margin: '0 0 14px', fontSize: 13 }}>📊 <b>Prévisionnel de l'agence sélectionnée.</b> Ce tableau de résultat (SIG) est calculé automatiquement à partir des données du REX et des charges que vous avez saisies. Vue en lecture seule.</p> : null}

      <div className="kpis" style={{ marginBottom: 16 }}>
        {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
      </div>

      <div
        style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink65)' }}
        dangerouslySetInnerHTML={{ __html: previsionnelInsight(a, ca, net, tauxMS, res.libMin) }}
      />

      {a.periodesPaie && a.periodesPaie.length && a.costHour && a.cal && a.cal.length ? (
        <div data-testid="prev-paie-badge" style={{ padding: '6px 12px', background: 'rgba(74,158,255,.08)', border: '1px solid var(--blue2)', fontSize: 12, color: 'var(--blue2)', marginBottom: 12 }}>
          ℹ La ligne <b>Charges de personnel</b> est calculée selon les périodes de paie 2027 (et non par mois civil). Les heures supplémentaires de la 5e semaine des mois de 5 semaines (janvier, avril, juillet, octobre) sont lissées sur les deux mois suivants du trimestre.
        </div>
      ) : null}

      <div style={{ overflowX: 'auto' }}>
        <table className="prev-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Rubrique</th>
              {M.map((m) => <th key={m}>{m}</th>)}
              <th>Total</th>
              <th>% CA</th>
            </tr>
          </thead>
          <tbody>
            {lignesSIG(a, role).map((r) => {
              const total = ann(a, r.label);
              const pctCA = ca ? pct((total / ca) * 100) : '—';
              const zero = (v) => (!v || v === 0 ? ' zeroVal' : '');
              return (
                <tr key={r.label} className={r.type === 'subtotal' ? 'subtotal' : ''}>
                  <td><b>{r.label}</b></td>
                  {M.map((_, m) => {
                    const v = amount(a, r.label, m);
                    return <td key={m} className={'num locked' + zero(v)}>{euro(v)}</td>;
                  })}
                  <td className={'num locked' + zero(total)}><b>{euro(total)}</b></td>
                  <td className="num locked">{pctCA}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
