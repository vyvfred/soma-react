// Présence mois par mois — fonctions PURES, port de renderRH (cartes mensuelles,
// alertes), showWeekDetail (détail des semaines et impact du mois), verrouilerMois,
// deverrouillerMois, resetCP, renderIndemnites, renderHSImproductif.
import {
  M, hsRows, needWeeks, monthCA, mainMonth, pres, hsParPersonne, impactCPSemaine, refAgenceSeuils,
  chMois, coefHSMois, coefHSMoyen, payrollMonth, cpGeneres, coutHoraireImproductif, tauxAbsMois, ratioMaintien, absPartMois, moisDeSemaine, partSemaineMois
} from './calculations.js';
import { repartirCPAuto, cpParMois, bilanRecalculCP, cpProposeMois } from './repartitionCP.js';
import { coutHSTotal } from './calculations.js';

const semainesDe = (a, rows, m) => rows.filter((r) => a.cal.some((d) => d.week === r.week && d.month === m));

// Avancement : mois validés et CP restant à répartir sur les mois libres
export function progressionMois(a) {
  const verr = a.moisVerrouilles || [];
  const cpVerr = needWeeks(a).reduce((s, w) => (verr.indexOf(mainMonth(a, w.week)) >= 0 ? s + (+((a.presence[w.week] || {}).cp) || 0) : s), 0);
  return { nbVerrouilles: verr.length, cpLibres: Math.round((cpGeneres(a) - cpVerr) * 10) / 10 };
}

// Carte d'un mois : CA, HS, CP, fériés et vacances, tension, état (Validé / À équilibrer / À valider)
export function etatMois(a, m, rows = hsRows(a)) {
  const sem = semainesDe(a, rows, m);
  const jours = a.cal.filter((d) => d.month === m);
  // Semaine à cheval sur deux mois : HS et capacité comptées au prorata des jours du mois (pas en double)
  const hsM = sem.reduce((s, r) => s + (r.hs || 0) * partSemaineMois(a, r.week, m), 0);
  const baseM = sem.reduce((s, r) => s + pres(a, r.week).base * partSemaineMois(a, r.week, m), 0);
  const txHsM = baseM > 0 ? hsM / baseM : 0;
  const tensions = sem.filter((r) => r.t === 'critique').length;
  const warnings = sem.filter((r) => r.t === 'warning').length;
  const verrouille = (a.moisVerrouilles || []).indexOf(m) >= 0;
  const actif = a.moisActif === m;
  return {
    m, nom: M[m], caM: monthCA(a, m), hsM,
    cpM: sem.reduce((s, r) => s + absPartMois(a, r.week, 'cp', m), 0),
    nbFeries: jours.filter((d) => d.type === 'ferie').length,
    nbVac: jours.filter((d) => d.type === 'vacances').length,
    tensions, warnings,
    cpPoss: sem.filter((r) => r.t === 'sous-charge').length,
    coutHsM: hsM * (chMois(a, m) || 28.5) * coefHSMois(a, m),
    txHsM,
    tension: txHsM > 0.20 ? 'forte' : txHsM > 0.10 ? 'moyenne' : 'faible',
    tensionRate: sem.length ? Math.round(((tensions + warnings * 0.5) / sem.length) * 100) : 0,
    verrouille, actif,
    etat: verrouille ? 'Validé' : tensions > 0 ? 'À équilibrer' : 'À valider'
  };
}

