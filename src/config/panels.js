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
  ['variablesdec', 'Variables déc. 2026'],
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
  ['cg', 'Charges du réseau'],
  ['objectif', 'Modifier un budget'],
  ['aide', 'Aide']
];

// Directeur financier : écrans de suivi et de validation du CG, sans la préparation des données
const PREPARATION_CG = ['refagences', 'periodes', 'variablesdec', 'affectation', 'cg'];
export const PANELS_DF = PANELS_CG.filter((p) => !PREPARATION_CG.includes(p[0]));

// Rôle -> panneaux + écran d'atterrissage (repris de setupUI()).
export function navForRole(role) {
  switch (role) {
    case 'rex':
      return { panels: PANELS_REX, landing: 'objectif', group: 'REX exploitation' };
    case 'cg':
      return { panels: PANELS_CG, landing: 'cgdash', group: 'Contrôleur de gestion' };
    case 'df':
      // Le DF partage l'interface du CG (suivi, consultation des agences, validation) ; la préparation reste au CG.
      return { panels: PANELS_DF, landing: 'cgdash', group: 'Direction financière' };
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
