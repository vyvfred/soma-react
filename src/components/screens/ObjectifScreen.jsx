import { useBudget } from '../../context/BudgetContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { objectifInsight, coherenceCapacite } from '../../domain/objectifInsight.js';
import { annualCA, hsTot, genCal } from '../../domain/calculations.js';
import { euro } from '../../domain/format.js';
import BudgetBar from '../BudgetBar.jsx';

// Écran Objectif — port de la section « objectif » de la version mono-fichier :
// objectif CA et TXR, interprétation et bandeau de cohérence, activités de l'agence,
// réalisé et paramètres de référence (verrouillés par le CG pour le REX), zone
// scolaire, perspectives, détail du calcul de capacité.

const BANNER_STYLE = {
  ok: { border: 'var(--green, #2e7d6f)', bg: 'rgba(46,125,111,.10)', color: 'var(--green, #2e7d6f)' },
  info: { border: 'var(--blue2, #3d6fd6)', bg: 'var(--blue-light, rgba(61,111,214,.10))', color: 'var(--blue2, #3d6fd6)' },
  warn: { border: 'var(--orange, #c45300)', bg: 'rgba(196,83,0,.10)', color: 'var(--orange, #c45300)' }
};
const COULEUR_NIVEAU = { critique: 'var(--orange)', tendu: '#FF8F00', coherent: 'var(--accent-blue, var(--blue2))', confortable: 'var(--green)' };
const lbl = { display: 'block', fontSize: 12, color: 'var(--ink65)', margin: '10px 0 6px' };

function SaveIndicator({ status }) {
  const map = { idle: '', saving: 'Enregistrement…', saved: 'Enregistré', error: 'Non enregistré' };
  const color = status === 'error' ? 'var(--orange, #c45300)' : 'var(--ink30)';
  if (!map[status]) return null;
  return <span style={{ fontSize: 12, color }}>{map[status]}</span>;
}