// Semaines du mois avec tout ce qu'affiche le tableau de détail
export function semainesMois(a, m, rows = hsRows(a)) {
  const seuils = refAgenceSeuils(a);
  return semainesDe(a, rows, m).map((hr) => {
    const p = pres(a, hr.week);
    const hp = hsParPersonne(a, hr.week);
    const tx = p.base > 0 ? hp.hs / p.base : 0;
    const charge = hp.hs < 0.5 ? 'aucune tension' : tx > 0.20 ? 'surcharge' : tx > 0.10 ? 'charge soutenue' : 'charge légère';
    const impact = impactCPSemaine(a, hr.week, -1);
    const abs = Math.abs(impact);
    return {
      week: hr.week, base: p.base, cp: p.cp,
      // Semaine à cheval sur deux mois : part de ce mois (saisie) et total de la semaine
      aCheval: moisDeSemaine(a, hr.week).length > 1,
      parts: { cp: absPartMois(a, hr.week, 'cp', m), otherPaid: absPartMois(a, hr.week, 'otherPaid', m), other: absPartMois(a, hr.week, 'other', m) }, rate: p.rate, mal: p.mal, other: p.other, av: p.av,
      besoin: hr.hours, gap: hr.gap, hs: hr.hs, hsParPers: hp.hs >= 0.5 ? hp.ratio : null,
      charge, impact, impactNiveau: abs <= seuils.seuilFaible ? 'faible' : abs <= seuils.seuilMoyen ? 'moyen' : 'fort'
    };
  });
}

// Bandeau « Impact de ce mois »
export function impactMois(a, m, rows = hsRows(a)) {
  const sem = semainesDe(a, rows, m);
  const hsM = sem.reduce((s, r) => s + (r.hs || 0) * partSemaineMois(a, r.week, m), 0);
  const caMois = monthCA(a, m);
  const msMois = payrollMonth(a, m);
  return {
    caMois, msMois, tauxMS: caMois > 0 ? (msMois / caMois) * 100 : 0,
    hsM, coutHSM: hsM * (chMois(a, m) || 28.5) * coefHSMois(a, m),
    cpM: sem.reduce((s, r) => s + absPartMois(a, r.week, 'cp', m), 0),
    critM: sem.filter((r) => r.t === 'critique').length,
    okM: sem.filter((r) => r.t === 'ok').length
  };
}

// Semaines en tension critique (alerte globale)
export function semainesCritiques(a, rows = hsRows(a)) {
  return rows.filter((r) => r.t === 'critique').map((r) => {
    const d = a.cal.find((x) => x.week === r.week);
    return { week: r.week, mois: d ? M[d.month] : '', hs: r.hs };
  });
}

// Valide un mois (lecture seule) et relance la répartition des CP sur les mois libres.
// Mute `a` ; renvoie le message d'encouragement.
export function verrouillerMois(a, m) {
  const proposeAvant = (a.moisVerrouilles || []).indexOf(m) < 0 ? cpProposeMois(a, m) : null; // avant de figer le mois
  if (!a.moisVerrouilles) a.moisVerrouilles = [];
  if (a.moisVerrouilles.indexOf(m) < 0) a.moisVerrouilles.push(m);
  a.moisActif = null;
  const nb = a.moisVerrouilles.length;
  const libres = M.map((_, i) => i).filter((i) => a.moisVerrouilles.indexOf(i) < 0);
  if (libres.length) {
    const avant = cpParMois(a), cout = coutHSTotal(a), propose = proposeAvant;
    repartirCPAuto(a, libres);
    a.cpDernierRecalcul = bilanRecalculCP(avant, cout, a, { type: 'validation', mois: m, pose: avant[m], propose });
  } else a.cpDernierRecalcul = null;
  return messageValidation(nb, m);
}
// Message d'encouragement après la validation du nb-ième mois
export function messageValidation(nb, m) {
  if (nb === 12) return 'Les 12 mois sont calés — le plus dur est fait !';
  if (nb === 6) return 'Six mois validés, vous êtes à mi-parcours !';
  if (nb === 1) return 'Premier mois validé. Continuez sur votre lancée.';
  return M[m] + ' validé (' + nb + '/12 mois)';
}
export function deverrouillerMois(a, m) {
  a.moisVerrouilles = (a.moisVerrouilles || []).filter((x) => x !== m);
  a.moisActif = m;
  return a;
}
export function reinitialiserCP(a) {
  Object.keys(a.presence || {}).forEach((w) => { if (a.presence[w]) { a.presence[w] = { ...a.presence[w], cp: 0 }; delete a.presence[w].cpMois; } });
  // Plus de répartition : la référence « optimale », le reliquat et les enveloppes affichées n'ont plus de sens
  delete a.cpOptimal; delete a.cpOptimalHSCost; delete a.cpReliquat; delete a.cpEnveloppes; delete a.cpDernierRecalcul;
  return a;
}
// Saisie d'une semaine (CP ou autres absences, en jours)
export function setPresenceSemaine(a, w, champ, v) {
  a.presence = { ...(a.presence || {}) };
  a.presence[w] = { cp: 0, other: 0, ...(a.presence[w] || {}), [champ]: v === '' ? 0 : +v };
  return a;
}
// Saisie hebdomadaire d'un montant (repas, IDJF, HS improductives) : vide ou 0 = suppression
export function setMontantSemaine(a, cle, w, v) {
  const o = { ...(a[cle] || {}) };
  if (v === '' || +v === 0) delete o[w]; else o[w] = +v;
  a[cle] = o;
  return a;
}

