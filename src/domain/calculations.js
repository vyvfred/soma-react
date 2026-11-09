// SOMA — Noyau de calcul metier (extraction verbatim depuis index.html).
// Fonctions PURES sur l'objet agence `a` : aucun DOM, aucun etat global.
// Ne pas reformuler la logique — toute modification doit rester iso-comportement.

// ── Constantes de reference ──
const M=["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
const T=[{"label":"Chiffre d'affaires","type":"product"},{"label":"Achats Matières premières et sous traitance","type":"charge"},{"label":"Variations stock marchandises et autres approvisionnements","type":"charge"},{"label":"MARGE BRUTE GLOBALE","type":"subtotal"},{"label":"Electricité - eau - chauffage","type":"charge"},{"label":"Matériels ambulances","type":"charge"},{"label":"Carburant","type":"charge"},{"label":"Entretiens petits équipements","type":"charge"},{"label":"Fourniture bureau - vêtements","type":"charge"},{"label":"Sous traitance","type":"charge"},{"label":"Crédit bail et location véhicules","type":"charge"},{"label":"Location téléphonie - informatique - mobilité","type":"charge"},{"label":"Location immobilières et charges locatives","type":"charge"},{"label":"Entretiens véhicules - batîment","type":"charge"},{"label":"Maintenance informatique","type":"charge"},{"label":"Assurance","type":"charge"},{"label":"Formation - documentation","type":"charge"},{"label":"Honoraires et prestations de services","type":"charge"},{"label":"Publicité - cadeaux","type":"charge"},{"label":"Frais de déplacement - missions réceptions","type":"charge"},{"label":"Péages","type":"charge"},{"label":"Affranchissement","type":"charge"},{"label":"Téléphonie - internet","type":"charge"},{"label":"Frais bancaires et cotisations","type":"charge"},{"label":"Autres Achats et charges externes","type":"subtotal"},{"label":"VALEUR AJOUTEE","type":"subtotal"},{"label":"Subventions d'exploitation","type":"product"},{"label":"Impôts, taxes et versements assimilés","type":"charge"},{"label":"Charges de personnel","type":"charge"},{"label":"Quote-part MS siège","type":"charge"},{"label":"Quote-part régulation mutualisée","type":"charge"},{"label":"EXCEDENT BRUT D'EXPLOITATION","type":"subtotal"},{"label":"Reprises s/ charges et transferts","type":"product"},{"label":"Autres produits","type":"product"},{"label":"Dotations amortissements et provisions","type":"charge"},{"label":"Autres charges","type":"charge"},{"label":"RESULTAT D'EXPLOITATION","type":"subtotal"},{"label":"Produits financiers","type":"product"},{"label":"Charges financières","type":"charge"},{"label":"RESULTAT FINANCIER","type":"subtotal"},{"label":"RESULTAT COURANT AVANT IMPOT","type":"subtotal"},{"label":"Produits exceptionnels","type":"product"},{"label":"Charges exceptionnelles","type":"charge"},{"label":"RESULTAT EXCEPTIONNEL","type":"subtotal"},{"label":"Impôt sur les sociétés","type":"charge"},{"label":"Participation aux bénéfices","type":"charge"},{"label":"RESULTAT NET","type":"subtotal"}];
// Structures hors agences (demande du CG, nov. 2026) : le CG saisit tout leur compte de résultat ligne par ligne,
// CA et charges de personnel compris. Seul le Siège porte l'IS et la participation.
const STRUCTURES=['CENTRE DE FORMATION','EXCEPTIONNEL','RESEAU ADHERENT','SIEGE'];
const LIB_STRUCTURES={'CENTRE DE FORMATION':'Formation','EXCEPTIONNEL':'Exceptionnel','RESEAU ADHERENT':'Réseau adhérent','SIEGE':'Siège'};
const LIGNES_SIEGE=['Impôt sur les sociétés','Participation aux bénéfices'];
// Quotes-parts de charges de personnel réparties par le CG (demande de Florent, nov. 2026) : coût annuel du siège
// et de la régulation mutualisée ventilé sur chaque agence selon une clé libre, lissé sur 12 mois. Agences uniquement :
// les structures n'en portent pas (le Siège est à 0 en charges de personnel puisque tout est ventilé). 0 = non concernée.
const LIGNES_QUOTE_PART=['Quote-part MS siège','Quote-part régulation mutualisée'];
function estStructure(a){return !!a&&STRUCTURES.indexOf(a.name)>=0}
function estSiege(a){return !!a&&a.name==='SIEGE'}
// Le REX d'une agence voit son compte de résultat jusqu'au résultat d'exploitation ; les lignes en dessous
// ne sont visibles qu'à partir du Directeur Régional.
function vueExploitation(a,role){return role==='rex'&&!estStructure(a)}
function resultatAffiche(a,role){return vueExploitation(a,role)?{lib:"Résultat d'exploitation",libMin:"résultat d'exploitation",val:ann(a,"RESULTAT D'EXPLOITATION")}:{lib:'Résultat net',libMin:'résultat',val:ann(a,"RESULTAT NET")}}
function lignesSIG(a,role,consolide){let l=T.filter(function(r){return (consolide||estSiege(a)||LIGNES_SIEGE.indexOf(r.label)<0)&&(consolide||!estStructure(a)||LIGNES_QUOTE_PART.indexOf(r.label)<0);});if(!consolide&&vueExploitation(a,role)){let i=l.findIndex(function(r){return r.label==="RESULTAT D'EXPLOITATION";});l=l.slice(0,i+1);}return l}
// CA d'une structure : saisi (mensuel ou annuel). Le mode « % du CA » n'a pas de sens pour le CA lui-même.
function caStructure(a,m){let x=a.rex&&a.rex["Chiffre d'affaires"];if(!x)return 0;if(x.mode==='annual')return (+x.annual||0)/12;if(x.mode==='month')return x.values&&x.values[m]!==null&&x.values[m]!==undefined?+x.values[m]:0;return 0}
const feries=['2027-01-01','2027-03-29','2027-05-01','2027-05-06','2027-05-08','2027-05-17','2027-07-14','2027-08-15','2027-11-01','2027-11-11','2027-12-25'];
const vac={
  A:[['2027-01-01','2027-01-03'],['2027-02-13','2027-02-28'],['2027-04-10','2027-04-25'],['2027-07-03','2027-09-01'],['2027-10-23','2027-11-07'],['2027-12-18','2027-12-31']],
  B:[['2027-01-01','2027-01-03'],['2027-02-20','2027-03-07'],['2027-04-17','2027-05-02'],['2027-07-03','2027-09-01'],['2027-10-23','2027-11-07'],['2027-12-18','2027-12-31']],
  C:[['2027-01-01','2027-01-03'],['2027-02-06','2027-02-21'],['2027-04-03','2027-04-18'],['2027-07-03','2027-09-01'],['2027-10-23','2027-11-07'],['2027-12-18','2027-12-31']]
};

// ── Fonctions ──
function agency(name){let a={name,histCA:null,histCA2025:null,histTXR2026:null,targetAbsRate:null,perspectives:'',targetCA:null,targetTXR:null,schoolZone:'B',actSan:true,actSai:false,actTP:false,moisVerrouilles:[],moisActif:null,cgLocked:false,tauxAbsImproductif:null,tauxHoraireBrutJuin:null,msNRBrutMensuel:null,msNRTauxCharges:null,ratioMaintien:null,hsImproductif:{},repasRoulant:{},repasNonRoulant:{},idjfRoulant:{},idjfNonRoulant:{},
  // Calendrier des périodes de paie 2027
  // Format : [{mois:'Janvier', debut:'2026-12-07', fin:'2027-01-10', semaines:5}...]
  periodesPaie:null,variablesDec2026:null,refs:{san:refs(),sai:refs(),tp:refs()},cal:[],employees:[],presence:{},sick:Array(12).fill(null),hs50:Array(12).fill(null),tauxHoraireBrut:null,tauxChargePatronal:null,costHour:null,hsCostRate:1.25,drCostAnnual:0,drPct:0,rex:{}};T.forEach(r=>{if(r.type!=='subtotal')a.rex[r.label]={values:Array(12).fill(null),mode:r.label==='Carburant'||LIGNES_QUOTE_PART.indexOf(r.label)>=0?'annual':'month',chargeType:LIGNES_QUOTE_PART.indexOf(r.label)>=0?'fixe':r.type==='charge'?'variable':'fixe',allocationKey:r.label==='Carburant'?'ca':'monthly12',pct:r.label==='Carburant'?5.2:0,annual:0}});return a}

function annualCA(a){return M.reduce((s,_,m)=>s+monthCA(a,m),0)}

function annualCAWeight(a,m){let total=annualCA(a);return total?monthCA(a,m)/total:1/12}

function baseH(a){
  // Moyenne sur toutes les semaines si dates présentes, sinon calcul simple
  let hasMovements = a.employees.some(e=>e.dateEntree||e.dateSortie);
  if(!hasMovements || !a.cal || !a.cal.length){
    return a.employees.filter(estRoulantPart).reduce((s,e)=>s+(+e.hours||0)*partRoulant(e),0);
  }
  let weeks=needWeeks(a);
  if(!weeks.length) return a.employees.filter(estRoulantPart).reduce((s,e)=>s+(+e.hours||0)*partRoulant(e),0);
  let total=weeks.reduce((s,w)=>s+baseHWeek(a,w.week),0);
  return total/weeks.length;
}

function baseHWeek(a, week){
  let dateRef = week!==undefined ? weekRefDate(a, week) : null;
  return a.employees.filter(estRoulantPart).reduce((s,e)=>{
    if(dateRef && !empPresent(e, dateRef)) return s;
    return s+(+e.hours||0)*partRoulant(e);
  },0);
}

function between(d,s,e){return d>=s&&d<=e}

function buildPeriodesPaie() {
  // Règle : 5 semaines en début de trimestre (jan/avr/juil/oct), 4 semaines les autres mois
  // Calcul basé sur la même logique que le calendrier 2026 fourni
  return [
    {mois:'Janvier',  debut:'2026-12-07', fin:'2027-01-10', nbSem:5},
    {mois:'Février',  debut:'2027-01-11', fin:'2027-02-07', nbSem:4},
    {mois:'Mars',     debut:'2027-02-08', fin:'2027-03-07', nbSem:4},
    {mois:'Avril',    debut:'2027-03-08', fin:'2027-04-11', nbSem:5},
    {mois:'Mai',      debut:'2027-04-12', fin:'2027-05-09', nbSem:4},
    {mois:'Juin',     debut:'2027-05-10', fin:'2027-06-06', nbSem:4},
    {mois:'Juillet',  debut:'2027-06-07', fin:'2027-07-11', nbSem:5},
    {mois:'Août',     debut:'2027-07-12', fin:'2027-08-08', nbSem:4},
    {mois:'Septembre',debut:'2027-08-09', fin:'2027-09-05', nbSem:4},
    {mois:'Octobre',  debut:'2027-09-06', fin:'2027-10-10', nbSem:5},
    {mois:'Novembre', debut:'2027-10-11', fin:'2027-11-07', nbSem:4},
    {mois:'Décembre', debut:'2027-11-08', fin:'2027-12-05', nbSem:4},
  ];
  // NB: période 06/12/2027 → 31/12/2027 = variables à reporter sur paie jan 2028
}

function coefHSMois(a, mois){
  let p50 = tauxHS50Mois(a, mois);
  return (1 - p50) * 1.25 + p50 * 1.50;
}

function coefHSMoyen(a){
  // Pondération par le volume de HS mensuel pour un coût moyen juste
  let totHS = 0, totCoef = 0;
  let hsR = hsRows(a);
  for(let m=0;m<12;m++){
    let hsM = hsR.filter(function(r){return mainMonth(a,r.week)===m;}).reduce(function(s,r){return s+(r.hs||0);},0);
    if(hsM>0){ totHS += hsM; totCoef += hsM * coefHSMois(a, m); }
  }
  if(totHS>0) return totCoef/totHS;
  // Pas de HS : coefficient moyen simple des mois renseignés, sinon 1,25
  return 1.25;
}

function coutHSTotal(a){
  // Somme du coût des HS mois par mois, chaque mois avec son coefficient réel (25/50)
  let hsR = hsRows(a);
  let ch = (+a.costHour||0);
  let total = 0;
  for(let m=0;m<12;m++){
    let hsM = hsR.filter(function(r){return mainMonth(a,r.week)===m;}).reduce(function(s,r){return s+(r.hs||0);},0);
    total += hsM * chMois(a, m) * coefHSMois(a, m);
  }
  return total;
}

function coutHoraireImproductif(a){
  let cm = msNRMensuel(a);
  if(cm!==null){
    let hHebdo = a.employees.filter(e=>!isRoulant(e.qual)).reduce((s,e)=>s+(+e.hours||0)*(1-partRoulant(e)),0);
    cm=Math.max(0, cm-transfertRoulantNR(a));
    return hHebdo>0 ? cm/(hHebdo*52/12) : (+a.costHour||0);
  }
  let imp = a.employees.filter(e=>!isRoulant(e.qual)&&e.qual!=='FACTURIERE'&&(+e.coutJour||0)>0);
  if(!imp.length) return (+a.costHour||0);
  let moyJour = imp.reduce((s,e)=>s+(+e.coutJour||0),0)/imp.length;
  return moyJour/7;
}

// Congés payés : 25 jours ouvrés par an (5 semaines légales = 175 h pour un temps plein), soit 25/12 par mois.
const CP_JOURS_MOIS = 25/12;
function cpGeneres(a) {
  // CP générés, en jours de 7 h retirés de la présence ROULANTE (audit nov. 2026) :
  // 25/12 j par mois de présence hors maladie, au prorata du temps de travail (heures / 35) et de la part roulante.
  // Les non-roulants n'entrent pas : leurs congés n'enlèvent pas de capacité de production.
  let salaries = a.employees.filter(estRoulantPart);
  if (!salaries.length) return 0;
  let totalJ = 0;
  M.forEach(function(_, m) {
    let tauxMal = a.sick[m] !== null && a.sick[m] !== undefined ? +a.sick[m] / 100 : 0;
    let dateRef = '2027-' + String(m+1).padStart(2,'0') + '-15';
    salaries.forEach(function(e){
      if(!empPresent(e, dateRef)) return;
      totalJ += CP_JOURS_MOIS * (1 - tauxMal) * ((+e.hours||0) / 35) * partRoulant(e);
    });
  });
  return Math.round(totalJ * 10) / 10;
}
// Heures roulantes disponibles sur l'année hors heures supplémentaires : base contractuelle moins
// la maladie (taux moyen saisi, sinon cible) et les congés générés. Ne dépend pas du placement des CP.
function heuresDispoAnnuelles(a) {
  let remplis = (a.sick||[]).filter(function(v){ return v!==null && v!==undefined; });
  let mal = remplis.length ? remplis.reduce(function(s,v){ return s+(+v||0); },0)/remplis.length/100 : (+a.targetAbsRate||0)/100;
  return Math.max(0, baseH(a)*52*(1-mal) - cpGeneres(a)*7);
}

function cpPlanifies(a) {
  return Object.values(a.presence || {}).reduce(function(s, p) {
    return s + (+p.cp || 0);
  }, 0);
}

function empPresent(e, dateISO){
  if(e.dateEntree){
    if(dateISO < e.dateEntree) return false;
  }
  if(e.dateSortie){
    if(dateISO > e.dateSortie) return false;
  }
  return true;
}

function genCal(a){a.cal=[];for(let m=0;m<12;m++){let days=new Date(2027,m+1,0).getDate();for(let d=1;d<=days;d++){let dt=new Date(2027,m,d),type=typeDay(dt,a),ca={san:+a.refs.san[m][type]||0,sai:+a.refs.sai[m][type]||0,tp:+a.refs.tp[m][type]||0};a.cal.push({month:m,day:d,week:isoWeek(dt),type,ca,total:ca.san+ca.sai+ca.tp})}}}

function hsRows(a){
  let seuils=refAgenceSeuilsBase(a);
  return needWeeks(a).map(n=>{
    let p=pres(a,n.week),gap=n.hours-p.av,hs=Math.max(0,gap),under=Math.max(0,-gap);
    let t=hs>seuils.seuilTensionCrit?'critique':hs>seuils.seuiltensionWarn?'warning':under>seuils.seuiltensionWarn?'sous-charge':'ok';
    return {...n,...p,gap,hs,under,t};
  });
}

function impactCPSemaine(a, week, deltaCPjours) {
  // Impact financier d'ajouter/retirer deltaCPjours sur cette semaine
  // 1J de CP = 7h. Si semaine en HS, retirer 1J = +7h HS = +7*costHour*hsCostRate
  // Si semaine en sous-charge, ajouter 1J = économie nulle (pas de HS à éviter)
  let hr = hsRows(a).find(function(r){ return r.week === week; }) || {hs:0, gap:0};
  let hsDelta = -deltaCPjours * 7; // retirer CP augmente les HS
  let costHour = chMois(a, mainMonth(a, week)) || 28.5;
  let coefHS = coefHSMois(a, mainMonth(a, week));
  if (hr.gap > 0) {
    // Semaine en tension : chaque heure compte
    return Math.round(hsDelta * costHour * coefHS);
  } else {
    // Sous-charge : impact marginal
    return Math.round(hsDelta * costHour * 0.3);
  }
}

// Part roulante d'un salarié (clé roulant / non-roulant). 0 % = non roulant ; seul un champ vide vaut 100 %.
// (Avant nov. 2026 : « +e.pctRoulant||100 » comptait un salarié saisi à 0 % comme roulant à 100 %.)
// Toutes qualifications (nov. 2026) : un régulateur, un REX… peut avoir une part roulante. Champ vide : 100 % pour
// DEA/AA/TAXI/TPMR, 0 % pour les autres. Facturière jamais roulante. La part roulante est comptée en capacité et en
// masse salariale roulante (au coût horaire de l'agence) : le CG la retire de la ligne non-roulants.
function partRoulant(e){if(!e||String(e.qual||'').toUpperCase()==='FACTURIERE')return 0;let d=isRoulant(e.qual)?1:0,p=e.pctRoulant;if(p===null||p===undefined||p==='')return d;p=+p;return isNaN(p)?d:Math.max(0,Math.min(100,p))/100}
function estRoulantPart(e){return partRoulant(e)>0}
function isRoulant(qual){return ['DEA','AA','TAXI','TPMR'].includes((qual||'').toUpperCase())}

function isVac(iso,z){return (vac[z]||vac.B).some(x=>between(iso,x[0],x[1]))}

function isoWeek(date){let d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())),day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);let y=new Date(Date.UTC(d.getUTCFullYear(),0,1));return Math.ceil((((d-y)/86400000)+1)/7)}

