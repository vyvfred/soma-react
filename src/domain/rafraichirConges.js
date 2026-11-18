import { cpGeneres, cpPlanifies, cpNRAcquis, repartirCPNRAuto } from './calculations.js';
// Mise à jour des congés payés après un changement qui modifie les jours ACQUIS (audit CP nov. 2026) :
// équipe (ajout, suppression, import, reprise d'une autre version), dates d'entrée / de sortie, temps de travail,
// part roulante, qualification, absentéisme.
// Roulants : si des congés étaient déjà posés, la répartition automatique est refaite sur les mois non validés
// (les mois validés ne bougent pas), pour que les jours posés restent égaux aux jours acquis.
// Non-roulants : la répartition 60/20/20 est refaite seulement si elle venait du bouton « Répartir »
// (cpNR.auto) ; une saisie à la main n'est jamais écrasée, le compteur « Reste à poser » signale l'écart.
function etatConges(a){return {gen:cpGeneres(a),nr:cpNRAcquis(a)};}
function rafraichirConges(a,avant,repartirRoulants){
  let r={roulants:false,nonRoulants:false};
  if(Math.abs(cpGeneres(a)-avant.gen)>0.05&&cpPlanifies(a)>0&&+a.targetCA>0&&+a.targetTXR>0){repartirRoulants(a);r.roulants=true;}
  if(Math.abs(cpNRAcquis(a)-avant.nr)>0.05&&a.cpNR&&a.cpNR.auto){repartirCPNRAuto(a);r.nonRoulants=true;}
  return r;
}
export { etatConges, rafraichirConges };
