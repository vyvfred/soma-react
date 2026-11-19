import { useEffect, useState } from 'react';
import { chargerReperes } from '../lib/reperesApi.js';
import { completerAtterrissageCA, AGENCE_RESEAU, INDICATEURS_REPERES, anneeRep, annuel2025, atterrissage2026, budget2027Rep, comparaisonsLignes, ratioMoisRep } from '../domain/reperes.js';
import { M, libLigneSIG } from '../domain/calculations.js';

// Comparaisons de la Synthèse (nov. 2026) : budget 2027 face à 2025 (N-2), 2026 (N-1) et à la moyenne du réseau.
// Pour situer le budget : aucune couleur d'alerte, aucune valeur imposée.
const k = (v) => (v === null || v === undefined ? '—' : Math.round(v / 1000).toLocaleString('fr-FR') + ' k€');
const p1 = (v) => (v === null || v === undefined || !isFinite(v) ? '—' : (Math.round(v * 10) / 10).toLocaleString('fr-FR') + ' %');
const ecart = (v) => (v === null || v === undefined || !isFinite(v) ? '—' : (v > 0 ? '+' : '') + (Math.round(v * 10) / 10).toLocaleString('fr-FR'));
const cel = { padding: '5px 8px', textAlign: 'right', whiteSpace: 'nowrap' };

export function useReperesAgence(nom) {
  const [x, setX] = useState({ r: null, reseau: null });
  useEffect(() => {
    let on = true;
    if (nom) chargerReperes(nom).then((m) => { if (on) setX({ r: m[nom] || null, reseau: m[AGENCE_RESEAU] || null }); });
    return () => { on = false; };
  }, [nom]);
  return x;
}

// Lignes supplémentaires du tableau « Masse salariale / CA, mois par mois »
export function LignesMSHistoriques({ r, reseau }) {
  const lignes = [
    ['MS / CA 2026', anneeRep(r, 2026)],
    ['MS / CA 2025', anneeRep(r, 2025)],
    ['Moyenne réseau 2026', anneeRep(reseau, 2026)]
  ].filter((l) => l[1]);
  if (!lignes.length) return null;
  return lignes.map(([lib, row]) => (
    <tr key={lib} data-testid={'ratio-ms-histo'} style={{ borderTop: '1px solid var(--border)', color: 'var(--ink65)' }}>
      <td style={{ ...cel, textAlign: 'left' }}>{lib}</td>
      {M.map((_, m) => <td key={m} className="num" style={cel}>{p1(ratioMoisRep(row, 'perso', m))}</td>)}
      <td className="num" style={cel}>{p1(totalRatio(row))}</td>
    </tr>
  ));
}
function totalRatio(row) {
  if (!row || !row.reel) return null;
  const ca = atterrissage2026(row, 'ca').val, ms = atterrissage2026(row, 'perso').val;
  return ca ? ms / ca * 100 : null;
}

export default function Comparaisons({ a, r: r0, reseau }) {
  if (!r0 && !reseau) return null;
  const r = completerAtterrissageCA(r0, a && a.histCA);
  const at = (cle) => (anneeRep(r, 2026) ? atterrissage2026(r, cle).val : null);
  const an25 = (cle) => annuel2025(r, cle);
  const ca25 = an25('ca'), ca26 = at('ca');
  const lignes = comparaisonsLignes(a, r, reseau);
  const nb = reseau && reseau.nbAgences;
  return (
    <div data-testid="comparaisons" className="sv-carte">
      <div style={{ fontSize: 12, color: 'var(--ink65)', marginBottom: 10 }}>
        Pour situer votre budget, sans valeur imposée : réalisé 2025, atterrissage 2026 (réalisé des mois clos + estimation du contrôle de gestion), budget 2027{nb ? <> et moyenne des {nb} agences du réseau (pondérée par le CA)</> : null}.
      </div>
      {r && (ca25 !== null || ca26 !== null) ? (
        <div style={{ overflowX: 'auto', marginBottom: 12 }}>
          <table data-testid="comparaisons-cles" style={{ borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ color: 'var(--ink65)' }}><th style={{ ...cel, textAlign: 'left' }} /><th style={cel}>2025</th><th style={cel}>2026</th><th style={cel}>Budget 2027</th><th style={cel}>2027 / 2026</th><th style={cel}>2027 / 2025</th></tr></thead>
            <tbody>
              {INDICATEURS_REPERES.map((ind) => {
                const v25 = an25(ind.cle), v26 = at(ind.cle), v27 = budget2027Rep(a, ind.cle);
                const ev = (x) => (ind.cle === 'rex' || !x || !v27 ? '—' : ecart((v27 / x - 1) * 100) + ' %');
                return (
                  <tr key={ind.cle} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ ...cel, textAlign: 'left' }}>{ind.lib}</td><td className="num" style={cel}>{k(v25)}</td><td className="num" style={cel}>{k(v26)}</td>
                    <td className="num" style={{ ...cel, fontWeight: 700 }}>{v27 ? k(v27) : '—'}</td><td className="num" style={cel}>{ev(v26)}</td><td className="num" style={cel}>{ev(v25)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      <div style={{ overflowX: 'auto' }}>
        <table data-testid="comparaisons-lignes" style={{ borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: 'var(--ink65)' }}><th style={{ ...cel, textAlign: 'left' }}>En % du CA</th><th style={cel}>2025</th><th style={cel}>2026</th><th style={cel}>Budget 2027</th><th style={cel}>Écart 2027 / 2026</th><th style={cel}>Réseau 2025</th><th style={cel}>Réseau 2026</th><th style={cel}>Écart au réseau</th></tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.label} data-testid="comparaison-ligne" style={{ borderTop: '1px solid var(--border)', fontWeight: /^[A-Z' ]+$/.test(l.label) || l.label === 'Charges de personnel' || l.label === 'Autres Achats et charges externes' ? 700 : 400 }}>
                <td style={{ ...cel, textAlign: 'left' }}>{l.label === 'Autres Achats et charges externes' ? 'Charges externes (total)' : libLigneSIG(l.label)}</td>
                <td className="num" style={cel}>{p1(l.r2025)}</td><td className="num" style={cel}>{p1(l.r2026)}</td><td className="num" style={cel}>{p1(l.r2027)}</td>
                <td className="num" style={{ ...cel, color: 'var(--ink65)' }}>{l.r2027 !== null && l.r2026 !== null ? ecart(l.r2027 - l.r2026) + ' pt' : '—'}</td>
                <td className="num" style={{ ...cel, color: 'var(--ink65)' }}>{p1(l.res2025)}</td><td className="num" style={{ ...cel, color: 'var(--ink65)' }}>{p1(l.res2026)}</td>
                <td className="num" style={{ ...cel, color: 'var(--ink65)' }}>{l.r2027 !== null && l.res2026 !== null ? ecart(l.r2027 - l.res2026) + ' pt' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink65)', marginTop: 6 }}>
        2026 en % du CA : sur les mois clos ({anneeRep(r, 2026) ? M[0] + '–' + M[(anneeRep(r, 2026).moisClos || 1) - 1] : '—'}). Les écarts sont donnés à titre d'information : une agence peut avoir de bonnes raisons de s'écarter de la moyenne.
      </div>
    </div>
  );
}
