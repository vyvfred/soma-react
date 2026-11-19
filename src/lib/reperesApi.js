import { sb } from './supabase.js';

// Repères 2026 (tableau de bord du contrôle de gestion), table « reperes » : une ligne par agence.
// Lecture : CG, DF, DG, PDG, admin ; DR pour sa région ; REX pour son agence (règles de la base).
// Écriture : CG et admin.
const ANNEE_REPERES = 2026;

export async function chargerReperes(agence) {
  let req = sb.from('reperes').select('agence,data,updated_at').eq('annee', ANNEE_REPERES);
  if (agence) req = req.eq('agence', agence);
  const { data, error } = await req;
  if (error) return {};
  const map = {};
  (data || []).forEach((x) => { map[x.agence] = { ...(x.data || {}), majLe: x.updated_at }; });
  return map;
}

async function ecrireRepere(agence, data) {
  const { data: ex } = await sb.from('reperes').select('agence,data').eq('agence', agence).eq('annee', ANNEE_REPERES).maybeSingle();
  if (ex) return sb.from('reperes').update({ data: { ...(ex.data || {}), ...data }, updated_at: new Date().toISOString() }).eq('agence', agence).eq('annee', ANNEE_REPERES);
  return sb.from('reperes').insert({ agence, annee: ANNEE_REPERES, data, updated_at: new Date().toISOString() });
}

// Import du tableau de bord : remplace réalisé, budget et 2025 ; l'estimation des derniers mois saisie par le CG est conservée.
export async function enregistrerImportTDB(parAgence, nomFichier) {
  let ok = 0; const echecs = [];
  for (const agence of Object.keys(parAgence)) {
    const res = await ecrireRepere(agence, { ...parAgence[agence], fichier: nomFichier || null, importeLe: new Date().toISOString() });
    if (res && res.error) echecs.push(agence); else ok++;
  }
  return { ok, echecs };
}

// Estimation des mois non clos par le CG : { ca: [12], ext: [12], perso: [12], rex: [12] }
export async function enregistrerEstimation(agence, estim) {
  const res = await ecrireRepere(agence, { estim, estimeLe: new Date().toISOString() });
  return !(res && res.error);
}
