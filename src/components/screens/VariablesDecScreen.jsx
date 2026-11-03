import { useEffect, useMemo, useState } from 'react';
import { loadNetworkBudgets, saveCgData } from '../../lib/budgetApi.js';
import { agencesOps } from '../../config/agences.js';
import { VAR_DEC_RUBRIQUES, varDecDetail, varDecCalc, buildPeriodesPaie } from '../../domain/calculations.js';
import { useBudget } from '../../context/BudgetContext.jsx';
import { invaliderEtatCG } from '../CgGuide.jsx';
import { euro } from '../../domain/format.js';

// Variables de paie de décembre 2026, réglées sur la paie de janvier 2027.
// Saisie en brut par rubrique ; les éléments de salaire reçoivent les charges
// patronales de l'agence, les indemnités repas non. Écran réseau du CG.

function Kpi({ label, value, note }) {
  return <div className="kpi"><div className="label">{label}</div><div className="value">{value}</div><div className="note">{note || ''}</div></div>;
}
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function dateCourte(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? (+m[3]) + ' ' + MOIS[+m[2] - 1] + ' ' + m[1] : '';
}

// État d'une ligne : détail par rubrique, ou ancien montant global saisi avant cet écran
export function varDecLigne(base, saisie) {
  const det = { ...(varDecDetail(base) || {}), ...(saisie || {}) };
  const c = varDecCalc(det, base.tauxChargePatronal);
  if (!c.saisi && !varDecDetail(base) && +base.variablesDec2026 > 0) return { saisi: true, total: +base.variablesDec2026, brut: 0, ancien: true, det };
  return { ...c, det };
}

