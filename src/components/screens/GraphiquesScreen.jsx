import { useEffect, useState } from 'react';
import { loadNetworkBudgets } from '../../lib/budgetApi.js';
import { agencesOps } from '../../config/agences.js';
import { computeGraphiquesRows } from '../../domain/graphiques.js';
import { euro } from '../../domain/format.js';

// ── Graphe 1 : évolution du CA (barres groupées) — port de renderChartEvoCA ──
function evoCASvg(rows) {
  if (!rows.length) return '<div class="hint">Aucune donnée disponible.</div>';
  const barW = 18, gap = 6, groupGap = 28, leftAxis = 70, topPad = 20, chartH = 280, botPad = 90;
  const groupW = barW * 3 + gap * 2;
  const W = leftAxis + rows.length * (groupW + groupGap) + 20;
  const H = chartH + topPad + botPad;
  let maxCA = Math.max(...rows.map((r) => Math.max(r.ca2025, r.ca2026, r.caB2027)).concat([1]));
  maxCA = Math.ceil(maxCA / 500000) * 500000;
  const y = (v) => topPad + chartH - (v / maxCA * chartH);
  let svg = '<svg width="' + W + '" height="' + H + '" style="font-family:DM Sans,sans-serif">';
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const val = maxCA / steps * i, yy = y(val);
    svg += '<line x1="' + leftAxis + '" y1="' + yy + '" x2="' + (W - 20) + '" y2="' + yy + '" stroke="rgba(255,255,255,.06)"/>';
    svg += '<text x="' + (leftAxis - 8) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="10" fill="var(--ink65)">' + Math.round(val / 1000) + 'k</text>';
  }
  const colors = ['#4A4B68', '#4A9EFF', '#472683'];
  const keys = ['ca2025', 'ca2026', 'caB2027'];
  rows.forEach((r, i) => {
    const gx = leftAxis + i * (groupW + groupGap) + groupGap / 2;
    keys.forEach((k, j) => {
      const v = r[k], bx = gx + j * (barW + gap), by = y(v), bh = topPad + chartH - by;
      svg += '<rect x="' + bx + '" y="' + by + '" width="' + barW + '" height="' + Math.max(0, bh) + '" fill="' + colors[j] + '"><title>' + r.nom + ' : ' + euro(v) + '</title></rect>';
    });
    const cx = gx + groupW / 2;
    svg += '<text x="' + cx + '" y="' + (topPad + chartH + 14) + '" text-anchor="end" font-size="9" fill="var(--ink65)" transform="rotate(-45 ' + cx + ' ' + (topPad + chartH + 14) + ')">' + r.nom.slice(0, 16) + '</text>';
  });
  svg += '</svg>';
  return svg;
}

