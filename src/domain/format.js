// Formateurs — repris à l'identique de l'application actuelle.
export const euro = (n) =>
  (Number(n) || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export const pct = (n) =>
  (Number(n) || 0).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %';

export const fmtNum = (n) =>
  n !== null && n !== undefined ? Number(n).toLocaleString('fr-FR') : '';
