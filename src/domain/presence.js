// Rééquilibrage du taux d'absentéisme — port fidèle de reequilibrerSick().
// Fonction PURE : prend le tableau `sick` (12 mois, valeurs ou null) et la cible,
// renvoie un NOUVEAU tableau dont la moyenne des mois renseignés vise la cible,
// sans valeur négative. Ne touche pas aux mois vides.
export function reequilibrerSick(sick, cible) {
  const idxRemplis = [];
  sick.forEach((v, i) => { if (v !== null && v !== undefined) idxRemplis.push(i); });
  if (!idxRemplis.length) return Array(12).fill(cible);

  const moyActuelle = idxRemplis.reduce((s, i) => s + (+sick[i] || 0), 0) / idxRemplis.length;
  const ecart = moyActuelle - cible; // > 0 : trop haut, il faut baisser
  if (Math.abs(ecart) < 0.001) return sick.slice();

  const ajust = sick.slice();
  idxRemplis.forEach((i) => { ajust[i] = (+sick[i] || 0) - ecart; });

  // Corriger les négatifs en reportant le déficit sur les mois positifs.
  let secu = 0;
  while (secu < 50) {
    secu++;
    const negs = idxRemplis.filter((i) => ajust[i] < 0);
    if (!negs.length) break;
    const deficit = negs.reduce((s, i) => s + (0 - ajust[i]), 0);
    negs.forEach((i) => { ajust[i] = 0; });
    const positifs = idxRemplis.filter((i) => ajust[i] > 0.01);
    if (!positifs.length) break;
    const parMois = deficit / positifs.length;
    positifs.forEach((i) => { ajust[i] = Math.max(0, ajust[i] - parMois); });
  }
  idxRemplis.forEach((i) => { ajust[i] = Math.round(ajust[i] * 100) / 100; });
  return ajust;
}
