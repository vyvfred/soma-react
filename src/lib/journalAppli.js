// Instance unique du journal des connexions pour l'application (démarrée par AuthContext).
import { sb } from './supabase.js';
import { creerJournal } from '../domain/journal.js';

export const journal = creerJournal((nom, params) => sb.rpc(nom, params));

export async function chargerJournal(limite = 200) {
  const [stats, recent] = await Promise.all([sb.rpc('journal_stats'), sb.rpc('journal_recent', { p_limite: limite })]);
  if (stats.error) throw new Error(stats.error.message);
  if (recent.error) throw new Error(recent.error.message);
  return { stats: stats.data || [], recent: recent.data || [] };
}
