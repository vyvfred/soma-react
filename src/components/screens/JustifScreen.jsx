import { useState } from 'react';
import { useBudget } from '../../context/BudgetContext.jsx';
import { avecCacheMoteur, CP_HEURES_JOUR } from '../../domain/calculations.js';
import { tableauCPStock, tableauHeures, tableauVariables, feuillesJustif } from '../../domain/justifCalculs.js';
import { telechargerClasseur } from '../../lib/importExcel.js';
import { euro } from '../../domain/format.js';
import DetailCalculMS from '../DetailCalculMS.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { saveCgData } from '../../lib/budgetApi.js';
import { stockCPOuverture } from '../../domain/justifCalculs.js';

// Stock de congés au 31/12/2026 (facultatif) : saisi par le contrôleur de gestion, recopié dans toutes les versions
function SaisieStockCP({ a, peutSaisir, applyExternal }) {
  const ouv = stockCPOuverture(a);
  const [v, setV] = useState(ouv === null ? '' : String(ouv));
  const [msg, setMsg] = useState(null);
  async function enregistrer() {
    const val = v === '' ? null : Math.max(0, +String(v).replace(',', '.') || 0);
    try {
      const r = await saveCgData({ [a.name]: { stockCP2026: val } });
      if (r.echecs.length) { setMsg('Enregistrement refusé'); return; }
      applyExternal(a.name, { stockCP2026: val });
      setMsg('✓ Enregistré');
    } catch (e) { setMsg('Échec : ' + (e.message || 'erreur')); }
  }
  return (
    <div data-testid="stock-cp-ouverture" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '4px 0 12px', padding: '8px 10px', border: '1px solid var(--border)', background: 'var(--card2)', fontSize: 13 }}>
      <span><b>Stock de congés au 31/12/2026</b> (jours ouvrables, équipe roulante), facultatif :</span>
      {peutSaisir ? (
        <>
          <input data-testid="stock-cp-input" type="number" min="0" step="0.5" value={v} placeholder="non saisi" onChange={(e) => { setV(e.target.value); setMsg(null); }} style={{ width: 100 }} />
          <button data-testid="stock-cp-enregistrer" className="secondary" style={{ fontSize: 12 }} onClick={enregistrer}>Enregistrer</button>
          {msg ? <span style={{ fontSize: 12, color: msg.startsWith('✓') ? 'var(--green)' : 'var(--orange)' }}>{msg}</span> : null}
        </>
      ) : <b>{ouv === null ? 'non saisi (le stock part de 0)' : ouv.toLocaleString('fr-FR') + ' j'}</b>}
      <span className="hint" style={{ fontSize: 11, flexBasis: '100%', margin: 0 }}>Jours acquis et pas encore pris fin 2026, d'après la paie. Sans saisie, le stock part de 0 et peut passer en négatif.</span>
    </div>
  );
}

// Détail des calculs (nov. 2026) : contrôleur de gestion et direction financière voient comment chaque chiffre est obtenu
const ONGLETS = [['ms', 'Masse salariale'], ['var', 'Variables de paie'], ['cp', 'Stock de congés payés'], ['h', 'Heures']];
const c = { padding: '5px 8px', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' };
const cg = { ...c, textAlign: 'left' };
const n0 = (v) => (Math.abs(v) >= 0.5 ? Math.round(v).toLocaleString('fr-FR') : '');
const n1 = (v) => (Math.abs(v) >= 0.05 ? (Math.round(v * 10) / 10).toLocaleString('fr-FR') : '');

function Tableau({ entetes, lignes, total, testid }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table data-testid={testid} style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
        <thead><tr>{entetes.map((h, i) => <th key={i} style={i ? c : cg} title={h[1] || undefined}>{h[0]}</th>)}</tr></thead>
        <tbody>
          {lignes.map((l, i) => <tr key={i}>{l.map((v, j) => <td key={j} style={j ? { ...c, color: typeof v === 'string' && v.startsWith('-') ? 'var(--orange)' : undefined } : cg}>{v}</td>)}</tr>)}
          {total ? <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border2)' }}>{total.map((v, j) => <td key={j} style={j ? c : cg}>{v}</td>)}</tr> : null}
        </tbody>
      </table>
    </div>
  );
}

