// Liste des agences du réseau — extraite verbatim de l'application actuelle.
export const AGENCES =[
  {nom:'AGENCE DEMO',zone:'B'},{nom:'ANGOULEME',zone:'A'},{nom:'COGNAC',zone:'A'},{nom:'CHATELLERAULT',zone:'A'},{nom:'PARTHENAY',zone:'A'},
  {nom:'POITIERS',zone:'A'},{nom:'CLERMONT',zone:'A'},{nom:'DIJON',zone:'A'},{nom:'BOURG EN BRESSE',zone:'A'},
  {nom:'CHAMBERY',zone:'A'},{nom:'THYEZ',zone:'A'},{nom:'ANNECY',zone:'A'},{nom:'LIMOGES',zone:'A'},
  {nom:'BRIVE',zone:'A'},{nom:'TULLE',zone:'A'},{nom:'SAINT GILLES CROIX DE VIE',zone:'B'},
  {nom:'NANTES',zone:'B'},{nom:'ANGERS',zone:'B'},{nom:'LAVAL',zone:'B'},{nom:'LE MANS',zone:'B'},
  {nom:'RENNES',zone:'B'},{nom:'VANNES',zone:'B'},{nom:'EVREUX',zone:'B'},{nom:'TOURS',zone:'B'},
  {nom:'CAHORS',zone:'C'},{nom:'MOISSAC',zone:'C'},{nom:'TOULOUSE',zone:'C'},
  // Entités hors agences opérationnelles
  {nom:'SIEGE',zone:'B',type:'hors-agence'},
  {nom:'CENTRE DE FORMATION',zone:'B',type:'hors-agence'},
  {nom:'EXCEPTIONNEL',zone:'B',type:'hors-agence'},
  {nom:'RESEAU ADHERENT',zone:'B',type:'hors-agence'}
];


// Agences opérationnelles (exclut les entrées non-opérationnelles marquées `type`).
export function agencesOps() {
  return AGENCES.filter((a) => !a.type);
}
