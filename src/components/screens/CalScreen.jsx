import { useState } from 'react';
import { useBudget } from '../../context/BudgetContext.jsx';
import { euro } from '../../domain/format.js';

const M = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const WD = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const TYPE_STYLE = {
  ferie: { bg: 'rgba(196,83,0,.18)', border: 'var(--orange, #c45300)', badge: 'Férié', badgeBg: 'var(--orange, #c45300)' },
  vacances: { bg: 'rgba(255,143,0,.15)', border: 'rgba(255,143,0,.4)', badge: 'Vacances', badgeBg: '#FF8F00' },
  samedi: { bg: 'rgba(139,127,255,.15)', border: 'rgba(139,127,255,.45)', badge: 'Samedi', badgeBg: '#8B7FFF' },
  dimanche: { bg: 'rgba(139,127,255,.15)', border: 'rgba(139,127,255,.45)', badge: 'Dimanche', badgeBg: '#8B7FFF' }
};

export default function CalScreen() {
  const { agency: a, loading, error, agenceNom } = useBudget();
  const [month, setMonth] = useState(0);

  if (!agenceNom) return <div className="card"><h2>Calendrier</h2><p className="hint">Aucune agence rattachée.</p></div>;
  if (loading) return <div className="card"><h2>Calendrier</h2><p className="hint">Chargement…</p></div>;
  if (error) return <div className="card"><h2>Calendrier</h2><p className="hint">Erreur : {error}</p></div>;
  if (!a) return <div className="card"><h2>Calendrier — {agenceNom}</h2><p className="hint">Budget non commencé.</p></div>;
  if (!a.cal || !a.cal.length) return <div className="card"><h2>Calendrier — {agenceNom}</h2><p className="hint">Le calendrier se génère à partir des références CA. Renseignez-les d'abord.</p></div>;

  const days = a.cal.filter((d) => d.month === month);
  const start = (new Date(2027, month, 1).getDay() + 6) % 7;

  const nbFeries = days.filter((d) => d.type === 'ferie').length;
  const nbVacances = days.filter((d) => d.type === 'vacances').length;
  const nbWeekend = days.filter((d) => d.type === 'samedi' || d.type === 'dimanche').length;
  const caMois = days.reduce((s, d) => s + (d.total || 0), 0);

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Calendrier — {a.name}</h2>
        <select value={month} onChange={(e) => setMonth(+e.target.value)}>
          {M.map((x, i) => <option key={i} value={i}>{x}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--ink65)' }}>
          CA du mois : <b style={{ color: 'var(--violet2, var(--violet))' }}>{euro(caMois)}</b>
        </span>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, fontSize: 12, color: 'var(--ink65)' }}>
        <Legend color="rgba(255,143,0,.15)" border="rgba(255,143,0,.4)" text={'Vacances scolaires (zone ' + (a.schoolZone || '?') + ')'} />
        <Legend color="rgba(139,127,255,.15)" border="rgba(139,127,255,.45)" text="Samedi / Dimanche" />
        <Legend color="rgba(196,83,0,.18)" border="var(--orange, #c45300)" text="Jour férié" />
        <span style={{ fontSize: 12 }}>· {nbFeries} fériés · {nbVacances} j. vacances · {nbWeekend} week-end</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {WD.map((w) => <div key={w} style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', color: 'var(--ink65)' }}>{w}</div>)}
        {Array.from({ length: start }).map((_, i) => <div key={'e' + i} />)}
        {days.map((d) => {
          const st = TYPE_STYLE[d.type];
          return (
            <div key={d.day} style={{ minHeight: 78, padding: 6, border: '1px solid ' + (st ? st.border : 'var(--border)'), background: st ? st.bg : 'var(--card)', fontSize: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <b>{d.day}</b>
                {st ? <span style={{ background: st.badgeBg, color: '#fff', fontSize: 8, fontWeight: 700, padding: '1px 4px', textTransform: 'uppercase' }}>{st.badge}</span> : null}
              </div>
              <div style={{ color: 'var(--ink65)', fontSize: 9, marginBottom: 3 }}>S{d.week}</div>
              <div style={{ fontSize: 10 }}>San {euro(d.ca.san)}</div>
              {a.actSai ? <div style={{ fontSize: 10 }}>Sais {euro(d.ca.sai)}</div> : null}
              {a.actTP ? <div style={{ fontSize: 10 }}>TP {euro(d.ca.tp)}</div> : null}
              <div style={{ fontWeight: 700, marginTop: 2, fontFamily: 'DM Mono, monospace' }}>{euro(d.total)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Legend({ color, border, text }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 14, height: 14, background: color, border: '1px solid ' + border, display: 'inline-block' }} />
      {text}
    </span>
  );
}
