import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { sb } from '../lib/supabase.js';

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
  return data;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Au montage : reprendre une éventuelle session existante, puis écouter les changements.
  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await sb.auth.getSession();
      if (!active) return;
      if (data.session) {
        setSession(data.session);
        setProfile(await loadProfile(data.session.user.id));
      }
      setLoading(false);
    })();

    const { data: sub } = sb.auth.onAuthStateChange(async (_event, newSession) => {
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
    await sb.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const value = { session, profile, loading, error, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