function mainMonth(a,w){let c={};a.cal.filter(d=>d.week==w).forEach(d=>c[d.month]=(c[d.month]||0)+1);return +(Object.entries(c).sort((x,y)=>y[1]-x[1])[0]?.[0]||0)}

function manual(a,l,m){let x=a.rex[l];if(!x)return 0;if(x.mode==='pct')return monthCA(a,m)*(+x.pct||0)/100;if(x.mode==='annual'){let annual=+x.annual||0;if(x.allocationKey==='ca')return annual*annualCAWeight(a,m);return annual/12}return x.values[m]!==null&&x.values[m]!==undefined?+x.values[m]:0}

function monthCA(a,m){if(estStructure(a))return caStructure(a,m);if(!a.cal.length)genCal(a);return a.cal.filter(d=>d.month===m).reduce((s,d)=>s+d.total,0)}

function needWeeks(a){return weeks(a).map(w=>({week:w.week,days:w.days.length,ca:w.ca,hours:(+a.targetTXR?w.ca/+a.targetTXR:0)}))}

function payrollMonth(a,m){
  // Structure : charges de personnel saisies par le CG
  if(estStructure(a)) return manual(a,'Charges de personnel',m);
  // Si les périodes de paie sont configurées, utiliser le calcul comptable
  if(a.periodesPaie && a.periodesPaie.length && a.costHour && a.cal && a.cal.length){
    return payrollPayMonth(a, m);
  }
  // Sinon fallback sur le calcul mois civil
  return payrollMonthCivil(a,m);
}

