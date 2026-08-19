// Navigation par rôle — reprise fidèle des constantes panels* et de la logique
// de setupUI() dans l'application actuelle. Chaque entrée = [id, libellé].
//
// NB : les écrans eux-mêmes ne sont pas encore migrés (Sprint 0 = socle).
// Ces panneaux pilotent la coquille ; leur contenu sera porté écran par écran
// dans les sprints suivants.

export const PANELS_REX = [
  ['objectif', 'Objectif'],
  ['refs', 'Références CA'],
  ['cal', 'Calendrier'],
  ['team', 'Équipe'],
  ['rh', 'Présence & HS'],
  ['previsionnel', 'Prévisionnel'],
  ['finance', 'Synthèse'],
  ['aide', 'Aide']
];

export const PANELS_CG = [
  ['cgdash', 'Tableau de bord'],
  ['refagences', 'Données agences'],
  ['periodes', 'Périodes de paie'],
  ['affectation', 'Affectation DR'],
  ['comparative', 'Vue comparative'],
  ['graphiques', 'Graphiques'],
  ['consolidation', 'Consolidation'],
  ['objectif', 'Ouvrir une agence'],
  ['cg', 'Charges CG'],
  ['rex', 'Prévisionnel'],
  ['finance', 'Synthèse'],
  ['controle', 'Contrôles'],
  ['validation', 'Budgets à valider'],
  ['aide', 'Aide']
];

export const PANELS_DR = [
  ['validation', 'Budgets à valider'],
  ['consolidation', 'Consolidation région'],
  ['aide', 'Aide']
];

export const PANELS_DG = [
  ['validation', 'Budgets à valider'],
  ['consolidation', 'Consolidation réseau'],
  ['aide', 'Aide']
];

export const PANELS_ADMIN = [
  ['admin', 'Utilisateurs & Budgets'],
  ['consolidation', 'Consolidation réseau'],
  ['affectation', 'Affectation DR'],
  ['objectif', 'Modifier un budget']
];

// Rôle -> panneaux + écran d'atterrissage (repris de setupUI()).
export function navForRole(role) {
  switch (role) {
    case 'rex':
      return { panels: PANELS_REX, landing: 'objectif', group: 'REX exploitation' };
    case 'cg':
    case 'df':
      // CG et DF partagent la même interface complète.
      return { panels: PANELS_CG, landing: 'cgdash', group: 'Contrôleur de gestion' };
    case 'dr':
      return { panels: PANELS_DR, landing: 'validation', group: 'Directeur Régional' };
    case 'dg':
    case 'pdg':
      return { panels: PANELS_DG, landing: 'validation', group: 'Direction (DG, directeurs opérationnels)' };
    case 'admin':
      return { panels: PANELS_ADMIN, landing: 'admin', group: 'Administration' };
    default:
      return { panels: [['aide', 'Aide']], landing: 'aide', group: '' };
  }
}
