// Avancement de l'affectation des DR — port fidèle de l'insight de renderAffectation().
// Pur : renvoie les KPI et le texte, à partir des agences opérationnelles, de la map
// agence→region_id et de la liste des DR.
export function affectationInsight(ops, agMap, drs) {
  const affectees = ops.filter((a) => {
    const rid = agMap[a.nom];
    return rid && drs.some((dr) => dr.region_id === rid);
  });
  const sansDR = ops.filter((a) => !affectees.includes(a));
  const nbDRutilises = new Set(affectees.map((a) => agMap[a.nom])).size;

  const kpis = [
    { label: 'Agences', value: ops.length, note: 'dans le réseau' },
    { label: 'Affectées', value: affectees.length + '/' + ops.length, note: affectees.length < ops.length ? 'à compléter' : '✓ complet' },
    { label: 'DR mobilisés', value: nbDRutilises, note: drs.length ? ('sur ' + drs.length + ' DR') : 'aucun DR' }
  ];

  let text;
  if (!drs.length) {
    text = 'Aucun directeur régional n\u2019est encore créé. Créez les comptes DR pour pouvoir affecter les agences.';
  } else if (sansDR.length === 0) {
    text = 'Toutes les agences ont un DR affecté. Le circuit de validation peut démarrer : chaque budget soumis ira au bon directeur régional.';
  } else {
    const liste = sansDR.slice(0, 4).map((a) => a.nom).join(', ') + (sansDR.length > 4 ? '…' : '');
    text = '<b>' + affectees.length + ' agences sur ' + ops.length + '</b> ont un DR affecté. Il reste <b>' + sansDR.length + '</b> à affecter (' + liste + '). Sans DR, le budget de ces agences ne pourra pas être validé à la première étape.';
  }

  return { kpis, text, affectees, sansDR };
}
