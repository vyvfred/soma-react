import { useBudget } from '../../context/BudgetContext.jsx';
import { prefillCharges } from '../../domain/prefillCharges.js';
import { estStructure, estSiege, LIGNES_SIEGE, LIGNES_QUOTE_PART } from '../../domain/calculations.js';
import { manual, T, M, costHourJuin, msNRMensuel, ratioMaintien, fmtCoutH, heuresRoulantesNR, transfertRoulantNR } from '../../domain/calculations.js';
import { chargesInsight } from '../../domain/chargesInsight.js';
import { euro } from '../../domain/format.js';
import ClasseurChargesCard from '../ClasseurChargesCard.jsx';

// Lignes de charges éditables (on exclut CA, charges de personnel et les sous-totaux).
// Lignes saisissables : les structures saisissent aussi leur CA et leurs charges de personnel ;
// l'IS et la participation n'existent que pour le Siège.
const lignesSaisie = (a) => T.filter((r) => r.type !== 'subtotal'
  && (estStructure(a) || (r.label !== "Chiffre d'affaires" && r.label !== 'Charges de personnel'))
  && (estSiege(a) || LIGNES_SIEGE.indexOf(r.label) < 0)
  && (!estStructure(a) || LIGNES_QUOTE_PART.indexOf(r.label) < 0));

function Kpi({ label, value, note }) {
  return <div className="kpi"><div className="label">{label}</div><div className="value">{value}</div><div className="note">{note || ''}</div></div>;
}

