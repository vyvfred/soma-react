import { estSaisieDR } from '../../domain/saisiesDR.js';
import { useState } from 'react';
import { useBudget } from '../../context/BudgetContext.jsx';
import { hsTot, coutHSTotal, refAgenceSeuils, cpGeneres, cpPlanifies, hsRows } from '../../domain/calculations.js';
import { reequilibrerSick } from '../../domain/presence.js';
import { repartirCPAuto } from '../../domain/repartitionCP.js';
import { presenceInsight } from '../../domain/presenceInsight.js';
import {
  progressionMois, etatMois, semainesMois, impactMois, semainesCritiques, verrouillerMois, deverrouillerMois,
  reinitialiserCP, setPresenceSemaine, messageValidation, setMontantSemaine, indemnites, hsImproductives, moyenneHS50
} from '../../domain/presenceMois.js';
import { euro, pct } from '../../domain/format.js';
import { toast } from '../Toast.jsx';
import ChargeCurve from './ChargeCurve.jsx';
import { Pourquoi } from '../Vision.jsx';

const M = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const MOIS_LONGS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const clone = (o) => JSON.parse(JSON.stringify(o));
const fmt1 = (v) => (Math.round((+v || 0) * 10) / 10).toLocaleString('fr-FR');
const COUL_TENSION = { forte: 'var(--orange, #c45300)', moyenne: '#d4a017', faible: 'var(--green, #2e7d6f)' };
const COUL_IMPACT = { faible: 'var(--green, #2e7d6f)', moyen: '#d4a017', fort: 'var(--orange, #c45300)' };
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

function Repli({ titre, children, testid, open = true }) {
  return (
    <details open={open} data-testid={testid} style={{ border: '1px solid var(--border)', marginTop: 14, background: 'var(--bg)' }}>
      <summary style={{ cursor: 'pointer', padding: '10px 14px', fontWeight: 600, fontSize: 14 }}>{titre}</summary>
      <div style={{ padding: '4px 14px 14px' }}>{children}</div>
    </details>
  );
}

