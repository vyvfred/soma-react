import { sb, ecrire } from './supabase.js';
import { agencyFromRow, parseBudgetRow, buildBudgetData, migrateAgency, budgetData as budgetDataOf } from '../domain/budgetMapper.js';
import { agency } from '../domain/calculations.js';
import { donneesSoumission } from '../domain/versions.js';
import { AGENCES } from '../config/agences.js';
import { fusionnerRefCG, appliquerRefCG, CG_KEYS_SANS_VERROU } from '../domain/refCG.js';
import { fusionnerEquipe } from '../domain/imports.js';
import { ensureValidation as ensureValidationEngine, appliquerDecision as appliquerDecisionEngine } from '../domain/validationEngine.js';

// Couche d'accès aux données budget.
// Lecture : reproduit la requête de loadBudgetFromSupabase().
// Écriture : reproduit saveBudgetToSupabase() (préserve les autres versions).
// La transformation des objets est déléguée à la couche de mapping pure.

const ANNEE = 2027;

// Charge le budget d'une agence. Retourne l'objet agence prêt pour le calcul,
// plus les métadonnées nécessaires à une sauvegarde ultérieure.
export async function loadAgencyBudget(agenceNom) {
  const { data, error } = await sb
    .from('budgets')
    .select('*')
    .eq('agence', agenceNom)
    .eq('annee', ANNEE)
    .single();

  // PGRST116 = aucune ligne (budget pas encore créé) : cas normal.
  if (error && error.code !== 'PGRST116') throw error;
  if (!data) {
    // Budget pas encore créé : on part d'une agence vierge (comme la version mono-fichier) ;
    // la première modification crée la ligne en base.
    const neuve = migrateAgency(agency(agenceNom));
    const ref = AGENCES.find((x) => x.nom === agenceNom);
    if (ref) neuve.schoolZone = ref.zone || 'B';
    await reprendreRatioReseau(neuve);
    return { agency: neuve, statut: 'brouillon', budgetId: null, meta: null, activeVersion: 'v1', data: null, validation: null };
  }

  const parsed = parseBudgetRow(data);
  const a = agencyFromRow(data);
  await reprendreRatioReseau(a);
  return {
    agency: a,
    statut: data.statut,
    budgetId: data.id,
    meta: parsed.meta,
    activeVersion: parsed.activeVersion,
    data: data.data || null,
    validation: parsed.validation
  };
}

// Lit le jsonb `data` d'un budget (versions, meta, validation)
export async function loadBudgetData(budgetId) {
  const { data, error } = await sb.from('budgets').select('data,statut').eq('id', budgetId).single();
  if (error) throw error;
  return { data: (data && data.data) || {}, statut: data && data.statut };
}

// Réécrit le jsonb `data` d'un budget (changement de version, duplication, description)
export async function writeBudgetData(budgetId, data, statut) {
  const patch = statut ? { data, statut } : { data };
  const { error } = await ecrire(sb.from('budgets').update(patch).eq('id', budgetId));
  if (error) throw error;
}

// Soumission au circuit de validation (port de soumettreBudget) : la version donnée
// devient la version soumise, un nouveau cycle de validation démarre (historique conservé).
export async function submitBudget(budgetId, version, parNom) {
  const { data } = await loadBudgetData(budgetId);
  const d = donneesSoumission(data, version, parNom);
  await writeBudgetData(budgetId, d, 'soumis_dr');
  return d;
}

// Ratio de maintien de salaire : paramètre réseau. Une agence qui ne l'a pas encore
// (budget créé après l'enregistrement des Données agences) reprend celui du réseau.
export async function reprendreRatioReseau(a) {
  if (!a || (a.ratioMaintien !== null && a.ratioMaintien !== undefined && a.ratioMaintien !== '')) return;
  try {
    const { data } = await sb.from('budgets').select('data').eq('annee', ANNEE);
    const rm = (data || []).map((b) => budgetDataOf(b.data).ratioMaintien)
      .find((v) => v !== null && v !== undefined && v !== '');
    if (rm !== undefined) a.ratioMaintien = rm;
  } catch (e) { /* sans réseau : le ratio reste vide, signalé au CG */ }
}

