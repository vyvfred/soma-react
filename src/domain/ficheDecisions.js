// Fiche des décisions opérationnelles du REX, lue par le valideur — port fidèle de
// ficheDecisions / ficheDecisionsHTML. Chaque décision est jugée par rapport à une
// référence fiable : médiane réseau, historique de l'agence, absentéisme RH 2026.
// Différence assumée : les médianes réseau portent sur tous les budgets chargés
// (le mono-fichier ne voyait que les agences ouvertes dans la session).
import { ann, isRoulant, hsTot, coutDuChoixREX } from './calculations.js';
import { euro, pct } from './format.js';

const median = (arr) => { const s = arr.slice().sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const nbRoul = (d) => (d.employees || []).filter((e) => isRoulant(e.qual)).length;
const hsAn = (d) => { try { return hsTot(d).hs; } catch (e) { return 0; } };

// autres : données (agences) des autres budgets du réseau
export function ficheDecisions(d, autres = []) {
  const ca = ann(d, "Chiffre d'affaires") || 0;
  const histCA = +d.histCA || 0;
  const targetCA = +d.targetCA || ca || 0;
  const net = ann(d, 'RESULTAT NET') || 0;
  const ms = ann(d, 'Charges de personnel') || 0;
  const tauxMS = ca ? Math.round((ms / ca) * 100) : 0;
  const nbRoulants = nbRoul(d);
  const absRef = d.targetAbsRate !== null && d.targetAbsRate !== undefined && d.targetAbsRate !== '' ? +d.targetAbsRate : null;
  const sick = (d.sick || []).filter((v) => v !== null && v !== undefined);
  const absMoy = sick.length ? sick.reduce((s, v) => s + (+v || 0), 0) / sick.length : null;
  const hsParSalSem = nbRoulants > 0 ? hsAn(d) / nbRoulants / 52 : 0;
  const h50 = (d.hs50 || []).filter((v) => v !== null && v !== undefined);
  const hs50Moy = h50.length ? h50.reduce((s, v) => s + (+v || 0), 0) / h50.length : 0;
  let choix = null; try { choix = coutDuChoixREX(d); } catch (e) { /* données incomplètes */ }
  const croissance = histCA > 0 ? ((targetCA - histCA) / histCA) * 100 : null;

  const croissances = [], hsSals = [];
  autres.forEach((a) => {
    if (!a || !a.cal || !a.cal.length) return;
    const aCA = ann(a, "Chiffre d'affaires") || 0, aHist = +a.histCA || 0;
    if (aHist > 0 && aCA > 0) croissances.push(((aCA - aHist) / aHist) * 100);
    const r = nbRoul(a);
    if (r > 0) hsSals.push(hsAn(a) / r / 52);
  });
  return {
    ca, histCA, targetCA, net, tauxMS, nbRoulants, croissance,
    medCroissance: croissances.length ? median(croissances) : null,
    absRef, absMoy, hsParSalSem, medHSsal: hsSals.length ? median(hsSals) : null, hs50Moy, choix,
    activites: [d.actSan !== false ? 'sanitaire' : null, d.actSai ? 'saisonnier' : null, d.actTP ? 'transport de personnes' : null].filter(Boolean)
  };
}

// Lignes de la fiche : { titre, valeur (HTML), verdict, type: ok|warn|choix|neutre }
export function lignesFiche(f) {
  const l = [];
  let caVerdict = '';
  if (f.croissance !== null && f.medCroissance !== null) caVerdict = 'Croissance vs 2026 ; médiane réseau : ' + (f.medCroissance >= 0 ? '+' : '') + f.medCroissance.toFixed(1) + '%';
  else if (f.croissance !== null) caVerdict = 'Croissance par rapport à son réalisé 2026';
  l.push({ titre: 'Ambition commerciale', valeur: 'Vise ' + (f.croissance !== null ? (f.croissance >= 0 ? '+' : '') + f.croissance.toFixed(1) + '% ' : '') + '(' + euro(f.targetCA) + ')', verdict: caVerdict, type: 'neutre' });
  l.push({ titre: 'Effectif', valeur: '<b>' + f.nbRoulants + '</b> salariés roulants intégrés', verdict: 'Mis en regard de la hausse de CA visée', type: 'neutre' });
  if (f.absMoy !== null) {
    let verdict = '', type = 'neutre';
    if (f.absRef !== null) {
      const e = f.absMoy - f.absRef;
      if (e < -0.3) { verdict = 'Optimiste : l\'absentéisme maladie + AT 2026 (service RH) était de ' + pct(f.absRef); type = 'warn'; }
      else if (e > 0.3) { verdict = 'Prudent : supérieur à l\'absentéisme maladie + AT 2026 (service RH) de ' + pct(f.absRef); type = 'ok'; }
      else { verdict = 'Conforme à l\'absentéisme maladie + AT 2026 (service RH) : ' + pct(f.absRef); type = 'ok'; }
    }
    l.push({ titre: 'Absentéisme maladie', valeur: 'Table sur <b>' + pct(f.absMoy) + '</b>', verdict, type });
  }
  l.push({ titre: 'Heures supplémentaires', valeur: '<b>' + f.hsParSalSem.toFixed(1) + ' h</b>/semaine par salarié roulant', verdict: f.medHSsal !== null ? 'Médiane réseau : ' + f.medHSsal.toFixed(1) + ' h/semaine' : '', type: 'neutre' });
  if (f.hs50Moy > 0) l.push({ titre: 'Structure des HS', valeur: '<b>' + pct(f.hs50Moy) + '</b> des heures à +50%', verdict: 'Cette part augmente le coût moyen des heures supplémentaires', type: 'warn' });
  else l.push({ titre: 'Structure des HS', valeur: 'Toutes les heures à +25%', verdict: 'Répartition saine, pas de bascule dans les heures chères', type: 'ok' });
  if (f.choix && f.choix.mesurable && f.choix.surcout > 0) l.push({ titre: 'Arbitrage social', valeur: 'Congés déplacés hors optimum · surcoût <b>' + euro(f.choix.surcout) + '</b>', verdict: 'Choix humain assumé, à valider', type: 'choix' });
  return l;
}
