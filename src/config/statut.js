// Libellés de statut budgétaire — port fidèle de statutLabel().
export const STATUT_LABELS = {
  brouillon: 'Brouillon',
  soumis_dr: 'Soumis DR', valide_dr: 'Validé DR', refuse_dr: 'Refusé DR', complement_dr: 'Complément DR demandé',
  soumis_df: 'Soumis DF', valide_df: 'Validé DF', refuse_df: 'Refusé DF', complement_df: 'Complément DF demandé',
  soumis_dg: 'Soumis DG', valide_dg: 'Validé DG', refuse_dg: 'Refusé DG',
  soumis_pdg: 'Soumis PDG', valide_pdg: 'Validé PDG', refuse_pdg: 'Refusé PDG'
};

export function statutLabel(s) {
  return STATUT_LABELS[s] || s;
}
