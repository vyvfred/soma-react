import { createClient } from '@supabase/supabase-js';

// Mêmes identifiants publics que l'application actuelle.
// La clé "publishable" est publique par conception : la sécurité repose sur la RLS Supabase.
export const SUPABASE_URL = 'https://rtgbqltinxguuinhicrs.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_yYD1zRGVsDRU0yjdpaalaA_maENPmTh';

export const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