export default function ChargesCgScreen() {
  const { agenceNom, recharger } = useBudget();
  return (
    <>
      <ClasseurChargesCard agenceOuverte={agenceNom} onImporte={recharger} />
      {agenceNom
        ? <ChargesAgence />
        : <div className="card hint" data-testid="cg-sans-agence">Pour saisir ou corriger les charges d'une seule agence poste par poste, ouvrez-la avec « Ouvrir une agence ».</div>}
    </>
  );
}

function ChargesAgence() {
  const { agency: a, loading, error, editable, update, agenceNom } = useBudget();

  if (!agenceNom) return <div className="card"><h2>Charges CG</h2><p className="hint">Ouvrez une agence pour saisir ses charges.</p></div>;
  if (loading) return <div className="card"><h2>Charges CG</h2><p className="hint">Chargement du budget…</p></div>;
  if (error) return <div className="card"><h2>Charges CG</h2><p className="hint">Erreur : {error}</p></div>;
  if (!a) return <div className="card"><h2>Charges CG — {agenceNom}</h2><p className="hint">Budget non commencé pour cette agence.</p></div>;

  const insight = chargesInsight(a);

  // Mutations — reproduisent setRexType / setRexMode / setRexAnnual / setRexKey / setRexVal.
  function patchLine(label, patch) {
    update((draft) => {
      const rex = { ...draft.rex };
      rex[label] = { ...rex[label], ...patch };
      draft.rex = rex;
      return draft;
    });
  }
  function setMode(label, mode) {
    update((draft) => {
      const rex = { ...draft.rex };
      const line = { ...rex[label], mode };
      if (mode === 'pctMois' && !Array.isArray(line.pcts)) line.pcts = Array(12).fill(rex[label] && rex[label].mode === 'pct' && +rex[label].pct ? +rex[label].pct : null);
      rex[label] = line;
      draft.rex = rex;
      return draft;
    });
  }
  function setPctMois(label, m, value) {
    update((draft) => {
      const rex = { ...draft.rex };
      const line = { ...rex[label] };
      const pcts = (Array.isArray(line.pcts) ? line.pcts : Array(12).fill(null)).slice();
      pcts[m] = value === '' ? null : +String(value).replace(',', '.');
      line.pcts = pcts;
      rex[label] = line;
      draft.rex = rex;
      return draft;
    });
  }
  function setVal(label, m, value) {
    update((draft) => {
      const rex = { ...draft.rex };
      const line = { ...rex[label] };
      if (line.mode === 'pct') {
        line.pct = value === '' ? null : +value;
      } else {
        const values = (line.values || Array(12).fill(null)).slice();
        values[m] = value === '' ? null : +value;
        line.values = values;
      }
      rex[label] = line;
      draft.rex = rex;
      return draft;
    });
  }

  // Paramétrage salarial de l'agence (repris des Données agences, modifiable ici)
  function setParam(field, value) {
    update((draft) => {
      draft[field] = value === '' ? null : +String(value).replace(',', '.');
      if (draft.tauxHoraireBrut && draft.tauxChargePatronal) {
        draft.costHour = Math.round(+draft.tauxHoraireBrut * (1 + +draft.tauxChargePatronal / 100) * 100) / 100;
      }
      return draft;
    });
  }
  const juin = costHourJuin(a);
  const nr = msNRMensuel(a);
  const tr = transfertRoulantNR(a);
  const PARAMS = [
    ['tauxHoraireBrut', 'Taux horaire brut au 1er janvier (€/h)'],
    ['tauxHoraireBrutJuin', 'Taux horaire brut au 1er juin (€/h)'],
    ['tauxChargePatronal', 'Taux de charge patronal (%)'],
    ['msNRBrutMensuel', 'MS non-roulante : brut mensuel total (€)'],
    ['msNRTauxCharges', 'Taux de charges non-roulants (%)']
  ];

  const cellStyle = { padding: '3px 4px', borderBottom: '1px solid var(--border)' };

  return (
    <div className="card">
      <h2 style={{ marginBottom: 14 }}>Charges — {a.name}</h2>

      {estStructure(a) ? (
        <div data-testid="structure-note" style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(74,158,255,.08)', border: '1px solid var(--blue2)', fontSize: 13, color: 'var(--blue2)' }}>
          ℹ <b>{a.name}</b> est une structure hors agence : vous saisissez tout son compte de résultat ligne par ligne, <b>chiffre d'affaires et charges de personnel compris</b> (pas de calendrier ni d'équipe).
          {estSiege(a) ? <> Le Siège porte aussi l'<b>impôt sur les sociétés</b> et la <b>participation aux bénéfices</b> : résultat net = résultat courant avant impôt + résultat exceptionnel − IS − participation.</> : null}
        </div>
      ) : null}

      <div className="kpis" style={{ marginBottom: 16 }}>
        {insight.kpis.map((k, i) => <Kpi key={i} {...k} />)}
      </div>

      <div style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink65)', marginBottom: 16 }}
        dangerouslySetInnerHTML={{ __html: insight.text }} />

      <div className="paramSalarial" style={{ marginBottom: 16, padding: '12px 14px', border: '1px solid var(--border)', background: 'var(--bg2)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--violet2, var(--violet))', marginBottom: 8 }}>Paramétrage salarial</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
          {PARAMS.map(([k, label]) => (
            <label key={k} style={{ fontSize: 11, color: 'var(--ink65)' }}>{label}
              <input type="number" value={a[k] ?? ''} placeholder="—" disabled={!editable} onChange={(e) => setParam(k, e.target.value)} style={{ display: 'block', width: '100%', marginTop: 4 }} />
            </label>
          ))}
        </div>
        {editable ? (
          <button data-testid="prefill-charges" onClick={() => { if (window.confirm('Pré-remplir les postes standards (carburant, crédit-bail, loyers, assurance, impôts, honoraires, péages, charges financières) à partir du CA ? Les montants actuels de ces postes seront remplacés.')) update((draft) => prefillCharges(JSON.parse(JSON.stringify(draft)))); }}
            style={{ width: 'auto', margin: '10px 0 0', fontSize: 12, padding: '7px 14px' }}>Pré-remplir standards</button>
        ) : null}
        <p className="hint" style={{ fontSize: 12, margin: '10px 0 0' }}>
          Coût horaire chargé : <b>{a.costHour ? fmtCoutH(a.costHour) : '—'}</b> en janvier{juin ? <>, <b>{fmtCoutH(juin)}</b> à partir de juin</> : ' (pas de taux au 1er juin : celui de janvier s\'applique toute l\'année)'}.
          {' '}Masse salariale non-roulante : <b>{nr !== null ? euro(Math.round(nr)) + ' / mois' : 'non saisie'}</b>.
          {nr !== null && tr > 0 ? <>{' '}Part roulante des non-roulants (écran Équipe, {heuresRoulantesNR(a).toLocaleString('fr-FR')} h/sem.) : <b>{euro(Math.round(tr))} / mois</b> déduits automatiquement, déjà comptés en roulant.</> : null}
          {' '}Ratio de maintien de salaire : <b>{Math.round(ratioMaintien(a) * 100)} %</b> (paramètre réseau, Données agences).
        </p>
      </div>

      {!editable ? (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--blue-light, rgba(61,111,214,.10))', border: '1px solid var(--blue2, #3d6fd6)', fontSize: 13, color: 'var(--blue2, #3d6fd6)' }}>
          🔒 Budget engagé dans le circuit de validation — lecture seule.
        </div>
      ) : null}

      <div style={{ overflowX: 'auto' }}>
        <table className="tableColFixe" style={{ borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px' }}>Poste officiel</th>
              <th style={{ padding: '4px 8px' }}>Type</th>
              <th style={{ padding: '4px 8px' }}>Mode</th>
              <th style={{ padding: '4px 8px' }}>Clé / valeur</th>
              {M.map((m) => <th key={m} style={{ padding: '4px 4px' }}>{m}</th>)}
              <th style={{ padding: '4px 8px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {lignesSaisie(a).map((r) => {
              const x = a.rex[r.label] || {};
              const chargeType = x.chargeType || (r.type === 'charge' ? 'variable' : 'fixe');
              const mode = x.mode || 'month';
              const allocationKey = x.allocationKey || 'monthly12';
              const total = M.reduce((s, _, m) => s + manual(a, r.label, m), 0);

              return (
                <tr key={r.label}>
                  <td style={cellStyle}><b>{r.label}</b></td>
                  <td style={cellStyle}>
                    <span className={chargeType === 'fixe' ? 'badgeFixe' : 'badgeVar'}>{chargeType}</span>
                    <select value={chargeType} disabled={!editable} onChange={(e) => patchLine(r.label, { chargeType: e.target.value })} style={{ display: 'block', marginTop: 4 }}>
                      <option value="fixe">charge fixe</option>
                      <option value="variable">charge variable</option>
                    </select>
                  </td>
                  <td style={cellStyle}>
                    <select value={mode} disabled={!editable} onChange={(e) => setMode(r.label, e.target.value)}>
                      <option value="month">saisie mensuelle</option>
                      <option value="annual">montant annuel</option>
                      {r.label !== "Chiffre d'affaires" ? <option value="pct">% CA mensuel</option> : null}
                      {r.label !== "Chiffre d'affaires" ? <option value="pctMois">% CA différent chaque mois</option> : null}
                    </select>
                  </td>
                  <td style={cellStyle}>
                    {mode === 'annual' ? (
                      <div>
                        <label style={{ fontSize: 9, display: 'block' }}>Montant annuel</label>
                        <input type="number" value={x.annual || 0} disabled={!editable} onChange={(e) => patchLine(r.label, { annual: +e.target.value })} style={{ width: 90 }} />
                        <label style={{ fontSize: 9, display: 'block', marginTop: 2 }}>Clé</label>
                        <select value={allocationKey} disabled={!editable} onChange={(e) => patchLine(r.label, { allocationKey: e.target.value })}>
                          <option value="monthly12">division par 12</option>
                          <option value="ca">% du CA mensuel</option>
                        </select>
                      </div>
                    ) : mode === 'pct' ? (
                      <div>
                        <label style={{ fontSize: 9, display: 'block' }}>% CA mensuel</label>
                        <input type="number" value={x.pct || 0} disabled={!editable} onChange={(e) => setVal(r.label, 0, e.target.value)} style={{ width: 70 }} />
                      </div>
                    ) : mode === 'pctMois' ? (
                      <span className="hint" style={{ fontSize: 10 }}>% du CA saisi mois par mois</span>
                    ) : (
                      <span className="hint" style={{ fontSize: 10 }}>saisie par mois</span>
                    )}
                  </td>
                  {M.map((_, m) => (
                    <td key={m} style={cellStyle}>
                      {mode === 'pctMois'
                        ? <><input type="number" step="0.1" value={x.pcts && x.pcts[m] !== null && x.pcts[m] !== undefined ? x.pcts[m] : ''} disabled={!editable} onChange={(e) => setPctMois(r.label, m, e.target.value)} style={{ width: 52 }} /> %<div className="num locked" style={{ fontSize: 10 }}>{euro(manual(a, r.label, m))}</div></>
                        : mode === 'month'
                        ? <input type="number" value={(x.values && x.values[m]) || 0} disabled={!editable} onChange={(e) => setVal(r.label, m, e.target.value)} style={{ width: 58 }} />
                        : <span className="num locked" style={{ fontSize: 10 }}>{euro(manual(a, r.label, m))}</span>}
                    </td>
                  ))}
                  <td className="num" style={{ ...cellStyle, fontWeight: 700 }}>{euro(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