// Sauvegarde le budget. Reproduit saveBudgetToSupabase :
//   - recharge les versions existantes pour ne pas les écraser,
//   - écrit la version active,
//   - update si le budget existe, insert sinon.
// Retourne l'identifiant du budget (nouveau en cas d'insert).
// Enregistre la version active SANS écraser le travail des autres (fusion par rubrique, cf. fusion.js)
// et SANS réécrire le statut : seules la soumission, les décisions et l'admin changent le statut.
// Renvoie { id, version (fusionnée), meta, distantes (rubriques modifiées par d'autres) }.
export async function saveAgencyBudget({ budgetId, activeVersion, meta, agency, base = null, metaBase = null }) {
  let existingData = null;
  if (budgetId) {
    const { data: existing } = await sb.from('budgets').select('data').eq('id', budgetId).single();
    existingData = (existing && existing.data) || null;
  }

  const fullData = buildBudgetData(existingData, activeVersion, meta, agency, base, metaBase);
  const info = fullData._fusion;

  if (budgetId) {
    const { error } = await ecrire(sb.from('budgets').update({ data: fullData }).eq('id', budgetId));
    if (error) throw error;
    return { id: budgetId, ...info };
  }

  const payload = { agence: agency.name, annee: ANNEE, data: fullData, statut: 'brouillon' };
  const { data, error } = await sb.from('budgets').insert(payload).select().single();
  if (error) throw error;
  return { id: data.id, ...info };
}

// Charge tous les budgets du réseau (vue CG/direction) et renvoie une map
// indexée par nom d'agence : { agence: { statut, data } } où data est la version
// affichée. Reproduit le chargement de renderCgDash.
// Agences de la région d'un DR (noms)
export async function loadAgencesRegion(regionId) {
  if (!regionId) return [];
  const { data, error } = await sb.from('agences').select('nom').eq('region_id', regionId);
  if (error) throw error;
  return (data || []).map((a) => a.nom);
}

export async function loadNetworkBudgets() {
  const { data, error } = await sb
    .from('budgets')
    .select('agence,statut,data,updated_at')
    .eq('annee', ANNEE);
  if (error) throw error;
  const map = {};
  (data || []).forEach((b) => { map[b.agence] = { statut: b.statut, data: budgetDataOf(b.data), updatedAt: b.updated_at }; });
  return map;
}

// Charge les budgets pertinents pour la validation, selon le rôle.
// DR : uniquement les agences de sa région. Autres validateurs : tous les budgets
// (le filtrage « en attente de moi » se fait ensuite via le moteur de validation).
// Renvoie les lignes complètes (data.validation conservé, contrairement à la map réseau).
export async function loadBudgetsForValidation(profile) {
  let agenceNames = null;
  if (profile.role === 'dr') {
    if (!profile.region_id) return { budgets: [], noRegion: true };
    const { data: ags } = await sb.from('agences').select('nom').eq('region_id', profile.region_id);
    agenceNames = (ags || []).map((a) => a.nom);
    if (!agenceNames.length) return { budgets: [], noRegion: true };
  }

  let query = sb.from('budgets').select('id,agence,statut,data,updated_at').eq('annee', ANNEE);
  if (agenceNames) query = query.in('agence', agenceNames);
  const { data, error } = await query;
  if (error) throw error;
  return { budgets: data || [], noRegion: false };
}

// Enregistre une décision de validation. Reproduit fidèlement deciderBudget :
//   - recharge le budget frais (évite les conflits),
//   - applique la transition via le moteur pur (appliquerDecision),
//   - écrit data.validation + le nouveau statut.
// Renvoie le résultat du moteur ({ ok, message, refus?, definitif?, ... }).
// N'effectue AUCUNE écriture si le moteur refuse la décision (res.ok === false).
export async function submitDecision({ agence, role, decision, commentaire, parNom }) {
  const { data: rec, error: readErr } = await sb
    .from('budgets').select('id,data').eq('agence', agence).eq('annee', ANNEE).single();
  if (readErr || !rec) throw new Error('Budget introuvable.');

  const data = rec.data || {};
  const v = ensureValidationEngine(data.validation);
  const res = appliquerDecisionEngine(v, role, decision, commentaire, parNom);
  if (!res.ok) return res; // décision invalide : rien n'est écrit

  data.validation = res.validation;
  if (res.refus) data.validation.statut = 'refuse';
  const nouveauStatut = res.refus ? 'brouillon' : (res.definitif ? 'valide_pdg' : 'soumis');

  const { error } = await ecrire(sb.from('budgets').update({ data, statut: nouveauStatut }).eq('id', rec.id));
  if (error) throw error;
  return res;
}

