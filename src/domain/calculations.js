// SOMA — Noyau de calcul metier (extraction verbatim depuis index.html).
// Fonctions PURES sur l'objet agence `a` : aucun DOM, aucun etat global.
// Ne pas reformuler la logique — toute modification doit rester iso-comportement.

// ── Constantes de reference ──
const M=["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
const T=[{"label":"Chiffre d'affaires","type":"product"},{"label":"Achats Matières premières et sous traitance","type":"charge"},{"label":"Variations stock marchandises et autres approvisionnements","type":"charge"},{"label":"MARGE BRUTE GLOBALE","type":"subtotal"},{"label":"Electricité - eau - chauffage","type":"charge"},{"label":"Matériels ambulances","type":"charge"},{"label":"Carburant","type":"charge"},{"label":"Entretiens petits équipements","type":"charge"},{"label":"Fourniture bureau - vêtements","type":"charge"},{"label":"Sous traitance","type":"charge"},{"label":"Crédit bail et location véhicules","type":"charge"},{"label":"Location téléphonie - informatique - mobilité","type":"charge"},{"label":"Location immobilières et charges locatives","type":"charge"},{"label":"Entretiens véhicules - batîment","type":"charge"},{"label":"Maintenance informatique","type":"charge"},{"label":"Assurance","type":"charge"},{"label":"Formation - documentation","type":"charge"},{"label":"Honoraires et prestations de services","type":"charge"},{"label":"Publicité - cadeaux","type":"charge"},{"label":"Frais de déplacement - missions réceptions","type":"charge"},{"label":"Péages","type":"charge"},{"label":"Affranchissement","type":"charge"},{"label":"Téléphonie - internet","type":"charge"},{"label":"Frais bancaires et cotisations","type":"charge"},{"label":"Autres Achats et charges externes","type":"subtotal"},{"label":"VALEUR AJOUTEE","type":"subtotal"},{"label":"Subventions d'exploitation","type":"product"},{"label":"Impôts, taxes et versements assimilés","type":"charge"},{"label":"Charges de personnel","type":"charge"},{"label":"EXCEDENT BRUT D'EXPLOITATION","type":"subtotal"},{"label":"Reprises s/ charges et transferts","type":"product"},{"label":"Autres produits","type":"product"},{"label":"Dotations amortissements et provisions","type":"charge"},{"label":"Autres charges","type":"charge"},{"label":"RESULTAT D'EXPLOITATION","type":"subtotal"},{"label":"Produits financiers","type":"product"},{"label":"Charges financières","type":"charge"},{"label":"RESULTAT FINANCIER","type":"subtotal"},{"label":"RESULTAT COURANT AVANT IMPOT","type":"subtotal"},{"label":"Produits exceptionnels","type":"product"},{"label":"Charges exceptionnelles","type":"charge"},{"label":"RESULTAT EXCEPTIONNEL","type":"subtotal"},{"label":"RESULTAT NET","type":"subtotal"}];
const feries=['2027-01-01','2027-03-29','2027-05-01','2027-05-06','2027-05-08','2027-05-17','2027-07-14','2027-08-15','2027-11-01','2027-11-11','2027-12-25'];
const vac={
  A:[['2027-01-01','2027-01-04'],['2027-02-13','2027-03-01'],['2027-04-10','2027-04-26'],['2027-07-03','2027-08-31'],['2027-10-23','2027-11-08']],
  B:[['2027-01-01','2027-01-04'],['2027-02-20','2027-03-08'],['2027-04-17','2027-05-03'],['2027-07-03','2027-08-31'],['2027-10-23','2027-11-08']],
  C:[['2027-01-01','2027-01-04'],['2027-02-06','2027-02-22'],['2027-04-03','2027-04-19'],['2027-07-03','2027-08-31'],['2027-10-23','2027-11-08']]
};

// ── Fonctions ──
function agency(name){let a={name,histCA:null,histCA2025:null,histTXR2026:null,targetAbsRate:null,perspectives:'',targetCA:null,targetTXR:null,schoolZone:'B',actSan:true,actSai:false,actTP:false,moisVerrouilles:[],moisActif:null,cgLocked:false,tauxAbsImproductif:null,hsImproductif:{},repasRoulant:{},repasNonRoulant:{},idjfRoulant:{},idjfNonRoulant:{},
  // Calendrier des périodes de paie 2027
  // Format : [{mois:'Janvier', debut:'2026-12-07', fin:'2027-01-10', semaines:5}...]
  periodesPaie:null,variablesDec2026:null,refs:{san:refs(),sai:refs(),tp:refs()},cal:[],employees:[],presence:{},sick:Array(12).fill(null),hs50:Array(12).fill(null),tauxHoraireBrut:null,tauxChargePatronal:null,costHour:null,hsCostRate:1.25,drCostAnnual:0,drPct:0,rex:{}};T.forEach(r=>{if(r.type!=='subtotal')a.rex[r.label]={values:Array(12).fill(null),mode:r.label==='Carburant'?'annual':'month',chargeType:r.type==='charge'?'variable':'fixe',allocationKey:r.label==='Carburant'?'ca':'monthly12',pct:r.label==='Carburant'?5.2:0,annual:0}});return a}

function annualCA(a){return M.reduce((s,_,m)=>s+monthCA(a,m),0)}

function annualCAWeight(a,m){let total=annualCA(a);return total?monthCA(a,m)/total:1/12}

function baseH(a){
  // Moyenne sur toutes les semaines si dates présentes, sinon calcul simple
  let hasMovements = a.employees.some(e=>e.dateEntree||e.dateSortie);
  if(!hasMovements || !a.cal || !a.cal.length){
    return a.employees.filter(e=>isRoulant(e.qual)).reduce((s,e)=>s+(+e.hours||0)*(+e.pctRoulant||100)/100,0);
  }
  let weeks=needWeeks(a);
  if(!weeks.length) return a.employees.filter(e=>isRoulant(e.qual)).reduce((s,e)=>s+(+e.hours||0)*(+e.pctRoulant||100)/100,0);
  let total=weeks.reduce((s,w)=>s+baseHWeek(a,w.week),0);
  return total/weeks.length;
}

function baseHWeek(a, week){
  let dateRef = week!==undefined ? weekRefDate(a, week) : null;
  return a.employees.filter(e=>isRoulant(e.qual)).reduce((s,e)=>{
    if(dateRef && !empPresent(e, dateRef)) return s;
    return s+(+e.hours||0)*(+e.pctRoulant||100)/100;
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
    total += hsM * ch * coefHSMois(a, m);
  }
  return total;
}

function coutHoraireImproductif(a){
  let imp = a.employees.filter(e=>!isRoulant(e.qual)&&e.qual!=='FACTURIERE'&&(+e.coutJour||0)>0);
  if(!imp.length) return (+a.costHour||0);
  let moyJour = imp.reduce((s,e)=>s+(+e.coutJour||0),0)/imp.length;
  return moyJour/7;
}

function cpGeneres(a) {
  // CP générés : chaque salarié génère 2.5J par mois de PRÉSENCE (hors absence maladie).
  // Roulants et improductifs ont chacun leur taux d'absentéisme.
  let salaries = a.employees.filter(e => e.qual !== 'FACTURIERE');
  if (!salaries.length) return 0;
  let tauxImp = (a.tauxAbsImproductif!==null && a.tauxAbsImproductif!==undefined) ? +a.tauxAbsImproductif/100 : 0;
  let totalJ = 0;
  M.forEach(function(_, m) {
    let tauxMalRoulant = a.sick[m] !== null && a.sick[m] !== undefined ? +a.sick[m] / 100 : 0;
    let dateRef = '2027-' + String(m+1).padStart(2,'0') + '-15';
    salaries.forEach(function(e){
      if(!empPresent(e, dateRef)) return;
      // Appliquer le taux d'absentéisme correspondant au type de salarié
      let taux = isRoulant(e.qual) ? tauxMalRoulant : tauxImp;
      totalJ += 2.5 * (1 - taux);
    });
  });
  return Math.round(totalJ * 10) / 10;
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
  let costHour = +a.costHour || 28.5;
  let coefHS = coefHSMois(a, mainMonth(a, week));
  if (hr.gap > 0) {
    // Semaine en tension : chaque heure compte
    return Math.round(hsDelta * costHour * coefHS);
  } else {
    // Sous-charge : impact marginal
    return Math.round(hsDelta * costHour * 0.3);
  }
}

function isRoulant(qual){return ['DEA','AA','TAXI','TPMR'].includes((qual||'').toUpperCase())}

function isVac(iso,z){return (vac[z]||vac.B).some(x=>between(iso,x[0],x[1]))}

function isoWeek(date){let d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())),day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);let y=new Date(Date.UTC(d.getUTCFullYear(),0,1));return Math.ceil((((d-y)/86400000)+1)/7)}

