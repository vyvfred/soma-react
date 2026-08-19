// Comparaison inter-agences — logique pure extraite de renderComparative().
// Prend la map réseau { agence: { statut, data } } et la liste des agences
// opérationnelles ; renvoie les lignes, les médianes réseau et les agences atypiques.
// Lit directement les données brutes (comme l'original), sans passer par le noyau.

const ROULANTS = ['DEA', 'AA', 'TAXI', 'TPMR'];

function median(arr, fn) {
  const vals = arr.map(fn).filter((v) => v !== null && !isNaN(v)).sort((a, b) => a - b);
  if (!vals.length) return null;
  return vals[Math.floor(vals.length / 2)];
}

export function computeComparative(map, ops) {
  const rows = ops.map((ag) => {
    const d = map[ag.nom] ? map[ag.nom].data : {};
    const statut = map[ag.nom] ? map[ag.nom].statut : '—';
    const txr = +d.histTXR2026 || null;
    const mal = +d.targetAbsRate || null;
    const ch = +d.costHour || null;

    let etp = 0;
    if (d.employees && d.employees.length) {
      etp = d.employees.filter((e) => ROULANTS.includes(e.qual))
        .reduce((s, e) => s + (+e.hours || 0) * (+e.pctRoulant || 100) / 100 / 35, 0);
      etp = Math.round(etp * 100) / 100;
    }

    let tauxHS = null;
    if (d.cal && d.cal.length && d.targetTXR) {
      const baseHs = d.employees
        ? d.employees.filter((e) => ROULANTS.includes(e.qual)).reduce((s, e) => s + (+e.hours || 0) * (+e.pctRoulant || 100) / 100, 0)
        : 0;
      const caB = d.cal.reduce((s, day) => s + (day.total || 0), 0);
      const caMax = baseHs * (1 - (+d.targetAbsRate || 8) / 100) * (+d.histTXR2026 || +d.targetTXR || 40) * 52;
      tauxHS = caMax > 0 ? Math.round(Math.max(0, (caB - caMax) / caMax * 100)) : null;
    }

    return { nom: ag.nom, zone: ag.zone, txr, mal, ch, etp, tauxHS, statut, hasData: !!(txr || mal || ch || etp) };
  });

  const withData = rows.filter((r) => r.hasData);
  const medians = {
    txr: median(withData, (r) => r.txr),
    mal: median(withData, (r) => r.mal),
    ch: median(withData, (r) => r.ch),
    etp: median(withData, (r) => r.etp),
    tauxHS: median(withData, (r) => r.tauxHS)
  };

  // Agences atypiques (> 15 % de la médiane sur un indicateur défavorable).
  const atypiques = [];
  withData.forEach((r) => {
    const signaux = [];
    if (r.txr !== null && medians.txr && r.txr < medians.txr * 0.85) signaux.push('TXR faible');
    if (r.mal !== null && medians.mal && r.mal > medians.mal * 1.15) signaux.push('absentéisme élevé');
    if (r.ch !== null && medians.ch && r.ch > medians.ch * 1.15) signaux.push('coût horaire élevé');
    if (r.tauxHS !== null && medians.tauxHS && r.tauxHS > medians.tauxHS * 1.15 && medians.tauxHS > 0) signaux.push('recours aux HS important');
    if (signaux.length) atypiques.push({ nom: r.nom, signaux });
  });

  return { rows, withData, medians, atypiques };
}
