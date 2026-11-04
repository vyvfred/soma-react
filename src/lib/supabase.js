import { createClient } from '@supabase/supabase-js';

// Mêmes identifiants publics que l'application actuelle.
// La clé "publishable" est publique par conception : la sécurité repose sur la RLS Supabase.
export const SUPABASE_URL = 'https://rtgbqltinxguuinhicrs.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_yYD1zRGVsDRU0yjdpaalaA_maENPmTh';

export const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Écriture contrôlée : une modification refusée par les droits de la base ne renvoie pas d'erreur
// (0 ligne modifiée). On la transforme en erreur visible au lieu d'afficher « Enregistré ».
export async function ecrire(req) {
  const res = await req.select('id');
  if (res.error) return res;
  if (!res.data || !res.data.length) return { data: [], error: { message: 'Enregistrement refusé : vos droits ne permettent pas de modifier cette donnée.' } };
  return res;
}
