// Reprise de données entre versions et suppression d'une version (nov. 2026) —
// texte identique dans le mono-fichier (index.html) et ici.
// Le paramétrage du CG (taux, périodes de paie, variables, historiques) est commun aux versions :
// il n'est jamais recopié. Seules les saisies propres à une version le sont, par bloc.
const BLOCS_VERSION=[
  {id:'equipe',label:'Équipe',detail:'salariés, contrats, heures, % roulant, entrées et sorties',cles:['employees']},
  {id:'objectif',label:'Objectif et références CA',detail:'CA cible, TXR cible, activités, perspectives, CA moyen par type de jour, jours ajustés sur le calendrier',cles:['targetCA','targetTXR','perspectives','actSan','actSai','actTP','refs','ajustJours']},
  {id:'presence',label:'Présence & HS',detail:'absentéisme, congés, mois travaillés, CP des non-roulants, indemnités',cles:['sick','presence','cpEnveloppes','cpReliquat','cpOptimal','cpOptimalHSCost','cpNR','moisVerrouilles','hs50','hsImproductif','repasRoulant','repasNonRoulant','idjfRoulant','idjfNonRoulant']},
  {id:'charges',label:'Charges',detail:'postes de charges hors personnel (saisies REX et CG)',cles:['rex']}
];
const VERSIONS_SUPPRIMABLES=['v2','v3'];
// Copie dans l'agence cible les blocs choisis de l'agence source. Renvoie une nouvelle agence.
function reprendreBlocs(cible,source,ids){
  let out=JSON.parse(JSON.stringify(cible||{}));
  BLOCS_VERSION.forEach(function(b){
    if(ids.indexOf(b.id)<0)return;
    b.cles.forEach(function(k){
      if(source&&source[k]!==undefined)out[k]=JSON.parse(JSON.stringify(source[k]));
      else delete out[k];
    });
  });
  return out;
}
// Avertissement si la présence est reprise sans l'équipe alors que les équipes diffèrent
// (les saisies de présence sont rattachées aux salariés).
function alerteRepriseBlocs(cible,source,ids){
  if(ids.indexOf('presence')<0||ids.indexOf('equipe')>=0)return null;
  let n=function(a){return (a&&a.employees||[]).length;};
  if(n(cible)===n(source))return null;
  return 'La présence de la version source a été saisie pour '+n(source)+' salariés, la version active en compte '+n(cible)+'. Reprenez aussi l\'équipe pour garder des saisies cohérentes.';
}
// Une version peut être supprimée si : V2 ou V3, remplie, pas choisie pour la soumission, budget modifiable.
function motifRefusSuppression(data,v,editable){
  if(!editable)return 'Budget en validation : les versions ne peuvent plus être modifiées.';
  if(VERSIONS_SUPPRIMABLES.indexOf(v)<0)return 'La V1 est la version de référence : elle ne peut pas être supprimée.';
  if(!(data&&data.versions&&data.versions[v]&&Object.keys(data.versions[v]).length))return 'Cette version est déjà vide.';
  if(data.meta&&data.meta.submittedVersion===v)return 'Cette version est choisie pour la soumission : choisissez-en une autre avant de la supprimer.';
  return null;
}
// Données du budget sans la version v (la version active repasse sur la V1 si c'était elle).
function donneesSansVersion(data,v){
  let out=JSON.parse(JSON.stringify(data||{}));
  out.versions=out.versions||{};
  delete out.versions[v];
  out.meta=out.meta||{};
  if(out.meta.descriptions)delete out.meta.descriptions[v];
  if(out.meta.activeVersion===v)out.meta.activeVersion='v1';
  return out;
}

export { BLOCS_VERSION, VERSIONS_SUPPRIMABLES, reprendreBlocs, alerteRepriseBlocs, motifRefusSuppression, donneesSansVersion };