function payrollMonthCivil(a,m){
  // MS roulante : heures travaillées, HS, maintien sur arrêts, précarité CDD (cf. coutRoulantSemaine)
  let msRoulant = hsRows(a).reduce((s,r)=>{
    let daysWeek=a.cal.filter(d=>d.week===r.week).length||7;
    let daysMonth=a.cal.filter(d=>d.week===r.week&&d.month===m).length;
    if(!daysMonth)return s;
    let ratio=daysMonth/daysWeek;
    let weeklyCost=coutRoulantSemaine(a,r,m);
    return s+weeklyCost*ratio;
  },0);
  // MS improductifs : ligne globale CG (coût mensuel, absences au ratio de maintien).
  // À défaut, ancien calcul : coût journalier x jours travaillés.
  let msImproductif = msNRMensuel(a)!==null ? msNRMois(a,m) : a.employees
    .filter(e=>!isRoulant(e.qual)&&e.qual!=='FACTURIERE')
    .reduce((s,e)=>{
      let daysMonth=a.cal.filter(d=>d.month===m&&[1,2,3,4,5].includes(new Date(2027,d.month,d.day).getDay())).length;
      let joursHebdo=+e.joursSem||5;
      let joursActifs=Math.round(daysMonth*joursHebdo/5);
      return s+(+e.coutJour||0)*joursActifs*(1-partRoulant(e));
    },0);
  // HS improductives : total hebdo saisi par le REX, valorisé au coût horaire improductif x majoration
  let msHSImproductif = 0;
  let weeksM = a.cal.filter(d=>d.month===m).map(d=>d.week).filter((v,i,arr)=>arr.indexOf(v)===i);
  weeksM.forEach(function(w){
    let hs = a.hsImproductif && a.hsImproductif[w] ? +a.hsImproductif[w] : 0;
    if(!hs) return;
    // Ratio du nombre de jours de cette semaine dans le mois
    let daysWeek=a.cal.filter(d=>d.week===w).length||7;
    let daysMonth=a.cal.filter(d=>d.week===w&&d.month===m).length;
    let ratio=daysMonth/daysWeek;
    msHSImproductif += hs * coutHoraireImproductif(a) * coefHSMois(a,m) * ratio;
  });
  // Indemnités repas (roulants + non-roulants) : semaines rattachées au mois, pro-rata jours
  let repasMois = 0;
  let weeksRepas = a.cal.filter(d=>d.month===m).map(d=>d.week).filter((v,i,arr)=>arr.indexOf(v)===i);
  weeksRepas.forEach(function(w){
    let daysWeek=a.cal.filter(d=>d.week===w).length||7;
    let daysMonth=a.cal.filter(d=>d.week===w&&d.month===m).length;
    let ratio=daysMonth/daysWeek;
    let rR = a.repasRoulant&&a.repasRoulant[w] ? +a.repasRoulant[w] : 0;
    let rNR = a.repasNonRoulant&&a.repasNonRoulant[w] ? +a.repasNonRoulant[w] : 0;
    let iR = a.idjfRoulant&&a.idjfRoulant[w] ? +a.idjfRoulant[w] : 0;
    let iNR = a.idjfNonRoulant&&a.idjfNonRoulant[w] ? +a.idjfNonRoulant[w] : 0;
    repasMois += (rR + rNR + iR + iNR) * ratio;
  });
  // Quote-part DR : incluse dans la ligne globale non-roulante quand elle est saisie
  let msDR = msNRMensuel(a)!==null ? 0 : (+a.drCostAnnual||0)*(+a.drPct||0)/100/12;
  return msRoulant+msImproductif+msHSImproductif+repasMois+msDR;
}

