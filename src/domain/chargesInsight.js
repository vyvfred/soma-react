import { manual, coefHSMoyen, T, M } from './calculations.js';
import { euro } from './format.js';

// Interprétation de la saisie des charges CG — port fidèle de renderCgInsight().
// Fonction pure : renvoie les KPI et le texte d'avancement.
export function chargesInsight(a) {
  const postesCharge = T.filter((r) => r.type === 'charge');
  const totalPostes = postesCharge.length;
  let saisis = 0;
  postesCharge.forEach((r) => {
    const total = M.reduce((s, _, m) => s + manual(a, r.label, m), 0);
    if (Math.abs(total) > 0) saisis++;
  });

  let coutHoraire = +a.costHour || 0;
  if (!coutHoraire && a.tauxHoraireBrut && a.tauxChargePatronal) {
    coutHoraire = +a.tauxHoraireBrut * (1 + (+a.tauxChargePatronal) / 100);
  }

  const kpis = [
    { label: 'Postes saisis', value: saisis + '/' + totalPostes, note: saisis < totalPostes ? 'à compléter' : '✓ complet' },
    { label: 'Coût horaire', value: coutHoraire ? euro(coutHoraire).replace(' €', '') + ' €/h' : '—', note: coutHoraire ? 'brut chargé' : 'à renseigner' },
    { label: 'Coefficient HS moyen', value: '×' + coefHSMoyen(a).toFixed(3), note: 'selon répartition 25/50' }
  ];

  let text = 'Vous avez saisi <b>' + saisis + ' postes de charges sur ' + totalPostes + '</b> pour ' + a.name + '. ';
  if (!coutHoraire) {
    text += 'Renseignez le taux horaire brut et les charges patronales pour calculer le coût horaire.';
  } else if (saisis < totalPostes) {
    text += 'Le coût horaire est établi à ' + euro(coutHoraire).replace(' €', '') + ' €/h. Complétez les postes restants pour un budget prévisionnel complet.';
  } else {
    text += 'Toutes les charges sont renseignées et le coût horaire est établi. Le budget de cette agence est prêt côté charges.';
  }

  return { kpis, text, saisis, totalPostes, coutHoraire };
}
