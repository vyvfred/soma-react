import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { journal } from '../lib/journalAppli.js';
import { sb, HASH_INITIAL, LIEN_RECUPERATION, LIEN_EXPIRE, URL_APPLI } from '../lib/supabase.js';

// Reproduit fidèlement le flux de l'application actuelle :
//   signInWithPassword  ->  chargement du profil dans "profiles"  ->  session applicative.
// Améliorations propres au socle React : reprise de session au rechargement et
// écoute des changements d'auth (au lieu de la manipulation manuelle du DOM).

const AuthContext = createContext(null);

async function loadProfile(userId) {
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return profilEffectif(data);
}
// Profils multiples (nov. 2026) : rôle actif choisi parmi le rôle principal et les rôles supplémentaires
export function profilEffectif(data) {
  if (!data) return data;
  const supp = Array.isArray(data.roles_supp) ? data.roles_supp.filter((r) => r && r !== data.role) : [];
  const actif = data.role_actif && (data.role_actif === data.role || supp.includes(data.role_actif)) ? data.role_actif : data.role;
  const consult = Array.isArray(data.roles_consultatifs) ? data.roles_consultatifs : [];
  return { ...data, rolePrincipal: data.role, rolesDispo: [data.role].concat(supp), rolesConsultatifs: consult, consultatif: actif !== data.role && consult.includes(actif), role: actif };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // « Voir en tant que… » : un administrateur simule un autre rôle sans se déconnecter.
  const [simRole, setSimRole] = useState(null);
  // Lien « mot de passe oublié » : la personne arrive connectée et doit choisir un nouveau mot de passe.
  const [recuperation, setRecuperation] = useState(LIEN_RECUPERATION);

  // Au montage : reprendre une éventuelle session existante, puis écouter les changements.
  useEffect(() => {
    let active = true;

    (async () => {
      // Jeton de récupération dans l'URL (port de init() du mono-fichier)
      const hash = HASH_INITIAL;
      if (LIEN_RECUPERATION || LIEN_EXPIRE) window.history.replaceState(null, '', window.location.pathname);
      if (LIEN_RECUPERATION) {
        const params = new URLSearchParams(hash.replace('#', ''));
        const accessToken = params.get('access_token');
        if (accessToken) await sb.auth.setSession({ access_token: accessToken, refresh_token: params.get('refresh_token') || '' });
        window.history.replaceState(null, '', window.location.pathname);
        if (active) setRecuperation(true);
      }
      const { data } = await sb.auth.getSession();
      if (!active) return;
      if (data.session) {
        setSession(data.session);
        setProfile(await loadProfile(data.session.user.id));
      }
      setLoading(false);
    })();

    const { data: sub } = sb.auth.onAuthStateChange(async (_event, newSession) => {
      if (_event === 'PASSWORD_RECOVERY') setRecuperation(true);
      setSession(newSession);
      setProfile(newSession ? await loadProfile(newSession.user.id) : null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email, password) => {
    setError('');
    const { data, error: authErr } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (authErr) {
      setError('Identifiants incorrects.');
      return { ok: false };
    }
    const prof = await loadProfile(data.user.id);
    if (!prof) {
      setError("Profil introuvable. Contactez l'administrateur.");
      await sb.auth.signOut();
      return { ok: false };
    }
    // La session et le profil sont aussi mis à jour par onAuthStateChange ;
    // on les pose ici pour une bascule immédiate sans attendre l'événement.
    setSession(data.session);
    setProfile(prof);
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await journal.arreter(); // dernier signal (durée, enregistrements) tant que la session est valide
    await sb.auth.signOut();
    setSession(null);
    setProfile(null);
    setSimRole(null);
  }, []);

  const motDePasseOublie = useCallback(async (email) => {
    if (!email || !email.trim()) return { ok: false, message: 'Saisissez votre email.' };
    const { error: e } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: URL_APPLI });
    return e ? { ok: false, message: 'Erreur : ' + e.message } : { ok: true, message: 'Lien envoyé ! Vérifiez votre boîte mail.' };
  }, []);
  const changerMotDePasse = useCallback(async (p1, p2) => {
    if (!p1 || p1.length < 8) return { ok: false, message: 'Le mot de passe doit faire au moins 8 caractères.' };
    if (p1 !== p2) return { ok: false, message: 'Les mots de passe ne correspondent pas.' };
    const { error: e } = await sb.auth.updateUser({ password: p1 });
    if (e) return { ok: false, message: 'Erreur : ' + e.message };
    setRecuperation(false);
    return { ok: true, message: 'Mot de passe modifié avec succès.' };
  }, []);

  // Journal des connexions : une connexion par ouverture de SOMA avec une session et un profil valides.
  const userId = session && profile ? session.user.id : null;
  useEffect(() => {
    if (!userId) return undefined;
    journal.demarrer();
    return () => { journal.arreter(); };
  }, [userId]);

  const simuler = useCallback((role) => setSimRole(role && role !== 'admin' ? role : null), []);
  const vraiProfil = profile;
  const effectif = profile && simRole && profile.role === 'admin' ? { ...profile, role: simRole } : profile;
  // Bascule vers un autre de ses rôles : la base enregistre le rôle actif (droits), puis l'application repart de zéro
  const changerRole = useCallback(async (role) => {
    const { error: e } = await sb.rpc('choisir_role', { p_role: role });
    if (e) throw e;
    window.location.reload();
  }, []);
  const value = { changerRole, session, profile: effectif, vraiProfil, simRole: effectif !== profile ? simRole : null, simuler, recuperation, setRecuperation, motDePasseOublie, changerMotDePasse, loading, error, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
