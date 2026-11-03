import { useEffect, useState, useMemo, useRef } from 'react';
import { loadNetworkBudgets, saveCgData, saveEquipesImportees } from '../../lib/budgetApi.js';
import { lireClasseur, feuilleAgences } from '../../lib/importExcel.js';
import { parseRefAgences, parseRegistre } from '../../domain/imports.js';
import { agencesOps } from '../../config/agences.js';
import { refAgencesInsight } from '../../domain/refAgencesInsight.js';
import { costHourJuin } from '../../domain/calculations.js';
import { useBudget } from '../../context/BudgetContext.jsx';
import { invaliderEtatCG } from '../CgGuide.jsx';

// Données de référence posées par le CG. Les valeurs vont dans la version du budget
// lue par le REX (voir domain/refCG.js) ; seuls les champs saisis sont envoyés.
const FIELDS = [
  { key: 'histCA2025', label: 'CA 2025', w: 110 },
  { key: 'histCA', label: 'CA 2026', w: 110 },
  { key: 'histTXR2026', label: 'TXR 2026 (€/h)', w: 90 },
  { key: 'targetAbsRate', label: 'Absent. cible %', w: 90 },
  { key: 'tauxHoraireBrut', label: 'Taux brut 1er janv. (€/h)', w: 90 },
  { key: 'tauxHoraireBrutJuin', label: 'Taux brut 1er juin (€/h)', w: 90 },
  { key: 'tauxChargePatronal', label: 'Charges pat. %', w: 80 },
  { key: 'msNRBrutMensuel', label: 'MS non-roulante brut/mois (€)', w: 110 },
  { key: 'msNRTauxCharges', label: 'Charges non-roul. %', w: 80 }
];

function Kpi({ label, value, note }) {
  return <div className="kpi"><div className="label">{label}</div><div className="value">{value}</div><div className="note">{note || ''}</div></div>;
}

function costHourOf(d) {
  if (d.tauxHoraireBrut && d.tauxChargePatronal) {
    return Math.round(+d.tauxHoraireBrut * (1 + (+d.tauxChargePatronal || 0) / 100) * 100) / 100;
  }
  return d.costHour || null;
}

