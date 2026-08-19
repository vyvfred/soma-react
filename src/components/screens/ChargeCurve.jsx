import { needWeeks, hsParPersonne, mainMonth } from '../../domain/calculations.js';

const M = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const ENV_COLORS = ['rgba(139,127,255,.10)', 'rgba(45,212,191,.10)', 'rgba(245,158,11,.10)'];
const ENV_NAMES = ['Juin–Octobre (60% des congés)', 'Nov–Janvier (20%)', 'Février–Mai (20%)'];

// Courbe de charge hebdomadaire — port fidèle de renderChargeCurve().
// Construit le même SVG (HS/personne par semaine, zones légales, seuils).
// Le clic « ouvrir le mois » n'est pas encore câblé (navigation mois non portée).
export default function ChargeCurve({ agency: a }) {
  const weeks = needWeeks(a);
  const pts = weeks.map((w) => {
    const hp = hsParPersonne(a, w.week);
    return { week: w.week, mois: mainMonth(a, w.week), ratio: hp.ratio, hs: hp.hs, etp: hp.etp };
  });
  if (!pts.length) return null;

  const envOf = (mois) => ([5, 6, 7, 8, 9].includes(mois) ? 0 : [10, 11, 0].includes(mois) ? 1 : 2);

  const W = 900, H = 220, padL = 44, padR = 16, padT = 16, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  let maxRatio = Math.max(...pts.map((p) => p.ratio).concat([1]));
  maxRatio = Math.ceil(maxRatio * 1.15);
  const n = pts.length;
  const cx = (i) => padL + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
  const cy = (r) => padT + plotH - (r / maxRatio) * plotH;
  const moy = pts.reduce((s, p) => s + p.ratio, 0) / n;

  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block">';

  // Zones d'enveloppe.
  let zoneStart = 0;
  for (let i = 1; i <= n; i++) {
    if (i === n || envOf(pts[i].mois) !== envOf(pts[zoneStart].mois)) {
      const e = envOf(pts[zoneStart].mois);
      const x1 = cx(zoneStart) - (zoneStart > 0 ? (cx(zoneStart) - cx(zoneStart - 1)) / 2 : 0);
      const x2 = cx(i - 1) + (i < n ? (cx(i) - cx(i - 1)) / 2 : 0);
      svg += '<rect x="' + x1.toFixed(1) + '" y="' + padT + '" width="' + (x2 - x1).toFixed(1) + '" height="' + plotH + '" fill="' + ENV_COLORS[e] + '"/>';
      zoneStart = i;
    }
  }

  // Ligne de moyenne.
  svg += '<line x1="' + padL + '" y1="' + cy(moy).toFixed(1) + '" x2="' + (W - padR) + '" y2="' + cy(moy).toFixed(1) + '" stroke="var(--ink30)" stroke-width="1" stroke-dasharray="4 4"/>';
  svg += '<text x="' + (W - padR) + '" y="' + (cy(moy) - 4).toFixed(1) + '" text-anchor="end" font-size="10" fill="var(--ink30)">moyenne ' + moy.toFixed(1) + ' h/pers</text>';

  // Axe Y.
  for (let g = 0; g <= maxRatio; g += Math.max(1, Math.round(maxRatio / 4))) {
    svg += '<text x="' + (padL - 6) + '" y="' + (cy(g) + 3).toFixed(1) + '" text-anchor="end" font-size="9" fill="var(--ink30)">' + g + '</text>';
  }

  // Courbe.
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + cx(i).toFixed(1) + ' ' + cy(p.ratio).toFixed(1)).join(' ');
  svg += '<path d="' + path + '" fill="none" stroke="var(--violet)" stroke-width="2"/>';

  // Points colorés selon la charge.
  const seuilWarn = moy * 1.4, seuilCrit = moy * 1.8;
  pts.forEach((p, i) => {
    const col = p.ratio > seuilCrit ? 'var(--orange)' : (p.ratio > seuilWarn ? '#F59E0B' : 'var(--violet)');
    const r = p.ratio > seuilWarn ? 3.5 : 2.5;
    svg += '<circle cx="' + cx(i).toFixed(1) + '" cy="' + cy(p.ratio).toFixed(1) + '" r="' + r + '" fill="' + col + '"><title>Semaine ' + p.week + ' — ' + p.ratio.toFixed(1) + ' h/pers (' + Math.round(p.hs) + ' h au total)</title></circle>';
  });

  // Étiquettes de mois.
  const moisVus = {};
  pts.forEach((p, i) => { if (!(p.mois in moisVus)) moisVus[p.mois] = i; });
  Object.keys(moisVus).forEach((m) => {
    const i = moisVus[m];
    svg += '<text x="' + cx(i).toFixed(1) + '" y="' + (H - 8) + '" font-size="9" fill="var(--ink65)">' + M[+m] + '</text>';
  });

  svg += '</svg>';

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Charge hebdomadaire (heures supp. / personne)</div>
      <div dangerouslySetInnerHTML={{ __html: svg }} />
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8, fontSize: 11, color: 'var(--ink65)' }}>
        {ENV_NAMES.map((name, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, display: 'inline-block', background: ENV_COLORS[i].replace('.10', '.5') }} />
            {name}
          </span>
        ))}
      </div>
      <p className="hint" style={{ marginTop: 8, fontSize: 12 }}>
        💡 Les heures supplémentaires sont lissées <b>à l'intérieur de chaque période légale de congés</b>.
        Les niveaux peuvent différer entre périodes car la loi impose de concentrer 60 % des congés sur juin–octobre.
        Une courbe <b>plate dans chaque zone</b> est le signe d'une bonne répartition.
      </p>
    </div>
  );
}
