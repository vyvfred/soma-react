import { useEffect, useRef, useState } from 'react';
import { useBudget } from '../../context/BudgetContext.jsx';
import { euro } from '../../domain/format.js';
import { needWeeks, caFunMois, caFunJour } from '../../domain/calculations.js';
import { totauxCalendrier } from '../../domain/calTotaux.js';
import { activitesAjustables, joursCibles, appliquerAjustJours, nbJoursAjustes, effacerAjustJours, libelleJour, libellePortee, LIB_TYPE_JOUR } from '../../domain/ajustJours.js';

const M = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const WD = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const TYPE_STYLE = {
  ferie: { bg: 'rgba(196,83,0,.18)', border: 'var(--orange, #c45300)', badge: 'Férié', badgeBg: 'var(--orange, #c45300)' },
  vacances: { bg: 'rgba(255,143,0,.15)', border: 'rgba(255,143,0,.4)', badge: 'Vacances', badgeBg: '#FF8F00' },
  samedi: { bg: 'rgba(139,127,255,.15)', border: 'rgba(139,127,255,.45)', badge: 'Samedi', badgeBg: '#8B7FFF' },
  dimanche: { bg: 'rgba(139,127,255,.15)', border: 'rgba(139,127,255,.45)', badge: 'Dimanche', badgeBg: '#8B7FFF' }
};

export default function CalScreen() {
  const { agency: a, loading, error, agenceNom, update, editable } = useBudget();
  const [month, setMonth] = useState(0);
  const [sel, setSel] = useState(null);

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
          const choisi = sel && sel.m === month && sel.d === d.day;
          return (
            <div key={d.day} className="calJour" data-testid={'jour-' + d.day} role={editable ? 'button' : undefined} tabIndex={editable ? 0 : undefined}
              onClick={editable ? () => setSel(choisi ? null : { m: month, d: d.day }) : undefined}
              onKeyDown={editable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(choisi ? null : { m: month, d: d.day }); } } : undefined}
              title={d.ref ? 'CA ajusté sur le calendrier — référence : ' + euro(d.ref.san + d.ref.sai + d.ref.tp) : (editable ? 'Cliquer pour ajuster le CA de ce jour' : undefined)}
              style={{ minHeight: 78, padding: 6, border: choisi ? '2px solid var(--violet)' : d.ref ? '1px dashed var(--violet)' : '1px solid ' + (st ? st.border : 'var(--border)'), background: st ? st.bg : 'var(--card)', fontSize: 11, cursor: editable ? 'pointer' : 'default', position: 'relative' }}>
              {d.ref ? <span data-testid={'ajuste-' + d.day} style={{ position: 'absolute', right: 4, bottom: 3, fontSize: 11, color: 'var(--violet)' }} aria-label="jour ajusté">✎</span> : null}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <b>{d.day}</b>
                {st ? <span className="calJourBadge" style={{ background: st.badgeBg, color: '#fff', fontSize: 8, fontWeight: 700, padding: '1px 4px', textTransform: 'uppercase' }}>{st.badge}</span> : null}
              </div>
              <div className="calJourDetail" style={{ color: 'var(--ink65)', fontSize: 9, marginBottom: 3 }}>S{d.week}</div>
              <div className="calJourDetail" style={{ fontSize: 10 }} title={'San = sanitaire' + (a.actSai ? ', Sais = saisonnier' : '') + (a.actTP ? ', TP = transport de personnes' : '')}>San {euro(d.ca.san)}</div>
              {a.actSai ? <div className="calJourDetail" style={{ fontSize: 10 }}>Sais {euro(d.ca.sai)}</div> : null}
              {a.actTP ? <div className="calJourDetail" style={{ fontSize: 10 }}>TP {euro(d.ca.tp)}</div> : null}
              {caFunMois(a, d.month) ? <div className="calJourDetail" style={{ fontSize: 10, color: 'var(--ink65)' }} title="Funéraire : CA du mois réparti à parts égales sur les jours, sans besoin d'équipage">Fun {euro(caFunJour(a, d.month))}</div> : null}
              <div className="calJourTotal" style={{ fontWeight: 700, marginTop: 2, fontFamily: 'DM Mono, monospace' }}>{euro(d.total + caFunJour(a, d.month))}</div>
            </div>
          );
        })}
      </div>

      {sel && sel.m === month && editable ? <EditeurJour a={a} m={sel.m} d={sel.d} update={update} onClose={() => setSel(null)} /> : null}

      {editable ? (
        <p className="hint" style={{ fontSize: 12, marginTop: 10 }}>
          ✎ Cliquez sur un jour pour ajuster son CA (par exemple le transport de personnes un jour de la semaine), pour ce jour seul ou pour tous les mêmes jours du mois ou de l'année.
          {nbJoursAjustes(a) ? <> <b data-testid="nb-ajustes">{nbJoursAjustes(a)} jour{nbJoursAjustes(a) > 1 ? 's' : ''} ajusté{nbJoursAjustes(a) > 1 ? 's' : ''}</b> sur l'année.{' '}
            <button data-testid="effacer-ajustements" onClick={() => { if (window.confirm('Revenir aux références CA pour les ' + nbJoursAjustes(a) + ' jours ajustés ?')) update((x) => effacerAjustJours(x)); }} style={{ width: 'auto', margin: 0, fontSize: 11, padding: '3px 8px' }}>Tout remettre aux références</button></> : null}
        </p>
      ) : null}

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

