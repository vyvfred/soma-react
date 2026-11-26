// Export Excel compilant toutes les agences (nov. 2026) : synthèse réseau, compte de résultat consolidé (par entité et par
// mois), heures et effectifs. Une feuille « base » (une ligne par entité × rubrique × mois) porte les montants du moteur
// SOMA ; les tableaux de synthèse et de consolidation sont des formules (SUMIFS) sur cette base, avec les totaux.
// Même modèle de classeur que exportAgenceDetail (écrit par lib/exportExcel.js).
import { T, M, STRUCTURES, LIB_STRUCTURES, amount, hsRows, hsDuMois, partRoulant, estRoulantPart, cpGeneres, cpPlanifies, coutHSTotal, partHS50Annuelle, payrollMonth } from './calculations.js';
import { entiteDepuisBudget } from './consolideSIG.js';
import { statutLabel } from '../config/statut.js';
import { col } from './exportAgenceDetail.js';

const MOIS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
const C = (k, v, fmt, f) => ({ k, v, fmt, f });
const soma = (v, fmt) => C('soma', v, fmt);
const fx = (f, fmt, k) => C(k || 'formule', null, fmt, f);
const titre = (v) => C('titre', v), entete = (v) => C('entete', v), note = (v) => C('note', v), tot = (v) => C('total', v);
const r2 = (x) => Math.round((+x || 0) * 100) / 100;
const MC = (m) => col(3 + m); // mois en colonnes D..O dans la base, année en P
const esc = (s) => String(s).replace(/"/g, '""');

// Indicateurs d'heures et d'effectif d'une entité, par mois
function heuresMois(a) {
  const besoin = Array(12).fill(0), dispo = Array(12).fill(0), hs = Array(12).fill(0);
  hsRows(a).forEach((r) => {
    for (let m = 0; m < 12; m++) {
      besoin[m] += r.besoinMois ? (+r.besoinMois[m] || 0) : (m === r.m ? r.hours : 0);
      dispo[m] += r.dispoMois ? (+r.dispoMois[m] || 0) : (m === r.m ? r.av : 0);
      hs[m] += hsDuMois(a, r, m);
    }
  });
  return { besoin, dispo, hs };
}

export function classeurReseau(map, ops, { region = false, perimetre = '' } = {}) {
  const noms = ops.map((o) => o.nom).filter((n) => map[n]).concat(region ? [] : STRUCTURES.filter((n) => map[n]));
  const entites = [];
  const erreurs = [];
  noms.forEach((nom) => {
    try {
      const b = map[nom], a = entiteDepuisBudget(nom, b.data);
      if (!a || !a.cal) return;
      const meta = (b.data && b.data.meta) || {}, v = meta.submittedVersion || meta.activeVersion || 'v1';
      entites.push({ nom, a, structure: STRUCTURES.includes(nom), statut: statutLabel(b.statut), version: v.toUpperCase() });
    } catch (e) { erreurs.push(nom); }
  });

  // ── Base : entité × rubrique × mois ───────────────────────────────────────────
  const base = [[titre('Base de données — montants SOMA par entité, rubrique et mois')],
    [note('Une ligne par entité et par rubrique. Les onglets de synthèse et de consolidation sont calculés à partir de cette base (formules SOMME.SI.ENS) : filtrez-la ou faites-en un tableau croisé dynamique.')],
    ['Entité', 'Type', 'Rubrique'].concat(MOIS, ['Année']).map(entete)];
  const ajout = (e, rub, vals, fmt) => {
    const n = base.length + 1;
    base.push([e.nom, e.structure ? (LIB_STRUCTURES[e.nom] || 'Structure') : 'Agence', rub].concat(vals.map((v) => soma(r2(v), fmt)), [fx('SUM(D' + n + ':O' + n + ')', fmt)]));
  };
  const RUB_HEURES = ['Besoin d\'heures (h)', 'Heures disponibles (h)', 'Heures supplémentaires (h)'];
  entites.forEach((e) => {
    const a = e.a;
    T.forEach((r) => { let v; try { v = M.map((_, m) => amount(a, r.label, m)); } catch (x) { v = Array(12).fill(0); } ajout(e, r.label, v, 'eur'); });
    if (!e.structure) {
      try { const h = heuresMois(a); ajout(e, RUB_HEURES[0], h.besoin, 'h'); ajout(e, RUB_HEURES[1], h.dispo, 'h'); ajout(e, RUB_HEURES[2], h.hs, 'h'); } catch (x) { /* budget incomplet */ }
      try { ajout(e, 'Masse salariale hors quotes-parts', M.map((_, m) => payrollMonth(a, m)), 'eur'); } catch (x) { /* idem */ }
    }
  });
  const finBase = base.length;
  const BASE = "Base", SI = (critEnt, rub, colonne) => 'SUMIFS(' + BASE + '!$' + colonne + '$4:$' + colonne + '$' + finBase + ',' + BASE + '!$A$4:$A$' + finBase + ',' + critEnt + ',' + BASE + '!$C$4:$C$' + finBase + ',"' + esc(rub) + '")';
  const SIall = (rub, colonne) => 'SUMIFS(' + BASE + '!$' + colonne + '$4:$' + colonne + '$' + finBase + ',' + BASE + '!$C$4:$C$' + finBase + ',"' + esc(rub) + '")';

  // ── Synthèse réseau : une ligne par entité ───────────────────────────────────
  const syn = [[titre('Budget 2027 — ' + (perimetre || (region ? 'ma région' : 'réseau')))],
    [note('Export du ' + new Date().toLocaleDateString('fr-FR') + ' · ' + entites.length + ' entités' + (erreurs.length ? ' · non lues : ' + erreurs.join(', ') : '') + ' · Montants annuels issus de l\'onglet Base.')],
    ['Entité', 'Statut', 'Version', 'CA', 'Charges de personnel', 'MS / CA', 'EBE', 'Résultat d\'exploitation', 'Résultat net', 'Besoin (h)', 'Disponible (h)', 'Tension', 'HS (h)', 'Part HS à +50 %', 'Coût des HS', 'ETP roulants', 'Salariés', 'CP générés (j)', 'CP planifiés (j)'].map(entete)];
  entites.forEach((e, i) => {
    const n = 4 + i, ent = 'A' + n, a = e.a;
    let etp = 0, nb = 0, cpg = 0, cpp = 0, cHS = 0, p50 = 0;
    try { (a.employees || []).forEach((x) => { nb++; if (estRoulantPart(x)) etp += (+x.hours || 0) * partRoulant(x) / 35; }); } catch (x) { /* */ }
    if (!e.structure) { try { cpg = cpGeneres(a); cpp = cpPlanifies(a); cHS = coutHSTotal(a); p50 = partHS50Annuelle(a); } catch (x) { /* */ } }
    syn.push([e.nom, e.statut, e.version,
      fx(SI(ent, "Chiffre d'affaires", 'P'), 'eur'), fx(SI(ent, 'Charges de personnel', 'P'), 'eur'),
      fx('IF(D' + n + '<>0,E' + n + '/D' + n + ',"")', 'pct'),
      fx(SI(ent, "EXCEDENT BRUT D'EXPLOITATION", 'P'), 'eur'), fx(SI(ent, "RESULTAT D'EXPLOITATION", 'P'), 'eur'), fx(SI(ent, 'RESULTAT NET', 'P'), 'eur'),
      fx(SI(ent, RUB_HEURES[0], 'P'), 'h'), fx(SI(ent, RUB_HEURES[1], 'P'), 'h'), fx('IF(K' + n + '>0,J' + n + '/K' + n + ',"")', 'pct'), fx(SI(ent, RUB_HEURES[2], 'P'), 'h'),
      e.structure ? '' : soma(Math.round(p50 * 1000) / 1000, 'pct'), e.structure ? '' : soma(r2(cHS), 'eur'),
      soma(r2(etp), 'dec2'), soma(nb, 'int'), e.structure ? '' : soma(cpg, 'int'), e.structure ? '' : soma(r2(cpp), 'dec2')]);
  });
  const fs = 3 + entites.length, ts = fs + 1, S = (c, fmt) => fx('SUM(' + c + '4:' + c + fs + ')', fmt, 'total');
  syn.push([tot('Total'), tot(''), tot(''), S('D', 'eur'), S('E', 'eur'), fx('IF(D' + ts + '<>0,E' + ts + '/D' + ts + ',"")', 'pct', 'total'), S('G', 'eur'), S('H', 'eur'), S('I', 'eur'),
    S('J', 'h'), S('K', 'h'), fx('IF(K' + ts + '>0,J' + ts + '/K' + ts + ',"")', 'pct', 'total'), S('M', 'h'),
    fx('IF(M' + ts + '>0,SUMPRODUCT(M4:M' + fs + ',N4:N' + fs + ')/M' + ts + ',"")', 'pct', 'total'), S('O', 'eur'), S('P', 'dec2'), S('Q', 'int'), S('R', 'int'), S('S', 'dec2')]);

  // ── Compte de résultat par entité (annuel) ───────────────────────────────────
  const cre = [[titre('Compte de résultat 2027 par entité')], [note('Montants annuels ; colonne Consolidé = somme des entités.')],
    [entete('Rubrique')].concat(entites.map((e) => entete(e.nom)), [entete('Consolidé')])];
  T.forEach((r, i) => {
    const n = 4 + i, k = r.type === 'subtotal' ? 'total' : undefined, last = col(entites.length);
    cre.push([k ? tot(r.label) : r.label].concat(entites.map((e, j) => fx(SI(col(1 + j) + '$3', r.label, 'P'), 'eur', k)), [fx('SUM(B' + n + ':' + last + n + ')', 'eur', 'total')]));
  });

  // ── Compte de résultat consolidé par mois ────────────────────────────────────
  const crm = [[titre('Compte de résultat consolidé par mois')], [note('Somme de toutes les entités de l\'export, mois par mois.')],
    [entete('Rubrique')].concat(MOIS.map(entete), [entete('Année')])];
  T.forEach((r, i) => {
    const n = 4 + i, k = r.type === 'subtotal' ? 'total' : undefined;
    crm.push([k ? tot(r.label) : r.label].concat(M.map((_, m) => fx(SIall(r.label, MC(m)), 'eur', k)), [fx('SUM(B' + n + ':M' + n + ')', 'eur', 'total')]));
  });

  // ── Heures par agence et par mois ────────────────────────────────────────────
  const ag = entites.filter((e) => !e.structure);
  const hm = [[titre('Heures supplémentaires par agence et par mois')], [note('HS attribuées au mois où le besoin dépasse l\'équipe (semaines à cheval réparties).')],
    [entete('Agence')].concat(MOIS.map(entete), [entete('Année')])];
  ag.forEach((e, i) => { const n = 4 + i; hm.push([e.nom].concat(M.map((_, m) => fx(SI('$A' + n, RUB_HEURES[2], MC(m)), 'h')), [fx('SUM(B' + n + ':M' + n + ')', 'h')])); });
  const fh = 3 + ag.length;
  hm.push([tot('Total')].concat(M.map((_, m) => fx('SUM(' + col(1 + m) + '4:' + col(1 + m) + fh + ')', 'h', 'total')), [fx('SUM(N4:N' + fh + ')', 'h', 'total')]));

  const feuilles = [
    { nom: 'Synthèse réseau', largeurs: [24, 16, 8, 13, 13, 8, 13, 13, 13, 11, 11, 8, 10, 9, 12, 9, 8, 9, 9], gel: { x: 1, y: 3 }, lignes: syn },
    { nom: 'CR par entité', largeurs: [44].concat(entites.map(() => 13), [14]), gel: { x: 1, y: 3 }, lignes: cre },
    { nom: 'CR consolidé mensuel', largeurs: [44].concat(Array(12).fill(12), [14]), gel: { x: 1, y: 3 }, lignes: crm },
    { nom: 'HS par mois', largeurs: [24].concat(Array(12).fill(9), [11]), gel: { x: 1, y: 3 }, lignes: hm },
    { nom: 'Base', largeurs: [24, 14, 40].concat(Array(12).fill(11), [13]), gel: { x: 3, y: 3 }, lignes: base }
  ];
  return { feuilles, nbEntites: entites.length, erreurs };
}

export function nomFichierReseau(region) {
  return 'SOMA_budget_2027_' + (region ? 'region' : 'reseau') + '_compile_' + new Date().toISOString().slice(0, 10) + '.xlsx';
}
