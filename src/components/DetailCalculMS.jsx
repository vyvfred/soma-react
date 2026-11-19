import { useState } from 'react';
import { detailMSMois, feuillesDetailMS, LIGNES_DETAIL_MS } from '../domain/detailMS.js';
import { telechargerClasseur } from '../lib/importExcel.js';
import { avecCacheMoteur, M } from '../domain/calculations.js';
import { euro } from '../domain/format.js';

// Détail du calcul de la masse salariale : une ligne par poste, une colonne par mois de paie, formules du mois choisi
export default function DetailCalculMS({ a, ouvertParDefaut = false, sansFermer = false }) {
  const [ouvert, setOuvert] = useState(ouvertParDefaut);
  const [mois, setMois] = useState(0);
  if (!ouvert) return <button data-testid="detail-ms-ouvrir" className="secondary" onClick={() => setOuvert(true)} style={{ marginTop: 14, fontSize: 12 }}>▸ Détail du calcul de la masse salariale</button>;
  const d = avecCacheMoteur(() => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((m) => detailMSMois(a, m)));
  const cell = { padding: '4px 6px', textAlign: 'right', whiteSpace: 'nowrap' };
  const dm = d[mois];
  return (
    <div data-testid="detail-ms" style={{ marginTop: 14, padding: 14, border: '1px solid var(--border)', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>Détail du calcul de la masse salariale</h3>
        <span style={{ flex: 1 }} />
        <button data-testid="detail-ms-export" className="secondary" style={{ fontSize: 12 }} onClick={() => telechargerClasseur(feuillesDetailMS(a), 'SOMA_detail_masse_salariale_' + a.name.replace(/\s+/g, '_') + '_2027.xlsx')}>⬇ Exporter (Excel)</button>
        {sansFermer ? null : <button className="secondary" style={{ fontSize: 12 }} onClick={() => setOuvert(false)}>Fermer</button>}
      </div>
      <p className="hint" style={{ fontSize: 12, margin: '0 0 10px' }}>Salaires de base mensualisés ; variables (HS, retenues) rattachées à la période de paie, au prorata des jours. Cliquez sur un mois pour afficher ses formules. Le total de chaque colonne est la masse salariale du mois.</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
          <thead>
            <tr>
              <th style={{ ...cell, textAlign: 'left' }}>Poste</th>
              {d.map((x, m) => <th key={m} style={{ ...cell, cursor: 'pointer', background: m === mois ? 'rgba(139,127,255,.15)' : undefined }} onClick={() => setMois(m)}>{M[m]}</th>)}
              <th style={cell}>Total</th>
            </tr>
          </thead>
          <tbody>
            {LIGNES_DETAIL_MS.map(([cle, lib], i) => {
              const v = d.map((x) => (x.lignes[i] ? x.lignes[i].montant : 0));
              if (v.every((x) => Math.abs(x) < 0.5)) return null;
              return (
                <tr key={cle}>
                  <td style={{ ...cell, textAlign: 'left' }}>{lib}</td>
                  {v.map((x, m) => <td key={m} style={{ ...cell, color: x < 0 ? 'var(--orange, #c45300)' : undefined, background: m === mois ? 'rgba(139,127,255,.08)' : undefined }}>{Math.abs(x) >= 0.5 ? Math.round(x).toLocaleString('fr-FR') : ''}</td>)}
                  <td style={{ ...cell, fontWeight: 700 }}>{Math.round(v.reduce((s, x) => s + x, 0)).toLocaleString('fr-FR')}</td>
                </tr>
              );
            })}
            <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700 }}>
              <td style={{ ...cell, textAlign: 'left' }}>Total masse salariale</td>
              {d.map((x, m) => <td key={m} data-testid={'detail-ms-total-' + m} style={{ ...cell, background: m === mois ? 'rgba(139,127,255,.08)' : undefined }}>{Math.round(x.total).toLocaleString('fr-FR')}</td>)}
              <td style={cell}>{Math.round(d.reduce((s, x) => s + x.total, 0)).toLocaleString('fr-FR')}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {dm && dm.periode ? (
        <div data-testid="detail-ms-formules" style={{ marginTop: 12 }}>
          <h4 style={{ margin: '0 0 6px', fontSize: 13 }}>Formules — paie {/^[aeiou]/i.test(dm.periode.mois) ? 'd\'' : 'de '}{dm.periode.mois.toLowerCase()} ({dm.periode.debut.split('-').reverse().join('/')} – {dm.periode.fin.split('-').reverse().join('/')})</h4>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
            <tbody>
              {dm.lignes.filter((l) => Math.abs(l.montant) >= 0.5 || l.cle === 'base').map((l) => (
                <tr key={l.cle} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '4px 6px', width: '28%' }}>{l.lib}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', whiteSpace: 'nowrap', width: '12%', fontWeight: 700, color: l.montant < 0 ? 'var(--orange, #c45300)' : undefined }}>{euro(Math.round(l.montant))}</td>
                  <td style={{ padding: '4px 6px', color: 'var(--ink65)' }}>{l.formule}</td>
                </tr>
              ))}
              <tr><td style={{ padding: '6px', fontWeight: 700 }}>Total</td><td style={{ padding: '6px', textAlign: 'right', fontWeight: 700 }}>{euro(Math.round(dm.total))}</td><td /></tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
