import TexteLectureSeule from '../TexteLectureSeule.jsx';
import { estSaisieDR } from '../../domain/saisiesDR.js';
import { useState } from 'react';
import { useBudget } from '../../context/BudgetContext.jsx';
import { setAbsPartMois } from '../../domain/calculations.js';
import { hsTot, coutHSTotal, refAgenceSeuils, cpGeneres, cpPlanifies, hsRows, cpNRAcquis, cpNRSaisis, cpNRVide, etpNR, repartirCPNRAuto, salariesNR, joursSemaine, paiesSemaine, hsPayees2028, hs50Auto, tauxHS50Mois, part50Semaine } from '../../domain/calculations.js';
import { reequilibrerSick } from '../../domain/presence.js';
import { repartirCPAuto, ajusterCPMinimal } from '../../domain/repartitionCP.js';
import { etatConges, rafraichirConges } from '../../domain/rafraichirConges.js';
import { presenceInsight } from '../../domain/presenceInsight.js';
import {
  progressionMois, etatMois, semainesMois, impactMois, semainesCritiques, verrouillerMois, deverrouillerMois,
  reinitialiserCP, setPresenceSemaine, messageValidation, setMontantSemaine, indemnites, hsImproductives, moyenneHS50,
  relancerRepartitionCP
} from '../../domain/presenceMois.js';
import { cpProposeMois, reprendrePropositionMois } from '../../domain/repartitionCP.js';
import { euro, pct } from '../../domain/format.js';
import { toast } from '../Toast.jsx';
import ChargeCurve from './ChargeCurve.jsx';
import { Pourquoi } from '../Vision.jsx';

// « Payé en » d'une semaine : mois de paie (les deux si elle est à cheval sur deux périodes), paie 2028 signalée
const libPaies = (ps) => ps.map((p) => p.mois === 'jan2028'
  ? <span key="j28" style={{ color: 'var(--orange, #c45300)' }} title="Semaine payée sur la paie de janvier 2028 : sans effet sur le budget 2027">paie janv. 2028</span>
  : p.mois === 'dec2026' ? <span key="d26">variables déc. 2026</span>
    : <span key={p.mois}>{M[p.mois]}{ps.length > 1 ? ' (' + Math.round(p.part * 7) + ' j)' : ''}</span>)
  .reduce((acc, el, i) => (i ? [...acc, ' + ', el] : [el]), []);
// Semaine incomplète (début/fin d'année) : « 3 j en 2027 (1er-3 janv.) »
const libIncomplete = (j) => j.length + ' j en 2027 (' + j[0].day + (j.length > 1 ? '-' + j[j.length - 1].day : '') + ' ' + ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'][j[0].month] + ')';
const M = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const MOIS_LONGS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const clone = (o) => JSON.parse(JSON.stringify(o));
const fmt1 = (v) => (Math.round((+v || 0) * 10) / 10).toLocaleString('fr-FR');
const COUL_TENSION = { forte: 'var(--orange, #c45300)', moyenne: 'var(--amber)', faible: 'var(--green, #2e7d6f)' };
const COUL_IMPACT = { faible: 'var(--green, #2e7d6f)', moyen: 'var(--amber)', fort: 'var(--orange, #c45300)' };
const COUL_ETAT = { 'Validé': 'var(--green, #2e7d6f)', 'À équilibrer': 'var(--orange, #c45300)', 'À valider': 'var(--blue2, #3d6fd6)' };

function Kpi({ label, value, note }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="note">{note || ''}</div>
    </div>
  );
}

// Bloc repliable : son contenu n'est construit qu'à la première ouverture (accélération, nov. 2026)
function Repli({ titre, children, testid, open = true }) {
  const [vu, setVu] = useState(open);
  return (
    <details open={open} data-testid={testid} onToggle={(e) => { if (e.currentTarget.open) setVu(true); }} style={{ border: '1px solid var(--border)', marginTop: 14, background: 'var(--bg)' }}>
      <summary style={{ cursor: 'pointer', padding: '10px 14px', fontWeight: 600, fontSize: 14 }}>{titre}</summary>
      <div style={{ padding: '4px 14px 14px' }}>{vu ? children : null}</div>
    </details>
  );
}

const btnSec = { width: 'auto', margin: 0, background: 'transparent', color: 'var(--ink65)', border: '1px solid var(--border)', padding: '6px 12px', fontSize: 12 };
const btnPrim = { width: 'auto', margin: 0, background: 'linear-gradient(135deg,var(--violet),var(--violet2))', color: '#fff', border: 'none', padding: '7px 14px', fontSize: 12, fontWeight: 700 };
const cell = { padding: '4px 6px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };

// Semaine à cheval : valeur de la part du mois, total de la semaine en petit
function PartSemaine({ mois, semaine }) {
  return (
    <span title={'Part de ce mois ; semaine entière : ' + Math.round(semaine) + ' h'}>
      {Math.round(mois)}
      <div style={{ fontSize: 9, fontWeight: 400, color: 'var(--ink65)', whiteSpace: 'nowrap' }}>sem. {Math.round(semaine)}</div>
    </span>
  );
}

// ── Enveloppes de la règle 60 / 20 / 20 : cible, déjà figé sur les mois validés, posé par la répartition ──
function EnveloppesCP({ env }) {
  return (
    <div data-testid="cp-enveloppes" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 8, marginBottom: 12 }}>
      {env.map((e, i) => {
        const total = (e.verrouille || 0) + (e.budget || 0);
        return (
          <div key={i} style={{ padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 12, lineHeight: 1.5 }}>
            <div style={{ color: 'var(--ink65)' }}>{e.nom} <span style={{ color: 'var(--ink30)' }}>· {Math.round(e.pct * 100)} %</span></div>
            <div><b style={{ fontSize: 15 }}>{fmt1(total)} J</b> <span style={{ color: 'var(--ink65)' }}>pour une cible de {fmt1(e.cible)} J</span></div>
            {e.verrouille > 0 ? <div style={{ color: 'var(--ink65)' }}>dont {fmt1(e.verrouille)} J sur des mois validés</div> : null}
            {e.reporte > 0.05 ? <div style={{ color: 'var(--orange, #c45300)' }}>{fmt1(e.reporte)} J reportés ailleurs : tous ses mois sont validés</div> : null}
            {e.recu > 0.05 ? <div style={{ color: 'var(--ink65)' }}>+{fmt1(e.recu)} J reçus d'une période close</div> : null}
          </div>
        );
      })}
    </div>
  );
}

