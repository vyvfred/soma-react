// Parcours guidé du contrôleur de gestion — 7 étapes, état calculé sur le réseau.
// Fonctions PURES (testables) ; l'affichage est dans components/CgGuide.jsx.
import { chargesCGSaisies, varDec2026Total } from './calculations.js';
import { budgetData } from './budgetMapper.js';
import { ensureValidation, enAttenteDe } from './validationEngine.js';

export const CG_PARCOURS = [
  { n: 1, panel: 'refagences', ecrans: ['refagences'], titre: 'Données agences',
    quoi: 'Poser le cadre de chaque agence : historiques, cibles, taux horaires et masse salariale non-roulante.',
    comment: [
      'Renseignez une fois le <b>ratio de maintien de salaire</b>, au-dessus du tableau : il vaut pour tout le réseau.',
      'Pour chaque agence, complétez la ligne : CA 2025 et 2026, TXR 2026, absentéisme cible, taux brut au 1<sup>er</sup> janvier et au 1<sup>er</sup> juin, charges patronales, masse salariale non-roulante (brut mensuel et charges).',
      'Cliquez sur <b>« Enregistrer les modifications »</b> : les valeurs partent dans le budget de chaque agence et se verrouillent côté REX.'
    ],
    fini: 'Chaque agence a ses références et le ratio de maintien est renseigné.',
    vigilance: ['Une saisie non enregistrée est perdue si vous quittez l\'écran.'],
    aide: 'bien préparer les références',
    etat: (e) => ({ ok: e.avecRef === e.total && e.ratio, txt: 'Références ' + e.avecRef + '/' + e.total + ' · Ratio de maintien ' + (e.ratio ? '✓' : 'à renseigner') }) },
  { n: 2, panel: 'periodes', ecrans: ['periodes'], titre: 'Périodes de paie',
    quoi: 'Vérifier, pour chaque agence, les dates de collecte des variables de chaque mois de paie 2027.',
    comment: [
      'Choisissez l\'agence dans le sélecteur <b>« Agence ouverte »</b> en haut de l\'écran.',
      'Contrôlez le début et la fin de chaque période ; corrigez une date directement dans le tableau (enregistrement automatique).',
      '<b>« Réinitialiser le calendrier par défaut »</b> remet le calendrier standard (paie de janvier : du 7 décembre 2026 au 10 janvier 2027).'
    ],
    fini: 'Les dates correspondent au calendrier de paie réel. Si le calendrier standard convient, il n\'y a rien à modifier.',
    vigilance: ['Mois de paie à 5 semaines : les heures supplémentaires de la 5e semaine sont lissées sur le trimestre (colonne « dont lissage 5e semaine »).'],
    aide: 'Les dates s\'appliquent',
    etat: () => ({ ok: null, txt: 'Calendrier standard par défaut — à vérifier par agence' }) },
  { n: 3, panel: 'variablesdec', ecrans: ['variablesdec'], titre: 'Variables de décembre 2026',
    quoi: 'Saisir les variables de fin décembre 2026, payées sur la paie de janvier 2027.',
    comment: [
      'Pour chaque agence, saisissez les montants <b>bruts</b> du réalisé : HS à 25 %, HS à 50 %, dimanches et fériés, primes et autres, indemnités repas.',
      'Contrôlez le total chargé de chaque ligne, puis cliquez sur <b>« Enregistrer »</b>.'
    ],
    fini: 'Toutes les agences sont renseignées et aucune n\'est « sans taux de charge ».',
    vigilance: ['Le total chargé utilise le taux de charges des Données agences : renseignez-le d\'abord (étape 1).', 'Les indemnités repas ne sont pas chargées.'],
    aide: 'variables de paie de décembre',
    etat: (e) => ({ ok: e.avecVarDec === e.total, txt: e.avecVarDec + '/' + e.total + ' agences renseignées' }) },
  { n: 4, panel: 'affectation', ecrans: ['affectation'], titre: 'Affectation DR',
    quoi: 'Désigner le directeur régional de chaque agence : c\'est lui qui valide en premier.',
    comment: ['Pour chaque agence, choisissez son DR dans la liste.', 'L\'affectation est enregistrée immédiatement.'],
    fini: 'Chaque agence a un DR.',
    vigilance: ['Une agence sans DR ne peut pas franchir la première étape de validation.'],
    aide: 'affectation des DR',
    etat: (e) => ({ ok: e.avecDR === e.total, txt: e.avecDR + '/' + e.total + ' agences affectées' }) },
  { n: 5, panel: 'cg', ecrans: ['cg', 'controle'], titre: 'Charges par agence',
    quoi: 'Saisir les charges hors personnel de chaque agence, puis contrôler la cohérence de son budget.',
    comment: [
      'Choisissez l\'agence dans le sélecteur <b>« Agence ouverte »</b>.',
      'Vérifiez en haut le paramétrage salarial (taux horaires, masse salariale non-roulante), repris des Données agences et modifiable ici.',
      'Pour chaque poste, choisissez le mode (par mois, montant annuel, % du CA) et le type (fixe ou variable), puis saisissez. Enregistrement automatique.',
      'Terminez par l\'écran <b>Contrôles</b> de l\'agence.'
    ],
    fini: 'Tous les postes de chaque agence sont renseignés.',
    vigilance: ['Un budget soumis est en lecture seule : ses charges ne sont plus modifiables.'],
    aide: 'saisir les charges d\'une agence',
    etat: (e) => ({ ok: e.avecCharges === e.total, txt: e.avecCharges + '/' + e.total + ' agences avec charges' }) },
  { n: 6, panel: 'consolidation', ecrans: ['consolidation', 'comparative', 'graphiques'], titre: 'Suivre le réseau',
    quoi: 'Suivre l\'avancement des budgets et repérer les agences atypiques.',
    comment: [
      '<b>Consolidation</b> : l\'état de chaque agence et ses indicateurs clés.',
      '<b>Vue comparative</b> : chaque agence face à la médiane du réseau ; les valeurs en orange s\'en écartent nettement.',
      '<b>Graphiques</b> : trajectoires de CA et taux de charge, pour une lecture d\'ensemble.'
    ],
    fini: 'Tous les budgets sont soumis.',
    vigilance: ['Une valeur atypique n\'est pas une erreur : vérifiez-la avec le contexte de l\'agence.'],
    aide: 'suivre l\'avancement',
    etat: (e) => ({ ok: e.soumis === e.total ? true : null, txt: e.soumis + '/' + e.total + ' budgets soumis' }) },
  { n: 7, panel: 'validation', ecrans: ['validation'], titre: 'Valider',
    quoi: 'Valider les budgets à la deuxième étape du circuit, avec le directeur financier.',
    comment: [
      'Un budget arrive ici après la validation de son DR.',
      'Lisez la fiche de décisions de l\'agence.',
      'Rédigez votre commentaire (obligatoire), puis <b>« ✓ Valider »</b> ou <b>« ✕ Refuser »</b>.'
    ],
    fini: 'Aucun budget n\'attend votre décision.',
    vigilance: ['Un refus renvoie le budget au REX et efface toutes les validations, y compris celle du DR.'],
    aide: 'valider ou refuser',
    etat: (e) => ({ ok: e.attenteCG > 0 ? false : (e.soumis === e.total ? true : null), txt: e.attenteCG + ' budget' + (e.attenteCG > 1 ? 's' : '') + ' en attente de votre décision' }) }
];

