// Avancement de la construction d'un budget d'agence (vu par la chaîne de validation) —
// même règle que avancementBudget() de la version mono-fichier.
// Six jalons du REX à parts égales : objectif fixé, références CA, équipe, absentéisme
// mensuel, mois validés, postes de charges du REX. Les charges CG sont suivies à part (elles relèvent du CG).
import { contexteRedige } from './contexte.js';
import { T, LIGNES_SIEGE, chargesREXRemplies, LIGNES_CHARGES_REX } from './calculations.js';

const rempli = (v) => v !== null && v !== undefined && v !== '';

export function avancementBudget(d, updatedAt, maintenant = Date.now()) {
  d = d || {};
  const refs = d.refs || {}, acts = ['san'];
  if (d.actSai) acts.push('sai');
  if (d.actTP) acts.push('tp');
  let refTot = 0, refOk = 0;
  acts.forEach((act) => { for (let m = 0; m < 12; m++) ['semaine', 'vacances', 'samedi', 'dimanche', 'ferie'].forEach((t) => {
    refTot++; const mo = refs[act] && refs[act][m]; if (mo && rempli(mo[t])) refOk++;
  }); });
  const objectif = rempli(d.targetCA) && rempli(d.targetTXR) && contexteRedige(d); // contexte 2027 rédigé, objectif et TXR fixés
  const refsPct = refTot ? Math.round(refOk / refTot * 100) : 0;
  const nbSalaries = (d.employees || []).length;
  const absSaisis = (d.sick || []).filter(rempli).length;
  const moisValides = (d.moisVerrouilles || []).length;
  const cgLignes = T.filter((r) => r.type !== 'subtotal' && r.label !== "Chiffre d'affaires" && r.label !== 'Charges de personnel' && LIGNES_SIEGE.indexOf(r.label) < 0 && r.label !== 'Quote-part régulation mutualisée');
  const cgOk = cgLignes.filter((r) => {
    const x = d.rex && d.rex[r.label]; if (!x) return false;
    return x.mode === 'annual' ? rempli(x.annual) && +x.annual !== 0 : x.mode === 'pct' ? rempli(x.pct) && +x.pct !== 0 : x.mode === 'pctMois' ? (x.pcts || []).some((v) => rempli(v) && +v !== 0) : (x.values || []).some((v) => rempli(v) && +v !== 0);
  }).length;
  const chargesREX = d.rex ? chargesREXRemplies(d) : 0;
  const pct = Math.round(((objectif ? 1 : 0) + refsPct / 100 + (nbSalaries ? 1 : 0) + absSaisis / 12 + moisValides / 12 + chargesREX / LIGNES_CHARGES_REX.length) / 6 * 100);
  const joursSansModif = updatedAt ? Math.floor((maintenant - new Date(updatedAt).getTime()) / 86400000) : null;
  return { pct, objectif, refsPct, nbSalaries, absSaisis, moisValides, chargesREX, chargesPct: cgLignes.length ? Math.round(cgOk / cgLignes.length * 100) : 0, joursSansModif };
}

export function detailAvancement(av) {
  return 'Objectif : ' + (av.objectif ? 'fixé' : 'à fixer') + '\nRéférences CA : ' + av.refsPct + ' %\nÉquipe : ' + av.nbSalaries + ' salarié' + (av.nbSalaries > 1 ? 's' : '')
    + '\nAbsentéisme saisi : ' + av.absSaisis + '/12 mois\nMois validés : ' + av.moisValides + '/12\nCharges REX : ' + (av.chargesREX || 0) + '/6 postes\nCharges CG : ' + av.chargesPct + ' %';
}