function mainMonth(a,w){let c={};a.cal.filter(d=>d.week==w).forEach(d=>c[d.month]=(c[d.month]||0)+1);return +(Object.entries(c).sort((x,y)=>y[1]-x[1])[0]?.[0]||0)}

function manual(a,l,m){let x=a.rex[l];if(!x)return 0;if(x.mode==='pct')return monthCA(a,m)*(+x.pct||0)/100;if(x.mode==='annual'){let annual=+x.annual||0;if(x.allocationKey==='ca')return annual*annualCAWeight(a,m);return annual/12}return x.values[m]!==null&&x.values[m]!==undefined?+x.values[m]:0}

function monthCA(a,m){if(!a.cal.length)genCal(a);return a.cal.filter(d=>d.month===m).reduce((s,d)=>s+d.total,0)}

function needWeeks(a){return weeks(a).map(w=>({week:w.week,days:w.days.length,ca:w.ca,hours:(+a.targetTXR?w.ca/+a.targetTXR:0)}))}

function payrollMonth(a,m){
  // Si les périodes de paie sont configurées, utiliser le calcul comptable
  if(a.periodesPaie && a.periodesPaie.length && a.costHour && a.cal && a.cal.length){
    return payrollPayMonth(a, m);
  }
  // Sinon fallback sur le calcul mois civil
  return payrollMonthCivil(a,m);
}