const btnSec = { width: 'auto', margin: 0, background: 'transparent', color: 'var(--ink65)', border: '1px solid var(--border)', padding: '6px 12px', fontSize: 12 };
const btnPrim = { width: 'auto', margin: 0, background: 'linear-gradient(135deg,var(--violet),var(--violet2))', color: '#fff', border: 'none', padding: '7px 14px', fontSize: 12, fontWeight: 700 };
const cell = { padding: '4px 6px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };

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
function DetailMois({ a, m, editable, onNav, onFermer, onSet, onValider, onDeverrouiller }) {
  const rows = hsRows(a);
  const e = etatMois(a, m, rows);
  const imp = impactMois(a, m, rows);
  const sem = semainesMois(a, m, rows);
  const saisie = editable && !e.verrouille;
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

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
          <thead>
            <tr style={{ textAlign: 'right', color: 'var(--ink65)' }}>
              <th style={{ ...cell, textAlign: 'left' }}>Semaine</th>
              <th style={cell}>Base (h)</th>
              <th style={cell}>CP (J)</th>
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
                <td style={{ ...cell, textAlign: 'left' }}><b>S{s.week}</b></td>
                <td style={cell}>{Math.round(s.base)}</td>
                <td style={cell}><input data-testid={'cp-' + s.week} data-saisie-dr={estSaisieDR(a, 'presence.' + s.week + '.cp') ? '1' : undefined} type="number" min="0" step="0.5" value={(a.presence[s.week] || {}).cp || ''} placeholder="0" disabled={!saisie} onChange={(ev) => onSet(s.week, 'cp', ev.target.value)} style={{ width: 56 }} /></td>
                <td style={cell}><input type="number" data-saisie-dr={estSaisieDR(a, 'presence.' + s.week + '.otherPaid') ? '1' : undefined} min="0" step="0.5" value={(a.presence[s.week] || {}).otherPaid || ''} placeholder="0" title="Absences payées (jours)" disabled={!saisie} onChange={(ev) => onSet(s.week, 'otherPaid', ev.target.value)} style={{ width: 56 }} /></td>
                <td style={cell}><input type="number" data-saisie-dr={estSaisieDR(a, 'presence.' + s.week + '.other') ? '1' : undefined} min="0" step="0.5" value={(a.presence[s.week] || {}).other || ''} placeholder="0" title="Absences non payées (jours)" disabled={!saisie} onChange={(ev) => onSet(s.week, 'other', ev.target.value)} style={{ width: 56 }} /></td>
                <td style={cell}>{Math.round(s.mal)}</td>
                <td style={cell}>{Math.round(s.av)}</td>
                <td style={cell}>{Math.round(s.besoin)}</td>
                <td style={{ ...cell, fontWeight: 700, color: s.hs > 0.5 ? 'var(--orange, #c45300)' : 'var(--ink65)' }}>{Math.round(s.hs)}</td>
                <td style={cell}>{s.hsParPers || '—'}</td>
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

  if (nbRoulants === 0 || !hasObjectif) {
    return (
      <div className="card">
        <h2 style={{ marginBottom: 10 }}>Présence &amp; HS — {agenceNom}</h2>
        <p className="hint">
          {nbRoulants === 0
            ? 'La présence et les heures supplémentaires se calculent à partir de vos salariés roulants. Renseignez d\'abord votre équipe, puis revenez ici.'
            : 'Le besoin en heures se calcule à partir de votre objectif de chiffre d\'affaires et de votre TXR. Renseignez votre objectif pour voir apparaître vos semaines et leur charge.'}
        </p>
      </div>
    );
  }

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
  const setSem = (w, champ, v) => muter((x) => setPresenceSemaine(x, w, champ, v));
  const setMontant = (cle, w, v) => muter((x) => setMontantSemaine(x, cle, w, v));
  const distribuerCP = () => muter((x) => repartirCPAuto(x));
  const resetCP = () => {
    if (!window.confirm('Remettre à zéro tous les congés payés planifiés ?')) return;
    muter((x) => reinitialiserCP(x));
    toast('Congés remis à zéro', 'info');
  };
  const setSick = (m) => (e) => {
    const v = e.target.value;
    update((draft) => { draft.sick = draft.sick.slice(); draft.sick[m] = v === '' ? null : +v; return draft; });
  };
  const rebalance = () => update((draft) => { draft.sick = reequilibrerSick(draft.sick, +draft.targetAbsRate || 0); return draft; });
  const setHS50 = (m) => (e) => {
    const v = e.target.value;
    update((draft) => { draft.hs50 = (draft.hs50 || Array(12).fill(null)).slice(); draft.hs50[m] = v === '' ? null : Math.max(0, Math.min(100, +v)); return draft; });
  };

  // ── Indicateurs annuels ──
  const rows = hsRows(a);
  const tot = hsTot(a);
  const hsAnn = tot.hs;
  const hsCost = coutHSTotal(a);
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
      ? <span style={{ color: 'var(--orange, #c45300)' }}>⚠ {rest.toFixed(1)} J à placer</span>
      : <span style={{ color: 'var(--orange, #c45300)' }}>⚠ {Math.abs(rest).toFixed(1)} J en excès</span>;

  // ── Absentéisme ──
  const filled = a.sick.filter((v) => v !== null && v !== undefined);
  const avg = filled.length ? filled.reduce((acc, v) => acc + (+v || 0), 0) / filled.length : 0;
  const cible = +a.targetAbsRate || 0;
  const diff = avg - cible;
  const aCible = Math.abs(diff) <= 0.1;

  const hs50 = a.hs50 || Array(12).fill(null);
  const moy50 = moyenneHS50(a);
  const ind = indemnites(a);
  const imp = hsImproductives(a);

  return (
    <div className="card">
      <h2 style={{ marginBottom: 14 }}>Présence &amp; HS — {agenceNom}</h2>

      <div className="kpis" style={{ marginBottom: 16 }}>
        <Kpi label="HS estimées" value={hsAnn.toFixed(0) + ' h'} note={hsVerdict} />
        <Kpi label="Coût HS" value={euro(hsCost)} note="sur l'année" />
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
          🔒 Budget engagé dans le circuit de validation — lecture seule.
        </div>
      ) : null}

      {/* ── Congés payés : répartition, enveloppes, compteur ── */}
      {editable ? (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '14px 0 10px', flexWrap: 'wrap' }}>
          <button onClick={distribuerCP} style={{ width: 'auto', margin: 0 }}>Répartir les congés automatiquement</button>
          <button data-testid="reset-cp" onClick={resetCP} style={btnSec}>Remettre les CP à zéro</button>
          <span className="hint" style={{ fontSize: 12 }}>SOMA place les congés en lissant la charge, dans le respect des enveloppes légales. Les mois validés ne sont pas modifiés.</span>
        </div>
      ) : null}

      {a.cpEnveloppes && a.cpEnveloppes.length ? (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          {a.cpEnveloppes.map((e, i) => (
            <div key={i} style={{ flex: 1, minWidth: 150, padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 12 }}>
              <div style={{ color: 'var(--ink65)' }}>{e.nom} <span style={{ color: 'var(--ink30)' }}>({Math.round(e.pct * 100)}%)</span></div>
              <div style={{ fontWeight: 700 }}>{e.budget.toFixed(1)} J</div>
              {e.verrouille > 0 ? <div style={{ color: 'var(--ink30)' }}>dont {e.verrouille.toFixed(1)} verrouillés</div> : null}
            </div>
          ))}
        </div>
      ) : null}

      {a.cpReliquat > 0.05 ? (
        <div style={{ marginBottom: 12, padding: '8px 14px', background: 'rgba(196,83,0,.10)', border: '1px solid var(--orange, #c45300)', fontSize: 12, color: 'var(--orange, #c45300)' }}>
          ⚠ {a.cpReliquat.toFixed(1)} jours n'ont pas pu être placés (capacité insuffisante sur certaines semaines).
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', padding: '10px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', marginBottom: 18, fontSize: 13 }}>
        <span><b>Congés payés</b></span>
        <span>Générés : <b>{gen.toFixed(1)} J</b></span>
        <span>Planifiés : <b>{plan.toFixed(1)} J</b></span>
        <span>Restant : <b style={{ color: Math.abs(rest) < 1 ? 'var(--green, #2e7d6f)' : 'var(--orange, #c45300)' }}>{rest.toFixed(1)} J</b></span>
        <span style={{ marginLeft: 'auto' }}>{cpEtat}</span>
      </div>

      {/* ── Mois par mois ── */}
      <h3 style={{ fontSize: 15, margin: '6px 0 8px' }}>Mois par mois</h3>
      <div data-testid="progression-mois" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, fontSize: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 160, height: 8, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div style={{ width: (prog.nbVerrouilles / 12) * 100 + '%', height: '100%', background: 'var(--green, #2e7d6f)', transition: 'width .3s' }} />
        </div>
        <span><b>{prog.nbVerrouilles}/12</b> mois validés</span>
        <span>CP restants à répartir sur les mois libres : <b>{fmt1(prog.cpLibres)} J</b></span>
      </div>
      <p className="hint" style={{ fontSize: 12, margin: '0 0 10px' }}>
        💡 Ouvrez un mois pour voir ses semaines, ajuster les congés et les absences payées ou non payées, puis <b>validez-le</b> : il passe en lecture seule
        et SOMA répartit à nouveau les congés restants sur les mois encore libres. <Pourquoi k="conges" />
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 8 }}>
        {etats.map((e) => <CarteMois key={e.m} e={e} ouvert={ouvert === e.m} onOuvrir={() => (ouvert === e.m ? setOuvert(null) : ouvrir(e.m))} />)}
      </div>

      {ouvert !== null ? (
        <DetailMois a={a} m={ouvert} editable={editable}
          onNav={(d) => ouvrir(Math.max(0, Math.min(11, ouvert + d)))}
          onFermer={() => setOuvert(null)}
          onSet={setSem}
          onValider={() => valider(ouvert)}
          onDeverrouiller={() => deverrouiller(ouvert)} />
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

      {/* ── Absentéisme ── */}
      <Repli titre="Taux de maladie & AT par mois" testid="repli-maladie">
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

      {/* ── HS 25 % / 50 % ── */}
      <Repli titre={<>Répartition des heures supplémentaires (25% / 50%) <Pourquoi k="hs50" /></>} testid="repli-hs50">
        <div style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, margin: '6px 0 10px' }}>
          <span>⏱️</span>
          <div>Les 8 premières heures supplémentaires par semaine et par salarié sont majorées à <b>+25%</b>, au-delà à <b>+50%</b>.
            Indiquez, pour chaque mois, la <b>part de vos heures supplémentaires qui part à +50%</b> — d'après la réalité de votre agence.
            Beaucoup d'agences restent à <b>0%</b> toute l'année : c'est normal, tant que les heures supp restent réparties.</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr><th style={{ textAlign: 'left', padding: '4px 8px' }}>Mois</th>{M.map((m) => <th key={m} style={{ padding: '4px 6px' }}>{m}</th>)}<th style={{ padding: '4px 8px' }}>Moy</th></tr></thead>
            <tbody>
              <tr>
                <td style={{ padding: '4px 8px' }}><b>% HS à +50%</b></td>
                {hs50.map((v, i) => (
                  <td key={i} style={{ padding: '2px 4px' }}>
                    <input data-testid={'hs50-' + i} data-saisie-dr={estSaisieDR(a, 'hs50.' + i) ? '1' : undefined} type="number" min="0" max="100" value={v ?? ''} placeholder="0" disabled={!editable} onChange={setHS50(i)} style={{ width: 52 }} />
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
            : <>En moyenne <b>{pct(moy50)}</b> de vos heures supplémentaires partent à +50% sur l'année. Le coût moyen de vos HS sera calculé en conséquence.</>}
        </div>
      </Repli>

      {/* ── Indemnités ── */}
      <Repli titre="Indemnités (repas et dimanche/jour férié)" testid="repli-indemnites" open={false}>
        <p className="hint" style={{ margin: '6px 0 12px', fontSize: 12 }}>Saisissez pour chaque semaine le montant total des indemnités, en euros, séparément pour le personnel roulant et non-roulant. Ces montants sont intégrés à la masse salariale du prévisionnel.</p>
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
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700 }}>
                <td style={cell}>Total</td><td style={cell}>{euro(ind.tot.rR)}</td><td style={cell}>{euro(ind.tot.rNR)}</td><td style={cell}>{euro(ind.tot.iR)}</td><td style={cell}>{euro(ind.tot.iNR)}</td>
                <td style={{ ...cell, textAlign: 'right' }}>{euro(ind.tot.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Repli>

      {/* ── HS des improductifs ── */}
      <Repli titre="Personnel improductif (régulateurs, responsables)" testid="repli-improductif" open={false}>
        <p className="hint" style={{ margin: '6px 0 10px', fontSize: 12 }}>La masse salariale des improductifs est saisie en une ligne globale par le contrôleur de gestion. Leur absentéisme suit le même taux que les roulants, mois par mois. Renseignez ici, si besoin, leurs heures supplémentaires par semaine (majorées selon le barème 25/50 du mois). Leurs congés n'ont pas d'impact sur la production.</p>
        <div style={{ fontSize: 12, color: 'var(--ink65)', marginBottom: 12 }}>
          Absentéisme des improductifs : <b>{pct(imp.absMoy)}</b> en moyenne (aligné sur les roulants) · ratio de maintien de salaire : <b>{imp.ratioMaintien} %</b>
          {imp.totalHS ? <> · HS saisies : <b>{fmt1(imp.totalHS)} h</b> soit <b>{euro(imp.totalCout)}</b></> : null}
        </div>
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
