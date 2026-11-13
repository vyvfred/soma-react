// Données de référence posées par le contrôleur de gestion (Données agences,
// variables de décembre 2026) — fonctions PURES, port de la version mono-fichier.
import { msNRMensuel, costHourJuin, isRoulant } from './calculations.js';
//
// Cause racine corrigée : ces données étaient fusionnées au premier niveau du jsonb
// `data` ({versions, meta, histCA, ...}). Un budget déjà ouvert par le REX est
// versionné : le REX lit versions[v] et ne voyait rien, le CG ne retrouvait pas sa
// saisie, et la sauvegarde suivante du budget effaçait ces champs « orphelins ».

export const CG_REF_KEYS = [
  'histCA2025', 'histCA', 'histTXR2026', 'targetAbsRate', 'tauxHoraireBrut', 'tauxHoraireBrutJuin',
  'tauxChargePatronal', 'costHour', 'msNRBrutMensuel', 'msNRTauxCharges', 'ratioMaintien', 'cgLocked',
  'variablesDec2026', 'variablesDec2026Detail'
];
// Champs qui ne verrouillent pas les saisies du REX (paramètre réseau, variables de paie)
export const CG_KEYS_SANS_VERROU = ['ratioMaintien', 'cgLocked', 'variablesDec2026', 'variablesDec2026Detail'];

export function pickRefCG(obj) {
  const o = {};
  CG_REF_KEYS.forEach((k) => { if (obj && obj[k] !== undefined) o[k] = obj[k]; });
  return o;
}

// Applique des données CG à un budget (ou une version) et recalcule le coût horaire.
// Verrouille les champs de référence côté REX seulement si de vraies références sont posées.
export function appliquerRefCG(cible, data) {
  Object.assign(cible, data);
  const refsReelles = Object.keys(data).some((k) =>
    CG_KEYS_SANS_VERROU.indexOf(k) < 0 && data[k] !== null && data[k] !== undefined && data[k] !== '');
  if (refsReelles) cible.cgLocked = true;
  if (cible.tauxHoraireBrut && cible.tauxChargePatronal) {
    cible.costHour = Math.round(+cible.tauxHoraireBrut * (1 + +cible.tauxChargePatronal / 100) * 100) / 100;
  }
  return cible;
}

// Enregistre des données CG au bon endroit : dans chaque version (V1/V2/V3) si le
// budget est versionné, à plat sinon. Les champs CG laissés au premier niveau par
// d'anciennes sauvegardes sont récupérés au passage. L'état de validation est conservé.
export function fusionnerRefCG(existingData, data) {
  const d = JSON.parse(JSON.stringify(existingData || {}));
  if (d.versions) {
    const orphelins = pickRefCG(d);
    Object.keys(d.versions).forEach((v) => {
      if (d.versions[v]) appliquerRefCG(d.versions[v], { ...orphelins, ...data });
    });
    const out = { versions: d.versions, meta: d.meta };
    if (d.validation) out.validation = d.validation;
    return out;
  }
  return appliquerRefCG(d, data);
}

// Paramétrage salarial incomplet d'une agence (affiché dans les Contrôles).
export function alertesParametrage(a) {
  const out = [];
  if (msNRMensuel(a) === null) {
    const ancien = (a.employees || []).some((e) => !isRoulant(e.qual) && (+e.coutJour || 0) > 0) || (+a.drCostAnnual || 0) > 0;
    out.push({ t: 'warn', m: ancien
      ? 'Ligne globale non-roulante non saisie — calcul provisoire sur les anciens coûts journaliers et la quote-part DR.'
      : 'Ligne globale non-roulante non saisie — les improductifs ne sont pas dans la masse salariale.' });
  }
  if (a.ratioMaintien === null || a.ratioMaintien === undefined || a.ratioMaintien === '') {
    out.push({ t: 'info', m: 'Ratio de maintien de salaire non renseigné — les absences sont déduites à 100 %.' });
  }
  if (a.costHour && !costHourJuin(a)) {
    out.push({ t: 'info', m: 'Taux horaire au 1er juin non renseigné — le taux de janvier s\'applique toute l\'année.' });
  }
  return out;
}

// ── Versions V1/V2/V3 (revue nov. 2026) ──
// Socle commun à toutes les versions : références et charges posées par le CG, équipe chargée depuis le
// registre, périodes de paie. Une version vide part de ce socle au lieu d'un budget sans paramétrage.
export function socleVersion(src){
  let o = pickRefCG(src || {});
  ['rex','employees','periodesPaie'].forEach(function(k){ if(src && src[k] !== undefined && src[k] !== null) o[k] = JSON.parse(JSON.stringify(src[k])); });
  return o;
}
export function premiereVersionRemplie(versions){
  let vs = versions || {};
  return ['v1','v2','v3'].map(function(v){ return vs[v]; }).find(function(x){ return x && Object.keys(x).length; }) || {};
}
// Le CG modifie ses références ou ses charges sur la version ouverte : la modification est reportée dans
// les autres versions remplies, pour que les variantes du REX restent comparables. Renvoie le nombre de versions mises à jour.
export function reporterSaisieCG(versions, active, avant, apres){
  let J = function(v){ return JSON.stringify(v === undefined ? null : v); };
  let cles = CG_REF_KEYS.filter(function(k){ return J(avant ? avant[k] : undefined) !== J(apres[k]); });
  let lignes = Object.keys(apres.rex || {}).filter(function(l){ return J(avant && avant.rex ? avant.rex[l] : undefined) !== J(apres.rex[l]); });
  if(!cles.length && !lignes.length) return 0;
  let n = 0;
  Object.keys(versions || {}).forEach(function(v){
    let x = versions[v];
    if(v === active || !x || !Object.keys(x).length) return;
    cles.forEach(function(k){ x[k] = JSON.parse(J(apres[k])); });
    if(lignes.length){ x.rex = x.rex || {}; lignes.forEach(function(l){ x.rex[l] = JSON.parse(JSON.stringify(apres.rex[l])); }); }
    n++;
  });
  return n;
}
export function descriptionCopie(descSource, labelSource){ return descSource ? descSource + ' (copie)' : 'Copie de ' + labelSource; }
