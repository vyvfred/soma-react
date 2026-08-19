// Avancement de la préparation des données de référence — port fidèle de
// renderRefAgencesInsight(). Fonction pure : renvoie les KPI et le texte.
export function refAgencesInsight(map, ops) {
  const total = ops.length;
  let avecRef = 0;
  const sansRef = [];
  ops.forEach((ag) => {
    const d = map[ag.nom] || {};
    const hasRef = !!(d.histTXR2026 || d.costHour || d.tauxHoraireBrut);
    if (hasRef) avecRef++; else sansRef.push(ag.nom);
  });

  const kpis = [
    { label: 'Agences', value: total, note: 'dans le réseau' },
    { label: 'Données saisies', value: avecRef + '/' + total, note: avecRef < total ? 'à compléter' : '✓ complet' },
    { label: 'Restantes', value: sansRef.length, note: sansRef.length ? 'sans référence' : '✓ aucune' }
  ];

  let text;
  if (sansRef.length === 0) {
    text = 'Toutes les agences ont leurs données de référence. Les REX peuvent démarrer leur budget sur des bases complètes.';
  } else {
    const liste = sansRef.slice(0, 4).join(', ') + (sansRef.length > 4 ? '…' : '');
    text = '<b>' + avecRef + ' agences sur ' + total + '</b> ont leurs données de référence. Il reste <b>' + sansRef.length + '</b> à compléter (' + liste + '). Sans ces données, les REX concernés ne peuvent pas démarrer leur budget.';
  }

  return { kpis, text, avecRef, sansRef };
}
