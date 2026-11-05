// Compte de résultat consolidé (demande du CG, nov. 2026) — port fidèle de
// sigAnnuelEntite / entiteDepuisBudget / consolideReseau du mono-fichier.
// Somme des agences et des 4 structures, version soumise sinon active (budgetData).
import { T, sig, manual, refs, STRUCTURES, LIB_STRUCTURES } from './calculations.js';
import { budgetData } from './budgetMapper.js';

export function sigAnnuelEntite(a) {
  const out = {}; T.forEach((r) => { out[r.label] = 0; });
  for (let m = 0; m < 12; m++) {
    const sg = sig(a, m);
    T.forEach((r) => {
      out[r.label] += (r.type === 'subtotal' || r.label === "Chiffre d'affaires" || r.label === 'Charges de personnel') ? (sg[r.label] || 0) : manual(a, r.label, m);
    });
  }
  return out;
}

export function entiteDepuisBudget(nom, raw) {
  const d = budgetData(raw);
  if (!d || !Object.keys(d).length) return null;
  const a = JSON.parse(JSON.stringify(d));
  a.name = nom;
  if (!a.rex) a.rex = {};
  if (!a.refs) a.refs = { san: refs(), sai: refs(), tp: refs() };
  if (!a.employees) a.employees = []; if (!a.presence) a.presence = {};
  if (!a.sick) a.sick = Array(12).fill(null); if (!a.hs50) a.hs50 = Array(12).fill(null);
  if (!a.cal) a.cal = [];
  return a;
}

const zero = () => { const o = {}; T.forEach((r) => { o[r.label] = 0; }); return o; };

// map : { agence: { statut, data } } ; ops : agences opérationnelles [{ nom }]
// sansStructures : vue d'un DR, limitée aux agences de sa région
export function consolideReseau(map, ops, sansStructures = false) {
  const agences = zero(), structures = {}, erreurs = [];
  let nbAgences = 0;
  ops.forEach((ag) => {
    const b = map[ag.nom]; if (!b) return;
    try {
      const a = entiteDepuisBudget(ag.nom, b.data); if (!a) return;
      const s = sigAnnuelEntite(a); T.forEach((r) => { agences[r.label] += s[r.label]; }); nbAgences++;
    } catch (e) { erreurs.push(ag.nom); }
  });
  (sansStructures ? [] : STRUCTURES).forEach((nom) => {
    const b = map[nom]; let s = zero();
    if (b) { try { const a = entiteDepuisBudget(nom, b.data); if (a) s = sigAnnuelEntite(a); } catch (e) { erreurs.push(nom); } }
    structures[nom] = { s, present: !!b, statut: b ? b.statut : null, lib: LIB_STRUCTURES[nom] };
  });
  const total = zero();
  T.forEach((r) => { total[r.label] = agences[r.label] + Object.keys(structures).reduce((x, n) => x + structures[n].s[r.label], 0); });
  return { agences, nbAgences, structures, total, erreurs };
}

// Feuille Excel « Compte de résultat »
export function feuilleConsolide(c, region = false) {
  if (region) {
    const lr = [['Rubrique', 'Région']];
    T.forEach((r) => lr.push([r.label, Math.round(c.agences[r.label])]));
    return { nom: 'Compte de résultat', lignes: lr, largeurs: [46, 14] };
  }
  const lignes = [['Rubrique', 'Agences'].concat(STRUCTURES.map((n) => LIB_STRUCTURES[n])).concat(['Consolidé'])];
  T.forEach((r) => lignes.push([r.label, Math.round(c.agences[r.label])].concat(STRUCTURES.map((n) => Math.round(c.structures[n].s[r.label]))).concat([Math.round(c.total[r.label])])));
  return { nom: 'Compte de résultat', lignes, largeurs: [46, 14, 14, 14, 16, 14, 14] };
}
