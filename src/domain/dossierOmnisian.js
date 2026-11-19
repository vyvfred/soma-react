// Dossier d'analyse pour Omnisian (nov. 2026) : l'IA autorisée pour la direction générale et la direction financière.
// Un document texte (Markdown) que l'on dépose dans Omnisian : méthode, vue réseau, tableau comparatif des agences,
// une fiche par agence, questions types. Uniquement des données agrégées : aucun nom ni salaire individuel.
import { ann, hsTot, coutHSTotal, cpGeneres, cpPlanifies, estStructure, isRoulant, avecCacheMoteur, STRUCTURES, LIB_STRUCTURES, M } from './calculations.js';
import { entiteDepuisBudget, consolideReseau } from './consolideSIG.js';
import { syntheseVue } from './syntheseVue.js';
import { syntheseBudget } from './syntheseBudget.js';
import { avancementBudget } from './avancement.js';
import { statutLabel } from '../config/statut.js';
import { AGENCE_RESEAU, anneeRep } from './reperes.js';

const STATUTS_DEPOSES = (s) => !!s && s !== 'brouillon';
const nb = (v, d = 0) => (v === null || v === undefined || !isFinite(v) ? '—' : (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('fr-FR'));
const eur = (v) => (v === null || v === undefined || !isFinite(v) ? '—' : nb(Math.round(v)) + ' €');
const pc = (v) => (v === null || v === undefined || !isFinite(v) ? '—' : nb(v, 1) + ' %');
const sg = (v, u) => (v === null || v === undefined || !isFinite(v) ? '—' : (v > 0 ? '+' : '') + nb(v, 1) + u);
const ratio = (x, y) => (x !== null && x !== undefined && y ? (x / y) * 100 : null);
const texte = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const cellule = (s) => texte(s).replace(/\|/g, '/');
const dateFr = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

// Indicateurs d'une entité (agence ou structure) pour le dossier
export function ficheEntite(nom, row, reperes, role) {
  const a = entiteDepuisBudget(nom, row && row.data);
  if (!a) return { nom, lib: nom, present: false, statut: row ? row.statut : null };
  return avecCacheMoteur(() => {
    const s = syntheseBudget(a, role);
    const r = reperes[nom] || null, reseau = reperes[AGENCE_RESEAU] || null;
    const v = syntheseVue(a, r, reseau, { libResultat: s.kpis[1].label, resultat: s.net });
    const k = Object.fromEntries(v.kpis.map((x) => [x.cle, x]));
    const comp = (cle, i) => (k[cle] && k[cle].comps[i] ? k[cle].comps[i].val : null);
    const struct = estStructure(a);
    const ca = v.ca, ms = ann(a, 'Charges de personnel'), ext = ann(a, 'Autres Achats et charges externes'), rex = ann(a, "RESULTAT D'EXPLOITATION");
    const t = struct ? null : hsTot(a);
    const val = (row && row.data && row.data.validation) || null;
    const av = struct ? null : avancementBudget(a, row && row.updatedAt);
    return {
      nom, present: true, structure: struct, lib: struct ? LIB_STRUCTURES[nom] || nom : nom,
      statut: row.statut, majLe: row.updatedAt,
      ca, objectif: +a.targetCA || null, ecartObjectif: +a.targetCA ? ((ca / +a.targetCA) - 1) * 100 : null,
      evol26: comp('ca', 0), evol25: comp('ca', 1),
      libResultat: s.kpis[1].label, resultat: s.net, rex, rexPct: ratio(rex, ca), rex26Pct: comp('res', 0), rexReseauPct: comp('res', 1),
      ms, msPct: ratio(ms, ca), ms26Pct: comp('ms', 0), msReseauPct: comp('ms', 1),
      ext, extPct: ratio(ext, ca), ext26Pct: comp('ext', 0), extReseauPct: comp('ext', 1),
      txr: +a.targetTXR || null, absenteisme: +a.targetAbsRate || null,
      roulants: (a.employees || []).filter((e) => isRoulant(e.qual)).length,
      hs: t ? t.hs : null, coutHS: struct ? null : coutHSTotal(a),
      cpAcquis: struct ? null : cpGeneres(a), cpPoses: struct ? null : cpPlanifies(a),
      moisValides: (a.moisVerrouilles || []).length, avancement: av ? av.pct : null,
      contexte: texte(a.perspectives),
      avecRepere: v.avecRepere, pont: v.pont, mensuel: v.mensuel, points: v.points.map((p) => texte(p.texte)),
      historique: val && Array.isArray(val.historique) ? val.historique.filter((h) => h && (h.commentaire || h.type)).map((h) => ({ type: h.type, role: h.role, date: h.date, commentaire: texte(h.commentaire) })) : []
    };
  });
}

const METHODE = `## Comment lire ce dossier

- **Budget 2027** : prévision construite dans SOMA par le responsable d'exploitation (REX) de chaque agence, contrôlée par le contrôle de gestion puis validée par le directeur régional (DR), la direction financière (DF), la direction générale (DG) et le président (PDG).
- **2026** : réalisé des mois clos du tableau de bord du contrôle de gestion, complété par l'atterrissage (estimation des derniers mois par le contrôle de gestion).
- **2025** : réalisé de l'exercice complet.
- **Moyenne du réseau** : moyenne des agences du tableau de bord 2026 (hors Siège, Formation, Réseau adhérent et Exceptionnel).
- **CA** : chiffre d'affaires. **TXR** : chiffre d'affaires par heure travaillée par les équipages ; il convertit l'activité en heures de travail nécessaires.
- **Masse salariale / CA** : charges de personnel (salaires et charges, y compris provisions de congés) rapportées au CA.
- **Résultat d'exploitation** : CA moins toutes les charges d'exploitation, quotes-parts du siège comprises.
- **Écarts entre parenthèses** : écart du budget 2027 en points de CA par rapport à la référence indiquée.
- **Heures supplémentaires (HS)** : heures de besoin non couvertes par l'équipe présente, après congés et absentéisme ; coût au taux horaire majoré.
- **Congés payés des roulants** : jours acquis sur l'année ; règle de l'entreprise : 60 % de juin à octobre, 20 % de novembre à janvier, 20 % de février à mai, qui suit la modulation de la demande.
- **Structures** : Siège, Centre de formation, Réseau adhérent et Exceptionnel ont un budget simplifié préparé par le contrôle de gestion.
- **Statuts** : brouillon (en construction), puis soumis ou validé à chaque étage (DR, DF, DG, PDG). Seuls les budgets déposés sont définitifs côté REX.
- Les repères (2026, 2025, réseau) **éclairent** la décision : ce ne sont pas des seuils imposés. Un écart s'explique d'abord par le contexte rédigé par le REX.
- Données agrégées : le dossier ne contient aucun nom ni salaire individuel.
`;

const QUESTIONS = `## Questions utiles à poser sur ce dossier

1. Quelles agences ont la plus forte hausse de masse salariale / CA par rapport à 2026, et le contexte rédigé par le REX l'explique-t-il ?
2. Quels budgets 2027 s'écartent le plus de l'atterrissage 2026 (CA et résultat), dans un sens ou dans l'autre ?
3. Quelles agences ont un CA 2027 en hausse mais un résultat en baisse ? Pourquoi, d'après le passage du résultat 2026 au résultat 2027 ?
4. Classe les agences par écart de masse salariale / CA à la moyenne du réseau et propose trois questions à poser à chaque REX concerné.
5. Où les heures supplémentaires pèsent-elles le plus dans le CA, et quels mois sont concernés ?
6. Quelles hypothèses de croissance du CA paraissent ambitieuses au regard de 2025 et 2026 ?
7. Rédige une note de synthèse d'une page pour le comité de direction : budget consolidé, principaux risques, agences à examiner en priorité.
`;

function tableauComparatif(fiches) {
  const t = ['| Agence | Statut | CA 2027 | vs 2026 | vs 2025 | Écart objectif | Résultat 2027 | Résultat / CA 2027 | 2026 | Réseau 2026 | MS / CA 2027 | 2026 | Réseau 2026 | Ch. ext. / CA 2027 | 2026 | HS (h) | Coût HS | Roulants | Mois validés |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];
  fiches.forEach((f) => {
    if (!f.present) { t.push('| ' + f.lib + ' | ' + (f.statut ? statutLabel(f.statut) : 'non commencé') + ' | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |'); return; }
    t.push('| ' + [f.lib, statutLabel(f.statut), eur(f.ca), sg(f.evol26, ' %'), sg(f.evol25, ' %'), sg(f.ecartObjectif, ' %'), eur(f.resultat), pc(f.rexPct), pc(f.rex26Pct), pc(f.rexReseauPct),
      pc(f.msPct), pc(f.ms26Pct), pc(f.msReseauPct), pc(f.extPct), pc(f.ext26Pct), nb(f.hs), eur(f.coutHS), f.structure ? '—' : nb(f.roulants), f.structure ? '—' : f.moisValides + '/12'].map(cellule).join(' | ') + ' |');
  });
  return t.join('\n');
}

function ficheMarkdown(f) {
  const l = ['### ' + f.lib, ''];
  if (!f.present) { l.push('Budget non commencé.', ''); return l.join('\n'); }
  l.push('- Statut : **' + statutLabel(f.statut) + '** (dernière modification le ' + dateFr(f.majLe) + ')');
  if (!f.structure) l.push('- Avancement de la construction : ' + nb(f.avancement) + ' % · mois validés : ' + f.moisValides + '/12');
  l.push('- CA 2027 : **' + eur(f.ca) + '**' + (f.objectif ? ' · objectif ' + eur(f.objectif) + ' (' + sg(f.ecartObjectif, ' %') + ')' : '') + ' · évolution ' + sg(f.evol26, ' %') + ' vs 2026, ' + sg(f.evol25, ' %') + ' vs 2025');
  l.push('- ' + f.libResultat + ' 2027 : **' + eur(f.resultat) + '** · résultat d\'exploitation / CA ' + pc(f.rexPct) + ' (2026 : ' + pc(f.rex26Pct) + ', réseau 2026 : ' + pc(f.rexReseauPct) + ')');
  l.push('- Masse salariale : ' + eur(f.ms) + ' soit ' + pc(f.msPct) + ' du CA (2026 : ' + pc(f.ms26Pct) + ', réseau 2026 : ' + pc(f.msReseauPct) + ')');
  l.push('- Charges externes : ' + eur(f.ext) + ' soit ' + pc(f.extPct) + ' du CA (2026 : ' + pc(f.ext26Pct) + ', réseau 2026 : ' + pc(f.extReseauPct) + ')');
  if (!f.structure) {
    l.push('- Hypothèses : TXR ' + (f.txr ? nb(f.txr) + ' € de CA par heure' : '—') + ' · absentéisme ' + (f.absenteisme ? nb(f.absenteisme, 1) + ' %' : '—') + ' · ' + nb(f.roulants) + ' salariés roulants');
    l.push('- Heures supplémentaires : ' + nb(f.hs) + ' h, coût ' + eur(f.coutHS) + ' (' + pc(ratio(f.coutHS, f.ca)) + ' du CA) · congés des roulants : ' + nb(f.cpPoses, 1) + ' jours posés sur ' + nb(f.cpAcquis, 1) + ' acquis');
  }
  l.push('');
  l.push('**Contexte rédigé par le REX** : ' + (f.contexte ? f.contexte : 'non renseigné.'), '');
  if (f.pont) {
    l.push('**Passage du résultat d\'exploitation 2026 au résultat 2027** : ' + f.pont.map((p) => p.lib + ' ' + (p.type === 'delta' && p.val > 0 ? '+' : '') + eur(p.val)).join(' → '), '');
  } else if (!f.structure) l.push('Tableau de bord 2026 non disponible pour cette agence : pas de comparaison au réalisé.', '');
  const m = f.mensuel;
  if (m && m.ca27 && m.ca27.some((x) => x)) {
    l.push('| Mois | ' + M.join(' | ') + ' |', '|---|' + M.map(() => '---:').join('|') + '|');
    l.push('| CA 2027 | ' + m.ca27.map((x) => nb(x)).join(' | ') + ' |');
    if (m.ca26) l.push('| CA 2026 (réalisé jusqu\'au mois ' + m.moisClos26 + ', puis atterrissage) | ' + m.ca26.map((x) => nb(x)).join(' | ') + ' |');
    if (m.ca25) l.push('| CA 2025 | ' + m.ca25.map((x) => nb(x)).join(' | ') + ' |');
    l.push('| MS / CA 2027 (%) | ' + m.ms27.map((x) => nb(x, 1)).join(' | ') + ' |');
    l.push('');
  }
  if (f.points.length) l.push('**Points d\'attention** :', ...f.points.map((p) => '- ' + p), '');
  if (f.historique.length) l.push('**Historique de validation** :', ...f.historique.map((h) => '- ' + dateFr(h.date) + ' · ' + (h.role || '').toUpperCase() + ' · ' + (h.type || '') + (h.commentaire ? ' : « ' + h.commentaire + ' »' : '')), '');
  return l.join('\n');
}

// rows : { agence: { statut, data (brut), updatedAt } } ; reperes : chargerReperes() ; agence : nom pour une seule fiche (sinon tout le réseau)
export function dossierOmnisian({ rows, ops, reperes = {}, role = 'dg', agence = null, maintenant = new Date() }) {
  const noms = ops.map((o) => o.nom);
  const fichesAg = noms.map((n) => ficheEntite(n, rows[n], reperes, role));
  const fichesSt = STRUCTURES.map((n) => ({ ...ficheEntite(n, rows[n], reperes, role), lib: LIB_STRUCTURES[n] || n }));
  const presentes = fichesAg.filter((f) => f.present);
  const l = [];
  l.push('# SOMA — Dossier d\'analyse des budgets 2027' + (agence ? ' — ' + agence : ''), '');
  l.push('Extraction du ' + maintenant.toLocaleDateString('fr-FR') + ' à ' + maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + '. Source : SOMA (outil budgétaire de VYV Ambulance). Montants en euros.', '');
  l.push(METHODE);

  l.push('## Vue d\'ensemble du réseau', '');
  const dep = presentes.filter((f) => STATUTS_DEPOSES(f.statut)).length;
  l.push('- Agences : ' + noms.length + ' · budgets commencés : ' + presentes.length + ' · déposés pour validation : ' + dep + ' · validés définitivement : ' + presentes.filter((f) => /^valide(_pdg)?$/.test(f.statut)).length);
  let c = null;
  try { c = consolideReseau(rows, ops); } catch (e) { c = null; }
  if (c && c.total) {
    const T = c.total, ca = T["Chiffre d'affaires"];
    l.push('- Compte de résultat consolidé 2027 (agences et structures) : CA ' + eur(ca) + ' · charges de personnel ' + eur(T['Charges de personnel']) + ' (' + pc(ratio(T['Charges de personnel'], ca)) + ') · charges externes ' + eur(T['Autres Achats et charges externes']) + ' (' + pc(ratio(T['Autres Achats et charges externes'], ca)) + ') · résultat d\'exploitation ' + eur(T["RESULTAT D'EXPLOITATION"]) + ' (' + pc(ratio(T["RESULTAT D'EXPLOITATION"], ca)) + ')');
    l.push('- Agences seules : CA ' + eur(c.agences["Chiffre d'affaires"]) + ' · résultat d\'exploitation ' + eur(c.agences["RESULTAT D'EXPLOITATION"]));
  }
  const res = anneeRep(reperes[AGENCE_RESEAU], 2026);
  if (res && res.nbAgences) l.push('- Moyenne du réseau 2026 calculée sur ' + res.nbAgences + ' agences.');
  l.push('- Budgets en cours de construction : leurs chiffres peuvent encore évoluer. Les budgets non commencés n\'entrent pas dans les totaux.', '');

  l.push('## Tableau comparatif des agences', '');
  l.push(tableauComparatif(fichesAg), '');
  l.push('### Structures', '');
  l.push(tableauComparatif(fichesSt), '');

  l.push('## Fiches détaillées', '');
  const aDetailler = agence ? fichesAg.concat(fichesSt).filter((f) => f.nom === agence) : fichesAg.concat(fichesSt);
  aDetailler.forEach((f) => l.push(ficheMarkdown(f)));

  l.push(QUESTIONS);
  return l.join('\n');
}

export function nomFichierDossier(agence, maintenant = new Date()) {
  const d = maintenant.toISOString().slice(0, 10);
  return 'SOMA_dossier_Omnisian_' + (agence ? agence.replace(/[^A-Za-z0-9]+/g, '_') + '_' : 'reseau_') + d;
}
