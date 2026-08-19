// Libellés de rôle — repris à l'identique de roleLabel() dans l'application actuelle.
export const ROLE_LABELS = {
  rex: 'REX',
  dr: 'Dir. Régional',
  cg: 'Contrôleur de gestion',
  df: 'Direction Financière',
  dg: 'Direction (DG, directeurs opérationnels)',
  pdg: 'Direction (DG, directeurs opérationnels)',
  admin: 'Admin',
  demo: 'Démonstration'
};

export function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}
