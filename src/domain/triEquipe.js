// Tri d'affichage de l'équipe — texte identique dans le mono (index.html).
// Tri d'affichage de la liste du personnel (l'ordre enregistré dans le budget ne change pas)
const TRIS_EQUIPE=[['saisie','Ordre de saisie'],['nomAZ','Nom de A à Z'],['nomZA','Nom de Z à A'],['qualif','Qualification, puis nom']];
const RANG_QUALIF_EQUIPE={DEA:0,AA:1,TAXI:2,TPMR:3,FACTURIERE:4,REGULATEUR:5,REX:6};
function ordreEquipe(emps,tri){
  emps=emps||[];
  let idx=emps.map(function(_,i){return i;});
  let nom=function(i){return String(emps[i].name||emps[i].nom||'').trim();};
  let cmp=function(sens){return function(x,y){let a=nom(x),b=nom(y);if(!a&&b)return 1;if(a&&!b)return -1;return sens*a.localeCompare(b,'fr',{sensitivity:'base'})||x-y;};};
  if(tri==='nomAZ')return idx.sort(cmp(1));
  if(tri==='nomZA')return idx.sort(cmp(-1));
  if(tri==='qualif')return idx.sort(function(x,y){let qx=RANG_QUALIF_EQUIPE[emps[x].qual],qy=RANG_QUALIF_EQUIPE[emps[y].qual];let d=(qx===undefined?9:qx)-(qy===undefined?9:qy);return d||cmp(1)(x,y);});
  return idx;
}
// Ordre figé au moment du tri : les lignes ne sautent pas pendant la saisie d'un nom ; une ligne ajoutée
// va en bas jusqu'au prochain tri ; suppression, import ou changement d'agence : on retrie.
function majOrdreEquipe(etat,emps,tri,cle){
  let n=(emps||[]).length;
  if(!etat||etat.tri!==tri||etat.cle!==cle||n<etat.n||n>etat.n+1)return {tri:tri,cle:cle,n:n,ordre:ordreEquipe(emps,tri)};
  if(n===etat.n+1)return {tri:tri,cle:cle,n:n,ordre:etat.ordre.concat([n-1])};
  return etat;
}

export { TRIS_EQUIPE, ordreEquipe, majOrdreEquipe };