// Ajustement d'un jour : une valeur par activité, appliquée à ce jour seul ou aux mêmes jours du mois / de l'année
function EditeurJour({ a, m, d, update, onClose }) {
  const jour = a.cal.find((x) => x.month === m && x.day === d);
  const acts = activitesAjustables(a);
  const ref = jour.ref || jour.ca;
  const [vals, setVals] = useState(() => Object.fromEntries(acts.map(([k]) => [k, jour.ref ? String(jour.ca[k]) : ''])));
  const [portee, setPortee] = useState('jour');
  const boite = useRef(null);
  useEffect(() => { if (boite.current && boite.current.scrollIntoView) boite.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [m, d]);
  const appliquer = (efface) => {
    const cles = joursCibles(a, m, d, portee);
    const valeurs = Object.fromEntries(acts.map(([k]) => [k, efface ? '' : vals[k]]));
    update((x) => appliquerAjustJours(x, cles, valeurs));
    onClose();
  };
  return (
    <div ref={boite} data-testid="editeur-jour" style={{ marginTop: 14, padding: '14px 16px', border: '1px solid var(--violet)', background: 'var(--bg2)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <b style={{ fontSize: 15 }}>{libelleJour(m, d)}</b>
        <span style={{ fontSize: 12, color: 'var(--ink65)' }}>{LIB_TYPE_JOUR[jour.type]}</span>
        <button onClick={onClose} aria-label="Fermer" style={{ marginLeft: 'auto', width: 'auto', margin: 0, fontSize: 11, padding: '3px 8px' }}>✕</button>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
        {acts.map(([k, lib]) => (
          <label key={k} style={{ fontSize: 12 }}>
            <span style={{ display: 'block', color: 'var(--ink65)', marginBottom: 4 }}>{lib} (référence {euro(ref[k])})</span>
            <input data-testid={'ajust-' + k} type="text" inputMode="decimal" value={vals[k]} placeholder={String(ref[k])} onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))} style={{ width: 150 }} />
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, marginBottom: 12 }}>
        {['jour', 'mois', 'annee'].map((p) => (
          <label key={p} style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
            <input type="radio" name="portee" data-testid={'portee-' + p} checked={portee === p} onChange={() => setPortee(p)} style={{ width: 'auto', margin: 0 }} />
            {libellePortee(a, m, d, p)}
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="ok" data-testid="ajust-appliquer" onClick={() => appliquer(false)} style={{ width: 'auto', margin: 0 }}>Appliquer ({joursCibles(a, m, d, portee).length} jour{joursCibles(a, m, d, portee).length > 1 ? 's' : ''})</button>
        <button data-testid="ajust-reference" onClick={() => appliquer(true)} style={{ width: 'auto', margin: 0 }}>Revenir à la référence</button>
      </div>
      <p className="hint" style={{ fontSize: 11, margin: '10px 0 0' }}>Laissez une case vide pour garder la référence de l'activité. ↶ (Ctrl+Z) annule un ajustement.</p>
    </div>
  );
}

const M3 = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const pct = (x) => (x * 100).toFixed(1).replace('.', ',') + ' %';

function BandeauTotaux({ a, month, onMonth }) {
  const { mois, total } = totauxCalendrier(a.cal, M.map((_, m) => caFunMois(a, m)));
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
  if (total.fun) lignes.push(['CA Funéraire (sans besoin d\'équipage)', 'fun', true]);
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