export default function JustifScreen() {
  const { agency: a, loading, applyExternal } = useBudget();
  const { profile } = useAuth();
  const peutSaisirStock = ['cg', 'df', 'admin'].includes(profile && profile.role);
  const [onglet, setOnglet] = useState('ms');
  if (loading) return <div className="card"><p>Chargement…</p></div>;
  if (!a) return <div className="card"><h2>Détail des calculs</h2><p className="hint">Choisissez une agence.</p></div>;
  const pret = a.costHour && a.cal && a.cal.length;
  const sum = (t, k) => t.reduce((s, x) => s + x[k], 0);
  let contenu = null;
  if (!pret) contenu = <p className="hint">Renseignez le coût horaire (Charges CG) et le calendrier pour voir les calculs.</p>;
  else if (onglet === 'ms') contenu = <DetailCalculMS a={a} ouvertParDefaut sansFermer />;
  else if (onglet === 'var') {
    const v = avecCacheMoteur(() => tableauVariables(a));
    contenu = (
      <>
        <p className="hint" style={{ fontSize: 12 }}>Ce qui est payé sur la période de paie de chaque mois : heures supplémentaires majorées (précarité CDD comprise), retenues pour maladie non maintenue et absences non payées, lissage de la 5e semaine, variables de décembre 2026 en janvier, HS des non-roulants, repas et IDJF. Le salaire de base n'en fait pas partie.</p>
        <Tableau testid="justif-var"
          entetes={[['Mois de paie'], ['Période'], ['HS majorées'], ['Retenue maladie'], ['Retenue absences'], ['Lissage 5e sem.'], ['Variables déc. 2026'], ['HS non-roulants'], ['Repas et IDJF'], ['Total variables']]}
          lignes={v.map((x) => [x.lib, x.periode ? x.periode.debut.split('-').reverse().slice(0, 2).join('/') + ' – ' + x.periode.fin.split('-').reverse().slice(0, 2).join('/') : '', n0(x.hs), n0(x.retMaladie), n0(x.retAbsences), n0(x.lissage), n0(x.dec2026), n0(x.hsNR), n0(x.repas), n0(x.total)])}
          total={['Total', '', n0(sum(v, 'hs')), n0(sum(v, 'retMaladie')), n0(sum(v, 'retAbsences')), n0(sum(v, 'lissage')), n0(sum(v, 'dec2026')), n0(sum(v, 'hsNR')), n0(sum(v, 'repas')), n0(sum(v, 'total'))]} />
      </>
    );
  } else if (onglet === 'cp') {
    const t = avecCacheMoteur(() => tableauCPStock(a));
    contenu = (
      <>
        <p className="hint" style={{ fontSize: 12 }}>Congés des roulants en jours ouvrables (6 par semaine de congés). <b>Stockage</b> : jours acquis dans le mois (2,5 j par mois pour un temps plein, 80 % pendant les arrêts maladie, au prorata des heures et de la part roulante). <b>Déstockage</b> : jours posés dans le mois (écran Présence &amp; HS). Valorisation : jours × {(Math.round(CP_HEURES_JOUR * 100) / 100).toLocaleString('fr-FR')} h × coût horaire chargé du mois. Le stock part du stock au 31/12/2026 s'il est saisi (valorisé au coût horaire de janvier), sinon de 0. La variation du stock est comptée dans la masse salariale du mois (provision pour congés payés) : dotation quand l'équipe acquiert plus de jours qu'elle n'en pose, reprise les mois de congés, qui allège la masse salariale de ces mois souvent faibles en CA.</p>
        <SaisieStockCP key={a.name} a={a} peutSaisir={peutSaisirStock} applyExternal={applyExternal} />
        <Tableau testid="justif-cp"
          entetes={[['Mois'], ['Coût h.', 'Coût horaire chargé du mois'], ['Acquis (j)'], ['Stockage (€)'], ['Posés (j)'], ['Posés (h)'], ['Déstockage (€)'], ['Variation (€)'], ['Stock (j)'], ['Stock (€)'], ['Non-roul. acquis (j)', 'Non-roulants : ETP (Données agences) × 2,5 j par mois'], ['Non-roul. posés (j)'], ['Non-roul. variation (€)', '(acquis − posés) × ligne mensuelle / ETP / 26 ; 0 si les ETP ne sont pas saisis']]}
          lignes={(stockCPOuverture(a) !== null ? [['Stock au 31/12/2026', '', '', '', '', '', '', '', stockCPOuverture(a).toLocaleString('fr-FR'), n0(stockCPOuverture(a) * CP_HEURES_JOUR * (t[0] ? t[0].taux : 0)), '', '', '']] : []).concat(t.map((x) => [x.lib, x.taux.toFixed(2).replace('.', ','), n1(x.acquisJ), n0(x.acquisE), n1(x.prisJ), n1(x.prisH), n0(x.prisE), (x.variationE < 0 ? '-' : '') + n0(Math.abs(x.variationE)), (Math.round(x.stockJ * 10) / 10).toLocaleString('fr-FR'), Math.round(x.stockE).toLocaleString('fr-FR'), n1(x.nrAcquisJ), n1(x.nrPrisJ), (x.nrVariationE < 0 ? '-' : '') + n0(Math.abs(x.nrVariationE))]))}
          total={['Année', '', n1(sum(t, 'acquisJ')), n0(sum(t, 'acquisE')), n1(sum(t, 'prisJ')), n1(sum(t, 'prisH')), n0(sum(t, 'prisE')), n0(sum(t, 'variationE')), n1(t[11].stockJ), n0(t[11].stockE), n1(sum(t, 'nrAcquisJ')), n1(sum(t, 'nrPrisJ')), n0(sum(t, 'nrVariationE'))]} />
      </>
    );
  } else {
    const h = avecCacheMoteur(() => tableauHeures(a));
    contenu = (
      <>
        <p className="hint" style={{ fontSize: 12 }}>Heures des roulants par mois civil. Besoin = CA du jour ÷ TXR. Disponible = contrats − congés − maladie − absences − fériés. HS = besoin − disponible, semaine par semaine.</p>
        <Tableau testid="justif-h"
          entetes={[['Mois'], ['Besoin'], ['Heures contrat'], ['Congés'], ['Maladie'], ['Abs. payées'], ['Abs. non payées'], ['Fériés chômés'], ['Disponibles'], ['HS']]}
          lignes={h.map((x) => [x.lib, n0(x.besoin), n0(x.base), n0(x.cp), n0(x.maladie), n0(x.absPayees), n0(x.absNonPayees), n0(x.feries), n0(x.dispo), n0(x.hs)])}
          total={['Année', n0(sum(h, 'besoin')), n0(sum(h, 'base')), n0(sum(h, 'cp')), n0(sum(h, 'maladie')), n0(sum(h, 'absPayees')), n0(sum(h, 'absNonPayees')), n0(sum(h, 'feries')), n0(sum(h, 'dispo')), n0(sum(h, 'hs'))]} />
      </>
    );
  }
  return (
    <div className="card" data-testid="justif">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Détail des calculs · {a.name}</h2>
        <span style={{ flex: 1 }} />
        {pret ? <button data-testid="justif-export" className="secondary" style={{ fontSize: 12 }} onClick={() => telechargerClasseur(feuillesJustif(a), 'SOMA_detail_calculs_' + a.name.replace(/\s+/g, '_') + '_2027.xlsx')}>⬇ Tout exporter (Excel)</button> : null}
      </div>
      <p className="hint" style={{ margin: '6px 0 12px' }}>Le détail de chaque montant : masse salariale poste par poste, variables de paie, stock de congés, heures. Les chiffres sont ceux de l'application, arrondis à l'euro.</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {ONGLETS.map(([k, l]) => <button key={k} data-testid={'justif-onglet-' + k} className={onglet === k ? '' : 'secondary'} style={{ fontSize: 12 }} onClick={() => setOnglet(k)}>{l}</button>)}
      </div>
      {contenu}
    </div>
  );
}