function payrollPayMonth(a, moisIdx) {
  // moisIdx : 0=janvier...11=décembre
  let periodes = a.periodesPaie || buildPeriodesPaie();
  let periode = periodes[moisIdx];
  if (!periode) return 0;

  let debut = new Date(periode.debut);
  let fin = new Date(periode.fin);

  // Heures roulantes disponibles sur cette période
  // Pour janvier : ajouter le montant décembre 2026 si saisi
  // + le salaire de base des roulants pour les jours de décembre 2026 inclus dans la période
  let msJan2026 = moisIdx === 0 ? varDec2026Total(a) + baseDec2026(a) : 0;

  // Agréger les semaines ISO dont la majorité des jours tombe dans la période
  let hsR = hsRows(a);
  let ms = msJan2026;

  hsR.forEach(function(r) {
    // Trouver les jours de cette semaine dans le calendrier
    let daysOfWeek = a.cal.filter(function(d) { return d.week === r.week; });
    if (!daysOfWeek.length) return;

    // Calculer combien de jours de cette semaine tombent dans la période de paie
    let daysInPeriode = daysOfWeek.filter(function(d) {
      let dt = new Date(2027, d.month, d.day);
      return dt >= debut && dt <= fin;
    }).length;

    let daysTotal = daysOfWeek.length;
    if (daysTotal === 0) return;

    let ratio = daysInPeriode / daysTotal;
    if (ratio <= 0) return;

    // Coût pro-ratisé de cette semaine
    let coutSem = coutRoulantSemaine(a, r);
    ms += coutSem * ratio;
  });

  // Masse salariale non-roulants et DR : répartie sur la période (approximation pro-rata)
  let nbJoursPeriode = Math.round((fin - debut) / (1000*60*60*24)) + 1;
  let nbJoursAn = 365;

  // Non-roulants : ligne globale CG = un salaire mensuel par mois de paie.
  // À défaut, ancien calcul au coût journalier pro-rata de la période.
  let msNonRoulants = msNRMensuel(a)!==null ? msNRMois(a, moisIdx) : a.employees
    ? a.employees.filter(function(e) {
        return !['DEA','AA','TAXI','TPMR','FACTURIERE'].includes(e.qual);
      }).reduce(function(s, e) {
        return s + (+e.coutJour || 0) * (1 - partRoulant(e)) * (nbJoursPeriode * (+e.joursSem || 5) / 7);
      }, 0)
    : 0;

  // HS improductives : réparties sur les semaines de la période
  let msHSImp = 0;
  if (a.hsImproductif) {
    hsR.forEach(function(r) {
      let hs = a.hsImproductif[r.week] ? +a.hsImproductif[r.week] : 0;
      if (!hs) return;
      let daysOfWeek = a.cal.filter(function(d){ return d.week === r.week; });
      if (!daysOfWeek.length) return;
      let daysInPeriode = daysOfWeek.filter(function(d) {
        let dt = new Date(2027, d.month, d.day);
        return dt >= debut && dt <= fin;
      }).length;
      let ratio = daysInPeriode / daysOfWeek.length;
      if (ratio <= 0) return;
      msHSImp += hs * coutHoraireImproductif(a) * coefHSMois(a,mainMonth(a,r.week)) * ratio;
    });
  }

  // Indemnités repas sur la période de paie
  let repasPeriode = 0;
  let allWeeks = a.cal.map(d=>d.week).filter((v,i,arr)=>arr.indexOf(v)===i);
  allWeeks.forEach(function(w){
    let daysOfWeek = a.cal.filter(function(d){ return d.week===w; });
    if(!daysOfWeek.length) return;
    let daysInPeriode = daysOfWeek.filter(function(d){
      let dt=new Date(2027,d.month,d.day);
      return dt>=debut && dt<=fin;
    }).length;
    let ratio = daysInPeriode/daysOfWeek.length;
    if(ratio<=0) return;
    let rR = a.repasRoulant&&a.repasRoulant[w] ? +a.repasRoulant[w] : 0;
    let rNR = a.repasNonRoulant&&a.repasNonRoulant[w] ? +a.repasNonRoulant[w] : 0;
    let iR = a.idjfRoulant&&a.idjfRoulant[w] ? +a.idjfRoulant[w] : 0;
    let iNR = a.idjfNonRoulant&&a.idjfNonRoulant[w] ? +a.idjfNonRoulant[w] : 0;
    repasPeriode += (rR + rNR + iR + iNR) * ratio;
  });

  // DR pro-rata
  let msDR = msNRMensuel(a)!==null ? 0 : (+a.drCostAnnual || 0) * (+a.drPct || 0) / 100 * (nbJoursPeriode / nbJoursAn);

  // Lissage de la 5e semaine de variables sur le trimestre (voir lissage5eSemaine)
  return ms + msNonRoulants + msHSImp + repasPeriode + msDR + lissage5eSemaine(a, moisIdx);
}

