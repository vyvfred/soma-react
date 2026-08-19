import { createClient } from '@supabase/supabase-js';
import { sb, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase.js';
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
export async function createAccount({ nom, email, role, agence }) {
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
    const { data, error } = await sbTemp.auth.signUp({ email, password: DEFAULT_PASSWORD });
    if (error) {
      if (String(error.message || '').toLowerCase().includes('already registered')) {
        return { ok: false, message: 'Cette identité existe déjà dans Supabase. Si le profil manque, utilisez le SQL de liaison.' };
      }
      return { ok: false, message: 'Erreur création identité : ' + error.message };
    }
    userId = data && data.user ? data.user.id : null;
    if (!userId) {
      return { ok: false, message: 'Identité créée mais identifiant introuvable. Vérifiez que « Confirm email » est désactivé (Authentication > Providers > Email).' };
    }
  } catch (e) {
    return { ok: false, message: 'Erreur inattendue : ' + (e.message || e) };
  }

  // 3) Créer le profil métier.
  try {
    const { error: perr } = await sb.from('profiles').insert({ id: userId, email, nom, role, agence: agence || null });
    if (perr) return { ok: false, message: 'Identité créée, mais erreur sur le profil : ' + perr.message };
  } catch (e) {
    return { ok: false, message: 'Identité créée, mais erreur sur le profil : ' + (e.message || e) };
  }

  return { ok: true, message: 'Compte créé : ' + nom + ' (' + role + (agence ? ', ' + agence : '') + '). Mot de passe habituel.' };
}

export async function updateUserRole(userId, role) {
  const { error } = await sb.from('profiles').update({ role }).eq('id', userId);
  if (error) throw error;
}
export async function updateUserAgence(userId, agence) {
  const { error } = await sb.from('profiles').update({ agence: agence || null }).eq('id', userId);
  if (error) throw error;
}
export async function forceStatut(budgetId, statut) {
  const { error } = await sb.from('budgets').update({ statut }).eq('id', budgetId);
  if (error) throw error;
}
export async function resetPassword(email) {
  const { error } = await sb.auth.resetPasswordForEmail(email);
  if (error) throw error;
}
export async function deleteProfile(userId) {
  const { error } = await sb.from('profiles').delete().eq('id', userId);
  if (error) throw error;
}
