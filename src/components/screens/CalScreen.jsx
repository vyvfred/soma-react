import { useState } from 'react';
import { useBudget } from '../../context/BudgetContext.jsx';
import { euro } from '../../domain/format.js';
import { needWeeks } from '../../domain/calculations.js';
import { totauxCalendrier } from '../../domain/calTotaux.js';

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

      <BandeauTotaux a={a} month={month} onMonth={setMonth} />

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, fontSize: 12, color: 'var(--ink65)' }}>
        <Legend color="rgba(255,143,0,.15)" border="rgba(255,143,0,.4)" text={'Vacances scolaires (zone ' + (a.schoolZone || '?') + ')'} />
        <Legend color="rgba(139,127,255,.15)" border="rgba(139,127,255,.45)" text="Samedi / Dimanche" />
        <Legend color="rgba(196,83,0,.18)" border="var(--orange, #c45300)" text="Jour férié" />
        <span style={{ fontSize: 12 }}>· {nbFeries} fériés · {nbVacances} j. vacances · {nbWeekend} week-end</span>
      </div>

      <div className="calJours" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
        {WD.map((w) => <div key={w} style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', color: 'var(--ink65)' }}>{w}</div>)}
        {Array.from({ length: start }).map((_, i) => <div key={'e' + i} />)}
        {days.map((d) => {
          const st = TYPE_STYLE[d.type];
          return (
            <div key={d.day} className="calJour" style={{ minHeight: 78, padding: 6, border: '1px solid ' + (st ? st.border : 'var(--border)'), background: st ? st.bg : 'var(--card)', fontSize: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <b>{d.day}</b>
                {st ? <span className="calJourBadge" style={{ background: st.badgeBg, color: '#fff', fontSize: 8, fontWeight: 700, padding: '1px 4px', textTransform: 'uppercase' }}>{st.badge}</span> : null}
              </div>
              <div className="calJourDetail" style={{ color: 'var(--ink65)', fontSize: 9, marginBottom: 3 }}>S{d.week}</div>
              <div className="calJourDetail" style={{ fontSize: 10 }} title={'San = sanitaire' + (a.actSai ? ', Sais = saisonnier' : '') + (a.actTP ? ', TP = transport de personnes' : '')}>San {euro(d.ca.san)}</div>
              {a.actSai ? <div className="calJourDetail" style={{ fontSize: 10 }}>Sais {euro(d.ca.sai)}</div> : null}
              {a.actTP ? <div className="calJourDetail" style={{ fontSize: 10 }}>TP {euro(d.ca.tp)}</div> : null}
              <div className="calJourTotal" style={{ fontWeight: 700, marginTop: 2, fontFamily: 'DM Mono, monospace' }}>{euro(d.total)}</div>
            </div>
          );
        })}
      </div>

      <h3 style={{ margin: '22px 0 8px', fontSize: 15 }}>Synthèse hebdomadaire</h3>
      <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }} data-testid="cal-semaines">
        <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: 360 }}>
          <thead><tr style={{ color: 'var(--ink65)' }}><th style={{ textAlign: 'left', padding: '4px 8px' }}>Semaine</th><th style={{ padding: '4px 8px' }}>Jours</th><th style={{ padding: '4px 8px', textAlign: 'right' }}>CA</th><th style={{ padding: '4px 8px', textAlign: 'right' }}>Heures</th></tr></thead>
          <tbody>
            {needWeeks(a).map((w) => (
              <tr key={w.week} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '4px 8px' }}>S{w.week}</td>
                <td style={{ padding: '4px 8px', textAlign: 'center' }}>{w.days}</td>
                <td className="num" style={{ padding: '4px 8px', textAlign: 'right' }}>{euro(w.ca)}</td>
                <td className="num" style={{ padding: '4px 8px', textAlign: 'right' }}>{w.hours.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const M3 = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const pct = (x) => (x * 100).toFixed(1).replace('.', ',') + ' %';

function BandeauTotaux({ a, month, onMonth }) {
  const { mois, total } = totauxCalendrier(a.cal);
  const t = mois[month];
  const kpis = [
    ['CA du mois', euro(t.ca), true],
    ["Part de l'année", pct(t.part)],
    ['CA moyen / jour', euro(t.moyJour)],
    ['Jours de semaine hors vacances scolaires', t.ouvres],
    ['Vacances', t.vacances],
    ['Samedis', t.samedis],
    ['Dimanches', t.dimanches],
    ['Fériés', t.feries]
  ];
  const lignes = [
    ['Jours de semaine hors vacances scolaires', 'ouvres'], ['Vacances', 'vacances'], ['Samedis', 'samedis'], ['Dimanches', 'dimanches'], ['Fériés', 'feries'], ['Total jours', 'jours'],
    ['CA Sanitaire', 'san', true]
  ];
  if (a.actSai) lignes.push(['CA Saisonnier', 'sai', true]);
  if (a.actTP) lignes.push(['CA Transport de personnes', 'tp', true]);
  lignes.push(['CA total', 'ca', true, true], ["Part de l'année", 'part', 'pct']);
  const fmt = (v, k) => (k === 'pct' ? pct(v) : k ? euro(v) : v);
  const cell = { padding: '4px 8px', textAlign: 'right', whiteSpace: 'nowrap' };
  const sel = { background: 'rgba(139,127,255,.14)' };
  return (
    <div data-testid="cal-totaux-mensuels" data-visite="cal-totaux" style={{ marginBottom: 16, border: '1px solid var(--border)', background: 'var(--bg3, var(--card))', padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Récapitulatif — {M[month]}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {kpis.map(([l, v, fort]) => (
          <div key={l} style={{ minWidth: 92, padding: '6px 10px', border: '1px solid var(--border)', background: 'var(--card)' }}>
            <div style={{ fontSize: 10, color: 'var(--ink65)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{l}</div>
            <div style={{ fontSize: fort ? 16 : 14, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: fort ? 'var(--violet2, var(--violet))' : undefined }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
          <thead>
            <tr style={{ color: 'var(--ink65)' }}>
              <th style={{ ...cell, textAlign: 'left' }}>Totaux mensuels</th>
              {mois.map((m) => (
                <th key={m.month} data-mois={m.month} onClick={() => onMonth(m.month)} title={'Afficher ' + M[m.month]}
                  style={{ ...cell, cursor: 'pointer', textDecoration: m.month === month ? 'none' : 'underline dotted', ...(m.month === month ? sel : {}) }}>{M3[m.month]}</th>
              ))}
              <th style={cell}>Année</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map(([l, k, f, fort]) => (
              <tr key={k} style={{ borderTop: '1px solid var(--border)', fontWeight: fort ? 700 : undefined }}>
                <td style={{ ...cell, textAlign: 'left' }}>{l}</td>
                {mois.map((m) => <td key={m.month} className="num" style={{ ...cell, ...(m.month === month ? sel : {}) }}>{fmt(m[k], f)}</td>)}
                <td className="num" style={{ ...cell, fontWeight: 700 }}>{fmt(total[k], f)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