// ── Lissage de la 5e semaine de variables (règle du contrôle de gestion, nov. 2026) ──
// Chaque trimestre compte un mois de paie à 5 semaines de variables (janvier, avril, juillet, octobre)
// et deux mois à 4 semaines. On ne garde que 4 semaines de variables par mois et on lisse la 5e :
//   mois à 5 semaines : − (coût des HS du mois : taux plein + majorations 25 % et 50 %) / 5 × 2/3
//   chacun des 2 mois à 4 semaines du trimestre : + la moitié de ce montant.
// Le total du trimestre est inchangé ; chaque mois porte 4 semaines 1/3 de variables.
function nbSemPeriode(p){
  if(!p || !p.debut || !p.fin) return 0;
  return Math.round(((new Date(p.fin) - new Date(p.debut)) / 86400000 + 1) / 7);
}
// Coût des heures supplémentaires rattachées à un mois de paie (roulants + improductifs ;
// pour janvier, les HS de décembre 2026 saisies dans « Variables déc. 2026 », charges comprises)
function coutHSPeriodePaie(a, moisIdx){
  let periodes = a.periodesPaie || buildPeriodesPaie();
  let p = periodes[moisIdx]; if(!p) return 0;
  let debut = new Date(p.debut), fin = new Date(p.fin);
  let total = 0;
  hsRows(a).forEach(function(r){
    let jours = a.cal.filter(function(d){ return d.week === r.week; });
    if(!jours.length) return;
    let dedans = jours.filter(function(d){ let dt = new Date(2027, d.month, d.day); return dt >= debut && dt <= fin; }).length;
    if(!dedans) return;
    let ratio = dedans / jours.length, m = mainMonth(a, r.week);
    total += r.hs * chMois(a, m) * coefHSMois(a, m) * (1 + TAUX_PRECARITE_CDD*partCDDSemaine(a, r.week)) * ratio;
    let hsImp = a.hsImproductif && a.hsImproductif[r.week] ? +a.hsImproductif[r.week] : 0;
    if(hsImp) total += hsImp * coutHoraireImproductif(a) * coefHSMois(a, m) * ratio;
  });
  if(moisIdx === 0){
    let det = varDecDetail(a);
    if(det) total += ((+det.hs25||0) + (+det.hs50||0)) * (1 + (+a.tauxChargePatronal||0)/100);
  }
  return total;
}
// Salaire de base des roulants pour les jours de 2026 de la période de paie de janvier
// (ex. 7 au 31 décembre 2026) : le calendrier 2027 ne les contient pas. Les variables
// de décembre (HS, primes…) sont à part (« Variables déc. 2026 »).
// Heures hebdo des roulants présents au 31/12/2026 × jours / 7 × coût horaire de janvier,
// maladie de janvier au ratio de maintien, précarité des CDD.
function baseDec2026(a){
  let periodes = a.periodesPaie || buildPeriodesPaie();
  let p = periodes[0];
  if(!p || !p.debut || p.debut >= '2027-01-01') return 0;
  let jours = Math.round((new Date('2027-01-01') - new Date(p.debut)) / 86400000);
  if(jours <= 0) return 0;
  let h = 0, hCDD = 0;
  (a.employees || []).forEach(function(e){
    if(!estRoulantPart(e) || !empPresent(e, '2026-12-31')) return;
    let x = (+e.hours||0) *partRoulant(e);
    h += x; if(e.contract === 'CDD') hCDD += x;
  });
  if(!h) return 0;
  let mal = a.sick && a.sick[0] !== null && a.sick[0] !== undefined ? (+a.sick[0]||0) / 100 : 0;
  return h * jours / 7 * chMois(a, 0) * (1 - mal * (1 - ratioMaintien(a))) * (1 + TAUX_PRECARITE_CDD * hCDD / h);
}
function lissage5eSemaine(a, moisIdx){
  let periodes = a.periodesPaie || buildPeriodesPaie();
  let t = Math.floor(moisIdx / 3), mois = [3*t, 3*t+1, 3*t+2];
  let m5 = mois.filter(function(m){ return nbSemPeriode(periodes[m]) === 5; });
  if(m5.length !== 1) return 0; // trimestre sans (ou avec plusieurs) mois à 5 semaines : pas de lissage
  let x = coutHSPeriodePaie(a, m5[0]) / 5 * 2/3;
  if(moisIdx === m5[0]) return -x;
  return nbSemPeriode(periodes[moisIdx]) === 4 ? x / 2 : 0;
}

