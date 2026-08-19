// Couche de mapping budget ⇄ Supabase.
// Reproduit fidèlement loadBudgetFromSupabase() et saveBudgetToSupabase() de
// l'application actuelle, mais sous forme de fonctions PURES et testables :
// pas d'accès réseau ici — on transforme des objets.
//
// Modèle de données réel (table `budgets`) :
//   { id, agence, annee, statut, data, updated_at }
// où `data` (jsonb) est soit versionné { meta, versions:{v1,v2,v3}, validation },
// soit « plat » (ancien format) = les champs de l'agence directement.

import { agency, refs, buildPeriodesPaie, T } from './calculations.js';

const DEFAULT_META = () => ({
  activeVersion: 'v1',
  submittedVersion: null,
  descriptions: { v1: '', v2: '', v3: '' }
});

// ── Lecture : ligne DB -> métadonnées + données de version ──────────
export function parseBudgetRow(row) {
  const d = (row && row.data) || {};
  const validation = d.validation || null;
  let meta, activeVersion, versionData;

  if (d.versions) {
    meta = d.meta || DEFAULT_META();
    if (!meta.descriptions) meta.descriptions = { v1: '', v2: '', v3: '' };
    activeVersion = meta.activeVersion || 'v1';
    versionData = d.versions[activeVersion] || d.versions.v1 || {};
  } else {
    versionData = d;
    activeVersion = 'v1';
    meta = DEFAULT_META();
  }

  return {
    budgetId: row ? row.id : null,
    statut: row ? row.statut : 'brouillon',
    meta,
    activeVersion,
    versionData,
    validation
  };
}

// ── Reconstruction de l'objet agence à partir d'une ligne DB ────────
export function agencyFromRow(row) {
  const name = row.agence;
  const { versionData } = parseBudgetRow(row);

  if (versionData && Object.keys(versionData).length) {
    const a = { ...agency(name), ...versionData, name };
    migrateAgency(a);
    return a;
  }

  // Budget vide : pré-remplir les données de référence CG si présentes.
  const a = agency(name);
  const ref = (row && row.data) || {};
  if (ref.histCA2025) a.histCA2025 = ref.histCA2025;
  if (ref.histCA) a.histCA = ref.histCA;
  if (ref.histTXR2026) {
    a.histTXR2026 = ref.histTXR2026;
    a.histTXR = ref.histTXR2026;
    a.targetTXR = ref.histTXR2026;
  }
  if (ref.targetAbsRate) {
    a.targetAbsRate = ref.targetAbsRate;
    a.sick = Array(12).fill(ref.targetAbsRate);
  }
  return a;
}

// ── Écriture : agence -> jsonb `data` (préserve les autres versions) ─
export function buildBudgetData(existingData, activeVersion, meta, a) {
  const versions = existingData && existingData.versions ? { ...existingData.versions } : {};
  const aClean = JSON.parse(JSON.stringify(a));
  delete aClean.versions;
  delete aClean.meta;
  versions[activeVersion] = aClean;
  return { versions, meta };
}

// ── Migration d'une agence (port fidèle du corps de migrateState) ───
export function migrateAgency(a) {
  if (!a.refs || typeof a.refs !== 'object') a.refs = { san: refs(), sai: refs(), tp: refs() };
  ['san', 'sai', 'tp'].forEach((k) => {
    if (!Array.isArray(a.refs[k]) || a.refs[k].length !== 12) a.refs[k] = refs();
    a.refs[k].forEach((mo, i) => {
      if (!mo || typeof mo !== 'object') a.refs[k][i] = { semaine: null, vacances: null, samedi: null, dimanche: null, ferie: null };
      else ['semaine', 'vacances', 'samedi', 'dimanche', 'ferie'].forEach((t) => { if (!(t in mo)) mo[t] = null; });
    });
  });
  if (!Array.isArray(a.cal)) a.cal = [];
  if (!Array.isArray(a.hs50)) a.hs50 = Array(12).fill(null);
  if (a.drCostAnnual === undefined) a.drCostAnnual = 0;
  if (a.tauxHoraireBrut === undefined) a.tauxHoraireBrut = null;
  if (a.tauxChargePatronal === undefined) a.tauxChargePatronal = null;
  if (a.tauxHoraireBrut !== null && a.tauxChargePatronal !== null && a.costHour === null) {
    a.costHour = Math.round(+a.tauxHoraireBrut * (1 + (+a.tauxChargePatronal || 0) / 100) * 100) / 100;
  }
  if (!a.moisVerrouilles) a.moisVerrouilles = [];
  if (a.cgLocked === undefined) a.cgLocked = false;
  if (a.tauxAbsImproductif === undefined) a.tauxAbsImproductif = null;
  if (!a.hsImproductif) a.hsImproductif = {};
  if (!a.repasRoulant) a.repasRoulant = {};
  if (!a.repasNonRoulant) a.repasNonRoulant = {};
  if (!a.idjfRoulant) a.idjfRoulant = {};
  if (!a.idjfNonRoulant) a.idjfNonRoulant = {};
  if (!a.periodesPaie) a.periodesPaie = buildPeriodesPaie();
  if (a.variablesDec2026 === undefined) a.variablesDec2026 = null;
  if (a.moisActif === undefined) a.moisActif = null;
  if (a.actSan === undefined) a.actSan = true;
  if (a.actSai === undefined) a.actSai = false;
  if (a.actTP === undefined) a.actTP = false;
  if (a.drPct === undefined) a.drPct = 0;
  a.employees = (a.employees || []).map((e) => ({
    qual: e.qual || 'DEA', hoursM: e.hoursM || 0, hsTarget: e.hsTarget || 0,
    pctRoulant: e.pctRoulant !== undefined ? e.pctRoulant : 100,
    joursSem: e.joursSem || 5, coutJour: e.coutJour || 0, ...e
  }));
  if (!a.sick) a.sick = Array(12).fill(+a.targetAbsRate || 5);
  if (!a.presence) a.presence = {};
  if (!a.employees) a.employees = [];
  if (!a.rex) a.rex = {};
  T.forEach((r) => {
    if (r.type !== 'subtotal' && !a.rex[r.label]) {
      a.rex[r.label] = {
        values: Array(12).fill(null),
        mode: r.label === 'Carburant' ? 'annual' : 'month',
        chargeType: r.type === 'charge' ? 'variable' : 'fixe',
        allocationKey: r.label === 'Carburant' ? 'ca' : 'monthly12',
        pct: r.label === 'Carburant' ? 5.2 : 0, annual: 0
      };
    }
    if (a.rex[r.label]) {
      const x = a.rex[r.label];
      if (!x.values) x.values = Array(12).fill(null);
      if (!x.mode) x.mode = 'month';
      if (!x.allocationKey) x.allocationKey = 'monthly12';
      if (!x.chargeType) x.chargeType = r.type === 'charge' ? 'variable' : 'fixe';
    }
  });
  return a;
}

// Extraction de la version affichée pour les vues réseau (CG/DR) — port fidèle
// de budgetData(). Diffère de parseBudgetRow : privilégie la version SOUMISE.
export function budgetData(d) {
  if (!d) return {};
  if (d.versions) {
    const meta = d.meta || {};
    const v = meta.submittedVersion || meta.activeVersion || 'v1';
    return d.versions[v] || d.versions.v1 || {};
  }
  return d;
}
