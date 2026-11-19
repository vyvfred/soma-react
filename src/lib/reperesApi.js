import { sb } from './supabase.js';
import { agregerReseau, AGENCE_RESEAU } from '../domain/reperes.js';

// Repères du tableau de bord du contrôle de gestion, table « reperes » : une ligne par agence et par exercice
// (2026 : réalisé des mois clos + estimation ; 2025 : exercice complet). « __RESEAU__ » = moyenne du réseau.
// Lecture : CG, DF, DG, PDG, admin ; DR pour sa région ; REX pour son agence ; moyenne du réseau pour tous.
// Écriture : CG et admin.

// { agence: { ...ligne 2026, histo: { 2025: ligne 2025 } } }
function assembler(rows) {
  const map = {};
  (rows || []).forEach((x) => {
    const d = { ...(x.data || {}), majLe: x.updated_at };
    const cur = map[x.agence] || (map[x.agence] = { histo: {} });
    if (x.annee === 2026) Object.assign(cur, d, { histo: cur.histo });
    else cur.histo[x.annee] = d;
  });
  return map;
}

export async function chargerReperes(agence) {
  let req = sb.from('reperes').select('agence,annee,data,updated_at');
  if (agence) req = req.in('agence', [agence, AGENCE_RESEAU]);
  const { data, error } = await req;
  if (error) return {};
  return assembler(data);
}

async function ecrireRepere(agence, annee, data, remplacer) {
  const { data: ex } = await sb.from('reperes').select('agence,data').eq('agence', agence).eq('annee', annee).maybeSingle();
  const d = remplacer ? data : { ...((ex && ex.data) || {}), ...data };
  if (ex) return sb.from('reperes').update({ data: d, updated_at: new Date().toISOString() }).eq('agence', agence).eq('annee', annee);
  return sb.from('reperes').insert({ agence, annee, data: d, updated_at: new Date().toISOString() });
}

// Recalcule la moyenne du réseau d'un exercice à partir des lignes des agences
async function majReseau(annee) {
  const { data } = await sb.from('reperes').select('agence,data').eq('annee', annee);
  const rows = {}; (data || []).forEach((x) => { if (x.agence !== AGENCE_RESEAU) rows[x.agence] = x.data; });
  return ecrireRepere(AGENCE_RESEAU, annee, agregerReseau(rows), true);
}

// Import d'un classeur (exercice 2026 ou 2025) : remplace réalisé, budget et année précédente ;
// l'estimation des derniers mois saisie par le CG est conservée.
export async function enregistrerImportTDB(parAgence, nomFichier, annee = 2026) {
  let ok = 0; const echecs = [];
  for (const agence of Object.keys(parAgence)) {
    const res = await ecrireRepere(agence, annee, { ...parAgence[agence], fichier: nomFichier || null, importeLe: new Date().toISOString() });
    if (res && res.error) echecs.push(agence); else ok++;
  }
  await majReseau(annee);
  return { ok, echecs };
}

// Estimation des mois non clos de 2026 par le CG : { ca: [12], ext: [12], perso: [12], rex: [12] }
export async function enregistrerEstimation(agence, estim) {
  const res = await ecrireRepere(agence, 2026, { estim, estimeLe: new Date().toISOString() });
  await majReseau(2026);
  return !(res && res.error);
}
