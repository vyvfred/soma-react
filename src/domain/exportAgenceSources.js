// Sources de l'export Excel détaillé : agence ouverte (écran) ou budget du réseau (consolidation)
import { entiteDepuisBudget } from './consolideSIG.js';
import { statutLabel } from '../config/statut.js';
import { classeurBudgetAgence, nomFichierBudgetAgence } from './exportAgenceDetail.js';
import { VERSION_LABELS } from './versions.js';

const libVersion = (v, desc) => ((VERSION_LABELS && VERSION_LABELS[v]) || (v ? v.toUpperCase() : '')) + (desc ? ' — ' + desc : '');

// entree = { statut, data } de la map réseau ; null si le budget est vide
export function fichierDepuisReseau(nom, entree, role) {
  if (!entree || !entree.data) return null;
  const a = entiteDepuisBudget(nom, entree.data);
  if (!a || !a.cal) return null;
  const meta = entree.data.meta || {}, v = meta.submittedVersion || meta.activeVersion || 'v1';
  return { nom: nomFichierBudgetAgence(nom), modele: classeurBudgetAgence(a, { version: libVersion(v, meta.descriptions && meta.descriptions[v]), statut: statutLabel(entree.statut) }, role) };
}

export function fichierDepuisAgence(a, nom, { activeVersion, meta, statut } = {}, role) {
  return { nom: nomFichierBudgetAgence(nom || a.name), modele: classeurBudgetAgence({ ...a, name: nom || a.name }, { version: libVersion(activeVersion, meta && meta.descriptions && meta.descriptions[activeVersion]), statut: statutLabel(statut) }, role) };
}