export function cgEtapeDe(panelId) {
  return CG_PARCOURS.find((s) => s.ecrans.indexOf(panelId) >= 0) || null;
}

// rows : lignes budgets complètes { agence, statut, data } ; agMap : agence → region_id ;
// drs : profils DR { id, region_id } ; ops : agences opérationnelles.
export function cgEtatReseau(rows, agMap, drs, ops) {
  const map = {};
  (rows || []).forEach((b) => { map[b.agence] = b; });
  const e = { total: ops.length, avecRef: 0, avecVarDec: 0, avecDR: 0, avecCharges: 0, soumis: 0, attenteCG: 0, ratio: false };
  ops.forEach((ag) => {
    const b = map[ag.nom];
    const d = b ? budgetData(b.data) : {};
    if (d.histTXR2026 || d.costHour || d.tauxHoraireBrut) e.avecRef++;
    if (chargesCGSaisies(d) > 0) e.avecCharges++;
    if (varDec2026Total(d) > 0) e.avecVarDec++;
    if (b && b.statut && b.statut !== 'brouillon') e.soumis++;
    if (b && b.data && b.data.validation && enAttenteDe(ensureValidation(b.data.validation), 'cg')) e.attenteCG++;
    if (d.ratioMaintien !== null && d.ratioMaintien !== undefined && d.ratioMaintien !== '') e.ratio = true;
    const rid = (agMap || {})[ag.nom];
    if (rid && (drs || []).some((dr) => dr.region_id === rid)) e.avecDR++;
  });
  return e;
}

export function premiereEtapeAFaire(e) {
  return CG_PARCOURS.find((s) => s.etat(e).ok === false) || null;
}