function pres(a,w){
  let base=baseHWeek(a,w);
  // Semaine partielle de l'année (1er-3 janvier, 27-31 décembre) : base au prorata des jours
  let nbj=a.cal.filter(d=>d.week===w).length; if(nbj && nbj<7) base=base*nbj/7;
  let p=a.presence[w]||{cp:0,other:0};
  let m=mainMonth(a,w);
  let rate=a.sick[m]!==null&&a.sick[m]!==undefined?+a.sick[m]:0;
  // CP et autres absences exprimés en jours (1J = 7H).
  // Autres absences (décision nov. 2026) : « payées » (formation, événements familiaux,
  // récupération…) coûtées au taux horaire comme les congés ; « non payées » (sans solde) non coûtées.
  let cpH=(+p.cp||0)*7;
  let otherH=(+p.other||0)*7;
  let otherPaidH=(+p.otherPaid||0)*7;
  let mal=base*rate/100;
  let av=Math.max(0,base-cpH-mal-otherH-otherPaidH);
  return {base,cp:+p.cp||0,cpH,other:+p.other||0,otherH,otherPaid:+p.otherPaid||0,otherPaidH,m,rate,mal,av,etp:av/35};
}

function refAgenceSeuils(a) {
  // Coût HS d'une semaine type (si toute la capacité était en HS)
  let baseHebdo = baseH(a);  // heures roulants contractuelles
  let coutHSRef = baseHebdo * (+a.costHour||28.5) * coefHSMoyen(a);
  // Seuils impact CP (% du coût HS semaine type)
  let seuilFaible = coutHSRef * 0.10;
  let seuilMoyen  = coutHSRef * 0.30;
  // Seuils tension HS (% de la capacité hebdo)
  let seuiltensionWarn = baseHebdo * 0.10;  // 10% de la capacité
  let seuilTensionCrit = baseHebdo * 0.20;  // 20% de la capacité
  // Tolérance CP équilibre (5% du stock généré)
  let toleranceCP = Math.max(0.5, cpGeneres(a) * 0.05);
  return { coutHSRef, seuilFaible, seuilMoyen, seuiltensionWarn, seuilTensionCrit, toleranceCP };
}

function refAgenceSeuilsBase(a) {
  let baseHebdo = baseH(a);
  let coutHSRef = baseHebdo * (+a.costHour||28.5) * 1.25;
  return {
    coutHSRef,
    seuilFaible: coutHSRef * 0.10,
    seuilMoyen: coutHSRef * 0.30,
    seuiltensionWarn: baseHebdo * 0.10,
    seuilTensionCrit: baseHebdo * 0.20
  };
}

function refs(){return Array.from({length:12},()=>({semaine:null,vacances:null,samedi:null,dimanche:null,ferie:null}))}

function sig(a,m){let v=l=>manual(a,l,m),ca=monthCA(a,m),marge=ca-v("Achats Matières premières et sous traitance")-v("Variations stock marchandises et autres approvisionnements"),aa=["Electricité - eau - chauffage","Matériels ambulances","Carburant","Entretiens petits équipements","Fourniture bureau - vêtements","Sous traitance","Crédit bail et location véhicules","Location téléphonie - informatique - mobilité","Location immobilières et charges locatives","Entretiens véhicules - batîment","Maintenance informatique","Assurance","Formation - documentation","Honoraires et prestations de services","Publicité - cadeaux","Frais de déplacement - missions réceptions","Péages","Affranchissement","Téléphonie - internet","Frais bancaires et cotisations"].reduce((s,l)=>s+v(l),0),va=marge-aa,pay=payrollMonth(a,m),qp=estStructure(a)?0:v("Quote-part MS siège")+v("Quote-part régulation mutualisée"),ebe=va+v("Subventions d'exploitation")-v("Impôts, taxes et versements assimilés")-pay-qp,rex=ebe+v("Reprises s/ charges et transferts")+v("Autres produits")-v("Dotations amortissements et provisions")-v("Autres charges"),rf=v("Produits financiers")-v("Charges financières"),rcai=rex+rf,re=v("Produits exceptionnels")-v("Charges exceptionnelles"),rn=rcai+re-v("Impôt sur les sociétés")-v("Participation aux bénéfices");return {"Chiffre d'affaires":ca,"Charges de personnel":pay,"MARGE BRUTE GLOBALE":marge,"Autres Achats et charges externes":aa,"VALEUR AJOUTEE":va,"EXCEDENT BRUT D'EXPLOITATION":ebe,"RESULTAT D'EXPLOITATION":rex,"RESULTAT FINANCIER":rf,"RESULTAT COURANT AVANT IMPOT":rcai,"RESULTAT EXCEPTIONNEL":re,"RESULTAT NET":rn}}

function tauxHS50Mois(a, mois){
  if(!a.hs50) return 0;
  let v = a.hs50[mois];
  if(v===null || v===undefined) return 0;
  return Math.max(0, Math.min(100, +v)) / 100;
}

