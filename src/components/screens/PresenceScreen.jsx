import { useBudget } from '../../context/BudgetContext.jsx';
import {
  hsTot, coefHSMoyen, refAgenceSeuils, cpGeneres, cpPlanifies
} from '../../domain/calculations.js';
import { reequilibrerSick } from '../../domain/presence.js';
import { repartirCPAuto } from '../../domain/repartitionCP.js';
import { presenceInsight } from '../../domain/presenceInsight.js';
import { euro, pct } from '../../domain/format.js';
import ChargeCurve from './ChargeCurve.jsx';

const M = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

function Kpi({ label, value, note }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="note">{note || ''}</div>
    </div>
  );
}

export default function PresenceScreen() {
  const { agency: a, loading, error, editable, update, agenceNom } = useBudget();

  if (!agenceNom) return <div className="card"><h2>Présence &amp; HS</h2><p className="hint">Aucune agence n'est rattachée à votre profil.</p></div>;
  if (loading) return <div className="card"><h2>Présence &amp; HS</h2><p className="hint">Chargement du budget…</p></div>;
  if (error) return <div className="card"><h2>Présence &amp; HS</h2><p className="hint">Impossible de charger le budget : {error}</p></div>;
  if (!a) return <div className="card"><h2>Présence &amp; HS — {agenceNom}</h2><p className="hint">Budget non commencé pour cette agence.</p></div>;

  const nbRoulants = (a.employees || []).filter((e) => ['DEA', 'AA', 'TAXI', 'TPMR'].includes((e.qual || '').toUpperCase())).length;
  const hasObjectif = +a.targetCA > 0 && +a.targetTXR > 0;

  // Guidage si données insuffisantes.
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

  // ── KPIs annuels (port fidèle de renderRH) ──
  const tot = hsTot(a);
  const hsAnn = tot.hs;
  const hsCost = hsAnn * (+a.costHour || 0) * coefHSMoyen(a);
  const empMoy = tot.av > 0 ? tot.av / 52 / 35 : 0;
  const s = refAgenceSeuils(a);
  const hsVerdict = hsAnn > s.seuilTensionCrit * 52 ? '⚠ élevé' : hsAnn > s.seuiltensionWarn * 52 ? 'niveau modéré' : 'niveau maîtrisé';
  const insightHtml = presenceInsight(a);

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

  // ── Absentéisme mensuel ──
  const filled = a.sick.filter((v) => v !== null && v !== undefined);
  const avg = filled.length ? filled.reduce((acc, v) => acc + (+v || 0), 0) / filled.length : 0;
  const cible = +a.targetAbsRate || 0;
  const diff = avg - cible;
  const aCible = Math.abs(diff) <= 0.1;

  const setSick = (m) => (e) => {
    const v = e.target.value;
    update((draft) => { draft.sick = draft.sick.slice(); draft.sick[m] = v === '' ? null : +v; return draft; });
  };
  const rebalance = () => {
    update((draft) => { draft.sick = reequilibrerSick(draft.sick, +draft.targetAbsRate || 0); return draft; });
  };
  const distribuerCP = () => {
    // Deep clone : l'optimiseur mute l'agence en profondeur (a.presence par semaine).
    update((draft) => { const a2 = JSON.parse(JSON.stringify(draft)); repartirCPAuto(a2); return a2; });
  };

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

      {/* Compteur congés payés (lecture seule) */}
      {/* Congés payés : action de répartition + compteur */}
      {editable ? (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
          <button onClick={distribuerCP}>Répartir les congés automatiquement</button>
          <span className="hint" style={{ fontSize: 12 }}>SOMA place les congés en lissant la charge, dans le respect des enveloppes légales.</span>
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

      {/* Bandeau règle CG */}
      <div style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, marginBottom: 10 }}>
        <span>🩺</span>
        <div>
          <b>Taux d'absentéisme fixé par le contrôle de gestion : {pct(cible)}</b> (basé sur l'historique).<br />
          Vous pouvez ajuster la répartition mois par mois, mais la <b>moyenne annuelle doit rester à {pct(cible)}</b>.
        </div>
      </div>

      {!editable ? (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--blue-light, rgba(61,111,214,.10))', border: '1px solid var(--blue2, #3d6fd6)', fontSize: 13, color: 'var(--blue2, #3d6fd6)' }}>
          🔒 Budget engagé dans le circuit de validation — lecture seule.
        </div>
      ) : null}

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
                  <input type="number" value={v ?? ''} placeholder="—" disabled={!editable} onChange={setSick(i)} style={{ width: 52 }} />
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

      <p className="hint" style={{ marginTop: 18, fontSize: 12 }}>
        Cette vue couvre les indicateurs, l'interprétation, la courbe de charge, la répartition
        automatique des congés et l'absentéisme. Les indemnités (repas, IDJF) seront ajoutées dans un prochain incrément.
      </p>
    </div>
  );
}
