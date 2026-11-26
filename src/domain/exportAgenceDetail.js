// Export Excel détaillé du budget d'une agence (nov. 2026) : un vrai support de travail, avec les calculs en formules.
// Fonction PURE : construit un modèle de classeur { feuilles: [{ nom, largeurs, gel, lignes: [[cellule…]] }] } ;
// l'écriture du fichier (styles, formats) est dans lib/exportExcel.js.
//
// Cellule : null | nombre | texte | { v, f, k, fmt } avec
//   f   : formule Excel (sans le « = »), v : valeur (résultat attendu, utile si le tableur ne recalcule pas),
//   k   : rôle — 'saisie' (hypothèse modifiable, bleu), 'soma' (valeur calculée par le moteur SOMA, gris),
//         'formule' (calcul Excel, noir), 'titre', 'entete', 'total', 'note', 'controle'
//   fmt : 'eur' | 'h' | 'pct' | 'pct100' | 'int' | 'date' | 'dec2' | 'dec3'
// Principe : besoin (calendrier ÷ TXR), disponible, heures supplémentaires et leur coût, compte de résultat et charges
// en % du CA sont des formules ; la répartition jour par jour des contrats, les fériés chômés, la maladie du mois
// et la masse salariale par période de paie viennent du moteur SOMA (valeurs grises), avec une colonne de contrôle.
import {
  M, T, hsRows, joursSemaine, mainMonth, chMois, txrDuMois, caFunMois, partRoulant, isRoulant, lignesSIG, ann,
  coutHoraireImproductif, hs50Auto, tauxHS50Mois, hsDuMois, coefHSSemaine, paieParPeriodes, payrollMonth, estStructure,
  indemnitesSemaine, paiesSemaine, hsTot, coutHSTotal, CP_HEURES_JOUR, amount
} from './calculations.js';
import { detailMSMois } from './detailMS.js';

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
const AA = ['Electricité - eau - chauffage', 'Matériels ambulances', 'Carburant', 'Entretiens petits équipements', 'Fourniture bureau - vêtements', 'Sous traitance', 'Crédit bail et location véhicules', 'Location téléphonie - informatique - mobilité', 'Location immobilières et charges locatives', 'Entretiens véhicules - batîment', 'Maintenance informatique', 'Assurance', 'Formation - documentation', 'Honoraires et prestations de services', 'Publicité - cadeaux', 'Frais de déplacement - missions réceptions', 'Péages', 'Affranchissement', 'Téléphonie - internet', 'Frais bancaires et cotisations'];

