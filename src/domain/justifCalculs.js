import { M, chMois, CP_HEURES_JOUR, hsRows, pres, absPartMois, partSemaineMois, cpNRAcquisMois, cpAcquisMois, cpPrisMois, variationStockCPNRMois } from './calculations.js';
import { detailMSMois, feuillesDetailMS } from './detailMS.js';
// Justification des calculs (écran « Détail des calculs », contrôleur de gestion et direction financière, nov. 2026).
// Tous les montants viennent des mêmes fonctions que le reste de l'application : rien n'est recalculé autrement.

// Congés payés des roulants, mois par mois : acquisition (stockage) et prise (déstockage), en jours ouvrables,
// en heures (1 j = 35/6 h) et valorisés au coût horaire chargé du mois. Stock d'ouverture au 31/12/2026 : facultatif,
// saisi par le contrôleur de gestion (a.stockCP2026, jours ouvrables de l'équipe roulante), valorisé au coût horaire de janvier ; 0 sinon.
function stockCPOuverture(a){let v=a&&a.stockCP2026;return (v===null||v===undefined||v==='')?null:Math.max(0,+v||0);}
function tableauCPStock(a){
  let ouv=stockCPOuverture(a)||0,stockJ=ouv,stockE=ouv*CP_HEURES_JOUR*chMois(a,0);
  return M.map(function(lib,m){
    let ch=chMois(a,m),acq=cpAcquisMois(a,m),pris=cpPrisMois(a,m);
    let acqE=acq*CP_HEURES_JOUR*ch,prisE=pris*CP_HEURES_JOUR*ch;
    stockJ+=acq-pris;stockE+=acqE-prisE;
    let nrAcq=cpNRAcquisMois(a,m),nrPris=a.cpNR&&a.cpNR.jours?(+a.cpNR.jours[m]||0):0,nrVar=variationStockCPNRMois(a,m);
    return {mois:m,lib:lib,taux:ch,acquisJ:acq,acquisH:acq*CP_HEURES_JOUR,acquisE:acqE,prisJ:pris,prisH:pris*CP_HEURES_JOUR,prisE:prisE,
      variationJ:acq-pris,variationE:acqE-prisE,stockJ:stockJ,stockE:stockE,nrAcquisJ:nrAcq,nrPrisJ:nrPris,nrVariationE:nrVar};
  });
}
// Heures du mois civil (semaines à cheval au prorata des jours) : besoin, capacité, congés, maladie, absences, HS
function tableauHeures(a){
  let rows=hsRows(a);
  return M.map(function(lib,m){
    let t={mois:m,lib:lib,besoin:0,base:0,cp:0,maladie:0,absPayees:0,absNonPayees:0,dispo:0,hs:0};
    rows.forEach(function(r){
      let k=partSemaineMois(a,r.week,m);if(!k)return;
      let p=pres(a,r.week);
      t.besoin+=(r.hours||0)*k;t.base+=p.base*k;t.maladie+=p.mal*k;t.dispo+=p.av*k;t.hs+=(r.hs||0)*k;
      t.cp+=absPartMois(a,r.week,'cp',m)*CP_HEURES_JOUR;
      t.absPayees+=absPartMois(a,r.week,'otherPaid',m)*7;t.absNonPayees+=absPartMois(a,r.week,'other',m)*7;
    });
    return t;
  });
}
// Variables de paie par mois de paie (période de 4 ou 5 semaines) : extraites du détail de la masse salariale
function tableauVariables(a){
  return M.map(function(lib,m){
    let d=detailMSMois(a,m),g=function(k){let l=d.lignes.find(function(x){return x.cle===k;});return l?l.montant:0;};
    return {mois:m,lib:lib,periode:d.periode,hs:g('hs'),retMaladie:g('mal'),retAbsences:g('abs'),lissage:g('lissage'),dec2026:g('dec'),hsNR:g('hsnr'),repas:g('repas'),
      total:g('hs')+g('mal')+g('abs')+g('lissage')+g('dec')+g('hsnr')+g('repas')};
  });
}
// Classeur Excel complet : masse salariale (montants + formules), variables de paie, stock de congés, heures
function feuillesJustif(a){
  let r=function(v){return Math.round(v);},r1=function(v){return Math.round(v*10)/10;};
  let f=feuillesDetailMS(a);
  let v=tableauVariables(a);
  f.push({nom:'Variables de paie',largeurs:[12,14,14,14,14,14,14,14,14],lignes:[['Mois de paie','HS majorées','Retenue maladie','Retenue absences','Lissage 5e sem.','Variables déc. 2026','HS non-roulants','Repas et IDJF','Total variables']].concat(v.map(function(x){return [x.lib,r(x.hs),r(x.retMaladie),r(x.retAbsences),r(x.lissage),r(x.dec2026),r(x.hsNR),r(x.repas),r(x.total)];}))});
  let c=tableauCPStock(a);
  f.push({nom:'Stock congés payés',largeurs:[12,12,12,14,12,12,14,14,12,14,12,12,14],lignes:[['Mois','Coût horaire','Acquis (j)','Stockage (€)','Pris (j)','Pris (h)','Déstockage (€)','Variation (€)','Stock (j)','Stock (€)','Non-roulants acquis (j)','Non-roulants pris (j)','Non-roulants variation (€)']].concat(stockCPOuverture(a)!==null?[['Stock au 31/12/2026','','','','','','','',r1(stockCPOuverture(a)),r(stockCPOuverture(a)*CP_HEURES_JOUR*chMois(a,0)),'','','']]:[]).concat(c.map(function(x){return [x.lib,Math.round(x.taux*100)/100,r1(x.acquisJ),r(x.acquisE),r1(x.prisJ),r1(x.prisH),r(x.prisE),r(x.variationE),r1(x.stockJ),r(x.stockE),r1(x.nrAcquisJ),r1(x.nrPrisJ),r(x.nrVariationE)];}))});
  let h=tableauHeures(a);
  f.push({nom:'Heures par mois',largeurs:[12,12,12,12,12,12,12,12,12],lignes:[['Mois','Besoin','Heures contrat','Congés','Maladie','Abs. payées','Abs. non payées','Disponibles','HS']].concat(h.map(function(x){return [x.lib,r(x.besoin),r(x.base),r(x.cp),r(x.maladie),r(x.absPayees),r(x.absNonPayees),r(x.dispo),r(x.hs)];}))});
  return f;
}
export { stockCPOuverture, tableauCPStock, tableauHeures, tableauVariables, feuillesJustif };
