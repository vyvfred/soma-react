// Fusion à l'enregistrement (point 2 de l'audit) : plusieurs personnes peuvent avoir le même
// budget ouvert (le REX sur sa présence, le CG sur les charges). Chaque session garde l'état
// chargé (« base ») et n'écrit que les rubriques qu'elle a modifiées depuis, par-dessus la version
// relue en base. Les rubriques modifiées par les autres sont conservées et renvoyées pour
// mettre l'écran à jour. Même code dans le mono-fichier (fusionnerVersion).
const J = (v) => (v === undefined ? undefined : JSON.stringify(v));
const copie = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

export function fusionnerVersion(base, local, distant) {
  const loc = local || {};
  // Pas de point de départ connu, ou rien en base : la version locale fait foi
  if (!base || !distant || !Object.keys(distant).length) {
    const fusion = copie(loc); delete fusion.versions; delete fusion.meta;
    return { fusion, locales: Object.keys(fusion), distantes: [] };
  }
  const fusion = copie(distant);
  const locales = [], distantes = [];
  const cles = new Set([...Object.keys(base), ...Object.keys(loc), ...Object.keys(distant)]);
  cles.forEach((k) => {
    if (k === 'versions' || k === 'meta') return;
    const b = J(base[k]), l = J(loc[k]), d = J(distant[k]);
    if (l !== b) {
      locales.push(k);
      if (loc[k] === undefined) delete fusion[k]; else fusion[k] = copie(loc[k]);
    } else if (d !== b) {
      distantes.push(k);
    }
  });
  delete fusion.versions; delete fusion.meta;
  return { fusion, locales, distantes };
}
