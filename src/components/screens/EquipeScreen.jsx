import { useBudget } from '../../context/BudgetContext.jsx';
import { teamInsight } from '../../domain/teamInsight.js';
import { isRoulant } from '../../domain/calculations.js';

const QUALS = ['DEA', 'AA', 'TAXI', 'TPMR', 'REGULATEUR', 'REX'];
const CONTRACTS = ['CDI', 'CDD', 'APPRENTI', 'INTERIM'];
const NUM_FIELDS = ['hours', 'hoursM', 'hsTarget', 'pctRoulant', 'joursSem', 'coutJour'];

const th = { textAlign: 'left', fontSize: 11, color: 'var(--ink65)', padding: '6px 8px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
const td = { padding: '4px 8px', borderBottom: '1px solid var(--border)' };

export default function EquipeScreen() {
  const { agency: a, loading, error, editable, update, agenceNom } = useBudget();

  if (!agenceNom) return <div className="card"><h2>Équipe</h2><p className="hint">Aucune agence n'est rattachée à votre profil.</p></div>;
  if (loading) return <div className="card"><h2>Équipe</h2><p className="hint">Chargement du budget…</p></div>;
  if (error) return <div className="card"><h2>Équipe</h2><p className="hint">Impossible de charger le budget : {error}</p></div>;
  if (!a) return <div className="card"><h2>Équipe — {agenceNom}</h2><p className="hint">Budget non commencé pour cette agence.</p></div>;

  const { nbSal, etpTotal, capaciteAn, phrase } = teamInsight(a);

  // Mutations — reproduisent setEmp / delEmp / addEmployee / setDR de l'app actuelle.
  function setEmp(i, field, value) {
    update((draft) => {
      const emps = draft.employees.slice();
      const e = { ...emps[i] };
      e[field] = NUM_FIELDS.includes(field) ? +value : value;
      if (field === 'name') e.nom = value;
      if (field === 'contract') e.contrat = value;
      if ((field === 'dateEntree' || field === 'dateSortie') && e.dateEntree && e.dateSortie && e.dateSortie < e.dateEntree) {
        alert('Attention : la date de sortie (' + e.dateSortie + ') est antérieure à la date d\'entrée (' + e.dateEntree + '). Ce salarié ne sera compté sur aucune semaine. Corrigez les dates.');
      }
      emps[i] = e;
      draft.employees = emps;
      return draft;
    });
  }
  function delEmp(i) {
    update((draft) => { draft.employees = draft.employees.filter((_, idx) => idx !== i); return draft; });
  }
  function addEmployee() {
    update((draft) => {
      draft.employees = draft.employees.concat({ name: 'Nouveau salarié', qual: 'DEA', contract: 'CDI', hours: 35, hoursM: 0, hsTarget: 3, pctRoulant: 100, joursSem: 5, coutJour: 0, dateEntree: '', dateSortie: '' });
      return draft;
    });
  }
  function addPoste() {
    update((draft) => {
      draft.employees = draft.employees.concat({ name: 'Poste prévisionnel', qual: 'DEA', contract: 'CDD', hours: 35, hoursM: 0, hsTarget: 3, pctRoulant: 100, joursSem: 5, coutJour: 0, dateEntree: '2027-06-01', dateSortie: '2027-09-30' });
      return draft;
    });
  }
  function setDR(field, value) {
    update((draft) => { draft[field] = +value; return draft; });
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: 14 }}>Équipe — {agenceNom}</h2>

      <div className="teamKpiRow" style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        <Kpi label="Salariés" value={nbSal} sub={nbSal > 1 ? 'personnes' : 'personne'} />
        <Kpi label="Effectif" value={etpTotal.toFixed(1) + ' ETP'} sub="équivalent temps plein" />
        <Kpi label="Capacité" value={capaciteAn > 0 ? capaciteAn.toLocaleString('fr-FR') + ' h' : '—'} sub="heures / an" />
      </div>

      <div style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink65)', marginBottom: 16 }}
        dangerouslySetInnerHTML={{ __html: phrase }} />

      {!editable ? (
        <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--blue-light, rgba(61,111,214,.10))', border: '1px solid var(--blue2, #3d6fd6)', fontSize: 13, color: 'var(--blue2, #3d6fd6)' }}>
          🔒 Budget engagé dans le circuit de validation — lecture seule.
        </div>
      ) : null}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Nom', 'Qualif.', 'Contrat', 'H. base', '% roul.', 'Jours/sem', 'Entrée 2027', 'Sortie 2027', 'ETP', 'Coût/jour', ''].map((h, i) => <th key={i} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {a.employees.map((e, i) => {
              const nom = e.name || e.nom || '';
              const contrat = e.contract || e.contrat || 'CDI';
              const roul = isRoulant(e.qual);
              const etp = roul ? ((+e.hours || 0) / 35).toFixed(2) : '—';
              const isCddSais = contrat === 'CDD' && (e.dateEntree || e.dateSortie);
              return (
                <tr key={i}>
                  <td style={td}>
                    <input type="text" value={nom} disabled={!editable} onChange={(ev) => setEmp(i, 'name', ev.target.value)} style={{ width: 150 }} />
                    {isCddSais ? <span style={{ fontSize: 9, background: 'var(--orange, #c45300)', color: '#fff', padding: '1px 4px', marginLeft: 4 }}>CDD</span> : null}
                  </td>
                  <td style={td}>
                    <select value={e.qual} disabled={!editable} onChange={(ev) => setEmp(i, 'qual', ev.target.value)} style={{ width: 90 }}>
                      {QUALS.map((q) => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </td>
                  <td style={td}>
                    <select value={contrat} disabled={!editable} onChange={(ev) => setEmp(i, 'contract', ev.target.value)} style={{ width: 74 }}>
                      {CONTRACTS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td style={td}><input type="number" value={e.hours || 0} disabled={!editable} onChange={(ev) => setEmp(i, 'hours', ev.target.value)} style={{ width: 60 }} /></td>
                  <td style={td}><input type="number" value={e.pctRoulant || 0} min="0" max="100" disabled={!editable} onChange={(ev) => setEmp(i, 'pctRoulant', ev.target.value)} style={{ width: 55 }} />%</td>
                  <td style={td}><input type="number" value={e.joursSem || 5} min="1" max="7" disabled={!editable} onChange={(ev) => setEmp(i, 'joursSem', ev.target.value)} style={{ width: 50 }} /></td>
                  <td style={td}><input type="date" value={e.dateEntree || ''} min="2027-01-01" max="2027-12-31" disabled={!editable} onChange={(ev) => setEmp(i, 'dateEntree', ev.target.value)} style={{ width: 140, fontSize: 11 }} /></td>
                  <td style={td}><input type="date" value={e.dateSortie || ''} min="2027-01-01" max="2027-12-31" disabled={!editable} onChange={(ev) => setEmp(i, 'dateSortie', ev.target.value)} style={{ width: 140, fontSize: 11 }} /></td>
                  <td style={{ ...td, textAlign: 'right' }} className="num">{etp}</td>
                  <td style={td}>
                    {!roul
                      ? <input type="number" value={e.coutJour || 0} disabled={!editable} onChange={(ev) => setEmp(i, 'coutJour', ev.target.value)} style={{ width: 80 }} placeholder="€/j" />
                      : <span style={{ color: 'var(--ink30)' }}>—</span>}
                  </td>
                  <td style={td}>
                    <button className="danger" disabled={!editable} onClick={() => delEmp(i)} style={{ padding: '4px 8px', fontSize: 11 }}>✕</button>
                  </td>
                </tr>
              );
            })}
            <tr style={{ background: 'var(--blue-light, rgba(61,111,214,.10))' }}>
              <td colSpan={6} style={td}><b>Quote-part Directeur Régional</b></td>
              <td colSpan={2} style={td}>
                <label style={{ fontSize: 10, display: 'block' }}>Coût annuel DR (€)</label>
                <input type="number" value={a.drCostAnnual || 0} disabled={!editable} onChange={(ev) => setDR('drCostAnnual', ev.target.value)} style={{ width: 120 }} />
              </td>
              <td colSpan={3} style={td}>
                <label style={{ fontSize: 10, display: 'block' }}>% affecté à cette agence</label>
                <input type="number" value={a.drPct || 0} min="0" max="100" disabled={!editable} onChange={(ev) => setDR('drPct', ev.target.value)} style={{ width: 80 }} />%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {editable ? (
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={addEmployee}>+ Ajouter un salarié</button>
          <button className="secondary" onClick={addPoste}>+ Poste prévisionnel (CDD saisonnier)</button>
        </div>
      ) : null}
    </div>
  );
}

function Kpi({ label, value, sub }) {
  return (
    <div className="teamKpi" style={{ flex: 1, minWidth: 140, padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
      <div className="teamKpiLabel" style={{ fontSize: 11, color: 'var(--ink65)' }}>{label}</div>
      <div className="teamKpiValue" style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      {sub ? <div className="teamKpiSub" style={{ fontSize: 11, color: 'var(--ink30)' }}>{sub}</div> : null}
    </div>
  );
}
