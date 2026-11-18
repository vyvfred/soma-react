import { cleJour, genCal } from './calculations.js';
// Ajustement du CA d'un jour sur le calendrier (nov. 2026) — texte identique dans le mono-fichier (index.html) et ici.
// a.ajustJours = { '2027-03-16': { tp: 1200 } } : la valeur saisie remplace la référence CA de ce jour pour cette
// activité (genCal l'applique). Pratique pour le transport de personnes, dont l'activité varie selon le jour de la semaine.
const ACTIVITES_AJUST=[['san','Sanitaire','actSan'],['sai','Saisonnier','actSai'],['tp','Transport de personnes','actTP']];
const JOURS_SEMAINE=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
const LIB_TYPE_JOUR={semaine:'jour de semaine',vacances:'jour de vacances scolaires',samedi:'samedi',dimanche:'dimanche',ferie:'jour férié'};
function activitesAjustables(a){return ACTIVITES_AJUST.filter(function(x){return x[0]==='san'||!!a[x[2]];});}
// Jours visés : ce jour seul, ou tous les mêmes jours de la semaine et du même type (semaine, vacances…) du mois ou de l'année.
function joursCibles(a,m,d,portee){
  let ref=(a.cal||[]).find(function(x){return x.month===m&&x.day===d;});
  if(!ref)return [];
  if(portee!=='mois'&&portee!=='annee')return [cleJour(m,d)];
  let wd=new Date(2027,m,d).getDay();
  return (a.cal||[]).filter(function(x){return x.type===ref.type&&new Date(2027,x.month,x.day).getDay()===wd&&(portee==='annee'||x.month===m);}).map(function(x){return cleJour(x.month,x.day);});
}
// valeurs : {tp: 1200, san: ''} — un nombre ajuste, '' ou null revient à la référence. Recalcule le calendrier.
function appliquerAjustJours(a,cles,valeurs){
  let aj=Object.assign({},a.ajustJours||{});
  cles.forEach(function(k){
    let o=Object.assign({},aj[k]||{});
    Object.keys(valeurs).forEach(function(act){
      let v=valeurs[act];
      if(v===''||v===null||v===undefined)delete o[act];
      else{let n=+String(v).replace(',','.');if(isFinite(n)&&n>=0)o[act]=n;}
    });
    if(Object.keys(o).length)aj[k]=o;else delete aj[k];
  });
  a.ajustJours=aj;
  genCal(a);
  return a;
}
function effacerAjustJours(a,cles){
  let aj=Object.assign({},a.ajustJours||{});
  (cles||Object.keys(aj)).forEach(function(k){delete aj[k];});
  a.ajustJours=aj;
  genCal(a);
  return a;
}
function nbJoursAjustes(a){return Object.keys(a.ajustJours||{}).length;}
function libelleJour(m,d){
  let dt=new Date(2027,m,d),mois=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  let j=JOURS_SEMAINE[dt.getDay()];
  return j.charAt(0).toUpperCase()+j.slice(1)+' '+d+' '+mois[m]+' 2027';
}
function libellePortee(a,m,d,portee){
  let ref=(a.cal||[]).find(function(x){return x.month===m&&x.day===d;});
  let j=JOURS_SEMAINE[new Date(2027,m,d).getDay()]+'s';
  let t=ref&&ref.type!=='samedi'&&ref.type!=='dimanche'?' ('+LIB_TYPE_JOUR[ref.type]+')':'';
  let mois=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'][m];
  if(portee==='mois')return 'Tous les '+j+' de '+mois+t;
  if(portee==='annee')return 'Tous les '+j+' de l\'année'+t;
  return 'Ce jour seulement';
}

export { ACTIVITES_AJUST, LIB_TYPE_JOUR, activitesAjustables, joursCibles, appliquerAjustJours, effacerAjustJours, nbJoursAjustes, libelleJour, libellePortee };
