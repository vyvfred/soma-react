import { useBudget } from '../../context/BudgetContext.jsx';
import { M, monthCA, manual, LIGNES_CHARGES_REX, valeursChargeREX, setChargeREX, versSaisieREX, estStructure } from '../../domain/calculations.js';
import { estSaisieDR } from '../../domain/saisiesDR.js';
import { euro } from '../../domain/format.js';

// Étape « Charges » du REX : 4 postes en % du CA du mois, 2 postes en montant fixe par mois.
// Les valeurs du contrôleur de gestion sont reprises au premier passage (voir valeursChargeREX).
const NOMS = {
  'Matériels ambulances': 'Matériels ambulances',
  Carburant: 'Carburant',
  'Entretiens petits équipements': 'Entretiens petits équipements',
  'Fourniture bureau - vêtements': 'Fournitures de bureau - vêtements',
  'Sous traitance': 'Sous-traitance',
  'Entretiens véhicules - batîment': 'Entretiens véhicules - bâtiment'
};
const kEuro = (v) => Math.round((+v || 0) / 1000) + ' k€';
const pct = (v) => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',') + ' %';

export default function ChargesREXScreen() {
  const { agency: a, loading, error, editable, update, agenceNom } = useBudget();
  if (!agenceNom) return <div className="card"><h2>Charges d'exploitation</h2><p className="hint">Ouvrez une agence.</p></div>;
  if (loading) return <div className="card"><h2>Charges d'exploitation</h2><p className="hint">Chargement du budget…</p></div>;
  if (error) return <div className="card"><h2>Charges d'exploitation</h2><p className="hint">Erreur : {error}</p></div>;
  if (!a) return null;
  if (estStructure(a)) return <div className="card"><h2>Charges d'exploitation</h2><p className="hint">Les charges des structures sont saisies par le contrôle de gestion.</p></div>;

  const ca = M.map((_, m) => monthCA(a, m));
  const caAn = ca.reduce((s, v) => s + v, 0);
  const lignesPct = LIGNES_CHARGES_REX.filter((r) => r[1] === 'pctMois').map((r) => r[0]);
  const lignesFixes = LIGNES_CHARGES_REX.filter((r) => r[1] === 'month').map((r) => r[0]);
  const annuel = (l) => M.reduce((s, _, m) => s + manual(a, l, m), 0);
  const total = LIGNES_CHARGES_REX.reduce((s, r) => s + annuel(r[0]), 0);
  const set = (l, m, v) => update((d) => setChargeREX(d, l, m, v));
  const recopier = (l) => update((d) => { const x = versSaisieREX(d, l); const src = (x.mode === 'pctMois' ? x.pcts : x.values)[0]; for (let m = 1; m < 12; m++) setChargeREX(d, l, m, src === null || src === undefined ? '' : src); return d; });
  const cell = { padding: '4px 3px', textAlign: 'center' };
  const champ = (l, m, val, chemin) => (
    <td key={m} style={{ padding: '2px 2px' }}>
      <input type="number" data-testid={'chrex-' + l + '-' + m} data-saisie-dr={estSaisieDR(a, chemin) ? '1' : undefined} step="0.01" min="0" disabled={!editable}
        value={val === null || val === undefined ? '' : val} placeholder="0" onChange={(e) => set(l, m, e.target.value)}
        style={{ width: '100%', minWidth: 48, padding: '5px 2px', textAlign: 'center', fontSize: 12 }} />
    </td>
  );
  const ligne = (l) => {
    const mode = LIGNES_CHARGES_REX.find((r) => r[0] === l)[1];
    const vals = valeursChargeREX(a, l);
    const an = annuel(l);
    return (
      <tr key={l} style={{ borderTop: '1px solid var(--border)' }}>
        <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>
          <b>{NOMS[l] || l}</b>
          {editable ? <button type="button" title="Recopier la valeur de janvier sur les 12 mois" onClick={() => recopier(l)} aria-label="Recopier janvier sur les 12 mois" style={{ marginLeft: 4, padding: '1px 5px', fontSize: 12, width: 'auto' }}>⇉</button> : null}
        </td>
        {M.map((_, m) => champ(l, m, vals[m], 'rex.' + l + (mode === 'pctMois' ? '.pcts.' : '.values.') + m))}
        <td className="num" style={{ padding: '4px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}><b>{euro(an)}</b>{mode === 'pctMois' && caAn ? <div style={{ fontSize: 10, color: 'var(--ink65)' }}>{pct(an / caAn * 100)} du CA</div> : null}</td>
      </tr>
    );
  };
  const entete = (titre) => (
    <thead>
      <tr style={{ color: 'var(--ink65)' }}><th style={{ padding: '4px 8px', textAlign: 'left' }}>{titre}</th>{M.map((m) => <th key={m} style={cell}>{m}</th>)}<th style={{ padding: '4px 8px', textAlign: 'right' }}>Année</th></tr>
    </thead>
  );
  return (
    <div className="card" data-testid="charges-rex">
      <h2>Charges d'exploitation</h2>
      <p className="hint" style={{ marginBottom: 14 }}>
        Vous construisez six postes de charges. Les quatre premiers se saisissent en <b>% du chiffre d'affaires de chaque mois</b> (le taux peut changer d'un mois à l'autre) ;
        la sous-traitance et l'entretien des véhicules et du bâtiment en <b>montant fixe par mois</b>.
        Les cases sont pré-remplies avec les valeurs du contrôle de gestion quand il y en a : ajustez-les. Le bouton ⇉ recopie la valeur de janvier sur les 12 mois. Les autres charges restent saisies par le contrôle de gestion.
      </p>
      <h3 style={{ margin: '6px 0 8px' }}>En % du chiffre d'affaires du mois</h3>
      <div data-visite="charges" style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
          {entete('Poste')}
          <tbody>
            <tr style={{ color: 'var(--ink65)' }} data-testid="charges-rex-ca"><td style={{ padding: '4px 8px' }}>CA du mois</td>{ca.map((v, m) => <td key={m} className="num" style={cell}>{kEuro(v)}</td>)}<td className="num" style={{ padding: '4px 8px', textAlign: 'right' }}>{euro(caAn)}</td></tr>
            {lignesPct.map(ligne)}
          </tbody>
        </table>
      </div>
      {!caAn ? <p className="hint" style={{ fontSize: 12, marginTop: 6 }}>Le CA n'est pas encore construit (Références CA). Les montants s'afficheront ensuite.</p> : null}
      <h3 style={{ margin: '18px 0 8px' }}>Montant fixe par mois (€)</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
          {entete('Poste')}
          <tbody>{lignesFixes.map(ligne)}</tbody>
        </table>
      </div>
      <div data-testid="charges-rex-total" style={{ marginTop: 14, padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13 }}>
        Total de ces six postes : <b>{euro(total)}</b>{caAn ? <> soit <b>{pct(total / caAn * 100)}</b> du chiffre d'affaires</> : null}.
      </div>
    </div>
  );
}
