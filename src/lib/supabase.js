import { createClient } from '@supabase/supabase-js';

// Mêmes identifiants publics que l'application actuelle.
// La clé "publishable" est publique par conception : la sécurité repose sur la RLS Supabase.
export const SUPABASE_URL = 'https://rtgbqltinxguuinhicrs.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_yYD1zRGVsDRU0yjdpaalaA_maENPmTh';

// Lien « mot de passe oublié » : à lire AVANT de créer le client Supabase, qui consomme le jeton de l'adresse
// et l'efface aussitôt (sinon l'application s'ouvrait sans demander le nouveau mot de passe).
export const HASH_INITIAL = typeof window !== 'undefined' ? window.location.hash || '' : '';
export const LIEN_RECUPERATION = /(^|[#&])type=recovery(&|$)/.test(HASH_INITIAL);
export const LIEN_EXPIRE = /error_code=otp_expired|error=access_denied/.test(HASH_INITIAL);

export const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Écriture contrôlée : une modification refusée par les droits de la base ne renvoie pas d'erreur
// (0 ligne modifiée). On la transforme en erreur visible au lieu d'afficher « Enregistré ».
export async function ecrire(req) {
  const res = await req.select('id');
  if (res.error) return res;
  if (!res.data || !res.data.length) return { data: [], error: { message: 'Enregistrement refusé : vos droits ne permettent pas de modifier cette donnée.' } };
  return res;
}