// Indemnités (repas, dimanche et jour férié) : lignes par semaine et totaux
export function indemnites(a) {
  const lignes = needWeeks(a).map((wk) => {
    const w = wk.week;
    const val = (k) => (a[k] && a[k][w] ? +a[k][w] : 0);
    const d = a.cal.find((x) => x.week === w);
    const l = { week: w, mois: d ? d.month : -1, rR: val('repasRoulant'), rNR: val('repasNonRoulant'), iR: val('idjfRoulant'), iNR: val('idjfNonRoulant') };
    l.total = l.rR + l.rNR + l.iR + l.iNR;
    return l;
  });
  const tot = lignes.reduce((t, l) => ({ rR: t.rR + l.rR, rNR: t.rNR + l.rNR, iR: t.iR + l.iR, iNR: t.iNR + l.iNR }), { rR: 0, rNR: 0, iR: 0, iNR: 0 });
  return { lignes, tot: { ...tot, repas: tot.rR + tot.rNR, idjf: tot.iR + tot.iNR, total: tot.rR + tot.rNR + tot.iR + tot.iNR } };
}

// HS des improductifs : lignes par semaine, coût estimé et rappel de l'absentéisme aligné
export function hsImproductives(a) {
  const coutH = coutHoraireImproductif(a);
  const lignes = needWeeks(a).map((wk) => {
    const w = wk.week;
    const hs = a.hsImproductif && a.hsImproductif[w] ? +a.hsImproductif[w] : 0;
    const d = a.cal.find((x) => x.week === w);
    return { week: w, mois: d ? d.month : -1, hs, cout: hs ? Math.round(hs * coutH * coefHSMois(a, mainMonth(a, w))) : 0 };
  });
  const totalHS = a.hsImproductif ? Object.values(a.hsImproductif).reduce((s, v) => s + (+v || 0), 0) : 0;
  const absMoy = M.reduce((s, _, m) => s + tauxAbsMois(a, m) * 100, 0) / 12;
  return { lignes, totalHS, totalCout: Math.round(totalHS * coutH * coefHSMoyen(a)), absMoy, ratioMaintien: Math.round(ratioMaintien(a) * 100) };
}

// Répartition HS 25 % / 50 % : moyenne de la part à +50 %
export function moyenneHS50(a) {
  const v = (a.hs50 || []).filter((x) => x !== null && x !== undefined);
  return v.length ? v.reduce((s, x) => s + (+x || 0), 0) / v.length : 0;
}

// Relance manuelle de la répartition (bouton) : même bilan qu'après une validation
export function relancerRepartitionCP(a) {
  const avant = cpParMois(a), cout = coutHSTotal(a);
  repartirCPAuto(a);
  a.cpDernierRecalcul = bilanRecalculCP(avant, cout, a, { type: 'relance' });
  return a;
}
// Mois non validés (autres que m) modifiés à la main par rapport à la proposition : ils seront recalculés à la validation de m
export function moisModifiesHorsPropo(a, m) {
  if (!a.cpOptimal) return [];
  const verr = a.moisVerrouilles || [], parMois = cpParMois(a);
  return M.map((_, i) => i).filter((i) => i !== m && verr.indexOf(i) < 0 && Math.abs(parMois[i] - (cpProposeMois(a, i) || 0)) >= 0.5);
}
