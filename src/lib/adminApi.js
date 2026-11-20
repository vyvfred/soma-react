import { createClient } from '@supabase/supabase-js';
import { sb, ecrire, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, URL_APPLI } from './supabase.js';
import { budgetData } from '../domain/budgetMapper.js';

const ANNEE = 2027;
const DEFAULT_PASSWORD = 'vyvFred01!';

// Charge les utilisateurs (profils) et les budgets pour l'écran admin.
export async function loadAdminData() {
  const [{ data: users }, { data: budgets }] = await Promise.all([
    sb.from('profiles').select('*').order('nom'),
    sb.from('budgets').select('*').eq('annee', ANNEE).order('agence')
  ]);
  return {
    users: users || [],
    budgets: (budgets || []).map((b) => ({ id: b.id, agence: b.agence, statut: b.statut, targetCA: budgetData(b.data).targetCA || 0 }))
  };
}

// Création de compte — port fidèle de adminCreateUser.
// Utilise un client Supabase SECONDAIRE (persistSession:false) pour ne pas toucher
// la session admin en cours. Dépend de « Confirm email » désactivé côté Supabase.
// Comptes de consultation : tous les rôles en lecture seule (voir les écrans de chacun sans participer au budget)
const ROLES_CONSULTATION = ['dg', 'df', 'cg', 'dr', 'admin', 'rex'];
async function finaliserConsultation(id, role) {
  const autres = ROLES_CONSULTATION.filter((r) => r !== role);
  const { error } = await sb.from('profiles').update({ roles_supp: autres, roles_consultatifs: [role].concat(autres) }).eq('id', id);
  return error;
}
// Identité déjà présente (tentative précédente) : rattacher le profil côté serveur
async function lierProfil({ nom, email, role, agence, consultation }) {
  const { data: id, error } = await sb.rpc('admin_lier_profil', { p_email: email, p_nom: nom, p_role: role, p_agence: agence || null });
  if (error) return { ok: false, message: 'Le compte existe déjà dans les identités, mais le profil n\'a pas pu être rattaché : ' + error.message };
  if (consultation) { const e2 = await finaliserConsultation(id, role); if (e2) return { ok: false, message: 'Profil rattaché, mais erreur sur les rôles de consultation : ' + e2.message }; }
  return { ok: true, message: 'Compte rattaché : ' + nom + ' (' + role + (consultation ? ', consultation uniquement' : '') + '). L\'identité existait déjà : la personne garde le mot de passe défini à sa création.' };
}
export async function createAccount({ nom, email, role, agence, consultation = false }) {
  // 1) Profil déjà existant ?
  try {
    const { data: existing } = await sb.from('profiles').select('id').eq('email', email).maybeSingle();
    if (existing) return { ok: false, message: 'Un compte avec cet email existe déjà.' };
  } catch (_) { /* non bloquant */ }

  // 2) Créer l'identité via un client isolé.
  let userId = null;
  try {
    const sbTemp = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data, error } = await sbTemp.auth.signUp({ email, password: DEFAULT_PASSWORD, options: { emailRedirectTo: URL_APPLI } });
    if (error) {
      if (String(error.message || '').toLowerCase().includes('already registered')) return lierProfil({ nom, email, role, agence, consultation });
      return { ok: false, message: 'Erreur création identité : ' + error.message };
    }
    userId = data && data.user ? data.user.id : null;
    // Identité existante : Supabase renvoie un identifiant fictif (aucune identité attachée)
    if (data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return lierProfil({ nom, email, role, agence, consultation });
    if (!userId) {
      return { ok: false, message: 'Identité créée mais identifiant introuvable. Vérifiez que « Confirm email » est désactivé (Authentication > Providers > Email).' };
    }
  } catch (e) {
    return { ok: false, message: 'Erreur inattendue : ' + (e.message || e) };
  }

  // 3) Créer le profil métier.
  try {
    const { error: perr } = await sb.from('profiles').insert({ id: userId, email, nom, role, agence: agence || null });
    if (perr && /profiles_id_fkey|foreign key/i.test(perr.message || '')) return lierProfil({ nom, email, role, agence, consultation });
    if (perr) return { ok: false, message: 'Identité créée, mais erreur sur le profil : ' + perr.message };
    if (consultation) { const e2 = await finaliserConsultation(userId, role); if (e2) return { ok: false, message: 'Compte créé, mais erreur sur les rôles de consultation : ' + e2.message }; }
  } catch (e) {
    return { ok: false, message: 'Identité créée, mais erreur sur le profil : ' + (e.message || e) };
  }

  return { ok: true, message: 'Compte créé : ' + nom + ' (' + role + (agence ? ', ' + agence : '') + (consultation ? ', consultation uniquement' : '') + '). Mot de passe habituel.' };
}

export async function updateUserRole(userId, role) {
  const { error } = await ecrire(sb.from('profiles').update({ role }).eq('id', userId));
  if (error) throw error;
}
export async function updateUserAgence(userId, agence) {
  const { error } = await ecrire(sb.from('profiles').update({ agence: agence || null }).eq('id', userId));
  if (error) throw error;
}
// Agences supplémentaires d'un REX (en plus de son agence principale)
export async function updateUserAgencesSupp(userId, agences) {
  const { error } = await ecrire(sb.from('profiles').update({ agences_supp: [...new Set((agences || []).filter(Boolean))] }).eq('id', userId));
  if (error) throw error;
}
export async function forceStatut(budgetId, statut) {
  const { error } = await ecrire(sb.from('budgets').update({ statut }).eq('id', budgetId));
  if (error) throw error;
}
export async function resetPassword(email) {
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: URL_APPLI });
  if (error) throw error;
}
export async function deleteProfile(userId) {
  const { error } = await sb.from('profiles').delete().eq('id', userId);
  if (error) throw error;
}