// ── Ce que le dernier recalcul a changé (après une validation de mois ou une relance) ──
function BilanCP({ b, onFermer }) {
  if (!b) return null;
  const dCout = (b.coutApres || 0) - (b.coutAvant || 0);
  const ecart = b.type === 'validation' && b.propose != null ? Math.round(((b.pose || 0) - b.propose) * 10) / 10 : null;
  return (
    <div data-testid="cp-bilan" style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--blue-light, rgba(61,111,214,.08))', border: '1px solid var(--blue2, #3d6fd6)', fontSize: 12.5, lineHeight: 1.6 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
        <b style={{ flex: 1 }}>{b.type === 'validation' ? MOIS_LONGS[b.mois] + ' validé : ce que la répartition a changé' : 'Répartition recalculée : ce qui a changé'}</b>
        <button onClick={onFermer} aria-label="Masquer" style={{ ...btnSec, padding: '0 8px', border: 'none' }}>✕</button>
      </div>
      {ecart !== null ? (
        <div>
          {fmt1(b.pose)} J posés en {MOIS_LONGS[b.mois].toLowerCase()} (proposition de SOMA : {fmt1(b.propose)} J).{' '}
          {Math.abs(ecart) >= 0.5 ? (ecart < 0 ? 'Les ' + fmt1(-ecart) + ' J non posés ont été ajoutés sur les mois non validés.' : 'Les ' + fmt1(ecart) + ' J posés en plus ont été retirés des mois non validés.') : 'Pas d\'écart avec la proposition.'}
        </div>
      ) : null}
      {b.deplacements && b.deplacements.length ? (
        <div style={{ display: 'flex', gap: '4px 12px', flexWrap: 'wrap', margin: '4px 0' }}>
          {b.deplacements.map((d) => (
            <span key={d.m} style={{ color: d.delta > 0 ? 'var(--ink)' : 'var(--ink65)' }}>{M[d.m]} <b>{d.delta > 0 ? '+' : ''}{fmt1(d.delta)} J</b></span>
          ))}
        </div>
      ) : <div style={{ color: 'var(--ink65)' }}>Aucun mois n'a changé.</div>}
      <div>
        Coût des heures supplémentaires : {euro(b.coutAvant)} → <b>{euro(b.coutApres)}</b>
        {Math.abs(dCout) >= 1 ? <span style={{ color: dCout > 0 ? 'var(--orange, #c45300)' : 'var(--green, #2e7d6f)' }}> ({dCout > 0 ? '+' : ''}{euro(dCout)})</span> : null}
      </div>
      {b.report && b.report.length ? <div style={{ color: 'var(--ink65)' }}>{b.report.map((r) => fmt1(r.jours) + ' J de la période ' + r.nom.toLowerCase()).join(', ')} : tous ses mois sont validés, ces jours ont été placés sur les autres périodes.</div> : null}
    </div>
  );
}

// ── Carte d'un mois ──
function CarteMois({ e, ouvert, onOuvrir }) {
  return (
    <button data-testid={'mois-' + e.m} onClick={onOuvrir}
      style={{ margin: 0, textAlign: 'left', padding: '10px 12px', background: ouvert ? 'var(--bg2)' : 'var(--bg)', color: 'inherit',
        border: '1px solid ' + (ouvert ? 'var(--violet2)' : 'var(--border)'), borderTop: '3px solid ' + COUL_TENSION[e.tension], cursor: 'pointer', fontWeight: 400 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <b style={{ fontSize: 14 }}>{e.verrouille ? '🔒 ' : ''}{e.nom}</b>
        <span style={{ fontSize: 10, fontWeight: 700, color: COUL_ETAT[e.etat], textTransform: 'uppercase' }}>{e.etat}</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink65)', lineHeight: 1.6 }}>
        <div>CA <b style={{ color: 'var(--ink)' }}>{euro(e.caM)}</b></div>
        <div>HS <b style={{ color: COUL_TENSION[e.tension] }}>{Math.round(e.hsM)} h</b> · {euro(e.coutHsM)}</div>
        <div>CP <b style={{ color: 'var(--ink)' }}>{fmt1(e.cpM)} J</b>{e.cpPoss ? ' · ' + e.cpPoss + ' sem. creuse' + (e.cpPoss > 1 ? 's' : '') : ''}</div>
        {e.nbFeries || e.nbVac ? <div>{e.nbFeries ? e.nbFeries + ' férié' + (e.nbFeries > 1 ? 's' : '') : ''}{e.nbFeries && e.nbVac ? ' · ' : ''}{e.nbVac ? e.nbVac + ' j vacances' : ''}</div> : null}
        {e.tensions ? <div style={{ color: 'var(--orange, #c45300)' }}>⚠ {e.tensions} sem. critique{e.tensions > 1 ? 's' : ''}</div> : null}
      </div>
    </button>
  );
}

// ── Détail des semaines d'un mois ──
function DetailMois({ a, m, editable, onNav, onFermer, onSet, onValider, onDeverrouiller, onReprendre }) {
  const rows = hsRows(a);
  const e = etatMois(a, m, rows);
  const imp = impactMois(a, m, rows);
  const sem = semainesMois(a, m, rows);
  const saisie = editable && !e.verrouille;
  const propose = cpProposeMois(a, m);
  const ecart = propose == null ? 0 : Math.round((imp.cpM - propose) * 10) / 10;
  return (
    <div data-testid="detail-mois" style={{ border: '1px solid var(--violet2)', padding: 14, marginTop: 12, background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button style={btnSec} onClick={() => onNav(-1)} disabled={m === 0} aria-label="Mois précédent">◀</button>
        <h3 style={{ margin: 0, fontSize: 16 }}>{MOIS_LONGS[m]} 2027</h3>
        <button style={btnSec} onClick={() => onNav(1)} disabled={m === 11} aria-label="Mois suivant">▶</button>
        <span style={{ fontSize: 11, fontWeight: 700, color: COUL_ETAT[e.etat], textTransform: 'uppercase', marginLeft: 6 }}>{e.etat}</span>
        <span style={{ flex: 1 }} />
        {editable ? (e.verrouille
          ? <button data-testid="deverrouiller-mois" style={btnSec} onClick={onDeverrouiller}>🔓 Déverrouiller</button>
          : <button data-testid="valider-mois" style={btnPrim} onClick={onValider}>✓ Valider ce mois</button>) : null}
        <button style={btnSec} onClick={onFermer}>Fermer</button>
      </div>

      <div data-testid="impact-mois" style={{ display: 'flex', gap: 18, flexWrap: 'wrap', padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 12, marginBottom: 12 }}>
        <span>CA <b>{euro(imp.caMois)}</b></span>
        <span>Masse salariale <b>{euro(imp.msMois)}</b></span>
        <span>MS / CA <b>{imp.tauxMS.toFixed(1)} %</b></span>
        <span>HS <b>{Math.round(imp.hsM)} h</b> · <b>{euro(imp.coutHSM)}</b></span>
        <span>CP posés <b>{fmt1(imp.cpM)} J</b></span>
        <span style={{ color: imp.critM ? 'var(--orange, #c45300)' : 'var(--green, #2e7d6f)' }}>{imp.critM ? '⚠ ' + imp.critM + ' semaine(s) critique(s)' : '✓ Aucune semaine critique'}</span>
      </div>

      {e.verrouille ? <p className="hint" style={{ fontSize: 12, margin: '0 0 10px' }}>🔒 Mois validé : les congés sont figés. Déverrouillez-le pour les modifier.</p> : null}
      {saisie && propose != null ? (
        <div data-testid="cp-proposition-mois" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '8px 12px', border: '1px solid var(--border)', fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>
          <span>Proposition de SOMA : <b>{fmt1(propose)} J</b> · posés : <b>{fmt1(imp.cpM)} J</b></span>
          <span style={{ flex: 1, minWidth: 220, color: 'var(--ink65)' }}>
            {Math.abs(ecart) < 0.5
              ? 'Vous suivez la proposition. En validant, les autres mois ne bougent pas.'
              : ecart > 0
                ? 'En validant, les ' + fmt1(ecart) + ' J posés en plus seront retirés des mois non validés.'
                : 'En validant, les ' + fmt1(-ecart) + ' J non posés seront ajoutés sur les mois non validés.'}
          </span>
          {Math.abs(ecart) >= 0.5 ? <button data-testid="reprendre-proposition" style={btnSec} onClick={onReprendre}>Reprendre la proposition</button> : null}
        </div>
      ) : null}


      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
          <thead>
            <tr style={{ textAlign: 'right', color: 'var(--ink65)' }}>
              <th style={{ ...cell, textAlign: 'left' }}>Semaine</th>
              <th style={cell}>Base (h)</th>
              <th style={cell} title="Congés payés en jours ouvrables — une semaine de congés = 6 jours (lundi au samedi)">CP (J)</th>
              <th style={cell} title="Absences payées en jours — formation, événements familiaux, récupération… Coûtées au taux horaire comme les congés.">Abs. payées (J)</th>
              <th style={cell} title="Absences non payées en jours — congé sans solde… Retirées de la capacité, sans coût salarial.">Abs. non payées (J)</th>
              <th style={cell}>Maladie (h)</th>
              <th style={cell}>Dispo (h)</th>
              <th style={cell}>Besoin (h)</th>
              <th style={cell}>HS (h)</th>
              <th style={cell}>HS / pers.</th>
              <th style={cell} title="Effet sur le coût d'un jour de CP de plus cette semaine">Impact 1 J CP</th>
              <th style={{ ...cell, textAlign: 'left' }}>Charge</th>
            </tr>
          </thead>
          <tbody>
            {sem.map((s) => (
              <tr key={s.week} style={{ textAlign: 'right' }}>
                <td style={{ ...cell, textAlign: 'left' }}><b>S{s.week}</b>{joursSemaine(a, s.week).length < 7 ? <div data-testid={'incomplete-' + s.week} style={{ fontSize: 10, color: 'var(--orange, #c45300)' }} title="Semaine incomplète en 2027 : saisissez seulement les jours d'absence de ces dates. Besoin et ressources sont calculés jour par jour.">{libIncomplete(joursSemaine(a, s.week))}</div> : null}{s.aCheval ? <div data-testid={'a-cheval-' + s.week} style={{ fontSize: 10, color: 'var(--ink65)' }} title="Semaine à cheval sur deux mois : saisissez les jours de ce mois, ils s'additionnent à ceux de l'autre mois. Les HS sont calculées sur la semaine entière et attribuées au mois où le besoin dépasse l'équipe ; disponible, besoin et HS affichés sont ceux de ce mois (semaine entière en petit).">à cheval · sem. {fmt1(+((a.presence[s.week] || {}).cp) || 0)} J CP</div> : null}</td>
                <td style={cell}>{Math.round(s.base)}</td>
                <td style={cell}><input data-testid={'cp-' + s.week} data-saisie-dr={estSaisieDR(a, 'presence.' + s.week + '.cp') ? '1' : undefined} type="number" min="0" step="1" value={s.parts.cp || ''} title={s.aCheval ? 'Semaine à cheval sur deux mois : jours de ce mois. Total de la semaine : ' + fmt1(+((a.presence[s.week] || {}).cp) || 0) + ' J' : undefined} placeholder="0" disabled={!saisie} onChange={(ev) => onSet(s.week, 'cp', ev.target.value, m)} style={{ width: 56 }} /></td>
                <td style={cell}><input type="number" data-saisie-dr={estSaisieDR(a, 'presence.' + s.week + '.otherPaid') ? '1' : undefined} min="0" step="0.5" value={s.parts.otherPaid || ''} title={s.aCheval ? 'Semaine à cheval sur deux mois : jours de ce mois. Total de la semaine : ' + fmt1(+((a.presence[s.week] || {}).otherPaid) || 0) + ' J' : 'Absences payées (jours)'} placeholder="0" disabled={!saisie} onChange={(ev) => onSet(s.week, 'otherPaid', ev.target.value, m)} style={{ width: 56 }} /></td>
                <td style={cell}><input type="number" data-saisie-dr={estSaisieDR(a, 'presence.' + s.week + '.other') ? '1' : undefined} min="0" step="0.5" value={s.parts.other || ''} title={s.aCheval ? 'Semaine à cheval sur deux mois : jours de ce mois. Total de la semaine : ' + fmt1(+((a.presence[s.week] || {}).other) || 0) + ' J' : 'Absences non payées (jours)'} placeholder="0" disabled={!saisie} onChange={(ev) => onSet(s.week, 'other', ev.target.value, m)} style={{ width: 56 }} /></td>
                <td style={cell}>{Math.round(s.mal)}</td>
                <td style={cell}>{s.aCheval ? <PartSemaine mois={s.dispoMois} semaine={s.av} /> : Math.round(s.av)}{s.ferieH >= 0.5 ? <div data-testid={'ferie-' + s.week} title="Jour férié du lundi au samedi : 7 h par ETP retirées du disponible, hors équipe de permanence (dimensionnée sur le besoin du jour)" style={{ fontSize: 9, color: 'var(--orange, #c45300)', whiteSpace: 'nowrap' }}>férié −{Math.round(s.ferieH)} h</div> : null}</td>
                <td style={cell}>{s.aCheval ? <PartSemaine mois={s.besoinMois} semaine={s.besoin} /> : Math.round(s.besoin)}</td>
                <td data-testid={'hs-' + s.week} style={{ ...cell, fontWeight: 700, color: (s.aCheval ? s.hsMois : s.hs) > 0.5 ? 'var(--orange, #c45300)' : 'var(--ink65)' }}>{s.aCheval ? <PartSemaine mois={s.hsMois} semaine={s.hs} /> : Math.round(s.hs)}</td>
                <td style={cell}>{s.hsParPers != null ? <b>{(+s.hsParPers).toFixed(1)}</b> : '—'}</td>
                <td style={{ ...cell, color: COUL_IMPACT[s.impactNiveau], fontWeight: 600 }}>{s.impact > 0 ? '+' : ''}{euro(s.impact)}</td>
                <td style={{ ...cell, textAlign: 'left', color: 'var(--ink65)' }}>{s.charge}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PresenceScreen() {
  const { agency: a, loading, error, editable, update, agenceNom } = useBudget();
  const [ouvert, setOuvert] = useState(null);

  if (!agenceNom) return <div className="card"><h2>Présence &amp; HS</h2><p className="hint">Aucune agence n'est rattachée à votre profil.</p></div>;
  if (loading) return <div className="card"><h2>Présence &amp; HS</h2><p className="hint">Chargement du budget…</p></div>;
  if (error) return <div className="card"><h2>Présence &amp; HS</h2><p className="hint">Impossible de charger le budget : {error}</p></div>;
  if (!a) return <div className="card"><h2>Présence &amp; HS — {agenceNom}</h2><p className="hint">Budget non commencé pour cette agence.</p></div>;

  const nbRoulants = (a.employees || []).filter((e) => ['DEA', 'AA', 'TAXI', 'TPMR'].includes((e.qual || '').toUpperCase())).length;
  const hasObjectif = +a.targetCA > 0 && +a.targetTXR > 0;

  // ── Mutations (copie profonde : l'optimiseur des CP mute l'agence en profondeur) ──
  const muter = (fn) => update((draft) => { const a2 = clone(draft); fn(a2); return a2; });
  const ouvrir = (m) => { setOuvert(m); if (editable && (a.moisVerrouilles || []).indexOf(m) < 0) muter((x) => { x.moisActif = m; }); };
  const valider = (m) => {
    const deja = (a.moisVerrouilles || []).indexOf(m) >= 0;
    muter((x) => { verrouillerMois(x, m); });
    toast(messageValidation((a.moisVerrouilles || []).length + (deja ? 0 : 1), m), 'success');
    setOuvert(null);
  };
  const deverrouiller = (m) => { muter((x) => deverrouillerMois(x, m)); toast(MOIS_LONGS[m] + ' déverrouillé', 'info'); };
  // m : mois affiché — une semaine à cheval reçoit la part de ce mois, le total de la semaine est la somme des parts
  const setSem = (w, champ, v, m) => muter((x) => (m === undefined ? setPresenceSemaine(x, w, champ, v) : setAbsPartMois(x, w, champ, m, v)));
  const setMontant = (cle, w, v) => muter((x) => setMontantSemaine(x, cle, w, v));
  const distribuerCP = () => muter((x) => relancerRepartitionCP(x));
  const reprendre = (m) => { muter((x) => reprendrePropositionMois(x, m)); toast('Proposition de SOMA remise sur ' + MOIS_LONGS[m].toLowerCase(), 'info'); };
  const fermerBilan = () => muter((x) => { x.cpDernierRecalcul = null; });
  const resetCP = () => {
    if (!window.confirm('Remettre à zéro tous les congés payés planifiés ?')) return;
    muter((x) => reinitialiserCP(x));
    toast('Congés remis à zéro', 'info');
  };
  // Absentéisme modifié : les CP acquis (roulants et non-roulants) changent, les répartitions sont refaites
  // automatiquement (roulants : si des congés étaient posés ; non-roulants : si la répartition était automatique).
  const setSick = (m) => (e) => {
    const v = e.target.value;
    muter((x) => { const av = etatConges(x); x.sick = x.sick.slice(); x.sick[m] = v === '' ? null : +v; rafraichirConges(x, av, ajusterCPMinimal); });
  };
  const rebalance = () => muter((x) => { const av = etatConges(x); x.sick = reequilibrerSick(x.sick, +x.targetAbsRate || 0); rafraichirConges(x, av, ajusterCPMinimal); });
  const setHS50Mode = (mode) => update((draft) => { draft.hs50Mode = mode; return draft; });
  const setHS50 = (m) => (e) => {
    const v = e.target.value;
    update((draft) => { draft.hs50 = (draft.hs50 || Array(12).fill(null)).slice(); draft.hs50[m] = v === '' ? null : Math.max(0, Math.min(100, +v)); return draft; });
  };

  // Objectif ou équipe roulante manquants : les semaines ne peuvent pas être calculées, mais l'absentéisme
  // se saisit quand même (le DR qui démarre un budget doit pouvoir le renseigner).
  if (nbRoulants === 0 || !hasObjectif) {
    return (
      <div className="card">
        <h2 style={{ marginBottom: 10 }}>Présence &amp; HS — {agenceNom}</h2>
        <p className="hint" data-testid="presence-incomplet" style={{ padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          {nbRoulants === 0
            ? 'Les congés et les heures supplémentaires se calculent à partir des salariés roulants : renseignez d\'abord l\'équipe pour les voir apparaître. L\'absentéisme peut déjà être saisi ci-dessous.'
            : 'Les congés et les heures supplémentaires se calculent à partir de l\'objectif de chiffre d\'affaires et du TXR : renseignez l\'objectif pour les voir apparaître. L\'absentéisme peut déjà être saisi ci-dessous.'}
        </p>
        <div data-visite="absenteisme"><BlocAbsenteisme a={a} editable={editable} setSick={setSick} rebalance={rebalance} /></div>
      </div>
    );
  }

  // ── Indicateurs annuels ──
  const rows = hsRows(a);
  const tot = hsTot(a);
  const hsAnn = tot.hs;
  const hsCost = coutHSTotal(a);
  const hs2028 = hsPayees2028(a);
  const empMoy = tot.av > 0 ? tot.av / 52 / 35 : 0;
  const s = refAgenceSeuils(a);
  const hsVerdict = hsAnn > s.seuilTensionCrit * 52 ? '⚠ élevé' : hsAnn > s.seuiltensionWarn * 52 ? 'niveau modéré' : 'niveau maîtrisé';
  const insightHtml = presenceInsight(a);

  // ── Mois ──
  const etats = M.map((_, m) => etatMois(a, m, rows));
  const prog = progressionMois(a);
  const critiques = semainesCritiques(a, rows);

  // ── Compteur CP ──
  const gen = cpGeneres(a);
  const plan = cpPlanifies(a);
  const rest = Math.round((gen - plan) * 10) / 10;
  const tol = s.toleranceCP;
  const cpEtat = Math.abs(rest) <= tol
    ? <span style={{ color: 'var(--green, #2e7d6f)' }}>✓ Équilibré</span>
    : rest > tol
      ? <span style={{ color: 'var(--orange, #c45300)' }} title="Plus de jours acquis que de jours posés : relancez la répartition ou posez-les à la main">⚠ {rest.toFixed(1)} J encore à poser</span>
      : <span style={{ color: 'var(--orange, #c45300)' }} title="Plus de jours posés que de jours acquis, congés ajoutés à la main ou mois déjà validés : relancez la répartition ou retirez des congés">⚠ {Math.abs(rest).toFixed(1)} J posés en trop</span>;


  const hs50 = a.hs50 || Array(12).fill(null);
  const moy50 = moyenneHS50(a);
  const auto50 = hs50Auto(a);
  const calc50 = M.map((_, i) => tauxHS50Mois(a, i) * 100);
  const sem50 = auto50 ? rows.filter((r) => part50Semaine(r) > 0).length : 0;
  const ind = indemnites(a);
  const imp = hsImproductives(a);

  return (
    <div className="card">
      <h2 style={{ marginBottom: 14 }}>Présence &amp; HS — {agenceNom}</h2>

      <div className="kpis" style={{ marginBottom: 16 }}>
        <Kpi label="HS estimées" value={hsAnn.toFixed(0) + ' h'} note={hsVerdict} />
        <Kpi label="Coût HS" value={euro(hsCost)} note={hs2028.cout >= 1 ? 'réalisées en 2027 · dont ' + euro(hs2028.cout) + ' (' + Math.round(hs2028.hs) + ' h, 6-31 déc.) payés en janv. 2028' : "sur l'année"} />
        <Kpi label="Besoin / Dispo" value={tot.need.toFixed(0) + ' / ' + tot.av.toFixed(0) + ' h'} note={tot.av >= tot.need ? 'capacité suffisante' : 'déficit couvert par HS'} />
        <Kpi label="ETP moyen" value={empMoy.toFixed(2)} note="roulant" />
      </div>

      {insightHtml ? (
        <div style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink65)', marginBottom: 16 }}
          dangerouslySetInnerHTML={{ __html: insightHtml }} />
      ) : null}

      <ChargeCurve agency={a} />

      {!editable ? (
        <div style={{ margin: '12px 0', padding: '10px 14px', background: 'var(--blue-light, rgba(61,111,214,.10))', border: '1px solid var(--blue2, #3d6fd6)', fontSize: 13, color: 'var(--blue2, #3d6fd6)' }}>
          <TexteLectureSeule />
        </div>
      ) : null}

      {/* ── Absentéisme ── */}
      <div data-visite="absenteisme"><BlocAbsenteisme a={a} editable={editable} setSick={setSick} rebalance={rebalance} /></div>

      {/* ── Congés payés : répartition, enveloppes, compteur ── */}
      <h3 style={{ fontSize: 15, margin: '18px 0 4px' }}>2. Congés payés</h3>
      {editable ? (
        <div data-visite="conges" style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '14px 0 10px', flexWrap: 'wrap' }}>
          <button onClick={distribuerCP} style={{ width: 'auto', margin: 0 }}>Répartir les congés automatiquement</button>
          <button data-testid="reset-cp" onClick={resetCP} style={btnSec}>Remettre les CP à zéro</button>
          <span className="hint" style={{ fontSize: 12 }}>Refait toute la proposition sur les mois non validés (vos ajustements à la main sur ces mois sont remplacés). Les mois validés ne bougent pas.</span>
        </div>
      ) : null}

      {editable ? <BilanCP b={a.cpDernierRecalcul} onFermer={fermerBilan} /> : null}
      {a.cpEnveloppes && a.cpEnveloppes.length ? <EnveloppesCP env={a.cpEnveloppes} /> : null}

      {a.cpReliquat > 0.05 ? (
        <div style={{ marginBottom: 12, padding: '8px 14px', background: 'rgba(196,83,0,.10)', border: '1px solid var(--orange, #c45300)', fontSize: 12, color: 'var(--orange, #c45300)' }}>
          ⚠ {a.cpReliquat.toFixed(1)} jours n'ont pas pu être placés : il ne reste plus de semaine libre avec assez de salariés présents. Déverrouillez un mois ou posez-les à la main.
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', padding: '10px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', marginBottom: 18, fontSize: 13 }}>
        <span><b>Congés payés</b></span>
        <span title="Jours de congés que l'équipe roulante acquiert sur 2027 : 30 jours ouvrables par an (6 par semaine de congés) au prorata du temps de travail et de la part roulante ; pendant les arrêts maladie, 80 % du rythme normal (loi 2024)">Acquis sur l'année : <b>{gen.toFixed(1)} J</b></span>
        <span>Posés : <b>{plan.toFixed(1)} J</b></span>
        <span>Reste à poser : <b style={{ color: Math.abs(rest) < 1 ? 'var(--green, #2e7d6f)' : 'var(--orange, #c45300)' }}>{rest.toFixed(1)} J</b></span>
        <span style={{ marginLeft: 'auto' }}>{cpEtat}</span>
      </div>
      <p className="hint" style={{ fontSize: 12, margin: '-10px 0 16px' }}>
        <b>Comment SOMA propose les congés.</b> Il pose exactement les jours acquis, en respectant les périodes (60 % de juin à octobre, 20 % de novembre à janvier, 20 % de février à mai).
        Dans chaque période, il les place d'abord sur les semaines où l'équipe est plus nombreuse que le besoin, sans créer d'heure supplémentaire, en les étalant ;
        s'il en reste, il les met là où les heures supplémentaires par personne sont les plus basses, pour garder une charge régulière.
        Si les jours acquis changent (absentéisme, équipe, CDD, dates d'entrée ou de sortie, temps de travail, part roulante), SOMA ajoute ou retire <b>seulement la différence</b> sur les mois non validés : les congés déjà placés, y compris ceux ajustés à la main, ne bougent pas.
      </p>

      {/* ── Mois par mois ── */}
      <h3 style={{ fontSize: 15, margin: '6px 0 8px' }}>3. Mois par mois</h3>
      <div data-testid="progression-mois" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, fontSize: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 160, height: 8, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div style={{ width: (prog.nbVerrouilles / 12) * 100 + '%', height: '100%', background: 'var(--green, #2e7d6f)', transition: 'width .3s' }} />
        </div>
        <span><b>{prog.nbVerrouilles}/12</b> mois validés</span>
        <span title="Jours acquis moins les jours déjà posés sur les mois validés : c'est ce que la répartition place sur les mois encore ouverts">Congés à poser sur les mois non validés : <b>{fmt1(prog.cpLibres)} J</b></span>
      </div>
      <p className="hint" style={{ fontSize: 12, margin: '0 0 10px' }}>
        💡 Ouvrez un mois, ajustez les congés et les absences semaine par semaine, puis <b>validez-le</b> : il est figé, et l'écart avec la proposition
        (jours en plus ou en moins) est ajouté ou retiré sur les mois non validés, sans toucher aux congés déjà placés. Un bilan montre ensuite les mois qui ont bougé et l'effet sur le coût des heures supplémentaires. <Pourquoi k="conges" />
      </p>
      <div data-visite="mois" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 8 }}>
        {etats.map((e) => <CarteMois key={e.m} e={e} ouvert={ouvert === e.m} onOuvrir={() => (ouvert === e.m ? setOuvert(null) : ouvrir(e.m))} />)}
      </div>

      {ouvert !== null ? (
        <DetailMois a={a} m={ouvert} editable={editable}
          onNav={(d) => ouvrir(Math.max(0, Math.min(11, ouvert + d)))}
          onFermer={() => setOuvert(null)}
          onSet={setSem}
          onValider={() => valider(ouvert)}
          onDeverrouiller={() => deverrouiller(ouvert)}
          onReprendre={() => reprendre(ouvert)} />
      ) : null}

      {critiques.length ? (
        <div data-testid="alertes-critiques" style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(196,83,0,.08)', border: '1px solid var(--orange, #c45300)', fontSize: 12 }}>
          <b style={{ color: 'var(--orange, #c45300)' }}>⚠ {critiques.length} semaine{critiques.length > 1 ? 's' : ''} en tension critique</b>
          <div style={{ marginTop: 6, color: 'var(--ink65)' }}>
            {critiques.map((c) => 'S' + c.week + ' (' + c.mois + ', ' + Math.round(c.hs) + ' h)').join(' · ')}
          </div>
          <div style={{ marginTop: 6, color: 'var(--ink65)' }}>Évitez d'y poser des congés ou envisagez un renfort ponctuel.</div>
        </div>
      ) : null}

      {/* ── HS 25 % / 50 % ── */}
      <Repli titre={<>Répartition des heures supplémentaires (25% / 50%) <Pourquoi k="hs50" /></>} testid="repli-hs50">
        <div style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, margin: '6px 0 10px' }}>
          <span>⏱️</span>
          <div>Les 8 premières heures supplémentaires par semaine et par salarié sont majorées à <b>+25%</b>, au-delà à <b>+50%</b>.
            {auto50
              ? <> SOMA calcule la part à +50% <b>semaine par semaine</b> : chaque salarié présent absorbe ses 8 premières heures à +25% (équipe présente = heures disponibles ÷ 35), le reste part à +50%. On suppose les heures supp réparties entre les présents ; si elles se concentrent sur quelques personnes, la part réelle à +50% sera plus forte.</>
              : <> Indiquez, pour chaque mois, la <b>part de vos heures supplémentaires qui part à +50%</b> — d'après la réalité de votre agence.</>}</div>
        </div>
        <div role="radiogroup" aria-label="Mode de calcul de la part à +50%" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, marginBottom: 8 }}>
          <label><input type="radio" name="hs50Mode" data-testid="hs50-mode-auto" checked={auto50} disabled={!editable} onChange={() => setHS50Mode('auto')} /> Calcul automatique (règle des 8 h)</label>
          <label><input type="radio" name="hs50Mode" data-testid="hs50-mode-manuel" checked={!auto50} disabled={!editable} onChange={() => setHS50Mode('manuel')} /> Saisie manuelle par mois</label>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr><th style={{ textAlign: 'left', padding: '4px 8px' }}>Mois</th>{M.map((m) => <th key={m} style={{ padding: '4px 6px' }}>{m}</th>)}<th style={{ padding: '4px 8px' }}>{auto50 ? 'Année' : 'Moy'}</th></tr></thead>
            <tbody>
              <tr>
                <td style={{ padding: '4px 8px' }}><b>% HS à +50%</b></td>
                {auto50
                  ? calc50.map((v, i) => (
                    <td key={i} className="num" data-testid={'hs50-calc-' + i} style={{ padding: '6px 6px', textAlign: 'center', color: v > 0 ? 'var(--orange, #c45300)' : 'var(--ink65)' }}>{v > 0 ? pct(v) : '0%'}</td>
                  ))
                  : hs50.map((v, i) => (
                    <td key={i} style={{ padding: '2px 4px' }}>
                      <input data-testid={'hs50-' + i} data-saisie-dr={estSaisieDR(a, 'hs50.' + i) ? '1' : undefined} type="number" min="0" max="100" value={v ?? ''} placeholder="0" disabled={!editable} onChange={setHS50(i)} style={{ width: '100%', minWidth: 52, padding: '6px 4px', textAlign: 'center' }} />
                    </td>
                  ))}
                <td className="num" style={{ padding: '4px 8px' }}><b>{pct(moy50)}</b></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: moy50 <= 0 ? 'var(--green, #2e7d6f)' : 'var(--ink65)' }}>
          {moy50 <= 0
            ? '✓ Toutes vos heures supplémentaires sont à +25% — répartition saine.'
            : auto50
              ? <><b>{pct(moy50)}</b> de vos heures supplémentaires partent à +50% sur l'année ({sem50} semaine{sem50 > 1 ? 's' : ''} dépasse{sem50 > 1 ? 'nt' : ''} 8 h par salarié présent). Placer des congés ailleurs ou renforcer l'équipe sur ces semaines réduit ce surcoût.</>
              : <>En moyenne <b>{pct(moy50)}</b> de vos heures supplémentaires partent à +50% sur l'année. Le coût moyen de vos HS sera calculé en conséquence.</>}
        </div>
      </Repli>

      {/* ── Indemnités ── */}
      <Repli titre="Indemnités (repas et dimanche/jour férié)" testid="repli-indemnites" open={false}>
        <p className="hint" style={{ margin: '6px 0 12px', fontSize: 12 }}>Saisissez pour chaque semaine le montant total des indemnités, en euros, séparément pour le personnel roulant et non-roulant. Ces montants sont intégrés à la masse salariale du prévisionnel (ligne « Charges de personnel », détail « dont indemnités »), <b>sur le mois de paie</b> indiqué dans la dernière colonne : une semaine de fin de mois est payée le mois suivant, et les semaines après le 5 décembre sur la paie de janvier 2028.</p>
        <div data-testid="indemnites-totaux" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <Kpi label="Repas" value={euro(ind.tot.repas)} note={'roulant ' + euro(ind.tot.rR) + ' · non-roulant ' + euro(ind.tot.rNR)} />
          <Kpi label="Dimanche & jour férié" value={euro(ind.tot.idjf)} note={'roulant ' + euro(ind.tot.iR) + ' · non-roulant ' + euro(ind.tot.iNR)} />
          <Kpi label="Total indemnités" value={euro(ind.tot.total)} note="sur l'année" />
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg)' }}>
              <tr style={{ color: 'var(--ink65)' }}>
                <th style={{ ...cell, textAlign: 'left' }}>Semaine</th>
                <th style={cell}>Repas roulant (€)</th>
                <th style={cell}>Repas non-roulant (€)</th>
                <th style={cell}>IDJF roulant (€)</th>
                <th style={cell}>IDJF non-roulant (€)</th>
                <th style={{ ...cell, textAlign: 'right' }}>Total</th>
                <th style={{ ...cell, textAlign: 'left' }} title="Mois de paie sur lequel la semaine est payée (périodes de paie)">Payé en</th>
              </tr>
            </thead>
            <tbody>
              {ind.lignes.map((l) => (
                <tr key={l.week}>
                  <td style={cell}><b>S{l.week}</b> <span style={{ color: 'var(--ink30)' }}>{M[l.mois] || ''}</span></td>
                  {[['repasRoulant', l.rR], ['repasNonRoulant', l.rNR], ['idjfRoulant', l.iR], ['idjfNonRoulant', l.iNR]].map(([k, v]) => (
                    <td key={k} style={cell}><input data-testid={k + '-' + l.week} data-saisie-dr={estSaisieDR(a, k + '.' + l.week) ? '1' : undefined} type="number" min="0" value={v || ''} placeholder="0" disabled={!editable} onChange={(e) => setMontant(k, l.week, e.target.value)} style={{ width: 80 }} /></td>
                  ))}
                  <td style={{ ...cell, textAlign: 'right', fontWeight: l.total ? 700 : 400 }}>{l.total ? euro(l.total) : '—'}</td>
                  <td data-testid={'paye-en-' + l.week} style={{ ...cell, textAlign: 'left', whiteSpace: 'nowrap' }}>{libPaies(paiesSemaine(a, l.week))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700 }}>
                <td style={cell}>Total</td><td style={cell}>{euro(ind.tot.rR)}</td><td style={cell}>{euro(ind.tot.rNR)}</td><td style={cell}>{euro(ind.tot.iR)}</td><td style={cell}>{euro(ind.tot.iNR)}</td>
                <td style={{ ...cell, textAlign: 'right' }}>{euro(ind.tot.total)}</td>
                <td style={cell} />
              </tr>
            </tfoot>
          </table>
        </div>
      </Repli>

      {/* ── HS des improductifs ── */}
      <Repli titre="Personnel improductif (régulateurs, responsables)" testid="repli-improductif" open={false}>
        <p className="hint" style={{ margin: '6px 0 10px', fontSize: 12 }}>La masse salariale des improductifs est saisie en une ligne globale par le contrôleur de gestion. Leur absentéisme suit le même taux que les roulants, mois par mois. Renseignez ici, si besoin, leurs heures supplémentaires par semaine (majorées selon le barème 25/50 du mois). Indiquez aussi le nombre de jours de congés payés qu'ils posent chaque mois.</p>
        <div style={{ fontSize: 12, color: 'var(--ink65)', marginBottom: 12 }}>
          Absentéisme des improductifs : <b>{pct(imp.absMoy)}</b> en moyenne (aligné sur les roulants) · ratio de maintien de salaire : <b>{imp.ratioMaintien} %</b>
          {imp.totalHS ? <> · HS saisies : <b>{fmt1(imp.totalHS)} h</b> soit <b>{euro(imp.totalCout)}</b></> : null}
        </div>
        <CongesNonRoulants a={a} editable={editable} muter={muter} />
        <h4 style={{ margin: '10px 0 8px', fontSize: 13, color: 'var(--ink65)' }}>Heures supplémentaires improductives par semaine</h4>
        <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg)' }}>
              <tr style={{ color: 'var(--ink65)' }}><th style={{ ...cell, textAlign: 'left' }}>Semaine</th><th style={cell}>HS (h)</th><th style={{ ...cell, textAlign: 'right' }}>Coût estimé</th></tr>
            </thead>
            <tbody>
              {imp.lignes.map((l) => (
                <tr key={l.week}>
                  <td style={cell}><b>S{l.week}</b> <span style={{ color: 'var(--ink30)' }}>{M[l.mois] || ''}</span></td>
                  <td style={cell}><input data-testid={'hsimp-' + l.week} data-saisie-dr={estSaisieDR(a, 'hsImproductif.' + l.week) ? '1' : undefined} type="number" min="0" step="0.5" value={l.hs || ''} placeholder="0" disabled={!editable} onChange={(e) => setMontant('hsImproductif', l.week, e.target.value)} style={{ width: 64 }} /></td>
                  <td style={{ ...cell, textAlign: 'right' }}>{l.cout ? euro(l.cout) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Repli>
    </div>
  );
}

// ── Congés des non-roulants : jours par mois et compteur acquis / posés (aucun coût, pas de remplacement) ──
// ── Absentéisme maladie & AT, mois par mois (toujours affiché, même budget incomplet) ──
function BlocAbsenteisme({ a, editable, setSick, rebalance }) {
  const filled = a.sick.filter((v) => v !== null && v !== undefined);
  const avg = filled.length ? filled.reduce((acc, v) => acc + (+v || 0), 0) / filled.length : 0;
  const cible = +a.targetAbsRate || 0;
  const diff = avg - cible;
  const aCible = Math.abs(diff) <= 0.1;
  return (
    <Repli titre="1. Absentéisme maladie & AT, mois par mois" testid="repli-maladie">
      <p className="hint" style={{ fontSize: 12, margin: '6px 0 0' }}>
        À saisir en premier : les congés payés acquis par l'équipe en dépendent (pas d'acquisition pendant les absences maladie).
        Si vous le modifiez après avoir réparti les congés, SOMA refait aussitôt la répartition des mois non validés.
      </p>
      <div style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, margin: '6px 0 10px' }}>
        <span>🩺</span>
        <div>
          <b>Taux d'absentéisme fixé par le contrôle de gestion : {pct(cible)}</b> (basé sur l'historique).<br />
          Vous pouvez ajuster la répartition mois par mois, mais la <b>moyenne annuelle doit rester à {pct(cible)}</b>.
        </div>
      </div>
      <div style={{ overflowX: 'auto', marginBottom: 12 }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px' }}>Mois</th>
              {M.map((m) => <th key={m} style={{ padding: '4px 6px' }}>{m}</th>)}
              <th style={{ padding: '4px 8px' }}>Moy</th>
              <th style={{ padding: '4px 8px' }}>Cible</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '4px 8px' }}><b>Maladie &amp; AT %</b></td>
              {a.sick.map((v, i) => (
                <td key={i} style={{ padding: '2px 4px' }}>
                  <input type="number" data-saisie-dr={estSaisieDR(a, 'sick.' + i) ? '1' : undefined} value={v ?? ''} placeholder="—" disabled={!editable} onChange={setSick(i)} style={{ width: 52 }} />
                </td>
              ))}
              <td className="num" style={{ padding: '4px 8px' }}><span className={aCible ? 'ok' : 'warn'}>{pct(avg)}</span></td>
              <td style={{ padding: '4px 8px' }}>{pct(cible)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, color: aCible ? 'var(--green, #2e7d6f)' : 'var(--orange, #c45300)' }}>
          {aCible ? '✓ Conforme à la cible du contrôle de gestion' : 'Écart de ' + pct(Math.abs(diff)) + ' ' + (diff > 0 ? 'au-dessus' : 'en dessous') + ' de la cible — à corriger'}
        </span>
        {editable && !aCible ? <button className="secondary" onClick={rebalance}>Rééquilibrer automatiquement</button> : null}
      </div>
    </Repli>
  );
}

function CongesNonRoulants({ a, editable, muter }) {
  const c = a.cpNR || cpNRVide();
  const nb = salariesNR(a).length;
  const acquis = cpNRAcquis(a);
  const saisis = cpNRSaisis(a);
  const reste = Math.round((acquis - saisis) * 10) / 10;
  const setJour = (i, v) => muter((x) => { if (!x.cpNR) x.cpNR = cpNRVide(); x.cpNR = { ...x.cpNR, auto: false, jours: (x.cpNR.jours || Array(12).fill(null)).slice() }; x.cpNR.jours[i] = v === '' ? null : Math.max(0, Math.round(+String(v).replace(',', '.') || 0)); });
  const cellule = { padding: '4px 6px' };
  return (
    <div data-testid="repli-cp-nr" style={{ marginBottom: 18 }}>
      <h4 style={{ margin: '10px 0 6px', fontSize: 13, color: 'var(--ink65)' }}>Congés payés : nombre de jours par mois</h4>
      <p className="hint" style={{ margin: '0 0 10px', fontSize: 12 }}>
        Nombre de jours de congés de l'équipe non roulante pour chaque mois, pour planifier toute l'équipe et vérifier que les jours acquis sont bien posés.
        Ils ne sont pas remplacés. {etpNR(a) !== null ? <>Les jours acquis viennent du nombre d'ETP non roulants saisi par le contrôleur de gestion ({String(etpNR(a)).replace('.', ',')} ETP × 2,5 j par mois) ; la <b>variation du stock</b> (acquis − posés) entre dans la masse salariale du mois : calez vos jours posés sur les jours acquis.</> : <>Leur salaire est dans la ligne globale du contrôleur de gestion.</>}
      </p>
      <div data-testid="cp-nr-compteur" style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, marginBottom: 10 }}>
        <span title={etpNR(a) !== null ? 'ETP non roulants (Données agences) × 2,5 jours ouvrables par mois' : '30 jours ouvrables par an (6 par semaine de congés) au prorata du temps de travail et de la part non roulante ; pendant les arrêts maladie, 80 % du rythme normal (loi 2024)'}>Acquis {etpNR(a) !== null ? <>({String(etpNR(a)).replace('.', ',')} ETP)</> : <>par {nb} non-roulant{nb > 1 ? 's' : ''}</>} : <b>{acquis.toFixed(1)} J</b></span>
        <span>Posés : <b>{saisis.toFixed(1)} J</b></span>
        <span>Reste à poser : <b style={{ color: Math.abs(reste) < 1 ? 'var(--green, #2e7d6f)' : 'var(--orange, #c45300)' }}>{reste.toFixed(1)} J</b></span>
        {editable ? <button type="button" data-testid="cp-nr-repartir" onClick={() => muter((x) => repartirCPNRAuto(x))} style={{ marginLeft: 'auto', fontSize: 12 }}>↗ Répartir les jours acquis (60/20/20)</button> : null}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr><th style={{ ...cellule, textAlign: 'left' }}>Mois</th>{M.map((m) => <th key={m} style={cellule}>{m}</th>)}<th style={cellule}>Total</th></tr></thead>
          <tbody>
            <tr>
              <td style={cellule}><b>Jours de CP</b></td>
              {M.map((_, i) => (
                <td key={i} style={{ padding: '2px 3px' }}>
                  <input data-testid={'cpnr-' + i} data-saisie-dr={estSaisieDR(a, 'cpNR.jours.' + i) ? '1' : undefined} type="number" min="0" step="1" value={c.jours && c.jours[i] !== null && c.jours[i] !== undefined ? c.jours[i] : ''} placeholder="0" disabled={!editable}
                    onChange={(e) => setJour(i, e.target.value)} style={{ width: '100%', minWidth: 58, padding: '6px 4px', textAlign: 'center' }} />
                </td>
              ))}
              <td className="num" style={cellule}><b>{saisis.toFixed(1)}</b></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
