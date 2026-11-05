// Soumission d'un budget au DR (bandeau du budget et fin de parcours) :
// mêmes confirmations que la version mono-fichier.
import { sb } from '../lib/supabase.js';
import { VERSION_LABELS, ecartAbsenteisme } from '../domain/versions.js';
import { pct } from '../domain/format.js';
import { toast } from './Toast.jsx';

// DR responsable de l'agence (agences.region_id -> profiles.region_id) ; null si aucun.
export async function drDeLAgence(agenceNom) {
  try {
    const { data: ag } = await sb.from('agences').select('region_id').eq('nom', agenceNom).maybeSingle();
    if (!ag || !ag.region_id) return null;
    const { data: dr } = await sb.from('profiles').select('id,nom').eq('role', 'dr').eq('region_id', ag.region_id).maybeSingle();
    return dr || null;
  } catch (e) { return null; }
}

export async function soumettreAvecConfirmations({ a, agenceNom, activeVersion, submit, parNom }) {
  const ecart = ecartAbsenteisme(a);
  if (ecart && !window.confirm('Attention : votre taux d\'absentéisme moyen (' + pct(ecart.moyenne) + ') s\'écarte de la référence du contrôle de gestion (' + pct(ecart.cible) + ').\n\nVous pouvez le rééquilibrer avant de soumettre (bouton « Rééquilibrer automatiquement » de l\'écran Présence).\n\nSoumettre quand même ?')) return;
  // Agence sans DR affecté : le budget resterait sans valideur
  const dr = await drDeLAgence(agenceNom);
  if (!dr && !window.confirm('Aucun directeur régional n\'est encore affecté à votre agence.\n\nVotre budget sera bien transmis, mais il ne pourra être validé qu\'une fois l\'affectation faite par le contrôleur de gestion.\n\nSoumettre quand même ?')) return;
  if (!window.confirm('Soumettre la version ' + VERSION_LABELS[activeVersion] + ' au Directeur Régional ?\n\nCette version deviendra le budget officiel. Vous ne pourrez plus le modifier tant qu\'il est en validation.')) return;
  const r = await submit(parNom);
  toast(r.message, r.ok ? 'success' : 'warn');
}
