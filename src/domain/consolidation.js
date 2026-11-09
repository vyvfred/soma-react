// Consolidation réseau — logique pure extraite de renderConsolidation().
// Prend la map réseau { agence: { statut, data, updatedAt } } et les agences
// opérationnelles ; renvoie les KPI globaux, les lignes détaillées et les alertes.
// Les indicateurs passent par le moteur de calcul (audit nov. 2026) : mêmes chiffres que l'écran de l'agence.

import { hsTot, cpGeneres, cpPlanifies, heuresDispoAnnuelles, partRoulant } from './calculations.js';
import { entiteDepuisBudget } from './consolideSIG.js';
import { avancementBudget } from './avancement.js';

const ROULANTS = ['DEA', 'AA', 'TAXI', 'TPMR'];

export function computeConsolidation(map, ops) {
  const entries = Object.values(map);
  const total = ops.length;
  const budgetsCount = Object.keys(map).length;
  const deposes = entries.filter((e) => e.statut !== 'brouillon').length;
  const valides = entries.filter((e) => e.statut === 'valide_pdg').length;
  const brouillons = entries.filter((e) => e.statut === 'brouillon').length;
  const nonDeposes = total - budgetsCount;
  const enCours = entries.filter((e) => e.statut && e.statut.includes('soumis')).length;

  let caReseauTotal = 0;
  const agencesAtypiques = [];
  const avBrouillons = [], aRelancer = [];

  const rows = ops.map((ag) => {
    const b = map[ag.nom];
    if (!b) return { nom: ag.nom, zone: ag.zone, present: false };

    const d = b.data || {};
    const statut = b.statut || 'brouillon';
    const av = avancementBudget(d, b.updatedAt);
    if (statut === 'brouillon') { avBrouillons.push(av.pct); if (av.joursSansModif !== null && av.joursSansModif >= 7) aRelancer.push(ag.nom); }

    const caB = d.cal && d.cal.length ? d.cal.reduce((s, day) => s + (day.total || 0), 0) : 0;

    let baseH = 0;
    if (d.employees && d.employees.length) {
      baseH = d.employees.filter((e) => ROULANTS.includes(e.qual))
        .reduce((s, e) => s + (+e.hours || 0) *partRoulant(e), 0);
    }
    const txr = +d.targetTXR || 0;
    let ent = null; try { ent = entiteDepuisBudget(ag.nom, d); } catch (e) { ent = null; }
    const caMax = ent ? Math.round(heuresDispoAnnuelles(ent) * txr) : 0;
    const txCharge = caMax > 0 ? Math.round(caB / caMax * 100) : 0;

    // HS annuelles (approximation, reprise verbatim de l'original).
    let hsAnn = 0; try { hsAnn = ent && txr > 0 ? Math.round(hsTot(ent).hs) : 0; } catch (e) { hsAnn = 0; }

    const cpGen = ent ? cpGeneres(ent) : 0;
    const cpPlan = ent ? cpPlanifies(ent) : 0;
    const cpEcart = Math.round((cpGen - cpPlan) * 10) / 10;

    const alertes = [];
    if (!d.costHour) alertes.push({ t: 'warn', m: 'Coût horaire manquant' });
    if (txCharge > 115) alertes.push({ t: 'crit', m: 'CA > capacité max (+15%)' });
    else if (txCharge > 100) alertes.push({ t: 'warn', m: 'CA > capacité (HS requises)' });
    if (Math.abs(cpEcart) > cpGen * 0.1 && cpGen > 0) alertes.push({ t: 'warn', m: 'CP non équilibrés' });
    if (!d.targetTXR) alertes.push({ t: 'info', m: 'TXR non renseigné' });
    if (statut.includes('soumis') && alertes.length > 0) alertes.unshift({ t: 'crit', m: 'Anomalies détectées' });

    if (caB > 0) caReseauTotal += caB;
    if (txCharge > 115) agencesAtypiques.push(ag.nom);

    const dateStr = b.updatedAt ? new Date(b.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '—';

    return { nom: ag.nom, zone: ag.zone, present: true, statut, av, caB, caMax, txCharge, hsAnn, cpGen, cpEcart, alertes, dateStr };
  });

  const avancementMoyen = avBrouillons.length ? Math.round(avBrouillons.reduce((x, y) => x + y, 0) / avBrouillons.length) : null;
  return { total, budgetsCount, deposes, valides, brouillons, nonDeposes, enCours, caReseauTotal, agencesAtypiques, avancementMoyen, aRelancer, rows };
}