export default function VariablesDecScreen() {
  const { applyExternal } = useBudget();
  const [state, setState] = useState({ loading: true, error: null, map: null });
  const [edits, setEdits] = useState({}); // { agence: { rubrique: valeur } }
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  function reload() {
    loadNetworkBudgets()
      .then((m) => { const map = {}; Object.keys(m).forEach((k) => { map[k] = m[k].data; }); setState({ loading: false, error: null, map }); })
      .catch((err) => setState({ loading: false, error: err.message || 'Erreur de chargement', map: null }));
  }
  useEffect(() => { reload(); }, []);

  const ops = agencesOps();
  const lignes = useMemo(() => {
    const out = {};
    ops.forEach((ag) => { out[ag.nom] = varDecLigne((state.map || {})[ag.nom] || {}, edits[ag.nom]); });
    return out;
  }, [state.map, edits]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state.loading) return <div className="card"><h2>Variables de paie de décembre 2026</h2><p className="hint">Chargement…</p></div>;
  if (state.error) return <div className="card"><h2>Variables de paie de décembre 2026</h2><p className="hint">Erreur : {state.error}</p></div>;

  let nb = 0, total = 0; const sansTaux = [];
  ops.forEach((ag) => {
    const l = lignes[ag.nom], d = (state.map || {})[ag.nom] || {};
    if (l.saisi) { nb++; total += l.total; if (!d.tauxChargePatronal && l.brut > 0) sansTaux.push(ag.nom); }
  });
  const enCours = Object.keys(edits).length;
  let insight = nb === 0
    ? 'Aucune agence n\'a encore ses variables de décembre 2026. Sans elles, la paie de janvier 2027 est sous-estimée.'
    : '<b>' + nb + ' agence' + (nb > 1 ? 's' : '') + ' sur ' + ops.length + '</b> ' + (nb > 1 ? 'ont' : 'a') + ' leurs variables de décembre 2026.';
  if (sansTaux.length) insight += ' Taux de charge patronal manquant pour ' + sansTaux.slice(0, 3).join(', ') + (sansTaux.length > 3 ? '…' : '') + ' : les charges ne sont pas ajoutées tant qu\'il n\'est pas renseigné dans Données agences.';
  if (enCours) insight += ' <b>' + enCours + ' agence' + (enCours > 1 ? 's' : '') + ' modifiée' + (enCours > 1 ? 's' : '') + ', pensez à enregistrer.</b>';
  const p0 = (buildPeriodesPaie()[0] || {}).debut;

  function setVal(nom, k, val) {
    const v = val === '' ? null : Math.max(0, +String(val).replace(',', '.') || 0);
    setEdits((prev) => ({ ...prev, [nom]: { ...(prev[nom] || {}), [k]: v } }));
  }
  async function save() {
    if (!enCours) return;
    setSaving(true); setMsg(null);
    try {
      const saisies = {};
      Object.keys(edits).forEach((nom) => {
        const d = (state.map || {})[nom] || {};
        const l = varDecLigne(d, edits[nom]);
        const c = varDecCalc(l.det, d.tauxChargePatronal);
        saisies[nom] = { variablesDec2026Detail: c.saisi ? l.det : null, variablesDec2026: c.saisi ? Math.round(c.total) : null };
      });
      const r = await saveCgData(saisies);
      Object.entries(r.ecrits).forEach(([nom, data]) => applyExternal(nom, data));
      invaliderEtatCG();
      setMsg(r.echecs.length ? 'Enregistrement refusé pour : ' + r.echecs.join(', ') : '✓ ' + r.count + ' agence' + (r.count > 1 ? 's' : '') + ' enregistrée' + (r.count > 1 ? 's' : ''));
      setEdits({});
      reload();
    } catch (err) {
      setMsg('Échec : ' + (err.message || 'erreur'));
    } finally { setSaving(false); }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Variables de paie de décembre 2026</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={save} disabled={!enCours || saving}>{saving ? '⏳ Enregistrement…' : '💾 Enregistrer'}</button>
          {msg ? <span style={{ fontSize: 13, color: msg.startsWith('✓') ? 'var(--green, #2e7d6f)' : 'var(--orange, #c45300)' }}>{msg}</span> : null}
        </div>
      </div>

      <div className="kpis" style={{ marginBottom: 16 }}>
        <Kpi label="Agences renseignées" value={nb + '/' + ops.length} note={nb < ops.length ? 'à compléter' : '✓ complet'} />
        <Kpi label="Total réseau" value={euro(Math.round(total))} note="chargé, paie de janvier" />
        <Kpi label="Sans taux de charge" value={sansTaux.length} note={sansTaux.length ? 'charges non appliquées' : '✓ aucune'} />
      </div>
      <div style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink65)', marginBottom: 14 }}
        dangerouslySetInnerHTML={{ __html: insight }} />
      <p className="hint" style={{ marginBottom: 12 }}>
        La paie de janvier 2027 règle les variables de la fin de décembre 2026 (<b>du {dateCourte(p0)} au 31 décembre 2026</b>). Saisissez pour chaque agence les montants <b>bruts</b> du réalisé, tels qu'ils figurent dans la paie. SOMA ajoute les charges patronales de l'agence aux éléments de salaire ; les indemnités repas ne sont pas chargées. Le total s'ajoute à la masse salariale du mois de paie de janvier.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table id="varDecTable" style={{ borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Agence</th>
              {VAR_DEC_RUBRIQUES.map((r) => <th key={r.k} style={{ padding: '6px 8px' }}>{r.l} (€ brut){r.charge ? null : <><br /><span style={{ fontWeight: 400, textTransform: 'none' }}>non chargé</span></>}</th>)}
              <th style={{ padding: '6px 8px' }}>Charges pat. %</th>
              <th style={{ padding: '6px 8px' }}>Total chargé paie janv.</th>
            </tr>
          </thead>
          <tbody>
            {ops.map((ag) => {
              const d = (state.map || {})[ag.nom] || {};
              const l = lignes[ag.nom];
              return (
                <tr key={ag.nom}>
                  <td style={{ padding: '4px 8px' }}><b>{ag.nom}</b></td>
                  {VAR_DEC_RUBRIQUES.map((r) => (
                    <td key={r.k} style={{ padding: '2px 4px' }}>
                      <input type="number" min="0" step="0.01" value={l.det[r.k] ?? ''} placeholder="—" onChange={(e) => setVal(ag.nom, r.k, e.target.value)} style={{ width: 110 }} />
                    </td>
                  ))}
                  <td style={{ textAlign: 'center' }}>{d.tauxChargePatronal ? d.tauxChargePatronal + ' %' : <span style={{ color: 'var(--orange, #c45300)' }} title="Taux de charge patronal à renseigner dans Données agences">manquant</span>}</td>
                  <td className="varDecTot" style={{ fontWeight: 700, color: 'var(--violet2, var(--violet))', fontFamily: 'DM Mono, monospace', padding: '0 8px', whiteSpace: 'nowrap' }}>
                    {l.saisi ? euro(Math.round(l.total)) : '—'}
                    {l.ancien ? <div style={{ fontSize: 10, fontWeight: 400, color: 'var(--ink65)' }}>montant global saisi avant le détail</div> : null}
                    {edits[ag.nom] ? <span style={{ fontSize: 10, color: 'var(--orange, #c45300)' }}> ● non enregistré</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
