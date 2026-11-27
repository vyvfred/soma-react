import { reperesAgence } from '../domain/reperes.js';
import { M } from '../domain/calculations.js';

// Bloc « Repères 2026 » : informe la décision (fiche de validation, écran Objectif du REX, écran Tableau de bord 2026).
// Rien n'est repris dans le budget 2027.
const k = (v) => (v === null || v === undefined ? '—' : Math.round(v / 1000).toLocaleString('fr-FR') + ' k€');
const p1 = (v) => (v === null || v === undefined || !isFinite(v) ? '—' : (Math.round(v * 10) / 10).toLocaleString('fr-FR') + ' %');
const COULEUR = { alerte: 'var(--red, #c0392b)', attention: 'var(--orange, #c45300)', info: 'var(--blue2, #3d6fd6)' };
const ICONE = { alerte: '⚠', attention: '◆', info: 'ℹ' };

export function periodeReperes(r) {
  const mc = (r && r.moisClos) || 0;
  if (!mc) return 'aucun mois clos';
  return 'réalisé ' + (mc === 1 ? M[0] : M[0] + '–' + M[mc - 1]) + (mc < 12 ? ' + estimation CG ' + (mc === 11 ? M[11] : M[mc] + '–' + M[11]) : '');
}

export default function ReperesBloc({ a, r, titre, sansBudget }) {
  if (!r) return null;
  const x = reperesAgence(a, r);
  if (!x) return null;
  const cel = { padding: '3px 8px', textAlign: 'right', whiteSpace: 'nowrap' };
  const evol = (l) => (l.v2026 && l.v2027 ? ((l.v2027 / l.v2026 - 1) * 100) : null);
  return (
    <div data-testid="reperes-2026" style={{ margin: '8px 0', padding: '10px 12px', border: '1px solid var(--border)', background: 'var(--card2)', fontSize: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--blue2, #3d6fd6)', marginBottom: 4 }}>{titre || 'Repères 2026 (tableau de bord)'}</div>
      <div style={{ color: 'var(--ink65)', marginBottom: 6 }}>Atterrissage 2026 : {periodeReperes(r)}. Pour information : ces chiffres ne modifient pas le budget.</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr><th style={{ ...cel, textAlign: 'left' }} /><th style={cel}>Réalisé 2025</th><th style={cel}>Atterrissage 2026</th>{sansBudget ? null : <><th style={cel}>Budget 2027</th><th style={cel}>2027 / 2026</th></>}</tr></thead>
          <tbody>
            {x.lignes.map((l) => (
              <tr key={l.cle} data-testid={'reperes-' + l.cle}>
                <td style={{ ...cel, textAlign: 'left' }}>{l.lib}</td><td style={cel}>{k(l.v2025)}</td><td style={{ ...cel, fontWeight: 700 }}>{k(l.v2026)}</td>
                {sansBudget ? null : <><td style={cel}>{k(l.v2027)}</td><td style={cel}>{evol(l) === null || l.cle === 'rex' ? '—' : (evol(l) > 0 ? '+' : '') + p1(evol(l))}</td></>}
              </tr>
            ))}
            {x.ratios.map((t) => (
              <tr key={'r' + t.cle} style={{ color: 'var(--ink65)' }}>
                <td style={{ ...cel, textAlign: 'left' }}>{t.lib} / CA</td><td style={cel}>{p1(t.r2025)}</td><td style={cel}>{p1(t.r2026)}</td>
                {sansBudget ? null : <><td style={cel}>{p1(t.r2027)}</td><td style={cel}>{t.r2026 !== null && t.r2027 !== null ? ((t.r2027 - t.r2026) > 0 ? '+' : '') + (Math.round((t.r2027 - t.r2026) * 10) / 10).toLocaleString('fr-FR') + ' pt' : '—'}</td></>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {x.fiabilite ? (
        <div data-testid="reperes-fiabilite" style={{ marginTop: 6 }}>
          Budget 2026 sur {x.fiabilite.mois} mois : CA réalisé <b>{k(x.fiabilite.caReel)}</b> pour {k(x.fiabilite.caBudget)} budgétés · résultat d'exploitation réalisé <b>{k(x.fiabilite.rexReel)}</b> pour {k(x.fiabilite.rexBudget)} budgétés.
        </div>
      ) : null}
      {(sansBudget ? x.alertes.filter((al) => !/2027/.test(al.texte)) : x.alertes).length ? (
        <ul data-testid="reperes-alertes" style={{ margin: '6px 0 0', paddingLeft: 0, listStyle: 'none' }}>
          {(sansBudget ? x.alertes.filter((al) => !/2027/.test(al.texte)) : x.alertes).map((al, i) => (
            <li key={i} data-niveau={al.niveau} style={{ color: COULEUR[al.niveau], margin: '2px 0' }}>{ICONE[al.niveau]} {al.texte}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