function typeDay(date,a){let iso=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0'),wd=date.getDay();if(feries.includes(iso))return 'ferie';if(wd===0)return 'dimanche';if(wd===6)return 'samedi';if(isVac(iso,a.schoolZone))return 'vacances';return 'semaine'}

function weekRefDate(a, week){
  let days=a.cal.filter(d=>d.week===week);
  if(!days.length) return null;
  // Prendre le jour médian
  let mid=days[Math.floor(days.length/2)];
  let m=String(mid.month+1).padStart(2,'0');
  let d=String(mid.day).padStart(2,'0');
  return '2027-'+m+'-'+d;
}

function weeks(a){if(!a.cal.length)genCal(a);let map={};a.cal.forEach(d=>{if(!map[d.week])map[d.week]={week:d.week,days:[],ca:0};map[d.week].days.push(d);map[d.week].ca+=d.total});return Object.values(map).sort((x,y)=>{let dx=x.days[0],dy=y.days[0];return (dx.month-dy.month)||(dx.day-dy.day)})}

function amount(a,l,m){let row=T.find(r=>r.label===l);if(l==="Chiffre d'affaires"||l==="Charges de personnel"||row?.type==='subtotal')return sig(a,m)[l]||0;return manual(a,l,m)}
function ann(a,l){return M.reduce((s,_,m)=>s+amount(a,l,m),0)}
function hsTot(a){return hsRows(a).reduce((o,r)=>{o.ca+=r.ca;o.need+=r.hours;o.av+=r.av;o.hs+=r.hs;return o},{ca:0,need:0,av:0,hs:0})}

function hsParPersonne(a, week){
  // HS par personne présente = HS de la semaine / ETP présents
  let p = pres(a, week);
  let n = needWeeks(a).find(function(x){return x.week===week;});
  if(!n) return {hs:0, etp:p.etp, ratio:0};
  let hs = Math.max(0, n.hours - p.av);
  let ratio = p.etp > 0 ? hs / p.etp : 0;
  return {hs:hs, etp:p.etp, ratio:ratio};
}
function qualifierSemaine(a, week){
  let jours = a.cal.filter(function(d){return d.week===week;});
  let ferie = jours.some(function(d){return d.type==='ferie';});
  let vacances = jours.some(function(d){return d.type==='vacances';});
  if(ferie) return 'jour férié';
  if(vacances) return 'vacances scolaires';
  return null; // semaine standard
}
function coutDuChoixREX(a){
  // Pas de référence optimale mémorisée → pas de surcoût mesurable
  if(!a.cpOptimal){
    return { mesurable:false, surcout:0, hsSup:0, semaines:[] };
  }
  // Coût HS actuel (avec les choix du REX)
  let coutActuel = coutHSTotal(a);
  let coutOptimal = a.cpOptimalHSCost || 0;
  let surcout = Math.max(0, Math.round(coutActuel - coutOptimal));

  // Détail des semaines où le REX a dévié de l'optimum
  let semaines = [];
  needWeeks(a).forEach(function(w){
    let reel = (+((a.presence[w.week]||{}).cp) || 0);
    let opt = (+a.cpOptimal[w.week] || 0);
    let ecart = Math.round((reel - opt) * 10) / 10;
    if(Math.abs(ecart) >= 0.5){
      semaines.push({
        week: w.week,
        mois: mainMonth(a, w.week),
        optimal: opt,
        reel: reel,
        ecart: ecart
      });
    }
  });

  // Estimation des HS supplémentaires induites (en heures)
  let hsSup = 0;
  let cout = (+a.costHour||0) * coefHSMoyen(a);
  if(cout > 0) hsSup = Math.round(surcout / cout);

  return {
    mesurable: true,
    surcout: surcout,      // en euros
    hsSup: hsSup,          // en heures
    semaines: semaines,    // semaines déviées
    coutActuel: Math.round(coutActuel),
    coutOptimal: Math.round(coutOptimal)
  };
}
function memoriserRepartitionOptimale(a){
  let opt = {};
  needWeeks(a).forEach(function(w){
    opt[w.week] = (+((a.presence[w.week]||{}).cp) || 0);
  });
  a.cpOptimal = opt;
  a.cpOptimalHSCost = coutHSTotal(a);
}

function auditAlerts(a){
  let s=chargesSummary(a),alerts=[],ca=s.ca,rex=ann(a,"RESULTAT D'EXPLOITATION");
  if(s.annualNoKey>0)alerts.push(['warning','Charges annuelles sans clé de répartition','Certaines charges annuelles n\'ont pas de clé claire.']);
  if(s.pctHigh>0)alerts.push(['warning','Pourcentage CA élevé','Un ou plusieurs postes en % CA dépassent 20 %.']);
  if(s.monthlyIrregular>0)alerts.push(['info','Répartition mensuelle très irrégulière','Certains postes mensuels varient fortement entre mois.']);
  if(ca>0&&rex/ca<-0.03)alerts.push(['critique','REX fortement négatif','Le REX est inférieur à -3 % du CA.']);
  if(ca>0&&s.payroll/ca>0.70)alerts.push(['warning','Masse salariale élevée','Les charges de personnel dépassent 70 % du CA.']);
  if(s.hs>500)alerts.push(['warning','HS élevées','Le volume annuel d\'heures supplémentaires dépasse 500 h.']);
  if(s.manualEmpty>10)alerts.push(['info','Nombreuses lignes de charges à zéro','Plusieurs postes de charges restent à zéro. Vérifier si c\'est volontaire.']);
  if(!alerts.length)alerts.push(['info','Aucune anomalie majeure détectée','Les contrôles simples ne détectent pas d\'incohérence importante.']);
  return alerts;
}

function chargesSummary(a){
  let ca=ann(a,"Chiffre d'affaires"),fixed=0,variable=0,manualEmpty=0,annualNoKey=0,pctHigh=0,monthlyIrregular=0;
  T.forEach(r=>{
    if(!isEditableREX(r.label))return;
    let x=a.rex[r.label];if(!x)return;
    let total=M.reduce((s,_,m)=>s+manual(a,r.label,m),0);
    if(r.type==='charge'){if(x.chargeType==='fixe')fixed+=total;if(x.chargeType==='variable')variable+=total;if(total===0)manualEmpty++;}
    if(x.mode==='annual'&&!x.allocationKey)annualNoKey++;
    if(x.mode==='pct'&&(+x.pct||0)>20)pctHigh++;
    if(x.mode==='month'){let vals=x.values.map(v=>+v||0),avg=vals.reduce((s,v)=>s+v,0)/12;if(avg>0){let max=Math.max(...vals),min=Math.min(...vals);if((max-min)>avg*1.5)monthlyIrregular++;}}
  });
  let payroll=ann(a,"Charges de personnel"),hs=hsTot(a).hs;
  return {ca,fixed,variable,payroll,hs,manualEmpty,annualNoKey,pctHigh,monthlyIrregular};
}

function isEditableREX(label){return label!=="Chiffre d'affaires"&&label!=="Charges de personnel"&&!(T.find(r=>r.label===label)?.type==='subtotal')}

// ── Paramétrage salarial 2027 (réunion de paramétrage des taux et coûts salariaux) ──
// Prime de précarité CDD, provisionnée chaque mois comme dans la paie
const TAUX_PRECARITE_CDD = 0.10;
// Variables de paie de décembre 2026 (réglées sur la paie de janvier 2027)
const VAR_DEC_RUBRIQUES = [
  {k:'hs25',      l:'HS à 25 %',                charge:true},
  {k:'hs50',      l:'HS à 50 %',                charge:true},
  {k:'dimFeries', l:'Dimanches et fériés',      charge:true},
  {k:'primes',    l:'Primes et autres variables', charge:true},
  {k:'repas',     l:'Indemnités repas',         charge:false}
];

function fmtCoutH(v){ return (+v).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €/h'; }

function costHourJuin(a){
  let brut=+a.tauxHoraireBrutJuin||0, ch=a.tauxChargePatronal;
  if(brut>0 && ch!==null && ch!==undefined && ch!=='') return Math.round(brut*(1+(+ch||0)/100)*100)/100;
  return null;
}

function chMois(a,m){
  if(m>=5){ let j=costHourJuin(a); if(j) return j; }
  return +a.costHour||0;
}

function ratioMaintien(a){
  let v=a.ratioMaintien;
  if(v===null||v===undefined||v==='') return 0;
  return Math.max(0,Math.min(100,+v||0))/100;
}

function tauxAbsMois(a,m){
  let v=a.sick?a.sick[m]:null;
  return (v===null||v===undefined)?0:Math.max(0,+v||0)/100;
}

function isCDD(e){ return String(e.contract||e.contrat||'').toUpperCase().indexOf('CDD')===0; }

function partCDDSemaine(a, week){
  let dateRef = weekRefDate(a, week);
  let tot=0, cdd=0;
  a.employees.forEach(function(e){
    if(!estRoulantPart(e)) return;
    if(dateRef && !empPresent(e, dateRef)) return;
    let h=(+e.hours||0)*partRoulant(e);
    tot+=h; if(isCDD(e)) cdd+=h;
  });
  return tot>0 ? cdd/tot : 0;
}

function coutRoulantSemaine(a, r, mTaux){
  let m = mainMonth(a, r.week);
  let ch = chMois(a, mTaux===undefined ? m : mTaux);
  // Heures travaillées + heures supplémentaires + maintien sur arrêts + indemnité de congés payés (salaire maintenu)
  // + absences payées (formation, événements familiaux, récupération…) au taux horaire comme les congés
  let cout = (r.av*ch) + (r.hs*ch*coefHSMois(a,m)) + ((r.mal||0)*ch*ratioMaintien(a)) + ((r.cpH||0)*ch) + ((r.otherPaidH||0)*ch);
  return cout * (1 + TAUX_PRECARITE_CDD*partCDDSemaine(a, r.week));
}

function msNRMensuel(a){
  let brut=+a.msNRBrutMensuel||0;
  if(brut<=0) return null;
  return brut*(1+(+a.msNRTauxCharges||0)/100);
}

// Part roulante des non-roulants (régulateur, REX… avec un % roulant) : déjà comptée en masse salariale roulante,
// elle est retirée AUTOMATIQUEMENT de la ligne non-roulants du CG (heures roulantes × coût horaire chargé du mois),
// pour qu'elle ne soit pas comptée deux fois. Le CG saisit la ligne non-roulants complète, sans rien déduire.
function heuresRoulantesNR(a,m){let ref=m===undefined?null:'2027-'+String(m+1).padStart(2,'0')+'-15';return (a.employees||[]).reduce(function(s,e){if(isRoulant(e.qual)||!estRoulantPart(e))return s;if(ref&&!empPresent(e,ref))return s;return s+(+e.hours||0)*partRoulant(e);},0)}
function transfertRoulantNR(a,m){return heuresRoulantesNR(a,m)*52/12*chMois(a,m===undefined?0:m)}
function msNRMois(a, m){
  let cm=msNRMensuel(a);
  if(cm===null) return 0;
  cm=Math.max(0, cm-transfertRoulantNR(a,m));
  return cm*(1 - tauxAbsMois(a,m)*(1-ratioMaintien(a)));
}

function varDecDetail(d){
  let det = d && d.variablesDec2026Detail;
  return (det && typeof det === 'object') ? det : null;
}

function varDecCalc(det, tauxCharges){
  let brut = 0, nonCharge = 0, saisi = false;
  VAR_DEC_RUBRIQUES.forEach(function(r){
    let v = det ? det[r.k] : null;
    if(v === null || v === undefined || v === '') return;
    saisi = true;
    if(r.charge) brut += +v || 0; else nonCharge += +v || 0;
  });
  return { saisi: saisi, brut: brut, nonCharge: nonCharge, total: brut*(1+(+tauxCharges||0)/100) + nonCharge };
}

function varDec2026Total(a){
  let det = varDecDetail(a);
  if(det) return varDecCalc(det, a.tauxChargePatronal).total;
  return +a.variablesDec2026 || 0;
}

function chargesCGSaisies(d){
  if(!d || !d.rex) return 0;
  let n = 0;
  Object.keys(d.rex).forEach(function(l){
    if(l === "Chiffre d'affaires" || l === 'Charges de personnel') return;
    let x = d.rex[l] || {};
    let saisi = x.mode === 'pct' ? (+x.pct > 0)
      : x.mode === 'annual' ? (+x.annual > 0)
      : (x.values || []).some(function(v){ return v !== null && v !== undefined && +v !== 0; });
    if(saisi) n++;
  });
  return n;
}

// Charges à reporter sur la paie de janvier 2028 : heures du 06/12/2027 au 31/12/2027
// (port fidèle de chargesReport2028).
function chargesReport2028(a){
  let debut = new Date(2027, 11, 6), fin = new Date(2027, 11, 31), nbJours = 26;
  let ms = 0;
  hsRows(a).forEach(function(r){
    let daysOfWeek = a.cal.filter(function(d){ return d.week === r.week; });
    if(!daysOfWeek.length) return;
    let daysIn = daysOfWeek.filter(function(d){ let dt = new Date(2027, d.month, d.day); return dt >= debut && dt <= fin; }).length;
    let ratio = daysIn / daysOfWeek.length;
    if(ratio <= 0) return;
    ms += coutRoulantSemaine(a, r) * ratio;
  });
  if(msNRMensuel(a) === null) ms += (a.employees || [])
    .filter(function(e){ return !['DEA','AA','TAXI','TPMR','FACTURIERE'].includes(e.qual); })
    .reduce(function(s, e){ return s + (+e.coutJour || 0) * (1 - partRoulant(e)) * nbJours * (+e.joursSem || 5) / 7; }, 0);
  if(msNRMensuel(a) === null) ms += (+a.drCostAnnual || 0) * (+a.drPct || 0) / 100 * (nbJours / 365);
  return Math.round(ms);
}

export {
  chargesReport2028, nbSemPeriode, coutHSPeriodePaie, lissage5eSemaine, baseDec2026, CP_JOURS_MOIS, heuresDispoAnnuelles, STRUCTURES, LIB_STRUCTURES, LIGNES_SIEGE, LIGNES_QUOTE_PART, partRoulant, estRoulantPart, estStructure, estSiege, vueExploitation, resultatAffiche, lignesSIG, caStructure,
  TAUX_PRECARITE_CDD, VAR_DEC_RUBRIQUES, fmtCoutH, costHourJuin, chMois, ratioMaintien, tauxAbsMois, isCDD, partCDDSemaine, coutRoulantSemaine, msNRMensuel, msNRMois, heuresRoulantesNR, transfertRoulantNR, varDecDetail, varDecCalc, varDec2026Total, chargesCGSaisies, payrollMonth, payrollMonthCivil, payrollPayMonth, needWeeks, manual, monthCA, pres, weekRefDate, T, M, amount, ann, hsTot, hsParPersonne, qualifierSemaine, coutDuChoixREX, memoriserRepartitionOptimale, chargesSummary, auditAlerts, isEditableREX, agency, annualCA, annualCAWeight, baseH, baseHWeek, between, buildPeriodesPaie, coefHSMois, coefHSMoyen, coutHSTotal, coutHoraireImproductif, cpGeneres, cpPlanifies, empPresent, genCal, hsRows, impactCPSemaine, isRoulant, isVac, isoWeek, mainMonth, refAgenceSeuils, refAgenceSeuilsBase, refs, sig, tauxHS50Mois, typeDay, weeks,
};