// Versions V1/V2/V3 d'un budget et soumission — fonctions PURES, port de la version
// mono-fichier (renderVersionBar, switchVersion, dupliquerVersion, showVersionCompare,
// soumettreBudget, renderRefusREX, showBudgetRecap).
import { agency, ann, hsTot, baseH, cpGeneres, cpPlanifies, annualCA, needWeeks } from './calculations.js';
import { migrateAgency } from './budgetMapper.js';
import { newValidation } from './validationEngine.js';
import { socleVersion, premiereVersionRemplie } from './refCG.js';

export const VERSIONS = ['v1', 'v2', 'v3'];
export const VERSION_LABELS = { v1: 'V1', v2: 'V2', v3: 'V3' };
export const VERSION_COLORS = {
  v1: { bg: 'rgba(74,158,255,.15)', fg: '#4A9EFF', solid: '#4A9EFF' },
  v2: { bg: 'rgba(130,54,140,.18)', fg: '#B76FC0', solid: '#82368C' },
  v3: { bg: 'rgba(196,83,0,.15)', fg: '#E8833C', solid: '#C45300' }
};

// Statuts où le REX (ou le CG) peut encore modifier le budget
export const STATUTS_MODIFIABLES = ['brouillon', 'refuse_dr', 'complement_dr', 'refuse_df', 'complement_df', 'refuse_dg'];
export function estModifiable(statut) {
  return STATUTS_MODIFIABLES.includes(statut);
}

export function versionRemplie(data, v) {
  return !!(data && data.versions && data.versions[v] && Object.keys(data.versions[v]).length);
}

// Première version libre (autre que l'active) pour une duplication, ou null si les 3 sont prises
export function cibleDuplication(data, active) {
  return VERSIONS.find((v) => v !== active && !versionRemplie(data, v)) || null;
}

// Agence de travail pour une version donnée. Version vide : agence vierge reprenant les
// données historiques de référence de la V1 (communes à toutes les versions).
export function agenceDeVersion(nom, data, v) {
  if (versionRemplie(data, v)) {
    return migrateAgency({ ...agency(nom), ...data.versions[v], name: nom });
  }
  const a = { ...agency(nom), name: nom };
  const ref = premiereVersionRemplie(data && data.versions);
  Object.assign(a, socleVersion(ref));
  if (ref.histCA2025) a.histCA2025 = ref.histCA2025;
  if (ref.histCA) a.histCA = ref.histCA;
  if (ref.histTXR2026) { a.histTXR2026 = ref.histTXR2026; a.histTXR = ref.histTXR2026; a.targetTXR = ref.histTXR2026; }
  return migrateAgency(a);
}

// Copie profonde de l'agence de travail, prête à être stockée comme version
export function copieVersion(a) {
  const c = JSON.parse(JSON.stringify(a));
  delete c.versions; delete c.meta;
  return c;
}

// Indicateurs de comparaison d'une version
export function indicateursVersion(a) {
  const ca = ann(a, "Chiffre d'affaires");
  const ms = ann(a, 'Charges de personnel');
  const rexpl = ann(a, "RESULTAT D'EXPLOITATION");
  const net = ann(a, 'RESULTAT NET');
  return {
    ca, ms, rexpl, net,
    hs: hsTot(a).hs,
    etp: baseH(a) / 35,
    nbSal: a.employees ? a.employees.filter((e) => e.qual !== 'FACTURIERE').length : 0,
    cpG: cpGeneres(a),
    cpP: cpPlanifies(a),
    msRatio: ca ? (ms / ca) * 100 : 0,
    netRatio: ca ? (net / ca) * 100 : 0
  };
}

// Colonnes du comparatif : versions remplies, la version active prise en mémoire (à jour)
export function comparerVersions(nom, data, active, agenceActive) {
  const meta = (data && data.meta) || {};
  const cols = [];
  VERSIONS.forEach((v) => {
    const a = v === active ? agenceActive : (versionRemplie(data, v) ? agenceDeVersion(nom, data, v) : null);
    if (!a) return;
    cols.push({ v, desc: (meta.descriptions && meta.descriptions[v]) || '', submitted: meta.submittedVersion === v, ...indicateursVersion(a) });
  });
  return cols;
}

// Moyenne d'absentéisme saisie et écart à la référence du CG (alerte douce avant soumission)
export function ecartAbsenteisme(a) {
  if (!a || !a.sick || a.targetAbsRate === null || a.targetAbsRate === undefined) return null;
  const remplis = a.sick.filter((v) => v !== null && v !== undefined);
  if (!remplis.length) return null;
  const moyenne = remplis.reduce((s, v) => s + (+v || 0), 0) / remplis.length;
  const ecart = Math.abs(moyenne - (+a.targetAbsRate || 0));
  return ecart > 0.1 ? { moyenne, cible: +a.targetAbsRate } : null;
}

// Données à écrire lors de la soumission : nouveau cycle de validation, en conservant
// l'historique des refus précédents (+ trace de la resoumission).
export function donneesSoumission(data, version, parNom, maintenant = new Date().toISOString()) {
  const d = JSON.parse(JSON.stringify(data || {}));
  d.meta = { ...(d.meta || {}), submittedVersion: version };
  const val = newValidation();
  if (d.validation && d.validation.historique && d.validation.historique.length) {
    val.historique = d.validation.historique;
    val.historique.push({ type: 'resoumission', date: maintenant, par: parNom || 'REX' });
  }
  d.validation = val;
  return d;
}

// Dernier refus à montrer au REX : seulement s'il est postérieur à la dernière resoumission
export function refusAAfficher(validation) {
  if (!validation || !validation.historique) return null;
  const refus = validation.historique.filter((h) => h.type === 'refus').pop();
  if (!refus) return null;
  const resoum = validation.historique.filter((h) => h.type === 'resoumission').pop();
  return !resoum || new Date(refus.date) > new Date(resoum.date) ? refus : null;
}

// Récapitulatif affiché quand le REX termine son parcours
export function recapBudget(a) {
  return {
    ca: annualCA(a),
    etp: baseH(a) / 35,
    semaines: needWeeks(a).length,
    hs: Math.round(hsTot(a).hs || 0)
  };
}