export default function RefAgencesScreen() {
  const { applyExternal } = useBudget();
  const [state, setState] = useState({ loading: true, error: null, map: null });
  const [edits, setEdits] = useState({}); // { agence: { field: value } }
  const [ratio, setRatio] = useState(null); // saisie en cours du ratio réseau (null = inchangé)
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const fichierRefs = useRef(null), fichierRegistre = useRef(null);

  function reload() {
    setState((s) => ({ ...s, loading: !s.map }));
    loadNetworkBudgets()
      .then((m) => {
        const map = {};
        Object.keys(m).forEach((k) => { map[k] = m[k].data; });
        setState({ loading: false, error: null, map });
      })
      .catch((err) => setState({ loading: false, error: err.message || 'Erreur de chargement', map: null }));
  }
  useEffect(() => { reload(); }, []);

  const ops = agencesOps();
  // Valeur affichée = édition locale si présente, sinon donnée chargée.
  const merged = useMemo(() => {
    const base = state.map || {};
    const out = {};
    ops.forEach((ag) => { out[ag.nom] = { ...(base[ag.nom] || {}), ...(edits[ag.nom] || {}) }; });
    return out;
  }, [state.map, edits]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ratio réseau actuel : première valeur trouvée dans les budgets
  const ratioBase = useMemo(() => {
    const vals = Object.values(state.map || {}).map((d) => d && d.ratioMaintien);
    const v = vals.find((x) => x !== null && x !== undefined && x !== '');
    return v === undefined ? '' : v;
  }, [state.map]);

  if (state.loading) return <div className="card"><h2>Données agences</h2><p className="hint">Chargement…</p></div>;
  if (state.error) return <div className="card"><h2>Données agences</h2><p className="hint">Erreur : {state.error}</p></div>;

  const insight = refAgencesInsight(merged, ops);

  function setField(nom, field, value) {
    const val = value === '' ? null : +value;
    setEdits((prev) => ({ ...prev, [nom]: { ...(prev[nom] || {}), [field]: val } }));
  }

  async function save() {
    if (!dirty) return;
    setSaving(true); setSavedMsg(null);
    try {
      const r = await saveCgData(edits, ratio === null || ratio === '' ? null : +ratio);
      Object.entries(r.ecrits).forEach(([nom, data]) => applyExternal(nom, data));
      invaliderEtatCG();
      setSavedMsg(r.echecs.length ? 'Enregistrement refusé pour : ' + r.echecs.join(', ') : '✓ ' + r.count + ' agence(s) enregistrée(s)');
      setEdits({}); setRatio(null);
      reload();
    } catch (err) {
      setSavedMsg('Échec : ' + (err.message || 'erreur'));
    } finally {
      setSaving(false);
    }
  }

  const dirty = Object.keys(edits).length > 0 || ratio !== null;

  // Import « Données agences » : écrit directement dans le budget de chaque agence
  // (version lue par le REX), comme la version mono-fichier.
  async function importerRefs(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true); setImportMsg(null);
    try {
      const { rows } = await lireClasseur(file, feuilleAgences);
      const r = parseRefAgences(rows, ops);
      if (r.erreur) { setImportMsg({ ok: false, t: r.erreur }); return; }
      const w = await saveCgData(r.saisies);
      Object.entries(w.ecrits).forEach(([nom, data]) => applyExternal(nom, data));
      invaliderEtatCG();
      // L'import fait foi : les saisies en cours pour ces agences sont remplacées
      setEdits((prev) => { const n = { ...prev }; Object.keys(w.ecrits).forEach((k) => delete n[k]); return n; });
      let t = w.count + ' agence(s) mise(s) à jour';
      if (r.inconnues.length) t += ' — non reconnues : ' + r.inconnues.slice(0, 3).join(', ') + (r.inconnues.length > 3 ? '…' : '');
      if (w.echecs.length) t += ' — refusées par le serveur : ' + w.echecs.join(', ');
      setImportMsg({ ok: !r.inconnues.length && !w.echecs.length, t });
      reload();
    } catch (err) {
      setImportMsg({ ok: false, t: 'Erreur : ' + (err.message || 'lecture impossible') });
    } finally { setImporting(false); }
  }

  // Import du registre RH : équipes de chaque agence (une équipe déjà construite par le
  // REX n'est pas écrasée ; le message le signale).
  async function importerRegistre(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true); setImportMsg(null);
    try {
      const { rows, decoderSerie } = await lireClasseur(file);
      const r = parseRegistre(rows, decoderSerie);
      if (r.erreur) { setImportMsg({ ok: false, t: r.erreur }); return; }
      const w = await saveEquipesImportees(r.parAgence);
      Object.entries(w.ecrites).forEach(([nom, employees]) => applyExternal(nom, { employees }, true));
      invaliderEtatCG();
      let t = w.count + ' agence(s) mise(s) à jour (' + w.totalSal + ' salariés importés)';
      if (r.ecartes) t += ' — ' + r.ecartes + ' ligne(s) écartée(s) (sortis avant 2027, emploi ou agence non reconnus)';
      if (w.gardees.length) t += ' — équipe déjà construite par le REX, non remplacée : ' + w.gardees.join(', ');
      if (w.echecs.length) t += ' — refusées par le serveur : ' + w.echecs.join(', ');
      setImportMsg({ ok: !w.echecs.length, t });
      reload();
    } catch (err) {
      setImportMsg({ ok: false, t: 'Erreur : ' + (err.message || 'lecture impossible') });
    } finally { setImporting(false); }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Données agences — références CG</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => fichierRegistre.current && fichierRegistre.current.click()} disabled={importing}>👥 Importer registre RH</button>
          <button onClick={() => fichierRefs.current && fichierRefs.current.click()} disabled={importing}>📥 Importer données agences</button>
          <input ref={fichierRegistre} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={importerRegistre} data-testid="fichier-registre" />
          <input ref={fichierRefs} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={importerRefs} data-testid="fichier-refs" />
        </div>
      </div>
      {importing ? <p className="hint">⏳ Import en cours…</p> : null}
      {importMsg ? <p data-testid="import-msg" style={{ fontSize: 13, margin: '0 0 12px', color: importMsg.ok ? 'var(--green, #2e7d6f)' : 'var(--orange, #c45300)' }}>{importMsg.t}</p> : null}

      <div className="kpis" style={{ marginBottom: 16 }}>
        {insight.kpis.map((k, i) => <Kpi key={i} {...k} />)}
      </div>

      <div style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink65)', marginBottom: 16 }}
        dangerouslySetInnerHTML={{ __html: insight.text }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14, padding: '12px 14px', border: '1px solid var(--border)', background: 'var(--bg2)' }}>
        <label style={{ margin: 0, fontSize: 12 }}>Ratio de maintien de salaire, tout le réseau (%) :</label>
        <input type="number" min="0" max="100" value={ratio !== null ? ratio : ratioBase} placeholder="ex : 50"
          onChange={(e) => setRatio(e.target.value)} style={{ width: 100 }} />
        <span style={{ fontSize: 12, color: 'var(--ink65)' }}>Part du salaire maintenue par l'entreprise pendant un arrêt maladie / AT. Vide = absences déduites à 100 %. Appliqué à toutes les agences à l'enregistrement.</span>
      </div>

      <div style={{ overflowX: 'auto', marginBottom: 14 }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Agence</th>
              <th style={{ padding: '6px 8px' }}>Zone</th>
              {FIELDS.map((f) => <th key={f.key} style={{ padding: '6px 8px' }}>{f.label}</th>)}
              <th style={{ padding: '6px 8px' }}>Coût horaire</th>
            </tr>
          </thead>
          <tbody>
            {ops.map((ag) => {
              const d = merged[ag.nom] || {};
              const cost = costHourOf(d);
              const juin = costHourJuin(d);
              return (
                <tr key={ag.nom}>
                  <td style={{ padding: '4px 8px' }}><b>{ag.nom}</b></td>
                  <td style={{ textAlign: 'center', padding: '4px 8px' }}>{ag.zone || '—'}</td>
                  {FIELDS.map((f) => (
                    <td key={f.key} style={{ padding: '2px 4px' }}>
                      <input type="number" value={d[f.key] ?? ''} placeholder="—" onChange={(e) => setField(ag.nom, f.key, e.target.value)} style={{ width: f.w }} />
                    </td>
                  ))}
                  <td style={{ fontWeight: 700, color: 'var(--violet2, var(--violet))', fontFamily: 'DM Mono, monospace', padding: '0 8px', whiteSpace: 'nowrap' }}>
                    {cost ? cost + ' €/h' : '—'}
                    {juin ? <div style={{ fontWeight: 400, fontSize: 11 }}>juin : {juin} €/h</div> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={save} disabled={!dirty || saving}>{saving ? '⏳ Enregistrement…' : '💾 Enregistrer les modifications'}</button>
        {dirty ? <span className="hint" style={{ fontSize: 12 }}>{Object.keys(edits).length} agence(s) modifiée(s){ratio !== null ? ' · ratio réseau modifié' : ''} — non enregistré</span> : null}
        {savedMsg ? <span style={{ fontSize: 13, color: savedMsg.startsWith('✓') ? 'var(--green, #2e7d6f)' : 'var(--orange, #c45300)' }}>{savedMsg}</span> : null}
      </div>
    </div>
  );
}
