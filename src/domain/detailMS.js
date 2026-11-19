import { buildPeriodesPaie, hsRows, joursSemaine, mainMonth, chMois, coefHSMois, ratioMaintien, partCDDSemaine, TAUX_PRECARITE_CDD, coutHoraireImproductif, msNRMensuel, msNRMois, partRoulant, estRoulantPart, isCDD, empPresent, cleJour, msRoulantBaseMois, couvertParLigneNR, varDec2026Total, lissage5eSemaine, payrollPayMonth, nbSemPeriode, cpAcquisMois, cpPrisMois, variationStockCPMois, CP_HEURES_JOUR, cpNRAcquisMois, cpNRPrisMois, coutJourCPNR, variationStockCPNRMois, etpNR } from './calculations.js';
// Détail du calcul de la masse salariale d'un mois de paie (écran Périodes de paie, nov. 2026).
// Chaque ligne donne son montant et sa formule avec les chiffres ; la somme des lignes est égale à payrollPayMonth(a, m).
const LIGNES_DETAIL_MS = [
  ['base', 'Salaire de base des roulants (mensualisé)'],
  ['hs', 'Heures supplémentaires des roulants (majorées)'],
  ['mal', 'Retenue maladie non maintenue'],
  ['abs', 'Retenue absences non payées'],
  ['lissage', 'Lissage de la 5e semaine de HS'],
  ['cpvar', 'Variation du stock de congés payés (provision)'],
  ['dec', 'Variables de décembre 2026'],
  ['nr', 'Non-roulants'],
  ['cpnrvar', 'Variation du stock de CP des non-roulants'],
  ['dr', 'Quote-part DR'],
  ['hsnr', 'Heures supplémentaires des non-roulants'],
  ['repas', 'Indemnités repas et IDJF']
];
function fmtH(v){return (Math.round(v*10)/10).toLocaleString('fr-FR')+' h';}
function detailMSMois(a,m){
  let periodes=a.periodesPaie||buildPeriodesPaie(),p=periodes[m];
  if(!p)return {mois:m,lignes:[],total:0};
  let debut=new Date(p.debut),fin=new Date(p.fin),rm=ratioMaintien(a);
  let hsH=0,hsE=0,malH=0,malE=0,absH=0,absE=0,hiH=0,hiE=0,repas=0;
  hsRows(a).forEach(function(r){
    let j=joursSemaine(a,r.week);if(!j.length)return;
    let ratio=j.filter(function(d){let dt=new Date(2027,d.month,d.day);return dt>=debut&&dt<=fin;}).length/j.length;
    if(ratio<=0)return;
    let mm=mainMonth(a,r.week),ch=chMois(a,mm),k=(1+TAUX_PRECARITE_CDD*partCDDSemaine(a,r.week))*ratio;
    hsH+=(r.hs||0)*ratio;hsE+=(r.hs||0)*ch*coefHSMois(a,mm)*k;
    malH+=(r.mal||0)*(1-rm)*ratio;malE+=(r.mal||0)*ch*(1-rm)*k;
    absH+=(r.otherH||0)*ratio;absE+=(r.otherH||0)*ch*k;
    let hi=a.hsImproductif&&a.hsImproductif[r.week]?+a.hsImproductif[r.week]:0;
    if(hi){hiH+=hi*ratio;hiE+=hi*coutHoraireImproductif(a)*coefHSMois(a,mm)*ratio;}
    let w=r.week,v=function(o){return o&&o[w]?+o[w]:0;};
    repas+=(v(a.repasRoulant)+v(a.repasNonRoulant)+v(a.idjfRoulant)+v(a.idjfNonRoulant))*ratio;
  });
  // Salaire de base : heures mensualisées de l'équipe roulante présente, taux du mois civil
  let nbj=new Date(2027,m+1,0).getDate(),hBase=0,hCDD=0,nbSal=0;
  (a.employees||[]).filter(function(e){return estRoulantPart(e)&&!couvertParLigneNR(a,e);}).forEach(function(e){
    let f=1;
    if(e.dateEntree||e.dateSortie){let n=0;for(let d=1;d<=nbj;d++)if(empPresent(e,cleJour(m,d)))n++;f=n/nbj;}
    if(f>0)nbSal++;
    let h=(+e.hours||0)*partRoulant(e)*52/12*f;hBase+=h;if(isCDD(e))hCDD+=h;
  });
  let base=msRoulantBaseMois(a,m),ch=chMois(a,m);
  let nrLigne=msNRMensuel(a)!==null;
  let nr=nrLigne?msNRMois(a,m):(a.employees||[]).filter(function(e){return ['DEA','AA','TAXI','TPMR','FACTURIERE'].indexOf(e.qual)<0;})
    .reduce(function(s,e){return s+(+e.coutJour||0)*(1-partRoulant(e))*(+e.joursSem||5)*52/12;},0);
  let dr=nrLigne?0:(+a.drCostAnnual||0)*(+a.drPct||0)/100/12;
  let lis=lissage5eSemaine(a,m),dec=m===0?varDec2026Total(a):0;
  let nrA=cpNRAcquisMois(a,m),nrP=cpNRPrisMois(a,m),nrV=variationStockCPNRMois(a,m),nrC=coutJourCPNR(a),j1=function(v){return (Math.round(v*10)/10).toLocaleString('fr-FR')+' j';};
  let cpA=cpAcquisMois(a,m),cpP=cpPrisMois(a,m),cpV=variationStockCPMois(a,m);
  let det={
    base:[base,nbSal+' roulant(s) présent(s) : '+fmtH(hBase)+' (heures du contrat × part roulante × 52/12, au prorata des jours de présence) × '+ch.toFixed(2).replace('.',',')+' €/h'+(hCDD>0?' + précarité CDD 10 % sur '+fmtH(hCDD):'')],
    hs:[hsE,fmtH(hsH)+' de HS dans la période ('+p.debut.split('-').reverse().join('/')+' – '+p.fin.split('-').reverse().join('/')+', '+nbSemPeriode(p)+' sem.) × taux horaire × majoration 25 / 50 % du mois, précarité CDD comprise'],
    mal:[-malE,fmtH(malH)+' de maladie non maintenue (maladie de la période × (1 − maintien '+Math.round(rm*100)+' %)) × taux horaire'],
    abs:[-absE,fmtH(absH)+' d\'absences non payées × taux horaire'],
    lissage:[lis,lis===0?'Pas de lissage ce mois-ci':(lis<0?'Mois à 5 semaines : − 2/3 d\'une semaine moyenne de HS de la période':'+ 1/3 de la semaine de HS lissée du mois à 5 semaines du trimestre')],
    cpvar:[cpV,'Jours acquis dans le mois '+(Math.round(cpA*10)/10).toLocaleString('fr-FR')+' j − jours posés '+(Math.round(cpP*10)/10).toLocaleString('fr-FR')+' j = '+(Math.round((cpA-cpP)*10)/10).toLocaleString('fr-FR')+' j × '+(Math.round(CP_HEURES_JOUR*100)/100).toLocaleString('fr-FR')+' h × '+ch.toFixed(2).replace('.',',')+' €/h (dotation quand l\'équipe acquiert plus qu\'elle ne pose, reprise les mois de congés)'],
    dec:[dec,m===0?'Variables de décembre 2026 saisies (chargées), payées sur la paie de janvier':'Janvier seulement'],
    nr:[nr,nrLigne?'Ligne Données agences : brut mensuel '+Math.round(+a.msNRBrutMensuel||0).toLocaleString('fr-FR')+' € × (1 + '+String(+a.msNRTauxCharges||0).replace('.',',')+' % de charges), sans lien avec l\'équipe ni les % roulants':'Coût journalier × jours par semaine × 52/12 × part non roulante'],
    cpnrvar:[nrV,nrC?'Jours acquis '+j1(nrA)+' ('+String(etpNR(a)).replace('.',',')+' ETP × 2,5 j) − jours posés '+j1(nrP)+' = '+j1(nrA-nrP)+' × '+(Math.round(nrC*100)/100).toLocaleString('fr-FR')+' € par jour (MS non roulante mensuelle / ETP / 26 jours ouvrables)':'Sans objet : ETP non roulants ou MS non roulante non saisis dans Données agences'],
    dr:[dr,nrLigne?'Incluse dans la ligne non-roulants':'Coût annuel du DR × quote-part / 12'],
    hsnr:[hiE,fmtH(hiH)+' saisies × coût horaire des non-roulants × majoration du mois'],
    repas:[repas,'Indemnités repas et IDJF saisies par semaine, au prorata des jours de la période']
  };
  let lignes=LIGNES_DETAIL_MS.map(function(l){return {cle:l[0],lib:l[1],montant:det[l[0]][0],formule:det[l[0]][1]};});
  let total=lignes.reduce(function(s,l){return s+l.montant;},0);
  return {mois:m,periode:p,lignes:lignes,total:total,calcule:payrollPayMonth(a,m)};
}
// Feuille Excel : une ligne par poste, une colonne par mois de paie, puis les formules de chaque mois
function feuillesDetailMS(a){
  let d=[0,1,2,3,4,5,6,7,8,9,10,11].map(function(m){return detailMSMois(a,m);});
  let mois=d.map(function(x){return x.periode?x.periode.mois:'';});
  let t=[['Poste'].concat(mois).concat(['Total'])];
  LIGNES_DETAIL_MS.forEach(function(l,i){let v=d.map(function(x){return Math.round(x.lignes[i]?x.lignes[i].montant:0);});t.push([l[1]].concat(v).concat([v.reduce(function(s,x){return s+x;},0)]));});
  let tot=d.map(function(x){return Math.round(x.total);});t.push(['Total masse salariale'].concat(tot).concat([tot.reduce(function(s,x){return s+x;},0)]));
  let f=[['Mois de paie','Poste','Montant (€)','Formule']];
  d.forEach(function(x){x.lignes.forEach(function(l){f.push([x.periode?x.periode.mois:'',l.lib,Math.round(l.montant),l.formule]);});});
  return [{nom:'Masse salariale par mois',lignes:t,largeurs:[44].concat(mois.map(function(){return 12;})).concat([14])},{nom:'Formules',lignes:f,largeurs:[12,44,14,110]}];
}
export { LIGNES_DETAIL_MS, detailMSMois, feuillesDetailMS };