function payrollMonthCivil(a,m){
  // MS roulante : heures disponibles x cout horaire + HS x coef
  let msRoulant = hsRows(a).reduce((s,r)=>{
    let daysWeek=a.cal.filter(d=>d.week===r.week).length||7;
    let daysMonth=a.cal.filter(d=>d.week===r.week&&d.month===m).length;
    if(!daysMonth)return s;
    let ratio=daysMonth/daysWeek;
    let weeklyCost=(r.av*(+a.costHour||0))+(r.hs*(+a.costHour||0)*coefHSMois(a,mainMonth(a,r.week)));
    return s+weeklyCost*ratio;
  },0);
  // MS improductifs (régulateurs, REX, responsables) : coût journalier x jours travaillés
  // Le coût journalier est payé même en CP/absence (salaire mensualisé), donc on compte tous les jours ouvrés
  let msImproductif = a.employees
    .filter(e=>!isRoulant(e.qual)&&e.qual!=='FACTURIERE')
    .reduce((s,e)=>{
      let daysMonth=a.cal.filter(d=>d.month===m&&[1,2,3,4,5].includes(new Date(2027,d.month,d.day).getDay())).length;
      let joursHebdo=+e.joursSem||5;
      let joursActifs=Math.round(daysMonth*joursHebdo/5);
      return s+(+e.coutJour||0)*joursActifs;
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
  // Quote-part DR : cout annuel x pourcentage / 12
  let msDR = (+a.drCostAnnual||0)*(+a.drPct||0)/100/12;
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
  let msJan2026 = moisIdx === 0 ? (+a.variablesDec2026 || 0) : 0;

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
    let coutSem = (r.av * (+a.costHour || 0)) + (r.hs * (+a.costHour || 0) * coefHSMois(a,mainMonth(a,r.week)));
    ms += coutSem * ratio;
  });

  // Masse salariale non-roulants et DR : répartie sur la période (approximation pro-rata)
  let nbJoursPeriode = Math.round((fin - debut) / (1000*60*60*24)) + 1;
  let nbJoursAn = 365;

  // Non-roulants (régulateurs, REX)
  let msNonRoulants = a.employees
    ? a.employees.filter(function(e) {
        return !['DEA','AA','TAXI','TPMR','FACTURIERE'].includes(e.qual);
      }).reduce(function(s, e) {
        return s + (+e.coutJour || 0) * (nbJoursPeriode * (+e.joursSem || 5) / 7);
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
      msHSImp += hs * coutHoraireImproductif(a) * coefHSMois(a,mainMonth(a,w)) * ratio;
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
  let msDR = (+a.drCostAnnual || 0) * (+a.drPct || 0) / 100 * (nbJoursPeriode / nbJoursAn);

  return ms + msNonRoulants + msHSImp + repasPeriode + msDR;
}

function pres(a,w){
  let base=baseHWeek(a,w);
  let p=a.presence[w]||{cp:0,other:0};
  let m=mainMonth(a,w);
  let rate=a.sick[m]!==null&&a.sick[m]!==undefined?+a.sick[m]:0;
  // CP et autres exprimés en jours (1J = 7H)
  let cpH=(+p.cp||0)*7;
  let otherH=(+p.other||0)*7;
  let mal=base*rate/100;
  let av=Math.max(0,base-cpH-mal-otherH);
  return {base,cp:+p.cp||0,cpH,other:+p.other||0,otherH,m,rate,mal,av,etp:av/35};
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

function sig(a,m){let v=l=>manual(a,l,m),ca=monthCA(a,m),marge=ca-v("Achats Matières premières et sous traitance")-v("Variations stock marchandises et autres approvisionnements"),aa=["Electricité - eau - chauffage","Matériels ambulances","Carburant","Entretiens petits équipements","Fourniture bureau - vêtements","Sous traitance","Crédit bail et location véhicules","Location téléphonie - informatique - mobilité","Location immobilières et charges locatives","Entretiens véhicules - batîment","Maintenance informatique","Assurance","Formation - documentation","Honoraires et prestations de services","Publicité - cadeaux","Frais de déplacement - missions réceptions","Péages","Affranchissement","Téléphonie - internet","Frais bancaires et cotisations"].reduce((s,l)=>s+v(l),0),va=marge-aa,pay=payrollMonth(a,m),ebe=va+v("Subventions d'exploitation")-v("Impôts, taxes et versements assimilés")-pay,rex=ebe+v("Reprises s/ charges et transferts")+v("Autres produits")-v("Dotations amortissements et provisions")-v("Autres charges"),rf=v("Produits financiers")-v("Charges financières"),rcai=rex+rf,re=v("Produits exceptionnels")-v("Charges exceptionnelles"),rn=rcai+re;return {"Chiffre d'affaires":ca,"Charges de personnel":pay,"MARGE BRUTE GLOBALE":marge,"Autres Achats et charges externes":aa,"VALEUR AJOUTEE":va,"EXCEDENT BRUT D'EXPLOITATION":ebe,"RESULTAT D'EXPLOITATION":rex,"RESULTAT FINANCIER":rf,"RESULTAT COURANT AVANT IMPOT":rcai,"RESULTAT EXCEPTIONNEL":re,"RESULTAT NET":rn}}

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

export {
  T, M,
  amount, ann, hsTot,
  hsParPersonne, qualifierSemaine, coutDuChoixREX, memoriserRepartitionOptimale,
  chargesSummary, auditAlerts, isEditableREX,
  agency, annualCA, annualCAWeight, baseH, baseHWeek, between, buildPeriodesPaie, coefHSMois, coefHSMoyen, coutHSTotal, coutHoraireImproductif, cpGeneres, cpPlanifies, empPresent, genCal, hsRows, impactCPSemaine, isRoulant, isVac, isoWeek, mainMonth, manual, monthCA, needWeeks, payrollMonth, payrollMonthCivil, payrollPayMonth, pres, refAgenceSeuils, refAgenceSeuilsBase, refs, sig, tauxHS50Mois, typeDay, weekRefDate, weeks
};