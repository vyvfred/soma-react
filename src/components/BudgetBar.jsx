import { useState } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { vueExploitation } from '../domain/calculations.js';
import { statutLabel } from '../config/statut.js';
import { VALIDATOR_LABELS } from '../domain/validationEngine.js';
import { VERSIONS, VERSION_LABELS, refusAAfficher, ecartAbsenteisme } from '../domain/versions.js';
import { euro, pct } from '../domain/format.js';
import { toast } from './Toast.jsx';

// Barre de version et de statut du budget (écran Objectif) — port de renderVersionBar,
// updateStatutBar et renderRefusREX : onglets V1/V2/V3, description, dupliquer, comparer,
// version de soumission, statut, soumission au DR, bandeau de refus.

const btn = { width: 'auto', margin: 0, fontSize: 12, padding: '7px 12px' };

function CompareModal({ cols, nom, onClose, expl }) {
  const toutes = [
    ['Chiffre d\'affaires', (c) => euro(c.ca)],
    ['Charges de personnel', (c) => euro(c.ms)],
    ['MS / CA', (c) => pct(c.msRatio)],
    ['Résultat d\'exploitation', (c) => euro(c.rexpl)],
    ['Résultat net', (c) => euro(c.net), true],
    ['Résultat net / CA', (c) => pct(c.netRatio), true],
    ['Effectif (ETP)', (c) => c.etp.toFixed(1)],
    ['Nombre de salariés', (c) => c.nbSal],
    ['Heures supplémentaires', (c) => Math.round(c.hs) + ' h'],
    ['CP générés', (c) => c.cpG.toFixed(0) + ' J'],
    ['CP planifiés', (c) => c.cpP.toFixed(0) + ' J']
  ];
  // Le REX d'une agence ne voit pas les lignes sous le résultat d'exploitation
  const lignes = expl ? toutes.filter((l) => !l[2]) : toutes;
  return (
    <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ padding: 20 }}>
      <div className="modalCard" style={{ width: '100%', maxWidth: 800, maxHeight: '88vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 10 }}>
          <h2 style={{ margin: 0 }}>Comparaison des versions — {nom}</h2>
          <button onClick={onClose} style={{ ...btn, background: 'transparent', border: '1px solid var(--border)', color: 'var(--ink65)' }} aria-label="Fermer">✕</button>
        </div>
        <p className="hint" style={{ marginBottom: 18 }}>★ = version choisie pour la soumission. Comparez les scénarios avant de décider.</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 10 }}>Indicateur</th>
                {cols.map((c) => <th key={c.v} style={{ padding: 10, minWidth: 120 }}>{VERSION_LABELS[c.v]}{c.submitted ? <span style={{ color: 'var(--green)' }}> ★</span> : null}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '8px 10px', fontStyle: 'italic', color: 'var(--ink65)', fontSize: 12 }}>Description</td>
                {cols.map((c) => <td key={c.v} style={{ padding: '8px 10px', fontSize: 11, color: 'var(--ink65)', fontStyle: 'italic' }}>{c.desc || '—'}</td>)}
              </tr>
              {lignes.map(([l, f]) => (
                <tr key={l} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '9px 10px', fontWeight: 600, fontSize: 13 }}>{l}</td>
                  {cols.map((c) => <td key={c.v} style={{ padding: '9px 10px', fontFamily: 'DM Mono, monospace', fontSize: 13 }}>{f(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function BudgetBar() {
  const { profile } = useAuth();
  const {
    agency: a, agenceNom, statut, editable, budgetId, activeVersion, meta, versionsRemplies, validation,
    switchVersion, duplicateVersion, setVersionDesc, chooseSubmittedVersion, compareVersions, submit
  } = useBudget();
  const [busy, setBusy] = useState(false);
  const [cols, setCols] = useState(null);
  if (!a || !profile || !['rex', 'cg', 'admin'].includes(profile.role)) return null;

  const run = (f) => async (...args) => { if (busy) return; setBusy(true); try { await f(...args); } catch (e) { toast('Échec : ' + (e.message || 'erreur'), 'error'); } finally { setBusy(false); } };

  const onSwitch = run(async (v) => { const msg = await switchVersion(v); if (msg) toast(msg, msg.includes('vide') ? 'warn' : 'info'); });
  const onDup = run(async () => {
    if (!window.confirm('Dupliquer la version ' + VERSION_LABELS[activeVersion] + ' vers la prochaine version libre ? Vous pourrez ensuite la modifier indépendamment.')) return;
    const r = await duplicateVersion();
    toast(r.message, r.ok ? 'success' : 'warn');
  });
  const onCompare = run(async () => {
    const c = await compareVersions();
    if (c.length < 2) { toast('Il faut au moins 2 versions remplies pour comparer. Utilisez « Dupliquer la version active » pour créer une variante.', 'warn'); return; }
    setCols(c);
  });
  const onChoose = run(async () => { await chooseSubmittedVersion(); toast('Version ' + VERSION_LABELS[activeVersion] + ' choisie pour la soumission', 'success'); });
  const onSubmit = run(async () => {
    const ecart = ecartAbsenteisme(a);
    if (ecart && !window.confirm('Attention : votre taux d\'absentéisme moyen (' + pct(ecart.moyenne) + ') s\'écarte de la référence du contrôle de gestion (' + pct(ecart.cible) + ').\n\nVous pouvez le rééquilibrer avant de soumettre (bouton « Rééquilibrer automatiquement » de l\'écran Présence).\n\nSoumettre quand même ?')) return;
    if (!window.confirm('Soumettre la version ' + VERSION_LABELS[activeVersion] + ' au Directeur Régional ?\n\nCette version deviendra le budget officiel. Vous ne pourrez plus le modifier tant qu\'il est en validation.')) return;
    const r = await submit(profile.nom);
    toast(r.message, r.ok ? 'success' : 'warn');
  });

  const refus = profile.role === 'rex' && statut === 'brouillon' ? refusAAfficher(validation) : null;
  const peutSoumettre = (profile.role === 'rex' || profile.role === 'cg') && editable;
  const libelleSoumettre = statut === 'brouillon' ? 'Soumettre au DR' : 'Re-soumettre au DR';

  return (
    <div className="budgetBar" data-testid="budget-bar" style={{ marginBottom: 16 }}>
      {refus ? (
        <div className="rexRefusBanner" data-testid="refus-banner" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 16px', marginBottom: 12, border: '1px solid var(--orange)', background: 'var(--orange-light, rgba(196,83,0,.10))', fontSize: 13, lineHeight: 1.6 }}>
          <span style={{ fontSize: 20 }}>↩</span>
          <div>
            <b>Budget renvoyé pour correction</b><br />
            Refusé par {VALIDATOR_LABELS[refus.role] || refus.role} le {new Date(refus.date).toLocaleDateString('fr-FR')} : « {refus.commentaire} »<br />
            <span style={{ color: 'var(--ink65)' }}>Corrigez votre budget puis resoumettez-le.</span>
          </div>
        </div>
      ) : null}

      {budgetId ? (
        <div style={{ padding: '12px 14px', border: '1px solid var(--border)', background: 'var(--bg2)', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink65)' }}>Version</span>
            {VERSIONS.map((v) => {
              const actif = v === activeVersion, rempli = versionsRemplies[v];
              return (
                <button key={v} onClick={() => onSwitch(v)} disabled={busy} data-testid={'version-' + v}
                  style={{ ...btn, fontWeight: 700, background: actif ? 'linear-gradient(135deg,var(--violet),var(--violet2))' : (rempli ? 'var(--bg3)' : 'transparent'), color: actif ? '#fff' : (rempli ? 'var(--ink)' : 'var(--ink30)'), border: actif ? 'none' : '1px solid var(--border)' }}>
                  {VERSION_LABELS[v]}{meta.submittedVersion === v ? ' ★' : ''}
                </button>
              );
            })}
            <span style={{ flex: 1 }} />
            <button onClick={onDup} disabled={busy || !editable} style={btn}>⎘ Dupliquer la version active</button>
            <button onClick={onCompare} disabled={busy} style={btn}>⇄ Comparer les versions</button>
          </div>
          <input type="text" value={(meta.descriptions && meta.descriptions[activeVersion]) || ''} onChange={(e) => setVersionDesc(e.target.value)} disabled={!editable}
            placeholder={'Description de la version ' + VERSION_LABELS[activeVersion] + ' (ex. : scénario avec renfort estival)'} style={{ width: '100%', marginBottom: 8 }} />
          <div style={{ fontSize: 12 }}>
            {meta.submittedVersion === activeVersion
              ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>★ Cette version est celle choisie pour la soumission.</span>
              : <>
                  {meta.submittedVersion ? <span style={{ color: 'var(--ink65)' }}>La version {VERSION_LABELS[meta.submittedVersion]} est actuellement choisie pour la soumission. </span> : null}
                  {editable ? <button className="ok" onClick={onChoose} disabled={busy} style={{ ...btn, fontSize: 11, padding: '5px 10px' }}>✓ Choisir cette version pour la soumission</button> : null}
                </>}
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 14px', border: '1px solid var(--border)' }}>
        <span style={{ fontSize: 13 }}>Statut du budget :</span>
        <span className={'statut ' + statut} data-testid="statut-badge">{statutLabel(statut)}</span>
        <span style={{ flex: 1 }} />
        {peutSoumettre && budgetId ? <button className={statut === 'brouillon' ? 'ok' : 'warn'} onClick={onSubmit} disabled={busy} style={btn}>{libelleSoumettre}</button> : null}
        {!editable ? <span style={{ fontSize: 12, color: 'var(--blue2)' }}>🔒 En validation — lecture seule</span> : null}
      </div>

      {cols ? <CompareModal cols={cols} nom={agenceNom} expl={vueExploitation(a, profile.role)} onClose={() => setCols(null)} /> : null}
    </div>
  );
}
