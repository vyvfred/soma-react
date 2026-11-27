import { annuel, montant, resultatMemo } from '../../domain/memoSIG.js';
import { estDetailSIG, libLigneSIG } from '../../domain/calculations.js';
import { useBudget } from '../../context/BudgetContext.jsx';
import { isRoulant, M, lignesSIG, indemnitesMS } from '../../domain/calculations.js';
import { useAuth } from '../../context/AuthContext.jsx';
import BoutonExportDetaille from '../BoutonExportDetaille.jsx';
import { fichierDepuisAgence } from '../../domain/exportAgenceSources.js';
import { euro, pct } from '../../domain/format.js';

// Écran Prévisionnel — port fidèle de renderPrevisionnel() : 4 KPI décisifs,
// interprétation, et tableau complet du compte de résultat mois par mois (lecture seule).

// Texte d'interprétation — port fidèle de renderPrevInsight() (mêmes seuils, mêmes messages).
function previsionnelInsight(a, ca, net, tauxMS, libMin = 'résultat') {
  if (!ca) {
    const nbRoulants = a.employees ? a.employees.filter((e) => isRoulant(e.qual)).length : 0;
    if (nbRoulants === 0) {
      return 'Le prévisionnel se calcule à partir de votre objectif, de votre équipe et de vos charges. Renseignez d\'abord <b>l\'objectif et l\'équipe</b>.';
    }
    if (!(+a.targetCA > 0)) {
      return 'Renseignez votre <b>objectif de CA</b> sur l\u2019écran Objectif pour calculer le prévisionnel.';
    }
    return 'Les charges ne sont pas encore saisies. Le résultat se complétera à mesure que le contrôle de gestion les renseigne.';
  }
  let phrase;
  if (net > 0) phrase = '' + libMin.charAt(0).toUpperCase() + libMin.slice(1) + ' : <b>' + euro(net) + '</b>. ';
  else if (net < 0) phrase = libMin.charAt(0).toUpperCase() + libMin.slice(1) + ' : <b>−' + euro(Math.abs(net)) + '</b>. ';
  else phrase = 'Budget à l\u2019équilibre. ';

  // Pas de seuil de masse salariale (nov. 2026) : le ratio se compare à 2025, 2026 et au réseau dans la Synthèse
  if (tauxMS > 0) phrase += 'Masse salariale : <b>' + pct(tauxMS) + '</b> du CA. La Synthèse la compare à 2025, 2026 et au réseau. ';
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
  const { loading, error, agency: a, agenceNom, activeVersion, meta, statut } = useBudget();
  const { profile } = useAuth();
  const role = vueCG ? 'cg' : profile.role;

  if (!agenceNom) return <div className="card"><h2>Prévisionnel</h2><p className="hint">Aucune agence n'est rattachée à votre profil.</p></div>;
  if (loading) return <div className="card"><h2>Prévisionnel</h2><p className="hint">Chargement du budget…</p></div>;
  if (error) return <div className="card"><h2>Prévisionnel</h2><p className="hint">Impossible de charger le budget : {error}</p></div>;
  if (!a) return <div className="card"><h2>Prévisionnel · {agenceNom}</h2><p className="hint">Budget non commencé pour cette agence.</p></div>;

  const ca = annuel(a, "Chiffre d'affaires");
  const indMois = M.map((_, m) => indemnitesMS(a, m));
  const indAn = indMois.reduce((x, v) => x + v, 0);
  const res = resultatMemo(a, role);
  const net = vueCG ? annuel(a, 'RESULTAT NET') : res.val;
  const ms = annuel(a, 'Charges de personnel');
  const ebe = annuel(a, "EXCEDENT BRUT D'EXPLOITATION");
  const tauxMS = ca ? (ms / ca) * 100 : 0;

  const rexR = annuel(a, "RESULTAT D'EXPLOITATION");
  // Vue CG (port de renderREX) : 6 indicateurs du SIG
  const kpis = vueCG ? [
    { label: 'CA', value: euro(ca) },
    { label: 'Charges personnel', value: euro(ms), note: pct(tauxMS) },
    { label: 'VA', value: euro(annuel(a, 'VALEUR AJOUTEE')) },
    { label: 'EBE', value: euro(ebe) },
    { label: 'Résultat d\'exploitation', value: euro(rexR), note: pct(ca ? (rexR / ca) * 100 : 0) },
    { label: 'Résultat net', value: euro(net), note: pct(ca ? (net / ca) * 100 : 0) }
  ] : [
    { label: 'CA budgété', value: euro(ca) },
    { label: res.lib, value: euro(net), note: ca ? pct((net / ca) * 100) : '' },
    { label: 'Masse salariale / CA', value: ca ? pct(tauxMS) : '—', note: !ca ? 'CA non calculé' : 'charges de personnel / CA' },
    { label: 'EBE', value: euro(ebe), note: ca ? pct((ebe / ca) * 100) : '' }
  ];

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Prévisionnel · {agenceNom}</h2>
        <BoutonExportDetaille testid="export-budget-detaille" libelle="📥 Budget détaillé (Excel)" titre="Classeur Excel avec tous les calculs en formules : calendrier, semaines, heures supplémentaires, masse salariale, compte de résultat"
          fichiers={() => fichierDepuisAgence(a, agenceNom, { activeVersion, meta, statut }, role)} />
      </div>
      {vueCG ? <p className="hint" style={{ margin: '0 0 14px', fontSize: 13 }}>Prévisionnel de l'agence, calculé à partir des saisies du REX et de vos charges. Lecture seule.</p> : null}

      <div className="kpis" data-visite="previsionnel" style={{ marginBottom: 16 }}>
        {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
      </div>

      <div
        style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink65)' }}
        dangerouslySetInnerHTML={{ __html: previsionnelInsight(a, ca, net, tauxMS, res.libMin) }}
      />

      {a.periodesPaie && a.periodesPaie.length && a.costHour && a.cal && a.cal.length ? (
        <div data-testid="prev-paie-badge" style={{ padding: '6px 12px', background: 'rgba(74,158,255,.08)', border: '1px solid var(--blue2)', fontSize: 12, color: 'var(--blue2)', marginBottom: 12 }}>
          ℹ La ligne <b>Charges de personnel</b> est calculée selon les périodes de paie 2027 (et non par mois civil). Les salaires de base sont mensualisés (le même montant chaque mois) ; seules les variables (heures supplémentaires, retenues d'absence) suivent les périodes de paie, et les heures supplémentaires de la 5e semaine des mois de 5 semaines (janvier, avril, juillet, octobre) sont lissées sur les deux mois suivants du trimestre.
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
            {lignesSIG(a, role).flatMap((r) => {
              const total = annuel(a, r.label);
              const pctCA = ca ? pct((total / ca) * 100) : '—';
              const zero = (v) => (!v || v === 0 ? ' zeroVal' : '');
              return [(
                <tr key={r.label} className={r.type === 'subtotal' ? 'subtotal' : ''}>
                  {estDetailSIG(r.label) ? <td style={{ paddingLeft: 18, fontStyle: 'italic' }}>{libLigneSIG(r.label)}</td> : <td><b>{r.label}</b></td>}
                  {M.map((_, m) => {
                    const v = montant(a, r.label, m);
                    return <td key={m} className={'num locked' + zero(v)}>{euro(v)}</td>;
                  })}
                  <td className={'num locked' + zero(total)}><b>{euro(total)}</b></td>
                  <td className="num locked">{pctCA}</td>
                </tr>
              )].concat(r.label === 'Charges de personnel' && indAn ? [(
                <tr key="dont-indemnites" data-testid="prev-dont-indemnites">
                  <td style={{ paddingLeft: 18, fontStyle: 'italic' }} title="Indemnités repas et dimanche/jour férié saisies dans Présence, sur leur mois de paie">dont indemnités (repas, IDJF)</td>
                  {indMois.map((v, m) => <td key={m} className={'num locked' + zero(v)} style={{ fontStyle: 'italic' }}>{euro(v)}</td>)}
                  <td className={'num locked' + zero(indAn)} style={{ fontStyle: 'italic' }}>{euro(indAn)}</td>
                  <td className="num locked">{ca ? pct((indAn / ca) * 100) : '—'}</td>
                </tr>
              )] : []);
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