// Enregistre des données CG par agence (Données agences, variables de décembre 2026).
// saisies : { agence: { champ: valeur } } — uniquement les champs saisis par le CG.
// ratioReseau (facultatif) : ratio de maintien de salaire, recopié dans toutes les
// agences qui ont déjà un budget. Écrit dans la version lue par le REX (voir refCG.js).
// Renvoie { count, echecs, ecrits: { agence: données appliquées } }.
export async function saveCgData(saisies, ratioReseau = null) {
  const noms = new Set(Object.keys(saisies));
  if (ratioReseau !== null) {
    const { data: tous } = await sb.from('budgets').select('agence').eq('annee', ANNEE);
    (tous || []).forEach((b) => noms.add(b.agence));
  }
  let count = 0;
  const echecs = [], ecrits = {};
  for (const nom of noms) {
    const data = { ...(saisies[nom] || {}) };
    if (ratioReseau !== null) data.ratioMaintien = Math.max(0, Math.min(100, ratioReseau));
    if (!Object.keys(data).length) continue;
    const { data: existing } = await sb.from('budgets').select('id,data').eq('agence', nom).eq('annee', ANNEE).single();
    let res;
    if (existing) {
      res = await ecrire(sb.from('budgets').update({ data: fusionnerRefCG(existing.data, data) }).eq('id', existing.id));
    } else if (Object.keys(data).some((k) => CG_KEYS_SANS_VERROU.indexOf(k) < 0 || k.startsWith('variablesDec'))) {
      // Pas de ligne vide pour le seul ratio réseau : il est repris à l'ouverture (reprendreRatioReseau)
      res = await sb.from('budgets').insert({ agence: nom, annee: ANNEE, data: appliquerRefCG({}, data), statut: 'brouillon' });
    } else {
      continue;
    }
    if (res && res.error) { echecs.push(nom); continue; }
    ecrits[nom] = data;
    count++;
  }
  return { count, echecs, ecrits };
}

// Enregistre les équipes issues de l'import du registre RH.
// parAgence : { agence: employees[] }. Un budget que le REX a déjà ouvert garde son
// équipe si elle est construite (voir domain/imports.js › fusionnerEquipe).
// Renvoie { count, totalSal, gardees, echecs, ecrites: { agence: employees } }.
export async function saveEquipesImportees(parAgence) {
  let count = 0, totalSal = 0;
  const gardees = [], echecs = [], ecrites = {};
  for (const [nom, employees] of Object.entries(parAgence)) {
    const { data: existing } = await sb.from('budgets').select('id,data').eq('agence', nom).eq('annee', ANNEE).single();
    let res;
    if (existing) {
      const { data, remplace } = fusionnerEquipe(existing.data, employees);
      if (!remplace) { gardees.push(nom); continue; }
      res = await ecrire(sb.from('budgets').update({ data }).eq('id', existing.id));
    } else {
      res = await sb.from('budgets').insert({ agence: nom, annee: ANNEE, data: { employees }, statut: 'brouillon' });
    }
    if (res && res.error) { echecs.push(nom); continue; }
    ecrites[nom] = employees;
    count++; totalSal += employees.length;
  }
  return { count, totalSal, gardees, echecs, ecrites };
}

// Ancien nom conservé pour compatibilité : n'envoie que les champs fournis.
export async function saveReferenceData(refMap) {
  const r = await saveCgData(refMap);
  return r.count;
}

// ── Affectation DR ──────────────────────────────────────────────
// Charge les données nécessaires à l'écran d'affectation.
export async function loadAffectationData() {
  const [{ data: drs }, { data: agData }, { data: regions }] = await Promise.all([
    sb.from('profiles').select('id,nom,region_id').eq('role', 'dr'),
    sb.from('agences').select('nom,region_id'),
    sb.from('regions').select('id,nom')
  ]);
  const agMap = {};
  (agData || []).forEach((a) => { agMap[a.nom] = a.region_id; });
  return { drs: drs || [], agMap, regions: regions || [] };
}

// Affecte (ou retire) un DR à une agence via la fonction serveur autorisée affecter_dr.
// (Le SQL de cette fonction doit avoir été déployé dans Supabase.)
export async function affecterDR(agence, drUserId) {
  const { error } = await sb.rpc('affecter_dr', { p_agence: agence, p_dr: drUserId || null });
  if (error) throw error;
}

// Budgets 2027 bruts (id, agence, statut, data tel que stocké) — classeur des charges
export async function loadBudgetsBruts() {
  const { data, error } = await sb.from('budgets').select('id,agence,statut,data').eq('annee', ANNEE);
  if (error) throw error;
  return data || [];
}

// Écrit les charges importées : relecture de chaque budget juste avant l'écriture,
// seules les lignes de charges changent ; création d'un brouillon si le budget n'existe pas.
export async function ecrireChargesImportees(noms, lignes, appliquer) {
  const ok = [], ko = [];
  for (const nom of noms) {
    try {
      const { data: b, error } = await sb.from('budgets').select('id,data').eq('agence', nom).eq('annee', ANNEE).maybeSingle();
      if (error) throw error;
      if (b) await ecrire(sb.from('budgets').update({ data: appliquer(b.data, lignes[nom]).data, updated_at: new Date().toISOString() }).eq('id', b.id));
      else await ecrire(sb.from('budgets').insert({ agence: nom, annee: ANNEE, data: appliquer({}, lignes[nom]).data, statut: 'brouillon' }));
      ok.push(nom);
    } catch (e) { ko.push(nom + ' (' + (e.message || e) + ')'); }
  }
  return { ok, ko };
}
