import TexteLectureSeule from '../TexteLectureSeule.jsx';
import { estSaisieDR } from '../../domain/saisiesDR.js';
import { useBudget } from '../../context/BudgetContext.jsx';
import { genCal, caFunMois, caFunJour, caFunAnnuel } from '../../domain/calculations.js';
import { euro } from '../../domain/format.js';

const M = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const DAY_TYPES = [
  { key: 'semaine', label: 'Jour de semaine' },
  { key: 'vacances', label: 'Vacances scolaires' },
  { key: 'samedi', label: 'Samedi' },
  { key: 'dimanche', label: 'Dimanche' },
  { key: 'ferie', label: 'Jour férié' }
];
const ACTIVITIES = [
  { key: 'san', label: 'Sanitaire', flag: 'actSan' },
  { key: 'sai', label: 'Saisonnier', flag: 'actSai' },
  { key: 'tp', label: 'Transport de personnes', flag: 'actTP' }
];

export default function RefsScreen() {
  const { agency: a, loading, error, editable, update, agenceNom } = useBudget();

  if (!agenceNom) return <div className="card"><h2>Références CA</h2><p className="hint">Aucune agence rattachée.</p></div>;
  if (loading) return <div className="card"><h2>Références CA</h2><p className="hint">Chargement…</p></div>;
  if (error) return <div className="card"><h2>Références CA</h2><p className="hint">Erreur : {error}</p></div>;
  if (!a) return <div className="card"><h2>Références CA — {agenceNom}</h2><p className="hint">Budget non commencé.</p></div>;

  // Modifie une référence puis régénère le calendrier (comme setRef → genCal).
  function setRef(act, m, type, value) {
    update((draft) => {
      const a2 = JSON.parse(JSON.stringify(draft));
      if (!a2.refs) a2.refs = {};
      if (!a2.refs[act]) a2.refs[act] = Array.from({ length: 12 }, () => ({}));
      a2.refs[act][m] = { ...a2.refs[act][m], [type]: value === '' ? null : +value };
      genCal(a2);
      return a2;
    });
  }
  function setFun(m, value) {
    update((draft) => {
      const v = (draft.caFuneraire && draft.caFuneraire.length === 12 ? draft.caFuneraire : Array(12).fill(null)).slice();
      v[m] = value === '' ? null : Math.max(0, +String(value).replace(',', '.') || 0);
      draft.caFuneraire = v;
      return draft;
    });
  }
  function toggleActivity(flag, checked) {
    update((draft) => {
      const a2 = JSON.parse(JSON.stringify(draft));
      a2[flag] = checked;
      genCal(a2);
      return a2;
    });
  }

  const activeActs = ACTIVITIES.filter((act) => a[act.flag]);

  return (
    <div className="card">
      <h2 style={{ marginBottom: 8 }}>Références CA — {a.name}</h2>
      <p className="hint" style={{ marginBottom: 14 }}>
        Le CA de référence par type de jour alimente automatiquement le calendrier et le chiffre d'affaires prévisionnel.
      </p>

      {/* Activités actives */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {ACTIVITIES.map((act) => (
          <label key={act.key} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={!!a[act.flag]} disabled={!editable || act.key === 'san'} onChange={(e) => toggleActivity(act.flag, e.target.checked)} />
            {act.label}{act.key === 'san' ? ' (toujours active)' : ''}
          </label>
        ))}
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }} title="Activité commerciale sans besoin d'équipage : CA saisi par mois, compté dans le CA mais pas dans les heures nécessaires ni le TXR">
          <input type="checkbox" data-testid="act-fun" checked={!!a.actFun} disabled={!editable} onChange={(e) => toggleActivity('actFun', e.target.checked)} />
          Funéraire
        </label>
      </div>

      {!editable ? (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--blue-light, rgba(61,111,214,.10))', border: '1px solid var(--blue2, #3d6fd6)', fontSize: 13, color: 'var(--blue2, #3d6fd6)' }}>
          <TexteLectureSeule />
        </div>
      ) : null}

      {activeActs.map((act) => {
        const refs = (a.refs && a.refs[act.key]) || Array.from({ length: 12 }, () => ({}));
        return (
          <div key={act.key} data-visite="refs" style={{ marginBottom: 22 }}>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>{act.label} — CA par jour (€)</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '4px 8px' }}>Type de jour</th>
                    {M.map((m) => <th key={m} style={{ padding: '4px 4px' }}>{m}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {DAY_TYPES.map((dt) => (
                    <tr key={dt.key}>
                      <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>{dt.label}</td>
                      {M.map((_, m) => (
                        <td key={m} style={{ padding: '2px 3px' }}>
                          <input type="number" data-saisie-dr={estSaisieDR(a, 'refs.' + act.key + '.' + m + '.' + dt.key) ? '1' : undefined} value={(refs[m] && refs[m][dt.key]) ?? ''} placeholder="—" disabled={!editable}
                            onChange={(e) => setRef(act.key, m, dt.key, e.target.value)} style={{ width: 56 }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {a.actFun ? (
        <div data-testid="refs-fun" style={{ marginBottom: 22 }}>
          <h3 style={{ fontSize: 14, marginBottom: 4 }}>Funéraire — CA par mois (€)</h3>
          <p className="hint" style={{ fontSize: 12, margin: '0 0 8px' }}>Activité commerciale sans besoin d'équipage : le montant du mois est réparti à parts égales sur chaque jour du calendrier. Il compte dans le chiffre d'affaires et le compte de résultat, mais pas dans les heures nécessaires, le TXR ni l'objectif de CA.</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
              <thead><tr><th style={{ textAlign: 'left', padding: '4px 8px' }}>Mois</th>{M.map((m) => <th key={m} style={{ padding: '4px 4px' }}>{m}</th>)}<th style={{ padding: '4px 8px' }}>Total</th></tr></thead>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>CA du mois</td>
                  {M.map((_, m) => (
                    <td key={m} style={{ padding: '2px 3px' }}>
                      <input type="number" min="0" data-testid={'fun-' + m} data-saisie-dr={estSaisieDR(a, 'caFuneraire.' + m) ? '1' : undefined} value={(a.caFuneraire && a.caFuneraire[m] !== null && a.caFuneraire[m] !== undefined) ? a.caFuneraire[m] : ''} placeholder="—" disabled={!editable}
                        onChange={(e) => setFun(m, e.target.value)} style={{ width: 70 }} />
                    </td>
                  ))}
                  <td className="num" style={{ padding: '4px 8px' }}><b>{euro(caFunAnnuel(a))}</b></td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px', whiteSpace: 'nowrap', color: 'var(--ink65)' }}>Par jour</td>
                  {M.map((_, m) => <td key={m} className="num" style={{ padding: '2px 4px', color: 'var(--ink65)' }}>{caFunMois(a, m) ? Math.round(caFunJour(a, m)).toLocaleString('fr-FR') : ''}</td>)}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <p className="hint" style={{ fontSize: 12 }}>
        CA annuel calculé (calendrier) : <b>{a.cal && a.cal.length ? euro(a.cal.reduce((s, d) => s + (d.total || 0), 0) + caFunAnnuel(a)) : '—'}</b>{a.actFun && caFunAnnuel(a) ? <> dont funéraire <b>{euro(caFunAnnuel(a))}</b></> : null}
      </p>
    </div>
  );
}