export default function ObjectifScreen() {
  const { agency: a, loading, error, saveStatus, update, editable, agenceNom } = useBudget();
  const { profile } = useAuth();
  if (!agenceNom) return <div className="card"><h2>Objectif</h2><p className="hint">Aucune agence n'est rattachée à votre profil.</p></div>;
  if (loading) return <div className="card"><h2>Objectif</h2><p className="hint">Chargement du budget…</p></div>;
  if (error) return <div className="card"><h2>Objectif</h2><p className="hint">Impossible de charger le budget : {error}</p></div>;
  if (!a) return <div className="card"><h2>Objectif — {agenceNom}</h2><p className="hint">Budget indisponible.</p></div>;

  const insight = objectifInsight(a);
  const coh = coherenceCapacite(a);
  // Données historiques verrouillées par le CG : lecture seule pour le REX
  const verrouCG = !!a.cgLocked && profile && profile.role === 'rex';

  const nombre = (field, recalcCal = false) => (e) => {
    const raw = e.target.value.replace(/[\s ]/g, '').replace(',', '.');
    const val = raw === '' ? null : Number(raw);
    if (raw !== '' && Number.isNaN(val)) return;
    update((d) => { d[field] = val; if (recalcCal) genCal(d); return d; });
  };
  const texte = (field) => (e) => { const v = e.target.value; update((d) => { d[field] = v; return d; }); };
  const activite = (field) => (e) => { const v = e.target.checked; update((d) => { d[field] = v; genCal(d); return d; }); };
  const zone = (e) => { const v = e.target.value; update((d) => { d.schoolZone = v; genCal(d); return d; }); };

  const caConstruit = annualCA(a), t = hsTot(a);
  const kpis = [
    ['Objectif CA', euro(a.targetCA)], ['CA construit', euro(caConstruit)], ['Écart', euro(caConstruit - (+a.targetCA || 0))],
    ['Heures nécessaires', t.need.toFixed(0) + ' h'], ['HS estimées', t.hs.toFixed(0) + ' h'], ['Zone', a.schoolZone]
  ];
  const ref = (field, label, placeholder, help) => (
    <div>
      <label style={lbl} htmlFor={'obj-' + field}>{label}{help ? <span title={help}> ⓘ</span> : null}</label>
      <input id={'obj-' + field} type="text" inputMode="decimal" placeholder={placeholder} value={a[field] ?? ''} onChange={nombre(field)}
        disabled={!editable || verrouCG} title={verrouCG ? 'Verrouillé par le contrôleur de gestion' : ''} style={verrouCG ? { background: 'var(--bg2)', color: 'var(--ink65)' } : undefined} />
    </div>
  );

  return (
    <div className="card">
      <BudgetBar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Objectif 2027 — {agenceNom}</h2>
        <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {verrouCG ? <span style={{ fontSize: 11, padding: '4px 10px', border: '1px solid var(--blue2)', color: 'var(--blue2)', background: 'var(--blue-light)' }}>🔒 Données historiques verrouillées par le CG</span> : null}
          <SaveIndicator status={saveStatus} />
        </span>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', margin: '14px 0 20px' }}>
        <label style={{ flex: 1, minWidth: 220 }}>
          <span style={{ display: 'block', fontSize: 12, color: 'var(--ink65)', marginBottom: 6 }}>Objectif de chiffre d'affaires</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="text" inputMode="numeric" placeholder="0" autoComplete="off" value={a.targetCA ?? ''} onChange={nombre('targetCA')} disabled={!editable} style={{ flex: 1 }} />
            <span style={{ color: 'var(--ink65)' }}>€</span>
          </span>
        </label>
        <label style={{ flex: 1, minWidth: 220 }}>
          <span style={{ display: 'block', fontSize: 12, color: 'var(--ink65)', marginBottom: 6 }}>
            TXR cible <span title="Taux de recette par heure : chiffre d'affaires ÷ heures de conduite. Généralement proche du TXR réalisé en 2026.">ⓘ</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="text" inputMode="decimal" placeholder="0" autoComplete="off" value={a.targetTXR ?? ''} onChange={nombre('targetTXR')} disabled={!editable} style={{ flex: 1 }} />
            <span style={{ color: 'var(--ink65)' }}>€/h</span>
          </span>
        </label>
      </div>

      <div className="objInsight" style={{ display: 'flex' }}>
        <span className="objInsightIcon">💬</span>
        <span className="objInsightText">{insight.phrase}</span>
      </div>
      {insight.banner ? (
        <div style={{ padding: '12px 16px', margin: '12px 0', border: '1px solid ' + BANNER_STYLE[insight.banner.class].border, background: BANNER_STYLE[insight.banner.class].bg, color: BANNER_STYLE[insight.banner.class].color }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}><span style={{ marginRight: 8 }}>{insight.banner.icon}</span>{insight.banner.title}</div>
          <div style={{ fontSize: 12 }}>{insight.banner.detail}</div>
        </div>
      ) : null}

      <div className="objActivites" style={{ margin: '16px 0' }}>
        <div className="objActivitesLabel" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink65)', marginBottom: 8 }}>Activités de l'agence</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label className="objActChip checked"><input type="checkbox" checked disabled /> Sanitaire <span style={{ fontSize: 10, color: 'var(--ink65)' }}>obligatoire</span></label>
          <label className={'objActChip' + (a.actSai ? ' checked' : '')}><input type="checkbox" checked={!!a.actSai} onChange={activite('actSai')} disabled={!editable} data-testid="act-sai" /> Saisonnier</label>
          <label className={'objActChip' + (a.actTP ? ' checked' : '')}><input type="checkbox" checked={!!a.actTP} onChange={activite('actTP')} disabled={!editable} /> Transport de personnes</label>
        </div>
      </div>

      <div className="objRecall" style={{ fontSize: 13, color: 'var(--ink65)', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginRight: 10 }}>Réalisé</span>{insight.recall}
      </div>

      <details className="objCollapse">
        <summary>Résultats passés &amp; paramètres de référence</summary>
        <div className="objCollapseBody" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
          {ref('histCA2025', 'CA 2025 (si disponible)', 'ex : 1 850 000')}
          {ref('histCA', 'CA 2026', 'ex : 2 200 000')}
          {ref('histTXR', 'TXR moyen réalisé 2026 (€/h)', 'ex : 42')}
          {ref('targetAbsRate', 'Absentéisme cible % (maladie)', 'ex : 7', 'Taux d\'absence (maladie + accidents du travail) que vous anticipez pour 2027, en pourcentage. Référence réseau : environ 8%.')}
          <div>
            <label style={lbl} htmlFor="obj-zone">Zone vacances scolaires</label>
            <select id="obj-zone" value={a.schoolZone || 'B'} onChange={zone} disabled={!editable}>
              <option>A</option><option>B</option><option>C</option>
            </select>
          </div>
        </div>
      </details>

      <details className="objCollapse">
        <summary>Perspectives &amp; contexte 2027 <span style={{ color: 'var(--ink30)', fontWeight: 400 }}>(optionnel)</span></summary>
        <div className="objCollapseBody">
          <textarea rows={5} value={a.perspectives || ''} onChange={texte('perspectives')} disabled={!editable} style={{ width: '100%' }}
            placeholder="Ex : Renouvellement du contrat EHPAD en janvier, recrutement d'un CDD saisonnier prévu en juillet, travaux de locaux au T2..." />
        </div>
      </details>

      {coh && +a.targetCA ? (
        <details className="objCollapse" data-testid="detail-capacite">
          <summary>Voir le détail du calcul de capacité</summary>
          <div className="objCollapseBody">
            <div className="kpis" style={{ marginBottom: 14 }}>
              {kpis.map(([l, v]) => <div key={l} className="kpi"><div className="label">{l}</div><div className="value">{v}</div></div>)}
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink65)', marginBottom: 6 }}>
                <span>Taux de charge de l'effectif</span><span style={{ fontWeight: 700, color: COULEUR_NIVEAU[coh.niveau] }}>{coh.tauxCharge}%</span>
              </div>
              <div style={{ height: 10, background: 'var(--bg3)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: Math.min(coh.tauxCharge, 100) + '%', background: COULEUR_NIVEAU[coh.niveau] }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginBottom: 14 }}>
              {[['Capacité max sans HS', coh.caMaxSansHS, 'var(--ink)', coh.baseHebdo.toFixed(0) + ' h/sem × ' + coh.txr + '€ × 52 sem.'],
                ['Capacité max avec 10% HS', coh.caMaxAvecHS10, 'var(--accent-blue, var(--blue2))', 'Volume HS raisonnable'],
                ['Capacité max avec 20% HS', coh.caMaxAvecHS20, 'var(--orange)', 'Limite haute à ne pas dépasser']].map(([l, v, c, n]) => (
                <div key={l} style={{ padding: 12, background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink65)', marginBottom: 6 }}>{l}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 700, color: c }}>{euro(v)}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink65)', marginTop: 3 }}>{n}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 14px', borderLeft: '3px solid ' + COULEUR_NIVEAU[coh.niveau], background: 'rgba(0,0,0,.15)', fontSize: 13 }}>
              <span style={{ marginRight: 8 }}>{coh.icone}</span><b>{coh.message}</b>
            </div>
            {coh.caJourCible > 0 ? (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink65)', padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                💡 <b>Référence CA cohérente pour une journée de semaine normale :</b> environ <b style={{ color: 'var(--accent-blue, var(--blue2))' }}>{euro(coh.caJourCible)}</b> ({coh.dispoHebdoMoy.toFixed(0)} h dispo ÷ 5 jours × {coh.txr} €/h). Si vos références CA dépassent significativement ce montant, des tensions HS apparaîtront.
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