// Colonne Excel (0 → A)
export function col(i) { let s = ''; i += 1; while (i > 0) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; }
const C = (k, v, fmt, f) => ({ k, v, fmt, f });
const saisie = (v, fmt) => C('saisie', v, fmt);
const soma = (v, fmt) => C('soma', v, fmt);
const fx = (f, v, fmt, k) => C(k || 'formule', v, fmt, f);
const titre = (v) => C('titre', v);
const entete = (v) => C('entete', v);
const note = (v) => C('note', v);
const r2 = (x) => Math.round((+x || 0) * 100) / 100;
const dateJS = (m, d) => new Date(Date.UTC(2027, m, d));
const MOISCOL = (m) => col(2 + m); // mois en colonnes C..N
const Q = (nom) => "'" + nom.replace(/'/g, "''") + "'";

function feuilleParametres(a) {
  const L = [];
  L.push([titre('Paramètres de calcul — ' + (a.name || 'agence'))]);
  L.push([note('Les cellules en bleu sont des hypothèses : modifiez-les, tout le classeur se recalcule. Les cellules grises viennent du moteur SOMA.')]);
  L.push([entete('Paramètre'), entete('Unité')].concat(MOIS.map(entete), [entete('Année')]));
  const ligneMois = (lib, unite, vals, fmt, tot) => [lib, unite].concat(vals.map((v) => saisie(v, fmt)), [tot || null]);
  L.push(ligneMois('TXR (CA par heure d\'équipage)', '€/h', M.map((_, m) => r2(txrDuMois(a, m))), 'dec2'));                 // ligne 4
  L.push(ligneMois('Coût horaire chargé d\'un roulant', '€/h', M.map((_, m) => r2(chMois(a, m))), 'dec2'));               // ligne 5
  L.push(ligneMois('Taux de maladie', '%', M.map((_, m) => (a.sick && a.sick[m] != null ? +a.sick[m] : 0)), 'dec2'));     // ligne 6
  L.push(ligneMois('CA funéraire (sans besoin d\'équipage)', '€', M.map((_, m) => caFunMois(a, m)), 'eur',
    fx('SUM(C7:N7)', M.reduce((s, _, m) => s + caFunMois(a, m), 0), 'eur')));                                             // ligne 7
  L.push(ligneMois('Part des HS à +50 % (mode manuel)', '%', M.map((_, m) => (a.hs50 && a.hs50[m] != null ? +a.hs50[m] : 0)), 'dec2')); // ligne 8
  L.push(['Mode de calcul de la part à +50 %', '', saisie(hs50Auto(a) ? 'auto' : 'manuel'), note('auto : 8 premières HS par salarié présent à +25 %, le reste à +50 % ; manuel : ligne 8')]); // ligne 9
  L.push(['Coût horaire chargé improductif', '€/h', saisie(r2(coutHoraireImproductif(a)), 'dec2')]);                     // ligne 10
  L.push(['HS à +25 % par salarié et par semaine', 'h', saisie(8, 'int')]);                                               // ligne 11
  L.push(['Heures d\'un jour de congé payé (ouvrable)', 'h', fx('35/6', CP_HEURES_JOUR, 'dec2')]);                         // ligne 12
  L.push(['Heures d\'un jour d\'autre absence', 'h', saisie(7, 'dec2')]);                                                   // ligne 13
  return { nom: 'Paramètres', largeurs: [42, 8].concat(Array(12).fill(10), [12, 60]), gel: { x: 2, y: 3 }, lignes: L };
}

function feuilleCalendrier(a) {
  const L = [[titre('Calendrier 2027 — besoin d\'heures jour par jour')],
    [note('Besoin du jour = CA du jour ÷ TXR de son mois. Modifiez un CA ou le TXR (Paramètres, ligne 4) : besoins, heures supplémentaires et compte de résultat suivent.')],
    ['Date', 'Jour', 'Semaine', 'Mois', 'Type', 'CA sanitaire', 'CA saisonnier', 'CA transport de personnes', 'Ajustement', 'CA total', 'TXR', 'Besoin (h)'].map(entete)];
  const cal = (a.cal || []).slice();
  cal.forEach((d, i) => {
    const n = 4 + i, ca = d.ca || {}, san = +ca.san || 0, sai = +ca.sai || 0, tp = +ca.tp || 0, aj = r2((+d.total || 0) - san - sai - tp);
    const txr = txrDuMois(a, d.month);
    L.push([C('saisie', dateJS(d.month, d.day), 'date'), JOURS[new Date(2027, d.month, d.day).getDay()], d.week, d.month + 1, d.type,
      saisie(san, 'eur'), saisie(sai, 'eur'), saisie(tp, 'eur'), saisie(aj, 'eur'),
      fx('SUM(F' + n + ':I' + n + ')', +d.total || 0, 'eur'),
      fx('INDEX(Paramètres!$C$4:$N$4,D' + n + ')', txr, 'dec2'),
      fx('IF(K' + n + '>0,J' + n + '/K' + n + ',0)', txr > 0 ? (+d.total || 0) / txr : 0, 'h')]);
  });
  const fin = 3 + cal.length, t = fin + 1;
  L.push(['Total', '', '', '', ''].map((x) => C('total', x)).concat(['F', 'G', 'H', 'I', 'J'].map((c) => fx('SUM(' + c + '4:' + c + fin + ')', null, 'eur', 'total')), [C('total', ''), fx('SUM(L4:L' + fin + ')', null, 'h', 'total')]));
  return { nom: 'Calendrier', largeurs: [11, 10, 9, 6, 10, 13, 13, 13, 12, 13, 8, 11], gel: { x: 1, y: 3 }, lignes: L, fin, total: t };
}

function feuilleEquipe(a) {
  const L = [[titre('Équipe')], [note('Heures roulantes = heures du contrat × part roulante. Les entrées et sorties en cours d\'année sont prises en compte jour par jour dans l\'onglet Semaines.')],
    ['Salarié', 'Qualification', 'Contrat', 'Heures / semaine', 'Part roulante (%)', 'Heures roulantes', 'ETP roulant', 'Entrée', 'Sortie'].map(entete)];
  const emp = a.employees || [];
  emp.forEach((e, i) => {
    const n = 4 + i, h = +e.hours || 0, p = Math.round(partRoulant(e) * 1000) / 10;
    L.push([e.name || e.nom || ('Salarié ' + (i + 1)), e.qual || '', e.contract || '', saisie(h, 'dec2'), saisie(p, 'dec2'),
      fx('D' + n + '*E' + n + '/100', h * p / 100, 'dec2'), fx('F' + n + '/35', h * p / 100 / 35, 'dec2'), e.dateEntree || '', e.dateSortie || '']);
  });
  const fin = 3 + emp.length;
  L.push([C('total', 'Total'), C('total', emp.length + ' salariés'), C('total', ''), fx('SUM(D4:D' + fin + ')', null, 'dec2', 'total'), C('total', ''),
    fx('SUM(F4:F' + fin + ')', null, 'dec2', 'total'), fx('SUM(G4:G' + fin + ')', null, 'dec2', 'total')]);
  return { nom: 'Équipe', largeurs: [26, 14, 9, 12, 12, 12, 10, 11, 11], gel: { x: 1, y: 3 }, lignes: L, total: fin + 1 };
}

function feuilleSemaines(a) {
  const auto = hs50Auto(a);
  const L = [[titre('Semaines — besoin, équipe disponible et heures supplémentaires')],
    [note('Disponible = base des contrats − congés − absences − fériés chômés − maladie. HS = besoin − disponible quand le besoin dépasse. Les HS sont décomptées à la semaine (35 h). Colonnes grises : moteur SOMA (répartition des contrats jour par jour, fériés, maladie du mois).')],
    ['Semaine', 'Du', 'Au', 'Jours', 'Mois principal', 'CA', 'Besoin (h)', 'Base contrats (h)', 'CP (jours)', 'Facteur jour', 'CP (h)',
      'Absences payées (j)', 'Absences non payées (j)', 'Absences (h)', 'Fériés chômés (h)', 'Taux maladie (%)', 'Maladie (h)', 'Disponible (h)',
      'HS (h)', 'Part à +50 %', 'Coefficient', 'Coût horaire (€/h)', 'Coût des HS (€)', 'Tension', 'HS SOMA (h)', 'Écart'].map(entete)];
  const rows = hsRows(a);
  rows.forEach((r, i) => {
    const n = 4 + i, j = joursSemaine(a, r.week), d0 = j[0], d1 = j[j.length - 1], m = mainMonth(a, r.week);
    const pr = (a.presence && a.presence[r.week]) || {};
    // coût horaire moyen des HS de la semaine (mois d'attribution des HS, comme le moteur)
    let ch = chMois(a, m), cf = coefHSSemaine(a, r, m);
    if (r.hs > 0) { let s = 0, sc = 0; for (let k = 0; k < 12; k++) { const h = hsDuMois(a, r, k); if (h) { s += h * chMois(a, k) * coefHSSemaine(a, r, k); sc += h * coefHSSemaine(a, r, k); } } if (sc > 0) { ch = s / sc; cf = sc / r.hs; } }
    const p50 = auto ? 'IF(S' + n + '>0,MAX(0,S' + n + '-Paramètres!$C$11*R' + n + '/35)/S' + n + ',0)' : 'INDEX(Paramètres!$C$8:$N$8,E' + n + ')/100';
    L.push([r.week, C('soma', d0 ? dateJS(d0.month, d0.day) : '', 'date'), C('soma', d1 ? dateJS(d1.month, d1.day) : '', 'date'), j.length, m + 1,
      fx('SUMIFS(Calendrier!$J:$J,Calendrier!$C:$C,A' + n + ')', r.ca, 'eur'),
      fx('SUMIFS(Calendrier!$L:$L,Calendrier!$C:$C,A' + n + ')', r.hours, 'h'),
      soma(r2(r.base), 'h'), saisie(+pr.cp || 0, 'dec2'), soma(Math.round((r.fJ == null ? 1 : r.fJ) * 10000) / 10000, 'dec3'),
      fx('I' + n + '*Paramètres!$C$12*J' + n, r.cpH, 'h'),
      saisie(+pr.otherPaid || 0, 'dec2'), saisie(+pr.other || 0, 'dec2'),
      fx('(L' + n + '+M' + n + ')*Paramètres!$C$13*J' + n, (r.otherH || 0) + (r.otherPaidH || 0), 'h'),
      soma(r2(r.ferieH), 'h'), soma(Math.round((r.rate || 0) * 100) / 100, 'dec2'),
      fx('MAX(0,H' + n + '-O' + n + ')*P' + n + '/100', r.mal, 'h'),
      fx('MAX(0,H' + n + '-K' + n + '-N' + n + '-O' + n + '-Q' + n + ')', r.av, 'h'),
      fx('MAX(0,G' + n + '-R' + n + ')', r.hs, 'h'),
      fx(p50, r.hs > 0 ? (cf - 1.25) / 0.25 : 0, 'pct'),
      fx('1.25+0.25*T' + n, cf, 'dec3'),
      soma(r2(ch), 'dec2'),
      fx('S' + n + '*U' + n + '*V' + n, r.hs * cf * ch, 'eur'),
      fx('IF(R' + n + '>0,G' + n + '/R' + n + ',"")', r.av > 0 ? r.hours / r.av : '', 'pct'),
      soma(r2(r.hs), 'h'), fx('S' + n + '-Y' + n, 0, 'h', 'controle')]);
  });
  const fin = 3 + rows.length;
  const tot = (c, fmt) => fx('SUM(' + c + '4:' + c + fin + ')', null, fmt, 'total');
  L.push([C('total', 'Total'), C('total', ''), C('total', ''), C('total', ''), C('total', ''), tot('F', 'eur'), tot('G', 'h'), tot('H', 'h'), tot('I', 'dec2'), C('total', ''), tot('K', 'h'),
    tot('L', 'dec2'), tot('M', 'dec2'), tot('N', 'h'), tot('O', 'h'), C('total', ''), tot('Q', 'h'), tot('R', 'h'), tot('S', 'h'),
    fx('IF(S' + (fin + 1) + '>0,SUMPRODUCT(S4:S' + fin + ',T4:T' + fin + ')/S' + (fin + 1) + ',0)', null, 'pct', 'total'), C('total', ''), C('total', ''), tot('W', 'eur'),
    fx('IF(R' + (fin + 1) + '>0,G' + (fin + 1) + '/R' + (fin + 1) + ',"")', null, 'pct', 'total'), tot('Y', 'h'), tot('Z', 'h')]);
  return { nom: 'Semaines', largeurs: [8, 10, 10, 6, 8, 12, 10, 11, 8, 8, 9, 9, 9, 9, 9, 8, 9, 10, 9, 8, 8, 9, 12, 8, 9, 7], gel: { x: 1, y: 3 }, lignes: L, total: fin + 1 };
}

function feuilleIndemnites(a) {
  const L = [[titre('Indemnités repas et dimanche / jour férié (IDJF)')], [note('Montants hebdomadaires saisis dans Présence. « Payé en » : mois de paie de la semaine ; les semaines après le 5 décembre sont payées en janvier 2028.')],
    ['Semaine', 'Repas roulants', 'Repas non-roulants', 'IDJF roulants', 'IDJF non-roulants', 'Total', 'Payé en'].map(entete)];
  const ws = hsRows(a).map((r) => r.week), v = (o, w) => (o && o[w] ? +o[w] : 0);
  ws.forEach((w, i) => {
    const n = 4 + i, ps = paiesSemaine(a, w).map((p) => (p.mois === 'jan2028' ? 'janv. 2028' : p.mois === 'dec2026' ? 'déc. 2026' : MOIS[p.mois])).join(' + ');
    L.push([w, saisie(v(a.repasRoulant, w), 'eur'), saisie(v(a.repasNonRoulant, w), 'eur'), saisie(v(a.idjfRoulant, w), 'eur'), saisie(v(a.idjfNonRoulant, w), 'eur'),
      fx('SUM(B' + n + ':E' + n + ')', indemnitesSemaine(a, w), 'eur'), ps]);
  });
  const fin = 3 + ws.length;
  L.push([C('total', 'Total')].concat(['B', 'C', 'D', 'E', 'F'].map((c) => fx('SUM(' + c + '4:' + c + fin + ')', null, 'eur', 'total'))));
  return { nom: 'Indemnités', largeurs: [9, 13, 15, 13, 15, 13, 22], gel: { x: 1, y: 3 }, lignes: L };
}

function feuilleMasseSalariale(a) {
  const L = [[titre('Masse salariale par mois de paie')]];
  if (paieParPeriodes(a)) {
    L.push([note('Chaque mois de paie couvre sa période (onglet Détail MS : dates et formules). Montants calculés par SOMA ; le total est une formule reprise au compte de résultat.')]);
    L.push([entete('Composante'), entete('')].concat(MOIS.map(entete), [entete('Année')]));
    const det = M.map((_, m) => detailMSMois(a, m));
    const libs = det[0].lignes.map((l) => l.lib);
    libs.forEach((lib, i) => {
      const n = 4 + i;
      L.push([lib, ''].concat(det.map((d) => soma(r2(d.lignes[i] ? d.lignes[i].montant : 0), 'eur')), [fx('SUM(C' + n + ':N' + n + ')', null, 'eur')]));
    });
    const fin = 3 + libs.length, t = fin + 1;
    L.push([C('total', 'Total masse salariale'), C('total', '')].concat(M.map((_, m) => fx('SUM(' + MOISCOL(m) + '4:' + MOISCOL(m) + fin + ')', det[m].total, 'eur', 'total')), [fx('SUM(C' + t + ':N' + t + ')', null, 'eur', 'total')]));
    L.push([C('controle', 'Contrôle SOMA (écran)'), ''].concat(M.map((_, m) => soma(r2(payrollMonth(a, m)), 'eur')), [fx('SUM(C' + (t + 1) + ':N' + (t + 1) + ')', null, 'eur', 'controle')]));
    return { nom: 'Masse salariale', largeurs: [44, 2].concat(Array(12).fill(11), [13]), gel: { x: 2, y: 3 }, lignes: L, total: t, detail: det };
  }
  L.push([note('Masse salariale calculée par mois civil (agence sans périodes de paie configurées).')]);
  L.push([entete('Composante'), entete('')].concat(MOIS.map(entete), [entete('Année')]));
  L.push(['Masse salariale (calcul SOMA)', ''].concat(M.map((_, m) => soma(r2(payrollMonth(a, m)), 'eur')), [fx('SUM(C4:N4)', null, 'eur')]));
  L.push([C('total', 'Total masse salariale'), C('total', '')].concat(M.map((_, m) => fx(MOISCOL(m) + '4', null, 'eur', 'total')), [fx('SUM(C5:N5)', null, 'eur', 'total')]));
  return { nom: 'Masse salariale', largeurs: [44, 2].concat(Array(12).fill(11), [13]), gel: { x: 2, y: 3 }, lignes: L, total: 5, detail: null };
}

function feuilleDetailMS(ms) {
  const L = [[titre('Détail du calcul de la masse salariale')], ['Mois de paie', 'Période', 'Composante', 'Montant', 'Calcul'].map(entete)];
  (ms.detail || []).forEach((d) => {
    const per = d.periode ? (d.periode.debut + ' → ' + d.periode.fin) : '';
    d.lignes.forEach((l) => L.push([MOIS[d.mois], per, l.lib, soma(r2(l.montant), 'eur'), l.formule || '']));
    L.push([C('total', MOIS[d.mois]), C('total', per), C('total', 'Total'), C('total', r2(d.total)), C('total', '')]);
  });
  return { nom: 'Détail MS', largeurs: [10, 24, 40, 13, 110], gel: { x: 0, y: 2 }, lignes: L };
}

function feuilleResultat(a, role, cal, ms) {
  const lignes = lignesSIG(a, role);
  const L = [[titre('Compte de résultat 2027')], [note('CA = calendrier + funéraire. Charges en % du CA et clés de répartition en formules ; montants saisis en bleu. Colonne « SOMA » : valeur affichée dans l\'application, pour contrôle.')],
    [entete('Ligne'), entete('Mode')].concat(MOIS.map(entete), [entete('Année'), entete('SOMA'), entete('Écart')])];
  const ligneDe = {}; lignes.forEach((r, i) => { ligneDe[r.label] = 4 + i; });
  const ref = (lib, c) => (ligneDe[lib] ? c + ligneDe[lib] : null);
  const somme = (libs, c) => libs.map((l) => ref(l, c)).filter(Boolean);
  lignes.forEach((r, i) => {
    const n = 4 + i, lib = r.label, x = (a.rex || {})[lib];
    let mode = '', cells;
    const parMois = (fn) => M.map((_, m) => fn(MOISCOL(m), m));
    const caRef = (c) => ref("Chiffre d'affaires", c) || '0';
    if (lib === "Chiffre d'affaires" && estStructure(a)) {
      mode = 'saisi (structure)';
      cells = parMois((c, m) => saisie(r2(amount(a, lib, m)), 'eur'));
    } else if (lib === "Chiffre d'affaires") {
      mode = 'calendrier + funéraire';
      cells = parMois((c, m) => fx('SUMIFS(Calendrier!$J$4:$J$' + cal.fin + ',Calendrier!$D$4:$D$' + cal.fin + ',' + (m + 1) + ')+Paramètres!' + c + '7', null, 'eur'));
    } else if (lib === 'Charges de personnel') {
      mode = 'masse salariale' + (estStructure(a) ? '' : ' + quotes-parts');
      const qp = estStructure(a) ? [] : ['Quote-part MS siège', 'Quote-part régulation mutualisée'];
      cells = parMois((c) => fx([Q('Masse salariale') + '!' + c + ms.total].concat(somme(qp, c)).join('+'), null, 'eur'));
    } else if (r.type === 'subtotal') {
      mode = 'sous-total';
      const f = {
        'MARGE BRUTE GLOBALE': (c) => [caRef(c)].concat(somme(['Achats Matières premières et sous traitance', 'Variations stock marchandises et autres approvisionnements'], c).map((s) => '-' + s)).join(''),
        'Autres Achats et charges externes': (c) => (somme(AA, c).join('+') || '0'),
        'VALEUR AJOUTEE': (c) => (ref('MARGE BRUTE GLOBALE', c) || '0') + '-' + (ref('Autres Achats et charges externes', c) || '0'),
        "EXCEDENT BRUT D'EXPLOITATION": (c) => [ref('VALEUR AJOUTEE', c) || '0'].concat(somme(["Subventions d'exploitation"], c).map((s) => '+' + s), somme(['Impôts, taxes et versements assimilés', 'Charges de personnel'], c).map((s) => '-' + s)).join(''),
        "RESULTAT D'EXPLOITATION": (c) => [ref("EXCEDENT BRUT D'EXPLOITATION", c) || '0'].concat(somme(['Reprises s/ charges et transferts', 'Autres produits'], c).map((s) => '+' + s), somme(['Dotations amortissements et provisions', 'Autres charges'], c).map((s) => '-' + s)).join(''),
        'RESULTAT FINANCIER': (c) => ['0'].concat(somme(['Produits financiers'], c).map((s) => '+' + s), somme(['Charges financières'], c).map((s) => '-' + s)).join(''),
        'RESULTAT COURANT AVANT IMPOT': (c) => (ref("RESULTAT D'EXPLOITATION", c) || '0') + '+' + (ref('RESULTAT FINANCIER', c) || '0'),
        'RESULTAT EXCEPTIONNEL': (c) => ['0'].concat(somme(['Produits exceptionnels'], c).map((s) => '+' + s), somme(['Charges exceptionnelles'], c).map((s) => '-' + s)).join(''),
        'RESULTAT NET': (c) => [(ref('RESULTAT COURANT AVANT IMPOT', c) || '0') + '+' + (ref('RESULTAT EXCEPTIONNEL', c) || '0')].concat(somme(['Impôt sur les sociétés', 'Participation aux bénéfices'], c).map((s) => '-' + s)).join('')
      }[lib];
      cells = parMois((c) => fx(f ? f(c) : '0', null, 'eur', 'total'));
    } else if (x && x.mode === 'pct') {
      mode = (+x.pct || 0) + ' % du CA';
      cells = parMois((c) => fx(caRef(c) + '*' + (+x.pct || 0) + '/100', null, 'eur'));
    } else if (x && x.mode === 'pctMois') {
      mode = '% du CA par mois';
      cells = parMois((c, m) => fx(caRef(c) + '*' + (+(x.pcts && x.pcts[m]) || 0) + '/100', null, 'eur'));
    } else if (x && x.mode === 'annual') {
      const an = +x.annual || 0;
      mode = x.allocationKey === 'ca' ? 'annuel ' + Math.round(an) + ' € réparti au CA' : 'annuel ' + Math.round(an) + ' € / 12';
      cells = parMois((c) => fx(x.allocationKey === 'ca' ? 'IF($O$' + (ligneDe["Chiffre d'affaires"] || 4) + '<>0,' + an + '*' + caRef(c) + '/$O$' + (ligneDe["Chiffre d'affaires"] || 4) + ',' + an + '/12)' : an + '/12', null, 'eur'));
    } else {
      mode = x ? 'saisi par mois' : '';
      cells = parMois((c, m) => saisie(r2(amount(a, lib, m)), 'eur'));
    }
    const k = r.type === 'subtotal' ? 'total' : undefined;
    let somaV = 0; try { somaV = r2(ann(a, lib)); } catch (e) { somaV = 0; }
    L.push([k ? C('total', lib) : lib, k ? C('total', mode) : mode].concat(cells, [fx('SUM(C' + n + ':N' + n + ')', null, 'eur', k), soma(somaV, 'eur'), fx('O' + n + '-P' + n, 0, 'eur', 'controle')]));
  });
  return { nom: 'Compte de résultat', largeurs: [46, 26].concat(Array(12).fill(11), [13, 13, 9]), gel: { x: 2, y: 3 }, lignes: L, ligneDe };
}

function feuilleSynthese(a, meta, res, sem, eq) {
  const cr = (lib) => (res.ligneDe[lib] ? Q('Compte de résultat') + '!O' + res.ligneDe[lib] : null);
  const t = hsTot(a);
  const L = [[titre('Budget 2027 — ' + (a.name || 'agence'))],
    [note((meta.version ? 'Version : ' + meta.version + ' · ' : '') + (meta.statut ? 'Statut : ' + meta.statut + ' · ' : '') + 'Export du ' + new Date().toLocaleDateString('fr-FR') + ' depuis SOMA')],
    [],
    ['Indicateur', 'Valeur', 'D\'où vient le chiffre'].map(entete)];
  const kpi = (lib, f, v, fmt, src) => L.push([lib, fx(f, v, fmt), src]);
  if (cr("Chiffre d'affaires")) kpi("Chiffre d'affaires", cr("Chiffre d'affaires"), null, 'eur', 'Compte de résultat');
  if (cr('Charges de personnel')) kpi('Charges de personnel', cr('Charges de personnel'), null, 'eur', 'Compte de résultat (masse salariale + quotes-parts)');
  if (cr("Chiffre d'affaires") && cr('Charges de personnel')) kpi('Charges de personnel / CA', 'IF(' + cr("Chiffre d'affaires") + '<>0,' + cr('Charges de personnel') + '/' + cr("Chiffre d'affaires") + ',0)', null, 'pct', 'Ratio');
  if (cr("EXCEDENT BRUT D'EXPLOITATION")) kpi("Excédent brut d'exploitation", cr("EXCEDENT BRUT D'EXPLOITATION"), null, 'eur', 'Compte de résultat');
  if (cr("RESULTAT D'EXPLOITATION")) kpi("Résultat d'exploitation", cr("RESULTAT D'EXPLOITATION"), null, 'eur', 'Compte de résultat');
  if (cr('RESULTAT NET')) kpi('Résultat net', cr('RESULTAT NET'), null, 'eur', 'Compte de résultat');
  L.push([]);
  kpi('Besoin d\'heures d\'équipage', 'Semaines!G' + sem.total, t.need, 'h', 'Calendrier : CA du jour ÷ TXR');
  kpi('Heures disponibles des roulants', 'Semaines!R' + sem.total, t.av, 'h', 'Contrats − congés − absences − fériés − maladie');
  kpi('Tension moyenne (besoin / disponible)', 'IF(Semaines!R' + sem.total + '>0,Semaines!G' + sem.total + '/Semaines!R' + sem.total + ',0)', null, 'pct', 'Ratio');
  kpi('Heures supplémentaires', 'Semaines!S' + sem.total, t.hs, 'h', 'Somme des semaines (besoin − disponible)');
  kpi('Part des HS à +50 %', 'Semaines!T' + sem.total, null, 'pct', 'Règle des 8 h par salarié présent (ou saisie)');
  kpi('Coût des HS (semaines 2027)', 'Semaines!W' + sem.total, coutHSTotal(a), 'eur', 'HS × coefficient × coût horaire');
  kpi('ETP roulants (contrats)', Q('Équipe') + '!G' + eq.total, null, 'dec2', 'Équipe');
  L.push([]);
  L.push([note('Légende : bleu = hypothèse modifiable · noir = formule · gris = valeur du moteur SOMA · colonnes « Écart » = contrôle (0 attendu tant que les hypothèses ne sont pas modifiées).')]);
  return { nom: 'Synthèse', largeurs: [40, 16, 52], gel: null, lignes: L };
}

// a : agence (objet moteur) ; meta : { version, statut } ; role : rôle de l'utilisateur (vue exploitation des REX)
export function classeurBudgetAgence(a, meta = {}, role) {
  const par = feuilleParametres(a), cal = feuilleCalendrier(a), eq = feuilleEquipe(a), sem = feuilleSemaines(a);
  const ind = feuilleIndemnites(a), ms = feuilleMasseSalariale(a), res = feuilleResultat(a, role, cal, ms);
  const syn = feuilleSynthese(a, meta, res, sem, eq);
  const feuilles = [syn, res, ms, sem, cal, eq, ind, par];
  if (ms.detail) feuilles.splice(3, 0, feuilleDetailMS(ms));
  return { feuilles: feuilles.map(({ nom, largeurs, gel, lignes }) => ({ nom, largeurs, gel, lignes })) };
}

export function nomFichierBudgetAgence(nom) {
  const n = String(nom || 'agence').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return 'SOMA_budget_2027_' + n + '_' + new Date().toISOString().slice(0, 10) + '.xlsx';
}
