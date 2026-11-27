// Soumission d'un budget au DR (bandeau du budget et fin de parcours) :
// mêmes confirmations que la version mono-fichier.
import { contexteRedige } from '../domain/contexte.js';
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
  // Perspectives & contexte 2027 : obligatoire pour soumettre
  if (!contexteRedige(a)) { window.alert('Rédigez d\'abord les perspectives et le contexte 2027, sur l\'écran Objectif. C\'est ce texte qui explique votre budget au DR.'); return; }
  const ecart = ecartAbsenteisme(a);
  if (ecart && !window.confirm('Votre absentéisme moyen (' + pct(ecart.moyenne) + ') s\'écarte de la référence du contrôle de gestion (' + pct(ecart.cible) + ').\n\nVous pouvez le rééquilibrer sur l\'écran Présence avant de soumettre.\n\nSoumettre quand même ?')) return;
  // Agence sans DR affecté : le budget resterait sans valideur
  const dr = await drDeLAgence(agenceNom);
  if (!dr && !window.confirm('Aucun DR n\'est encore affecté à votre agence.\n\nLe budget sera transmis, mais il ne pourra être validé qu\'une fois le DR affecté par le contrôleur de gestion.\n\nSoumettre quand même ?')) return;
  if (!window.confirm('Soumettre la version ' + VERSION_LABELS[activeVersion] + ' au DR ?\n\nElle devient le budget officiel et ne sera plus modifiable pendant la validation.')) return;
  const r = await submit(parNom);
  toast(r.message, r.ok ? 'success' : 'warn');
}