// ── Graphe 2 : nuage TXR vs taux de charge — port de renderChartScatter ──
function scatterSvg(rows) {
  const pts = rows.filter((r) => r.txr > 0 && r.txCharge > 0);
  if (!pts.length) return '<div class="hint">Données insuffisantes (TXR et taux de charge requis).</div>';
  const W = 760, H = 420, pad = 60;
  const minTxr = Math.min(...pts.map((p) => p.txr)) - 2;
  const maxTxr = Math.max(...pts.map((p) => p.txr)) + 2;
  const minCh = 0, maxCh = Math.max(130, Math.max(...pts.map((p) => p.txCharge)) + 10);
  const px = (txr) => pad + (txr - minTxr) / (maxTxr - minTxr) * (W - pad - 20);
  const py = (ch) => H - pad - (ch - minCh) / (maxCh - minCh) * (H - pad - 20);
  let svg = '<svg width="' + W + '" height="' + H + '" style="font-family:DM Sans,sans-serif;max-width:100%">';
  const y100 = py(100);
  svg += '<rect x="' + pad + '" y="' + py(maxCh) + '" width="' + (W - pad - 20) + '" height="' + (y100 - py(maxCh)) + '" fill="rgba(196,83,0,.06)"/>';
  svg += '<line x1="' + pad + '" y1="' + y100 + '" x2="' + (W - 20) + '" y2="' + y100 + '" stroke="var(--orange)" stroke-dasharray="4 4" opacity="0.5"/>';
  svg += '<text x="' + (W - 24) + '" y="' + (y100 - 6) + '" text-anchor="end" font-size="10" fill="var(--orange)">Capacité max (100%)</text>';
  svg += '<line x1="' + pad + '" y1="' + (H - pad) + '" x2="' + (W - 20) + '" y2="' + (H - pad) + '" stroke="var(--border2)"/>';
  svg += '<line x1="' + pad + '" y1="' + (H - pad) + '" x2="' + pad + '" y2="20" stroke="var(--border2)"/>';
  for (let t = Math.ceil(minTxr / 5) * 5; t <= maxTxr; t += 5) {
    const xx = px(t);
    svg += '<line x1="' + xx + '" y1="' + (H - pad) + '" x2="' + xx + '" y2="' + (H - pad + 5) + '" stroke="var(--border2)"/>';
    svg += '<text x="' + xx + '" y="' + (H - pad + 18) + '" text-anchor="middle" font-size="10" fill="var(--ink65)">' + t + '</text>';
  }
  svg += '<text x="' + ((W + pad) / 2) + '" y="' + (H - 14) + '" text-anchor="middle" font-size="12" fill="var(--ink)">TXR (€/h) — productivité</text>';
  for (let c = 0; c <= maxCh; c += 20) {
    const yy = py(c);
    svg += '<line x1="' + (pad - 5) + '" y1="' + yy + '" x2="' + pad + '" y2="' + yy + '" stroke="var(--border2)"/>';
    svg += '<text x="' + (pad - 8) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="10" fill="var(--ink65)">' + c + '%</text>';
  }
  svg += '<text x="18" y="' + (H / 2) + '" text-anchor="middle" font-size="12" fill="var(--ink)" transform="rotate(-90 18 ' + (H / 2) + ')">Taux de charge</text>';
  pts.forEach((p) => {
    const x = px(p.txr), yy = py(p.txCharge);
    const col = p.txCharge > 115 ? 'var(--orange)' : p.txCharge > 100 ? '#FF8F00' : 'var(--accent-blue)';
    svg += '<circle cx="' + x + '" cy="' + yy + '" r="6" fill="' + col + '" opacity="0.85"><title>' + p.nom + ' — TXR ' + p.txr + ' €/h, charge ' + p.txCharge + '%</title></circle>';
    svg += '<text x="' + (x + 9) + '" y="' + (yy + 3) + '" font-size="9" fill="var(--ink65)">' + p.nom.slice(0, 12) + '</text>';
  });
  svg += '</svg>';
  return svg;
}

export default function GraphiquesScreen() {
  const [state, setState] = useState({ loading: true, error: null, map: null });

  useEffect(() => {
    let active = true;
    loadNetworkBudgets()
      .then((map) => { if (active) setState({ loading: false, error: null, map }); })
      .catch((err) => { if (active) setState({ loading: false, error: err.message || 'Erreur de chargement', map: null }); });
    return () => { active = false; };
  }, []);

  if (state.loading) return <div className="card"><h2>Graphiques</h2><p className="hint">Chargement…</p></div>;
  if (state.error) return <div className="card"><h2>Graphiques</h2><p className="hint">Erreur : {state.error}</p></div>;

  const rows = computeGraphiquesRows(state.map || {}, agencesOps());

  return (
    <div className="card">
      <h2 style={{ marginBottom: 14 }}>Graphiques réseau</h2>

      <h3 style={{ fontSize: 14, marginBottom: 8 }}>Évolution du chiffre d'affaires par agence</h3>
      <div style={{ overflowX: 'auto' }} dangerouslySetInnerHTML={{ __html: evoCASvg(rows) }} />
      <div style={{ display: 'flex', gap: 18, margin: '10px 0 24px', fontSize: 12, flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#4A4B68', marginRight: 5 }} />CA 2025</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#4A9EFF', marginRight: 5 }} />CA 2026</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#472683', marginRight: 5 }} />CA budgété 2027</span>
      </div>

      <h3 style={{ fontSize: 14, marginBottom: 8 }}>Productivité (TXR) vs taux de charge</h3>
      <p className="hint" style={{ fontSize: 12, marginBottom: 8 }}>
        Chaque point est une agence. À droite = plus productive ; au-dessus de 100 % = objectif au-delà de la capacité (zone orange).
      </p>
      <div style={{ overflowX: 'auto' }} dangerouslySetInnerHTML={{ __html: scatterSvg(rows) }} />
    </div>
  );
}
