import { ann, monthCA, STRUCTURES } from './calculations.js';
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
  let parAgence={},inconnues=[],annee=null;
  Object.keys(feuilles).forEach(function(onglet){
    let rows=feuilles[onglet]||[];if(!rows.length)return;
    let tete=rows[0]||[];
    let cols=[];tete.forEach(function(h,j){let mt=/^B\s*(\d{1,2})-(\d\d)/.exec(String(h||'').trim());if(mt){cols[+mt[1]-1]=j;annee=2000+(+mt[2]);}});
    if(cols.filter(function(x){return x!==undefined;}).length<12)return;
    let ag=agenceDuTDB(tete[0],agences);
    if(!ag){let n=normRep(tete[0]);if(n&&!/VYV/.test(n))inconnues.push(String(tete[0]).trim());return;}
    // Réalisé du mois : colonne juste avant le budget, ou deux avant quand une colonne « % CA » les sépare (Siège, Exceptionnel : sans % CA)
    let rc=cols.map(function(j){return /%/.test(String(tete[j-1]||''))?j-2:j-1;});
    let reel={},budget={};
    rows.slice(1).forEach(function(r){let lab=String(r[0]||'').trim();if(!lab)return;
      reel[lab]=rc.map(function(j){return valRep(r[j]);});budget[lab]=cols.map(function(j){return valRep(r[j]);});});
    // Mois clos : dernier mois avec un réalisé (CA, charges de personnel ou REX ; le Siège n'a pas de CA)
    let mc=0;["Chiffre d'affaires",'Charges de personnel',"RESULTAT D'EXPLOITATION"].forEach(function(l){let s=reel[l]||[];for(let m=0;m<12;m++)if(s[m]!==null&&s[m]!==undefined&&s[m]!==0&&m+1>mc)mc=m+1;});
    parAgence[ag]={nomTDB:String(tete[0]).trim(),moisClos:mc,reel:reel,budget:budget};
  });
  // Onglet de comparaison « 26 Vs 25 » (ou « 25 Vs 24 en € ») : année précédente, quatre indicateurs
  let comp=Object.keys(feuilles).find(function(o){return /\d\d\s*VS\s*\d\d/i.test(o)&&!/%/.test(o);});
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
  return {annee:annee||2026,parAgence:parAgence,inconnues:inconnues};
}
// Moyenne du réseau (agences opérationnelles, hors structures) : somme des réalisés, budgets et estimations,
// enregistrée sous l'agence « __RESEAU__ » et lisible par tous les profils. Les ratios au CA donnent la moyenne pondérée.
const AGENCE_RESEAU='__RESEAU__';
function agregerReseau(rows){
  let ag={moisClos:12,reel:{},budget:{},estim:{},nbAgences:0};
  Object.keys(rows).forEach(function(nom){
    let r=rows[nom];if(nom===AGENCE_RESEAU||STRUCTURES.indexOf(nom)>=0||!r||!r.reel)return;
    ag.nbAgences++;ag.moisClos=Math.min(ag.moisClos,r.moisClos||0);
    ['reel','budget'].forEach(function(q){Object.keys(r[q]||{}).forEach(function(l){let t=ag[q][l]||(ag[q][l]=Array(12).fill(0));for(let m=0;m<12;m++)t[m]+=valRep(r[q][l][m])||0;});});
    INDICATEURS_REPERES.forEach(function(ind){let t=ag.estim[ind.cle]||(ag.estim[ind.cle]=Array(12).fill(0)),b=serieRep(r,'budget',ind.cle);for(let m=0;m<12;m++){let e=estimRep(r,ind.cle,m);t[m]+=e===null?(valRep(b[m])||0):e;}});
  });
  return ag;
}
// Ligne d'une année : 2026 = la ligne courante, 2025 = l'historique importé (classeur de l'exercice 2025)
function anneeRep(r,annee){if(!r)return null;if(annee===2026)return r.reel?r:null;return r.histo&&r.histo[annee]&&r.histo[annee].reel?r.histo[annee]:null;}
// Part d'une ligne dans le CA sur les mois clos (2026 : janvier à octobre ; 2025 : l'année)
function ratioLigneRep(row,label){
  if(!row||!row.reel)return null;let mc=row.moisClos||0,ca=row.reel["Chiffre d'affaires"],s=row.reel[label];
  if(!mc||!ca||!s)return null;let c=sommeRep(ca,0,mc);return c?sommeRep(s,0,mc)/c*100:null;
}
// Ratio d'un mois (masse salariale / CA…) : réalisé, ou estimation du CG pour les mois non clos
function ratioMoisRep(row,cleNum,m){
  if(!row||!row.reel)return null;
  let v=function(cle){let ind=indRep(cle);if(m<(row.moisClos||0))return valRep((row.reel[ind.label]||[])[m]);let e=estimRep(row,cle,m);return e;};
  let n=v(cleNum),c=v('ca');return n===null||!c?null:n/c*100;
}
// Lignes du compte de résultat comparées en % du CA dans la Synthèse
const LIGNES_COMPARAISON=['Carburant','Crédit bail et location véhicules','Entretiens véhicules - batîment','Location immobilières et charges locatives','Assurance','Péages','Honoraires et prestations de services','Matériels ambulances','Autres Achats et charges externes','Impôts, taxes et versements assimilés','Charges de personnel',"EXCEDENT BRUT D'EXPLOITATION",'Dotations amortissements et provisions',"RESULTAT D'EXPLOITATION"];
function comparaisonsLignes(a,r,reseau){
  let ca27=budget2027Rep(a,'ca');
  return LIGNES_COMPARAISON.map(function(l){
    return {label:l,r2025:ratioLigneRep(anneeRep(r,2025),l),r2026:ratioLigneRep(anneeRep(r,2026),l),r2027:ca27?ann(a,l)/ca27*100:null,
      res2025:ratioLigneRep(anneeRep(reseau,2025),l),res2026:ratioLigneRep(anneeRep(reseau,2026),l)};
  });
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
// Atterrissage du CA saisi par le contrôle de gestion dans Données agences (« CA 2026 », a.histCA) : les mois non clos
// reçoivent la différence avec le réalisé, répartie comme le budget 2026 de ces mois. Une estimation du CA saisie dans
// le tableau de bord reste prioritaire.
function completerAtterrissageCA(r,caCG){
  caCG=valRep(caCG);if(!r||!r.reel||!caCG||caCG<=0)return r;
  let mc=r.moisClos||0;if(mc>=12)return r;
  let e=r.estim&&r.estim.ca;if(e&&e.some(function(v,m){return m>=mc&&valRep(v)!==null;}))return r;
  let reste=caCG-sommeRep(serieRep(r,'reel','ca'),0,mc);if(reste<=0)return r;
  let b=serieRep(r,'budget','ca'),tb=sommeRep(b,mc,12),ca=Array(12).fill(null);
  for(let m=mc;m<12;m++)ca[m]=tb>0?reste*(valRep(b[m])||0)/tb:reste/(12-mc);
  return Object.assign({},r,{estim:Object.assign({},r.estim||{},{ca:ca}),caAtterrissageCG:caCG});
}
function annuel2025(r,cle){let h=anneeRep(r,2025);if(h){let s=serieRep(h,'reel',cle);if(s.length)return sommeRep(s,0,12);}let s=serieRep(r,'n1',cle);return s.length?sommeRep(s,0,12):null;}
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
  if(!r||!r.reel)return null;
  r=completerAtterrissageCA(r,a&&a.histCA);
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
  if(r.caAtterrissageCG)al.push({niveau:'info',texte:'CA 2026 : atterrissage du contrôle de gestion (Données agences), novembre et décembre déduits du réalisé'});
  if(L.ca.manquants)al.push({niveau:'info',texte:'Atterrissage provisoire : estimation des '+L.ca.manquants+' derniers mois non saisie par le contrôle de gestion (budget 2026 retenu)'});
  let ordre={alerte:0,attention:1,info:2};al.sort(function(x,y){return ordre[x.niveau]-ordre[y.niveau];});
  return {lignes:lignes,ratios:ratios,fiabilite:fiab,alertes:al,moisClos:mc};
}
export { completerAtterrissageCA, AGENCE_RESEAU, agregerReseau, anneeRep, ratioLigneRep, ratioMoisRep, LIGNES_COMPARAISON, comparaisonsLignes, INDICATEURS_REPERES, SEUILS_REPERES, valRep, agenceDuTDB, lireTableauDeBord, serieRep, estimRep, atterrissage2026, annuel2025, budget2027Rep, reperesAgence };
