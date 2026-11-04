// Synthèse du budget — fonctions PURES, port de renderSynthese, renderCoutChoix,
// renderEnveloppesCP et renderDashboard (graphiques et ratios).
import { ann, hsTot, hsRows, needWeeks, mainMonth, cpGeneres, monthCA, coefHSMoyen, coutDuChoixREX, M, resultatAffiche, vueExploitation } from './calculations.js';
import { euro, pct } from './format.js';

const VALIDEURS = ['dr', 'df', 'dg', 'pdg'];

export function syntheseBudget(a, role = 'rex') {
  const ca = ann(a, "Chiffre d'affaires");
  const res = resultatAffiche(a, role);
  const net = res.val;
  const ms = ann(a, 'Charges de personnel');
  const caObj = +a.targetCA || 0;
  const ecart = ca - caObj;
  const tauxMS = ca ? (ms / ca) * 100 : 0;
  const nbCritiques = hsRows(a).filter((r) => r.t === 'critique').length;

  const kpis = [
    { label: 'CA budgété', value: euro(ca), note: '' },
    { label: res.lib, value: euro(net), note: ca ? pct((net / ca) * 100) : '' },
    { label: 'Masse salariale / CA', value: pct(tauxMS), note: tauxMS > 85 ? '⚠ élevé' : tauxMS > 75 ? 'à surveiller' : 'maîtrisé' },
    { label: 'Écart à l\'objectif', value: (ecart >= 0 ? '+' : '') + euro(ecart), note: caObj ? (ecart >= 0 ? 'objectif atteint' : 'sous l\'objectif') : '' }
  ];

  const estValideur = VALIDEURS.includes(role);
  const problemes = [];
  if (net < 0) problemes.push(res.libMin + ' déficitaire');
  if (tauxMS > 85) problemes.push('masse salariale élevée');
  if (caObj && ecart < -caObj * 0.03) problemes.push('objectif de CA non atteint');
  const verdict = problemes.length === 0
    ? { ok: true, icone: '✓', titre: 'Budget équilibré et cohérent',
      detail: estValideur ? 'Ce budget est sain sur ses grands équilibres — vous pouvez le valider.' : 'Votre budget est prêt à être transmis pour validation.' }
    : { ok: false, icone: '⚠', titre: 'Points à examiner : ' + problemes.join(', '),
      detail: estValideur ? 'Vérifiez ces points avant de valider ce budget.' : 'Nous vous conseillons de revoir ces points avant de soumettre votre budget.' };

  let lecture = '';
  if (ca) {
    if (caObj) lecture += ecart >= -caObj * 0.03 ? 'Ce budget atteint l\'objectif de chiffre d\'affaires (' + euro(ca) + '). ' : 'Ce budget est en retrait de ' + euro(Math.abs(ecart)) + ' par rapport à l\'objectif. ';
    if (net > 0) lecture += 'Il dégage un ' + res.libMin + ' positif de <b>' + euro(net) + '</b>. ';
    else if (net < 0) lecture += 'Il présente un ' + res.libMin + ' déficitaire de <b>' + euro(Math.abs(net)) + '</b>. ';
    if (tauxMS > 85) lecture += 'La masse salariale (' + pct(tauxMS) + ' du CA) est élevée. ';
    else if (tauxMS > 0) lecture += 'La masse salariale (' + pct(tauxMS) + ' du CA) est dans la norme. ';
    lecture += nbCritiques > 0 ? nbCritiques + ' semaine' + (nbCritiques > 1 ? 's' : '') + ' de tension à surveiller.' : 'Aucune semaine en tension critique.';
  }
  return { ca, net, ms, caObj, ecart, tauxMS, nbCritiques, kpis, verdict, lecture };
}

// Coût du choix de répartition des CP par le REX (vs l'optimum calculé par SOMA)
export function coutChoix(a) {
  const c = coutDuChoixREX(a);
  if (!c.mesurable) return null;
  return { ...c, semaines: c.semaines.map((s) => ({ ...s, nomMois: M[s.mois] })) };
}

