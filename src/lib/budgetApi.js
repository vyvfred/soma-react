import { sb } from './supabase.js';
import { agencyFromRow, parseBudgetRow, buildBudgetData, budgetData as budgetDataOf } from '../domain/budgetMapper.js';
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
    return { agency: null, statut: 'brouillon', budgetId: null, meta: null, activeVersion: 'v1' };
  }

  const parsed = parseBudgetRow(data);
  return {
    agency: agencyFromRow(data),
    statut: data.statut,
    budgetId: data.id,
    meta: parsed.meta,
    activeVersion: parsed.activeVersion
  };
}

// Sauvegarde le budget. Reproduit saveBudgetToSupabase :
//   - recharge les versions existantes pour ne pas les écraser,
//   - écrit la version active,
//   - update si le budget existe, insert sinon.
// Retourne l'identifiant du budget (nouveau en cas d'insert).
export async function saveAgencyBudget({ budgetId, activeVersion, meta, statut, agency }) {
  let existingData = null;
  if (budgetId) {
    const { data: existing } = await sb.from('budgets').select('data').eq('id', budgetId).single();
    existingData = (existing && existing.data) || null;
  }

  const fullData = buildBudgetData(existingData, activeVersion, meta, agency);

  if (budgetId) {
    const { error } = await sb.from('budgets').update({ data: fullData, statut }).eq('id', budgetId);
    if (error) throw error;
    return budgetId;
  }

  const payload = { agence: agency.name, annee: ANNEE, data: fullData, statut };
  const { data, error } = await sb.from('budgets').insert(payload).select().single();
  if (error) throw error;
  return data.id;
}

// Charge tous les budgets du réseau (vue CG/direction) et renvoie une map
// indexée par nom d'agence : { agence: { statut, data } } où data est la version
// affichée. Reproduit le chargement de renderCgDash.
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

  const { error } = await sb.from('budgets').update({ data, statut: nouveauStatut }).eq('id', rec.id);
  if (error) throw error;
  return res;
}

// Enregistre les données de référence CG par agence — reproduit saveRefAgences.
// refMap : { agence: { histCA2025, histCA, histTXR2026, targetAbsRate,
//   tauxHoraireBrut, tauxChargePatronal, costHour? } }. Pour chaque agence :
// fusionne dans les données existantes (racine) avec cgLocked=true, ou crée le budget.
export async function saveReferenceData(refMap) {
  let count = 0;
  for (const [nom, ref] of Object.entries(refMap)) {
    const data = { ...ref };
    if (!data.costHour && data.tauxHoraireBrut && data.tauxChargePatronal) {
      data.costHour = Math.round(+data.tauxHoraireBrut * (1 + +data.tauxChargePatronal / 100) * 100) / 100;
    }
    const { data: existing } = await sb.from('budgets').select('id,data').eq('agence', nom).eq('annee', ANNEE).single();
    if (existing) {
      const merged = { ...existing.data, ...data, cgLocked: true };
      const { error } = await sb.from('budgets').update({ data: merged }).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await sb.from('budgets').insert({ agence: nom, annee: ANNEE, data: { ...data, cgLocked: true }, statut: 'brouillon' });
      if (error) throw error;
    }
    count++;
  }
  return count;
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
