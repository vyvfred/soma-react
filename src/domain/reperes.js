import { ann, monthCA } from './calculations.js';
// Repères 2026 issus du tableau de bord du contrôle de gestion (nov. 2026) : réalisé 2025, réalisé 2026 des mois clos,
// estimation des derniers mois par le CG, budget 2026. Ils INFORMENT les valideurs (et le REX sur son agence) ;
// ils ne pré-remplissent jamais le budget 2027.
const INDICATEURS_REPERES=[
  {cle:'ca',label:"Chiffre d'affaires",lib:"Chiffre d'affaires"},
  {cle:'ext',label:'Autres Achats et charges externes',lib:'Charges externes'},
  {cle:'perso',label:'Charges de personnel',lib:'Charges de personnel'},
  {cle:'rex',label:"RESULTAT D'EXPLOITATION",lib:"Résultat d'exploitation"}
];
// Seuils d'alerte volontairement sensibles : écart de CA en %, ratios en points de CA
const SEUILS_REPERES={ca:3,caErreur:30,ratio:1,fiabCA:3,fiabRex:1};
const MOIS_TDB=['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'];
function valRep(v){if(v===null||v===undefined||v==='')return null;let n=typeof v==='number'?v:+String(v).replace(/\s/g,'').replace(',','.');return isFinite(n)?n:null;}
function normRep(x){return String(x||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/\s+/g,' ').trim();}
// Nom d'onglet ou de ligne du tableau de bord -> agence SOMA (« ST GILLES » -> SAINT GILLES CROIX DE VIE, « FORMATION (…) » -> CENTRE DE FORMATION)
function agenceDuTDB(nom,agences){
  let n=normRep(nom).replace(/^ST /,'SAINT ');
  if(!n)return null;
  if(/^FORMATION/.test(n))n='CENTRE DE FORMATION';
  if(/^RESEAU ADH|^ADHERENT/.test(n))n='RESEAU ADHERENT';
  if(/^EXCEPT/.test(n))n='EXCEPTIONNEL';
  let t=agences.find(function(a){return normRep(a)===n;});
  if(t)return t;
  t=agences.find(function(a){let x=normRep(a);return x.indexOf(n)===0||n.indexOf(x)===0;});
  return t||null;
}
// Lecture du classeur : feuilles = { nomOnglet: lignes[][] }. Onglet par agence : A1 = nom, colonnes « B mm-26 » = budget,
// deux colonnes avant = réalisé du mois. Onglet « 26 Vs 25 » : CA, charges externes, charges de personnel et REX 2025.
function lireTableauDeBord(feuilles,agences){
  let parAgence={},inconnues=[];
  Object.keys(feuilles).forEach(function(onglet){
    let rows=feuilles[onglet]||[];if(!rows.length)return;
    let tete=rows[0]||[];
    let cols=[];tete.forEach(function(h,j){let mt=/^B\s*(\d{1,2})-26/.exec(String(h||'').trim());if(mt)cols[+mt[1]-1]=j;});
    if(cols.filter(function(x){return x!==undefined;}).length<12)return;
    let ag=agenceDuTDB(tete[0],agences);
    if(!ag){let n=normRep(tete[0]);if(n&&!/VYV/.test(n))inconnues.push(String(tete[0]).trim());return;}
    let reel={},budget={};
    rows.slice(1).forEach(function(r){let lab=String(r[0]||'').trim();if(!lab)return;
      reel[lab]=cols.map(function(j){return valRep(r[j-2]);});budget[lab]=cols.map(function(j){return valRep(r[j]);});});
    // Mois clos : dernier mois avec un réalisé (CA, charges de personnel ou REX ; le Siège n'a pas de CA)
    let mc=0;["Chiffre d'affaires",'Charges de personnel',"RESULTAT D'EXPLOITATION"].forEach(function(l){let s=reel[l]||[];for(let m=0;m<12;m++)if(s[m]!==null&&s[m]!==undefined&&s[m]!==0&&m+1>mc)mc=m+1;});
    parAgence[ag]={nomTDB:String(tete[0]).trim(),moisClos:mc,reel:reel,budget:budget};
  });
  let comp=Object.keys(feuilles).find(function(o){return /26\s*VS\s*25/i.test(o);});
  if(comp){
    let rows=feuilles[comp],tete=rows[0]||[],col={};
    tete.forEach(function(h,j){let i=MOIS_TDB.indexOf(normRep(h).toLowerCase());if(i>=0)col[i]=j+1;});
    let cle={'CA':'ca','CHARGES EXTERNES':'ext','CHGES EXTERNES':'ext','CHARGES PERSO':'perso','CHGES PERSO':'perso','REX':'rex'},cour=null;
    rows.slice(2).forEach(function(r){
      if(String(r[0]||'').trim())cour=agenceDuTDB(r[0],agences);
      let k=cle[normRep(r[1])];if(!cour||!k||!parAgence[cour])return;
      if(!parAgence[cour].n1)parAgence[cour].n1={};
      parAgence[cour].n1[k]=MOIS_TDB.map(function(_,m){return col[m]!==undefined?valRep(r[col[m]]):null;});
    });
  }
  return {parAgence:parAgence,inconnues:inconnues};
}
function indRep(cle){return INDICATEURS_REPERES.find(function(i){return i.cle===cle;});}
function serieRep(r,quoi,cle){let ind=indRep(cle);if(!r||!ind)return [];if(quoi==='n1')return (r.n1&&r.n1[cle])||[];let s=r[quoi]&&r[quoi][ind.label];return s||[];}
function estimRep(r,cle,m){let e=r&&r.estim&&r.estim[cle];return e?valRep(e[m]):null;}
function sommeRep(s,de,a){let t=0;for(let m=de;m<a;m++)t+=valRep(s[m])||0;return t;}
// Atterrissage 2026 = réalisé des mois clos + estimation du CG pour les mois restants (à défaut : budget 2026, signalé)
function atterrissage2026(r,cle){
  let mc=(r&&r.moisClos)||0,re=serieRep(r,'reel',cle),bu=serieRep(r,'budget',cle),tot=sommeRep(re,0,mc),manquants=0;
  for(let m=mc;m<12;m++){let e=estimRep(r,cle,m);if(e===null){manquants++;e=valRep(bu[m])||0;}tot+=e;}
  return {val:tot,manquants:manquants,moisClos:mc};
}
function annuel2025(r,cle){let s=serieRep(r,'n1',cle);return s.length?sommeRep(s,0,12):null;}
function budget2027Rep(a,cle){
  if(!a)return 0;
  if(cle==='ca'){let t=0;for(let m=0;m<12;m++)t+=monthCA(a,m);return t;}
  return ann(a,indRep(cle).label);
}
function pctRep(v,ca){return ca?v/ca*100:null;}
function fmtPts(v){return (v>0?'+':'')+(Math.round(v*10)/10).toLocaleString('fr-FR')+' pt';}
function fmtPctRep(v){return (Math.round(v*10)/10).toLocaleString('fr-FR')+' %';}
function fmtKRep(v){return Math.round(v/1000).toLocaleString('fr-FR')+' k€';}
// Repères d'une agence pour la décision : tableau 2025 / atterrissage 2026 / budget 2027, fiabilité du budget 2026, alertes
function reperesAgence(a,r){
  if(!r)return null;
  let lignes=INDICATEURS_REPERES.map(function(ind){
    let at=atterrissage2026(r,ind.cle),v27=budget2027Rep(a,ind.cle);
    return {cle:ind.cle,lib:ind.lib,v2025:annuel2025(r,ind.cle),v2026:at.val,v2027:v27,manquants:at.manquants};
  });
  let L={};lignes.forEach(function(l){L[l.cle]=l;});
  let ca26=L.ca.v2026,ca27=L.ca.v2027,ca25=L.ca.v2025;
  let ratios=['ext','perso','rex'].map(function(k){return {cle:k,lib:L[k].lib,r2025:ca25?pctRep(L[k].v2025||0,ca25):null,r2026:pctRep(L[k].v2026,ca26),r2027:pctRep(L[k].v2027,ca27)};});
  let mc=r.moisClos||0,fiab=null;
  if(mc>0){
    let caR=sommeRep(serieRep(r,'reel','ca'),0,mc),caB=sommeRep(serieRep(r,'budget','ca'),0,mc),rxR=sommeRep(serieRep(r,'reel','rex'),0,mc),rxB=sommeRep(serieRep(r,'budget','rex'),0,mc);
    fiab={mois:mc,caReel:caR,caBudget:caB,rexReel:rxR,rexBudget:rxB};
  }
  let al=[];
  if(ca27>0&&ca26>0){
    let d=(ca27/ca26-1)*100;
    if(Math.abs(d)>=SEUILS_REPERES.caErreur)al.push({niveau:'alerte',texte:'CA 2027 ('+fmtKRep(ca27)+') très éloigné de l\'atterrissage 2026 ('+fmtKRep(ca26)+', '+(d>0?'+':'')+fmtPctRep(d)+') : erreur de saisie ?'});
    else if(Math.abs(d)>SEUILS_REPERES.ca)al.push({niveau:'attention',texte:'CA 2027 '+(d>0?'+':'')+fmtPctRep(d)+' par rapport à l\'atterrissage 2026 : hypothèses à retrouver dans le contexte du REX'});
  }
  if(ca27>0&&ca26>0)ratios.forEach(function(x){
    if(x.r2026===null||x.r2027===null)return;
    let d=x.r2027-x.r2026,favorable=x.cle==='rex'?d>0:d<0;
    if(Math.abs(d)>=SEUILS_REPERES.ratio)al.push({niveau:favorable?'attention':'alerte',texte:x.lib+' : '+fmtPctRep(x.r2027)+' du CA en 2027 contre '+fmtPctRep(x.r2026)+' en 2026 ('+fmtPts(d)+')'+(favorable?' : amélioration à justifier':' : dégradation')});
  });
  if(fiab){
    let dCA=fiab.caBudget?(fiab.caReel/fiab.caBudget-1)*100:0,dRex=fiab.caBudget?(fiab.rexReel-fiab.rexBudget)/fiab.caBudget*100:0;
    if(dRex<=-SEUILS_REPERES.fiabRex)al.push({niveau:'alerte',texte:'Budget 2026 non tenu : résultat d\'exploitation réalisé '+fmtKRep(fiab.rexReel)+' sur '+fiab.mois+' mois contre '+fmtKRep(fiab.rexBudget)+' budgétés ('+fmtPts(dRex)+' de CA)'});
    if(Math.abs(dCA)>SEUILS_REPERES.fiabCA)al.push({niveau:'info',texte:'CA 2026 réalisé '+(dCA>0?'+':'')+fmtPctRep(dCA)+' par rapport au budget 2026 sur '+fiab.mois+' mois'});
  }
  if(L.ca.manquants)al.push({niveau:'info',texte:'Atterrissage provisoire : estimation des '+L.ca.manquants+' derniers mois non saisie par le contrôle de gestion (budget 2026 retenu)'});
  let ordre={alerte:0,attention:1,info:2};al.sort(function(x,y){return ordre[x.niveau]-ordre[y.niveau];});
  return {lignes:lignes,ratios:ratios,fiabilite:fiab,alertes:al,moisClos:mc};
}
export { INDICATEURS_REPERES, SEUILS_REPERES, valRep, agenceDuTDB, lireTableauDeBord, serieRep, estimRep, atterrissage2026, annuel2025, budget2027Rep, reperesAgence };