// Bilan des CP par période légale : cible, posés, écart, compensation des mois verrouillés
const PERIODES = [
  { nom: 'Juin – octobre', months: [5, 6, 7, 8, 9] },
  { nom: 'Novembre – janvier', months: [10, 11, 0] },
  { nom: 'Février – mai', months: [1, 2, 3, 4] }
];
export function bilanEnveloppesCP(a) {
  const envs = a.cpEnveloppes;
  if (!envs || !envs.length) return null;
  const generes = cpGeneres(a);
  const alertes = [];
  const lignes = PERIODES.map((def, i) => {
    const env = envs[i] || {};
    let poses = needWeeks(a).reduce((s, w) => (def.months.indexOf(mainMonth(a, w.week)) >= 0 ? s + (+((a.presence[w.week] || {}).cp) || 0) : s), 0);
    poses = Math.round(poses * 10) / 10;
    const cible = env.cible !== undefined ? env.cible : Math.round(generes * (env.pct || 0) * 10) / 10;
    const ecart = Math.round((poses - cible) * 10) / 10;
    const conforme = Math.abs(ecart) < 1;
    if (!conforme && env.verrouille > 0) alertes.push(def.nom + ' : les mois verrouillés portent ' + env.verrouille + ' j — la répartition automatique a compensé sur les autres périodes.');
    return { nom: def.nom, cible, poses, ecart, conforme, ecartTxt: conforme ? 'conforme' : (ecart > 0 ? '+' + ecart + ' j' : ecart + ' j') };
  });
  return { lignes, alertes, reliquat: a.cpReliquat > 0 ? a.cpReliquat : 0 };
}

// Graphiques et tous les indicateurs (port de renderDashboard + renderFinance)
export function indicateursDetailles(a, role) {
  const expl = vueExploitation(a, role);
  const ca2026 = +a.histCA || 0;
  const caObj = +a.targetCA || 0;
  const caBudget = ann(a, "Chiffre d'affaires");
  const ms = ann(a, 'Charges de personnel');
  const rex = ann(a, "RESULTAT D'EXPLOITATION");
  const net = ann(a, 'RESULTAT NET');
  const t = hsTot(a);
  const hsCost = t.hs * (+a.costHour || 0) * coefHSMoyen(a);
  const r = (v) => (caBudget ? (v / caBudget) * 100 : 0);
  return {
    dash: [
      { label: 'CA 2026', value: euro(ca2026), note: 'réalisé / estimé' },
      { label: 'Objectif CA 2027', value: euro(caObj), note: 'saisi REX' },
      { label: 'Budget CA 2027', value: euro(caBudget), note: 'calendrier' },
      { label: 'Écart objectif', value: euro(caBudget - caObj), note: 'budget - objectif' },
      { label: 'REX 2027', value: euro(rex), note: pct(r(rex)) },
      { label: 'HS estimées', value: t.hs.toFixed(0) + ' h', note: 'moteur RH' }
    ],
    fin: [
      { label: 'CA calendrier', value: euro(caBudget) },
      { label: 'Charges personnel', value: euro(ms), note: 'présence + HS' },
      { label: 'REX', value: euro(rex), note: pct(r(rex)) },
      ...(expl ? [] : [{ label: 'Résultat net', value: euro(net), note: pct(r(net)) }]),
      { label: 'MS / CA', value: pct(r(ms)) },
      { label: 'HS', value: t.hs.toFixed(0) + ' h' }
    ],
    barresCA: [{ label: '2026', value: ca2026, cls: 'b2026' }, { label: 'Obj 27', value: caObj, cls: 'obj' }, { label: 'Bud 27', value: caBudget, cls: 'budget' }],
    barresResultat: expl ? [{ label: 'REX', value: rex, cls: 'budget' }] : [{ label: 'REX', value: rex, cls: 'budget' }, { label: 'Net', value: net, cls: 'budget' }],
    caMensuel: M.map((m, i) => ({ mois: m, value: monthCA(a, i) })),
    ratios: [
      { label: 'Masse salariale / CA', value: r(ms) },
      { label: 'REX / CA', value: r(rex) },
      ...(expl ? [] : [{ label: 'Résultat net / CA', value: r(net) }]),
      { label: 'Coût HS / CA', value: r(hsCost) }
    ]
  };
}
