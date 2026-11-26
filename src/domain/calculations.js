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
// Nov. 2026 (Florent) : les quotes-parts sont INCLUSES dans « Charges de personnel », comme dans les tableaux de bord ;
// leurs deux lignes s'affichent dessous en détail (« dont … ») et ne s'ajoutent pas une seconde fois.
function estDetailSIG(l){return LIGNES_QUOTE_PART.indexOf(l)>=0}
function libLigneSIG(l){return estDetailSIG(l)?'dont '+l.charAt(0).toLowerCase()+l.slice(1):l}
function estStructure(a){return !!a&&STRUCTURES.indexOf(a.name)>=0}
function estSiege(a){return !!a&&a.name==='SIEGE'}
// Le REX d'une agence voit son compte de résultat jusqu'au résultat d'exploitation ; les lignes en dessous
// ne sont visibles qu'à partir du Directeur Régional.
function vueExploitation(a,role){return role==='rex'&&!estStructure(a)}
function resultatAffiche(a,role){return vueExploitation(a,role)?{lib:"Résultat d'exploitation",libMin:"résultat d'exploitation",val:ann(a,"RESULTAT D'EXPLOITATION")}:{lib:'Résultat net',libMin:'résultat',val:ann(a,"RESULTAT NET")}}
function lignesSIG(a,role,consolide){let l=T.filter(function(r){return (consolide||estSiege(a)||LIGNES_SIEGE.indexOf(r.label)<0)&&(consolide||!estStructure(a)||LIGNES_QUOTE_PART.indexOf(r.label)<0);});if(!consolide&&vueExploitation(a,role)){let i=l.findIndex(function(r){return r.label==="RESULTAT D'EXPLOITATION";});l=l.slice(0,i+1);}return l}
// CA d'une structure : saisi (mensuel ou annuel). Le mode « % du CA » n'a pas de sens pour le CA lui-même.
// Structures (Siège, centre de formation, réseau adhérent, exceptionnel ; nov. 2026) : le CG saisit le CA et la masse
// salariale en une ou plusieurs lignes nommées, valeur mois par mois (a.lignesCA, a.lignesMS). Sans ligne : ancienne saisie par poste.
function lignesStructure(a,cle){return a&&Array.isArray(a[cle])?a[cle]:[];}
function totalLignesMois(a,cle,m){return lignesStructure(a,cle).reduce(function(s,l){let v=l&&l.valeurs?l.valeurs[m]:null;return s+(v===null||v===undefined||v===''?0:(+v||0));},0);}
function totalLigneAn(l){return (l&&l.valeurs?l.valeurs:[]).reduce(function(s,v){return s+(v===null||v===undefined||v===''?0:(+v||0));},0);}
function ligneStructureVide(nom){return {id:'l'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),nom:nom||'',valeurs:Array(12).fill(null)};}
function caStructure(a,m){if(lignesStructure(a,'lignesCA').length)return totalLignesMois(a,'lignesCA',m);let x=a.rex&&a.rex["Chiffre d'affaires"];if(!x)return 0;if(x.mode==='annual')return (+x.annual||0)/12;if(x.mode==='month')return x.values&&x.values[m]!==null&&x.values[m]!==undefined?+x.values[m]:0;return 0}
const feries=['2027-01-01','2027-03-29','2027-05-01','2027-05-06','2027-05-08','2027-05-17','2027-07-14','2027-08-15','2027-11-01','2027-11-11','2027-12-25'];
const vac={
  A:[['2027-01-01','2027-01-03'],['2027-02-13','2027-02-28'],['2027-04-10','2027-04-25'],['2027-07-03','2027-09-01'],['2027-10-23','2027-11-07'],['2027-12-18','2027-12-31']],
  B:[['2027-01-01','2027-01-03'],['2027-02-20','2027-03-07'],['2027-04-17','2027-05-02'],['2027-07-03','2027-09-01'],['2027-10-23','2027-11-07'],['2027-12-18','2027-12-31']],
  C:[['2027-01-01','2027-01-03'],['2027-02-06','2027-02-21'],['2027-04-03','2027-04-18'],['2027-07-03','2027-09-01'],['2027-10-23','2027-11-07'],['2027-12-18','2027-12-31']]
};

// ── Fonctions ──
function agency(name){let a={name,histCA:null,histCA2025:null,histTXR2026:null,targetAbsRate:null,perspectives:'',targetCA:null,targetTXR:null,schoolZone:'B',actSan:true,actSai:false,actTP:false,moisVerrouilles:[],moisActif:null,cgLocked:false,tauxAbsImproductif:null,tauxHoraireBrutJuin:null,msNRBrutMensuel:null,msNRTauxCharges:null,ratioMaintien:null,hsImproductif:{},cpNR:cpNRVide(),repasRoulant:{},repasNonRoulant:{},idjfRoulant:{},idjfNonRoulant:{},
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
  // Heures contractuelles de la semaine, au prorata des jours de présence de chaque salarié (calendrier, nov. 2026) :
  // une entrée ou une sortie en milieu de semaine compte pour les seuls jours où le salarié est là.
  let jours = week!==undefined ? joursSemaine(a, week) : [];
  return a.employees.filter(estRoulantPart).reduce((s,e)=>{
    let h=(+e.hours||0)*partRoulant(e);
    if(!jours.length || (!e.dateEntree && !e.dateSortie)) return s+h;
    // jour par jour : chaque jour de présence compte pour son poids habituel dans la semaine
    let pds=jours.map(function(d){ return poidsJourSemaine(a,d); });
    if(pds.every(function(x){ return x!==null; })){
      let tot=pds.reduce(function(t,x){ return t+x; },0);
      if(tot>0) return s+h*jours.reduce(function(t,d,i){ return empPresent(e, cleJour(d.month, d.day)) ? t+pds[i] : t; },0)/tot;
    }
    let presents=jours.filter(function(d){ return empPresent(e, cleJour(d.month, d.day)); }).length;
    return s+h*presents/jours.length;
  },0);
}
// Part d'une semaine qui tombe dans le mois m (jours du calendrier) : 1 pour une semaine entière du mois, 4/7 et 3/7 pour une semaine à cheval
// Part de la capacité d'une semaine qui tombe dans le mois m : jours du mois à leur poids habituel (jour par jour)
function partCapaciteMois(a,w,m){
  let j=joursSemaine(a,w);if(!j.length)return 0;
  let p=j.map(function(d){return poidsJourSemaine(a,d);});
  if(p.some(function(x){return x===null;}))return partSemaineMois(a,w,m);
  let t=p.reduce(function(s,x){return s+x;},0);if(!(t>0))return partSemaineMois(a,w,m);
  return j.reduce(function(s,d,i){return d.month===m?s+p[i]:s;},0)/t;
}
function partSemaineMois(a,w,m){let j=joursSemaine(a,w);if(!j.length)return 0;return j.filter(function(d){return d.month===m;}).length/j.length;}

function between(d,s,e){return d>=s&&d<=e}

// Date « AAAA-MM-JJ » lue en heure locale (new Date('2027-03-08') est minuit UTC, soit la veille au soir
// pour une date construite localement : en France, le premier jour de chaque période de paie était perdu)
function dateLocale(iso){ if(iso instanceof Date) return iso; let m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso||'')); return m ? new Date(+m[1], +m[2]-1, +m[3]) : new Date(iso); }
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

// Majoration des HS (nov. 2026) : les 8 premières heures supplémentaires d'un salarié dans la semaine sont à +25 %,
// les suivantes à +50 %. Par défaut SOMA calcule la part à +50 % semaine par semaine (calcul « auto ») en supposant
// les HS réparties entre les salariés présents : équipe présente = heures disponibles ÷ 35, chacun absorbe 8 h à +25 %.
// Mode « manuel » : la part saisie mois par mois par l'agence (a.hs50, en %), comme avant.
const HS25_PAR_ETP = 8;
function hs50Auto(a){ return !a || a.hs50Mode !== 'manuel'; }
function part50Semaine(r, hsForce){
  let hs = hsForce===undefined ? (+(r&&r.hs)||0) : (+hsForce||0);
  if(hs <= 0) return 0;
  let etp = Math.max(0, (+(r&&r.av)||0) / 35);
  return Math.max(0, hs - HS25_PAR_ETP*etp) / hs;
}
function coefHSManuel(a, mois){
  let p = tauxHS50Saisi(a, mois);
  return (1 - p) * 1.25 + p * 1.50;
}
// Coefficient d'une semaine (r = ligne hsRows) pour le mois m ; hsForce : volume d'HS simulé
function coefHSSemaine(a, r, m, hsForce){
  if(!hs50Auto(a)) return coefHSManuel(a, m===undefined ? mainMonth(a, r.week) : m);
  return 1.25 + 0.25 * part50Semaine(r, hsForce);
}
// Part à +50 % de chaque mois en mode auto (pondérée par les HS attribuées au mois), null si le mois n'a pas d'HS
function parts50AutoMois(a){
  return memoMoteur(a, 'parts50Auto', function(){
    let hs = Array(12).fill(0), h50 = Array(12).fill(0);
    hsRows(a).forEach(function(r){
      if(!(r.hs > 0)) return;
      let p = part50Semaine(r);
      for(let m=0;m<12;m++){ let x = hsDuMois(a, r, m); if(x){ hs[m] += x; h50[m] += x*p; } }
    });
    return { parMois: hs.map(function(v,m){ return v>0 ? h50[m]/v : null; }), hs: hs, h50: h50 };
  });
}
function coefHSMois(a, mois){
  if(!hs50Auto(a)) return coefHSManuel(a, mois);
  let p = parts50AutoMois(a).parMois[mois];
  return 1.25 + 0.25 * (p || 0);
}

function coefHSMoyen(a){
  // Pondération par le volume de HS mensuel pour un coût moyen juste
  let totHS = 0, totCoef = 0;
  let hsR = hsRows(a);
  for(let m=0;m<12;m++){
    hsR.forEach(function(r){ let h = hsDuMois(a,r,m); if(h>0){ totHS += h; totCoef += h*coefHSSemaine(a,r,m); } }); // semaine à cheval : HS attribuées là où est le déficit
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
    total += hsR.reduce(function(s,r){ let h = hsDuMois(a,r,m); return h ? s + h*coefHSSemaine(a,r,m) : s; },0) * chMois(a, m); // semaine à cheval : HS attribuées là où est le déficit
  }
  return total;
}

function coutHoraireImproductif(a){
  let cm = msNRMensuel(a);
  if(cm!==null){
    let hHebdo = a.employees.filter(e=>!isRoulant(e.qual)).reduce((s,e)=>s+(+e.hours||0),0);
    return hHebdo>0 ? cm/(hHebdo*52/12) : (+a.costHour||0);
  }
  let imp = a.employees.filter(e=>!isRoulant(e.qual)&&e.qual!=='FACTURIERE'&&(+e.coutJour||0)>0);
  if(!imp.length) return (+a.costHour||0);
  let moyJour = imp.reduce((s,e)=>s+(+e.coutJour||0),0)/imp.length;
  return moyJour/7;
}

// Congés payés en jours OUVRABLES (nov. 2026) : une semaine de congés = 6 jours (lundi à samedi), 30 jours par an
// (5 semaines légales = 175 h pour un temps plein), soit 2,5 jours par mois ; un jour de CP retire 35/6 h ≈ 5,83 h.
const CP_JOURS_MOIS = 30/12;
const CP_HEURES_JOUR = 35/6;
// Arrêt maladie (loi du 22 avril 2024) : les congés continuent de s'acquérir, à 2 jours ouvrables par mois au lieu de 2,5,
// soit 80 % du rythme normal. L'accident du travail acquiert à 100 %, mais l'absentéisme saisi regroupe maladie et AT :
// la règle maladie (la plus prudente) s'applique à tout le taux.
const CP_ACQUIS_MALADIE = 0.8;
function cpGeneres(a) {
  // CP générés, en jours de 7 h retirés de la présence ROULANTE (audit nov. 2026) :
  // 2,5 j ouvrables par mois, 80 % de ce rythme pendant les arrêts (loi 2024), au prorata du temps de travail (heures / 35) et de la part roulante.
  // Les non-roulants n'entrent pas : leurs congés n'enlèvent pas de capacité de production.
  let salaries = a.employees.filter(estRoulantPart);
  if (!salaries.length) return 0;
  let totalJ = 0;
  M.forEach(function(_, m) {
    let tauxMal = a.sick[m] !== null && a.sick[m] !== undefined ? +a.sick[m] / 100 : 0;
    let dateRef = '2027-' + String(m+1).padStart(2,'0') + '-15';
    salaries.forEach(function(e){
      if(!empPresent(e, dateRef)) return;
      totalJ += CP_JOURS_MOIS * (1 - tauxMal * (1 - CP_ACQUIS_MALADIE)) * ((+e.hours||0) / 35) * partRoulant(e);
    });
  });
  // Jours entiers (nov. 2026) : les congés acquis s'arrondissent à l'entier supérieur
  return Math.ceil(totalJ - 1e-6);
}
// Partage d'un total entier en parts entières proportionnelles à des poids (méthode des plus forts restes)
function partsEntieres(total, poids){let n=Math.round(total),sp=poids.reduce(function(s,v){return s+v;},0);if(!poids.length)return [];if(sp<=0){let r=poids.map(function(){return 0;});r[0]=n;return r;}
  let brut=poids.map(function(v){return n*v/sp;}),ent=brut.map(Math.floor),reste=n-ent.reduce(function(s,v){return s+v;},0);
  brut.map(function(v,i){return [v-ent[i],i];}).sort(function(x,y){return y[0]-x[0];}).slice(0,reste).forEach(function(x){ent[x[1]]++;});return ent;}
// Congés des non-roulants (nov. 2026) : jours de CP saisis par mois pour l'équipe non roulante (total),
// suivis avec un compteur acquis / posés. Aucun coût : leur salaire est déjà dans la ligne non-roulants
// du CG (un congé est payé) et ils ne sont pas remplacés (décision de la direction des opérations).
function salariesNR(a){return (a.employees||[]).filter(function(e){return !isRoulant(e.qual)&&(1-partRoulant(e))>0;});}
// CP des non-roulants (nov. 2026, contrôle de gestion) : si le CG saisit le nombre d'ETP non roulants dans Données agences,
// l'acquisition est ETP × 2,5 j ouvrables par mois (sans lien avec l'écran Équipe) ; l'agence saisit les jours posés (déstockage).
function etpNR(a){let v=a&&a.etpNR;return (v===null||v===undefined||v==='')?null:Math.max(0,+v||0);}
function cpNRAcquisMois(a,m){let tot=0;for(let k=0;k<12;k++)tot+=cpNRAcquisMoisBrut(a,k);let b=cpNRAcquisMoisBrut(a,m);return tot>0?b*Math.ceil(tot-1e-6)/tot:0;}
function cpNRAcquisMoisBrut(a,m){let etp=etpNR(a);if(etp!==null)return etp*CP_JOURS_MOIS;let ref='2027-'+String(m+1).padStart(2,'0')+'-15',mal=tauxAbsMois(a,m);return salariesNR(a).reduce(function(s,e){if(!empPresent(e,ref))return s;return s+CP_JOURS_MOIS*(1-mal*(1-CP_ACQUIS_MALADIE))*((+e.hours||0)/35)*(1-partRoulant(e));},0);}
// Coût d'un jour ouvrable de non-roulant : MS non roulante mensuelle / ETP / 26 jours ouvrables par mois
function coutJourCPNR(a){let cm=msNRMensuel(a),e=etpNR(a);return cm!==null&&e>0?cm/e/26:0;}
function cpNRPrisMois(a,m){return a&&a.cpNR&&a.cpNR.jours?(+a.cpNR.jours[m]||0):0;}
// Variation du stock de CP des non-roulants : (jours acquis − jours posés) × coût d'un jour ; dotation les mois où l'équipe
// acquiert plus qu'elle ne pose, reprise (baisse de la MS) les mois de congés. Nulle sans ligne MS non roulante ni ETP saisis.
function variationStockCPNRMois(a,m){if(!a||estStructure(a))return 0;let c=coutJourCPNR(a);return c?(cpNRAcquisMois(a,m)-cpNRPrisMois(a,m))*c:0;}
function cpNRAcquis(a){return Math.ceil(M.reduce(function(s,_,m){return s+cpNRAcquisMoisBrut(a,m);},0)-1e-6);}
function cpNRSaisis(a){let j=a.cpNR&&a.cpNR.jours;return j?Math.round(j.reduce(function(s,v){return s+(+v||0);},0)*10)/10:0;}
function cpNRVide(){return {jours:Array(12).fill(null)};}
// Répartition automatique des jours acquis selon les enveloppes légales (60 % juin-octobre, 20 % novembre-janvier, 20 % février-mai)
function repartirCPNRAuto(a){
  // Jours entiers : chaque période puis chaque mois reçoit un nombre entier de jours, le total fait exactement les jours acquis
  let tot=cpNRAcquis(a),j=Array(12).fill(0),env=[[[5,6,7,8,9],0.6],[[10,11,0],0.2],[[1,2,3,4],0.2]];
  let parEnv=partsEntieres(tot,env.map(function(e){return e[1];}));
  env.forEach(function(e,k){let pm=partsEntieres(parEnv[k],e[0].map(function(){return 1;}));e[0].forEach(function(m,i){j[m]=pm[i];});});
  if(!a.cpNR)a.cpNR=cpNRVide();
  a.cpNR.jours=j;a.cpNR.auto=true;return a;
}
// Heures roulantes disponibles sur l'année hors heures supplémentaires : base contractuelle moins
// la maladie (taux moyen saisi, sinon cible) et les congés générés. Ne dépend pas du placement des CP.
function heuresDispoAnnuelles(a) {
  let remplis = (a.sick||[]).filter(function(v){ return v!==null && v!==undefined; });
  let mal = remplis.length ? remplis.reduce(function(s,v){ return s+(+v||0); },0)/remplis.length/100 : (+a.targetAbsRate||0)/100;
  // Fériés chômés (lundi-samedi, hors permanence) : heures en moins
  let feries = (a.cal&&a.cal.length) ? a.cal.reduce(function(s,d){return s+ferieChomeJour(a,d);},0) : 0;
  return Math.max(0, (baseH(a)*52 - feries)*(1-mal) - cpGeneres(a)*CP_HEURES_JOUR); // pas de maladie un jour férié chômé
}

// Semaine à cheval sur deux mois (nov. 2026) : CP et autres absences se saisissent mois par mois, en jours, selon les jours
// de la semaine qui tombent dans chaque mois. Le total de la semaine (presence[w][champ], utilisé par tous les calculs)
// est la somme des parts, mémorisées dans presence[w][champ + 'Mois'] = { mois: jours }.
function moisDeSemaine(a,w){let s=[];joursSemaine(a,w).forEach(function(d){if(s.indexOf(d.month)<0)s.push(d.month);});return s;}
function absPartMois(a,w,champ,m){
  let p=a.presence[w]||{},tot=+p[champ]||0,ms=moisDeSemaine(a,w);
  if(ms.indexOf(m)<0)return 0;
  if(ms.length<2)return tot;
  let parts=p[champ+'Mois'];
  if(parts&&typeof parts==='object')return +parts[m]||0;
  // Pas de saisie par mois (répartition automatique, ancien budget) : au prorata des jours de chaque mois — ouvrables
  // (lundi-samedi) pour les CP, ouvrés (lundi-vendredi) pour les autres absences ; 
  // le dernier mois reçoit le reste pour que les parts fassent exactement le total
  let ouv=function(mm){return joursSemaine(a,w).filter(function(d){let j=new Date(2027,d.month,d.day).getDay();return d.month===mm&&j>0&&j<(champ==='cp'?7:6);}).length;};
  let tous=ms.reduce(function(s,mm){return s+ouv(mm);},0);
  let ent=champ==='cp'&&Math.abs(tot-Math.round(tot))<1e-9; // CP en jours entiers : parts entières
  let part=function(mm){return tous>0?(ent?Math.round(tot*ouv(mm)/tous):Math.round(tot*ouv(mm)/tous*10)/10):(mm===ms[0]?tot:0);};
  if(m!==ms[ms.length-1])return part(m);
  return Math.round((tot-ms.slice(0,-1).reduce(function(s,mm){return s+part(mm);},0))*10)/10;
}
function setAbsPartMois(a,w,champ,m,v){
  let ms=moisDeSemaine(a,w),p=Object.assign({cp:0,other:0},a.presence[w]||{});
  v=(v===''||v===null||v===undefined)?0:(+String(v).replace(',','.')||0);
  if(champ==='cp')v=Math.max(0,Math.round(v)); // congés en jours entiers
  if(ms.length<2||ms.indexOf(m)<0){p[champ]=v;delete p[champ+'Mois'];}
  else{let parts={};ms.forEach(function(mm){parts[mm]=mm===m?v:absPartMois(a,w,champ,mm);});p[champ+'Mois']=parts;p[champ]=Math.round(ms.reduce(function(s,mm){return s+parts[mm];},0)*10)/10;}
  a.presence=Object.assign({},a.presence);a.presence[w]=p;return a;
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

// Index du calendrier par semaine ISO (nov. 2026, accélération) : évite de parcourir les 365 jours à chaque
// recherche. Indexé sur le tableau a.cal lui-même (genCal en crée un nouveau ; les champs week/month d'un jour
// ne changent jamais) et revalidé sur sa longueur. Recherche stricte : comme filter(d=>d.week===w).
const INDEX_CAL=new WeakMap();
function indexCal(a){let c=a.cal||[],x=INDEX_CAL.get(c);if(x&&x.n===c.length)return x;x={n:c.length,parSemaine:new Map(),moisPrincipal:new Map()};c.forEach(function(d){let l=x.parSemaine.get(d.week);if(!l){l=[];x.parSemaine.set(d.week,l);}l.push(d);});INDEX_CAL.set(c,x);return x;}
function joursSemaine(a,w){return indexCal(a).parSemaine.get(w)||[];}
function genCal(a){a.cal=[];for(let m=0;m<12;m++){let days=new Date(2027,m+1,0).getDate();for(let d=1;d<=days;d++){let dt=new Date(2027,m,d),type=typeDay(dt,a),ca={san:+a.refs.san[m][type]||0,sai:+a.refs.sai[m][type]||0,tp:+a.refs.tp[m][type]||0},ref=null,aj=a.ajustJours&&a.ajustJours[cleJour(m,d)];if(aj){ref={san:ca.san,sai:ca.sai,tp:ca.tp};['san','sai','tp'].forEach(function(k){if(aj[k]!==undefined&&aj[k]!==null&&aj[k]!=='')ca[k]=+aj[k]||0;});}a.cal.push({month:m,day:d,week:isoWeek(dt),type,ca,total:ca.san+ca.sai+ca.tp,ref})}}}
// Clé d'un jour 2027 (« 2027-03-16 ») ; a.ajustJours[clé] = {san?, sai?, tp?} remplace la référence CA de ce jour (ajustement fait sur le calendrier)
function cleJour(m,d){return '2027-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');}

// Cache le temps d'UN calcul groupé (avecCacheMoteur) : le budget n'est pas modifié pendant ce calcul.
// Hors de ce cadre, aucun cache : le comportement reste celui d'avant (sûr pour un objet modifié sur place).
let CACHE_MOTEUR=null;
function avecCacheMoteur(fn){if(CACHE_MOTEUR)return fn();CACHE_MOTEUR=new WeakMap();try{return fn();}finally{CACHE_MOTEUR=null;}}
function memoMoteur(a,cle,calc){if(!CACHE_MOTEUR||!a||typeof a!=='object')return calc();let m=CACHE_MOTEUR.get(a);if(!m){m={};CACHE_MOTEUR.set(a,m);}if(!(cle in m))m[cle]=calc();return m[cle];}
function hsRows(a){return memoMoteur(a,'hsRows',function(){return hsRowsCalc(a);});}
function hsRowsCalc(a){
  let seuils=refAgenceSeuilsBase(a);
  return needWeeks(a).map(n=>{
    let p=pres(a,n.week),gap=n.hours-p.av,hs=Math.max(0,gap),under=Math.max(0,-gap);
    let t=hs>seuils.seuilTensionCrit?'critique':hs>seuils.seuiltensionWarn?'warning':under>seuils.seuiltensionWarn?'sous-charge':'ok';
    return {...n,...p,gap,hs,under,t,...partsMoisSemaine(a,n.week,p,hs)};
  });
}
// Semaine à cheval sur deux mois (nov. 2026) : les HS restent calculées sur la semaine entière (35 h hebdomadaires),
// mais sont attribuées aux mois là où le besoin dépasse l'équipe. Chaque morceau de semaine a son besoin (CA de ses jours
// ÷ TXR de son mois) et son équipe disponible (base au prorata de ses jours, maladie de son mois, congés et absences
// saisis sur la part de ce mois) ; les HS vont aux mois au prorata de leur déficit (à défaut, au prorata des jours).
function partsMoisSemaine(a,w,p,hs){
  let jrs=joursSemaine(a,w),ms=moisDeSemaine(a,w);
  if(ms.length<2){let m=ms.length?ms[0]:p.m,o={};o[m]=hs;return {hsMois:o,besoinMois:null,dispoMois:null};}
  let besoin={},dispo={},deficit={},total=0;
  ms.forEach(function(m){
    let j=jrs.filter(function(d){return d.month===m;}),k=partCapaciteMois(a,w,m),t=txrDuMois(a,m);
    besoin[m]=t>0?j.reduce(function(s,d){return s+d.total/t;},0):0;
    let tx=a.sick&&a.sick[m]!==null&&a.sick[m]!==undefined?+a.sick[m]:0;
    let abs=absPartMois(a,w,'cp',m)*CP_HEURES_JOUR+absPartMois(a,w,'other',m)*7+absPartMois(a,w,'otherPaid',m)*7+ferieChomeSemaine(a,w,m);
    dispo[m]=Math.max(0,p.base*k*(1-tx/100)-abs);
    deficit[m]=Math.max(0,besoin[m]-dispo[m]);total+=deficit[m];
  });
  let o={};ms.forEach(function(m){o[m]=hs>0?(total>0?hs*deficit[m]/total:hs*partSemaineMois(a,w,m)):0;});
  return {hsMois:o,besoinMois:besoin,dispoMois:dispo};
}
// HS d'une semaine attribuées au mois m
function hsDuMois(a,r,m){return r&&r.hsMois?(+r.hsMois[m]||0):(r?(r.hs||0)*partSemaineMois(a,r.week,m):0);}
// HS d'une semaine attribuées à une partie de ses jours (période de paie) : part de chaque mois au prorata de ses jours retenus
function hsDesJours(a,r,garder){let jrs=joursSemaine(a,r.week);if(!jrs.length)return 0;let t=0;moisDeSemaine(a,r.week).forEach(function(m){let j=jrs.filter(function(d){return d.month===m;});if(!j.length)return;t+=hsDuMois(a,r,m)*j.filter(garder).length/j.length;});return t;}

function impactCPSemaine(a, week, deltaCPjours) {
  // Impact financier d'ajouter/retirer deltaCPjours sur cette semaine
  // 1J de CP (jour ouvrable) = 35/6 h. Si semaine en HS, retirer 1J = +5,83 h HS × coût horaire × coefficient HS du mois (barème 25/50)
  // Si semaine en sous-charge, ajouter 1J = économie nulle (pas de HS à éviter)
  let hr = hsRows(a).find(function(r){ return r.week === week; }) || {hs:0, gap:0};
  let hsDelta = -deltaCPjours * CP_HEURES_JOUR; // retirer CP augmente les HS
  let costHour = chMois(a, mainMonth(a, week)) || 28.5;
  let coefHS = coefHSSemaine(a, hr.week===undefined ? {hs:0,av:0} : hr, mainMonth(a, week), Math.max(0,(hr.hs||0)+hsDelta));
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
// DEA/AA/TAXI/TPMR, 0 % pour les autres (facturière comprise). La part roulante est comptée en capacité et en
// masse salariale roulante (au coût horaire de l'agence) : le CG la retire de la ligne non-roulants.
function partRoulant(e){if(!e)return 0;let d=isRoulant(e.qual)?1:0,p=e.pctRoulant;if(p===null||p===undefined||p==='')return d;p=+p;return isNaN(p)?d:Math.max(0,Math.min(100,p))/100}
function estRoulantPart(e){return partRoulant(e)>0}
function isRoulant(qual){return ['DEA','AA','TAXI','TPMR'].includes((qual||'').toUpperCase())}

function isVac(iso,z){return (vac[z]||vac.B).some(x=>between(iso,x[0],x[1]))}

function isoWeek(date){let d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())),day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);let y=new Date(Date.UTC(d.getUTCFullYear(),0,1));return Math.ceil((((d-y)/86400000)+1)/7)}

function mainMonth(a,w){let ix=indexCal(a),k=+w;if(ix.moisPrincipal.has(k))return ix.moisPrincipal.get(k);let c={};(isNaN(k)?[]:joursSemaine(a,k)).forEach(d=>c[d.month]=(c[d.month]||0)+1);let r=+(Object.entries(c).sort((x,y)=>y[1]-x[1])[0]?.[0]||0);ix.moisPrincipal.set(k,r);return r}

function manual(a,l,m){let x=a.rex[l];if(!x)return 0;if(x.mode==='pct')return monthCA(a,m)*(+x.pct||0)/100;if(x.mode==='pctMois')return monthCA(a,m)*(+(x.pcts&&x.pcts[m])||0)/100;if(x.mode==='annual'){let annual=+x.annual||0;if(x.allocationKey==='ca')return annual*annualCAWeight(a,m);return annual/12}return x.values[m]!==null&&x.values[m]!==undefined?+x.values[m]:0}

function monthCA(a,m){if(estStructure(a))return caStructure(a,m);if(!a.cal||!a.cal.length){if(!a.refs)return caFunMois(a,m);genCal(a);}return a.cal.filter(d=>d.month===m).reduce((s,d)=>s+d.total,0)+caFunMois(a,m)}
// Activité funéraire (nov. 2026, agence de Cahors) : CA commercial saisi par mois, réparti à parts égales sur les jours du mois.
// Sans besoin d'équipage : il entre dans le CA (compte de résultat, charges en % du CA) mais ni dans les heures de besoin
// (qui viennent du CA des jours du calendrier, a.cal[].total), ni dans le TXR, ni dans l'objectif de CA (transport).
function caFunMois(a,m){if(!a||!a.actFun||!Array.isArray(a.caFuneraire))return 0;return Math.max(0,+a.caFuneraire[m]||0);}
function caFunJour(a,m){return caFunMois(a,m)/new Date(2027,m+1,0).getDate();}
function caFunAnnuel(a){return M.reduce(function(s,_,m){return s+caFunMois(a,m);},0);}

// TXR du mois : modulation mensuelle facultative saisie par le REX (txrMois), sinon le TXR cible annuel
function txrDuMois(a,m){let v=a&&a.txrMois?+a.txrMois[m]:0;return v>0?v:(+(a&&a.targetTXR)||0)}
function txrModule(a){return !!(a&&Array.isArray(a.txrMois)&&a.txrMois.some(v=>+v>0))}
// Heures nécessaires de la semaine : CA de chaque jour ÷ TXR de son mois
function needWeeks(a){let mod=txrModule(a),t=+a.targetTXR||0;return weeks(a).map(w=>({week:w.week,days:w.days.length,ca:w.ca,hours:mod?w.days.reduce((s,d)=>{let x=txrDuMois(a,d.month);return s+(x>0?d.total/x:0)},0):(t?w.ca/t:0)}))}
// TXR moyen réellement appliqué sur l'année (CA ÷ heures nécessaires) ; égal au TXR cible sans modulation
function txrEffectif(a){if(!txrModule(a)||!a.cal||!a.cal.length)return +(a&&a.targetTXR)||0;let ca=0,h=0;needWeeks(a).forEach(w=>{ca+=w.ca;h+=w.hours});return h>0?ca/h:(+a.targetTXR||0)}

// Provision pour congés payés (nov. 2026) : la charge de personnel du mois comprend la variation du stock de congés
// des roulants (+ jours acquis dans le mois, − jours posés dans le mois), valorisée jours × 35/6 h × coût horaire chargé du mois.
// Les mois où l'équipe part en congés (souvent les mois faibles en CA), la reprise de provision diminue la charge ;
// sur l'année, la somme des variations est nulle quand les congés posés égalent les congés acquis.
// Mois par mois au prorata, ramené au total arrondi à l'entier supérieur (la provision s'annule sur l'année quand posés = acquis)
function cpAcquisMois(a,m){let tot=0;for(let k=0;k<12;k++)tot+=cpAcquisMoisBrut(a,k);let b=cpAcquisMoisBrut(a,m);return tot>0?b*cpGeneres(a)/tot:0;}
function cpAcquisMoisBrut(a,m){
  let tauxMal=a.sick&&a.sick[m]!==null&&a.sick[m]!==undefined?+a.sick[m]/100:0,ref='2027-'+String(m+1).padStart(2,'0')+'-15';
  return (a.employees||[]).filter(estRoulantPart).reduce(function(s,e){
    if(!empPresent(e,ref))return s;
    return s+CP_JOURS_MOIS*(1-tauxMal*(1-CP_ACQUIS_MALADIE))*((+e.hours||0)/35)*partRoulant(e);
  },0);
}
function cpPrisMois(a,m){
  let s=0;
  needWeeks(a).forEach(function(w){if(moisDeSemaine(a,w.week).indexOf(m)>=0)s+=absPartMois(a,w.week,'cp',m);});
  return s;
}
function variationStockCPMois(a,m){if(!a||estStructure(a)||!a.employees||!a.employees.length)return 0;return (cpAcquisMois(a,m)-cpPrisMois(a,m))*CP_HEURES_JOUR*chMois(a,m);}
// La masse salariale suit les périodes de paie (sinon : mois civil)
function paieParPeriodes(a){ return !!(a && a.periodesPaie && a.periodesPaie.length && a.costHour && a.cal && a.cal.length); }
function payrollMonth(a,m){
  // Structure : charges de personnel saisies par le CG
  if(estStructure(a)) return lignesStructure(a,'lignesMS').length ? totalLignesMois(a,'lignesMS',m) : manual(a,'Charges de personnel',m);
  // Si les périodes de paie sont configurées, utiliser le calcul comptable
  if(paieParPeriodes(a)){
    return payrollPayMonth(a, m);
  }
  // Sinon fallback sur le calcul mois civil
  return payrollMonthCivil(a,m);
}

function payrollMonthCivil(a,m){
  // MS roulante : heures travaillées, HS, maintien sur arrêts, précarité CDD (cf. coutRoulantSemaine)
  let msRoulant = hsRows(a).reduce((s,r)=>{
    let daysWeek=joursSemaine(a,r.week).length||7;
    let daysMonth=joursSemaine(a,r.week).filter(d=>d.month===m).length;
    if(!daysMonth)return s;
    let ratio=daysMonth/daysWeek;
    // Semaine à cheval : coût hors HS au prorata des jours, HS selon leur mois (cf. partsMoisSemaine)
    let horsHS=coutRoulantSemaine(a,r,m,0);
    return s+horsHS*ratio+hsDuMois(a,r,m)*chMois(a,m)*coefHSSemaine(a,r,m)*(1+TAUX_PRECARITE_CDD*partCDDSemaine(a,r.week));
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
    let daysWeek=joursSemaine(a,w).length||7;
    let daysMonth=joursSemaine(a,w).filter(d=>d.month===m).length;
    let ratio=daysMonth/daysWeek;
    msHSImproductif += hs * coutHoraireImproductif(a) * coefHSMois(a,m) * ratio;
  });
  // Indemnités repas (roulants + non-roulants) : semaines rattachées au mois, pro-rata jours
  let repasMois = indemnitesMoisCivil(a, m);
  // Quote-part DR : incluse dans la ligne globale non-roulante quand elle est saisie
  let msDR = msNRMensuel(a)!==null ? 0 : (+a.drCostAnnual||0)*(+a.drPct||0)/100/12;
  return msRoulant+msImproductif+msHSImproductif+repasMois+msDR+variationStockCPMois(a,m)+variationStockCPNRMois(a,m); // + variation du stock de congés payés
}

// Indemnités (repas, dimanche et jour férié, roulants et non-roulants) saisies pour une semaine
function indemnitesSemaine(a, w){
  let v=function(o){ return o&&o[w] ? +o[w] : 0; };
  return v(a.repasRoulant)+v(a.repasNonRoulant)+v(a.idjfRoulant)+v(a.idjfNonRoulant);
}
// Indemnités d'un mois civil : semaines du mois au prorata de leurs jours
function indemnitesMoisCivil(a, m){
  let t=0;
  a.cal.filter(d=>d.month===m).map(d=>d.week).filter((v,i,arr)=>arr.indexOf(v)===i).forEach(function(w){
    let j=joursSemaine(a,w),n=j.length||7,dm=j.filter(d=>d.month===m).length;
    t+=indemnitesSemaine(a,w)*dm/n;
  });
  return t;
}
// Indemnités payées sur une période de paie (du debut au fin inclus) : semaines au prorata de leurs jours dans la période
function indemnitesPeriode(a, debut, fin){
  let t=0;
  a.cal.map(d=>d.week).filter((v,i,arr)=>arr.indexOf(v)===i).forEach(function(w){
    let j=joursSemaine(a,w);if(!j.length)return;
    let k=j.filter(function(d){ let dt=new Date(2027,d.month,d.day); return dt>=debut&&dt<=fin; }).length/j.length;
    if(k>0) t+=indemnitesSemaine(a,w)*k;
  });
  return t;
}
// Indemnités comprises dans la ligne Charges de personnel du mois m (même règle que payrollMonth)
function indemnitesMS(a, m){
  if(estStructure(a)) return 0;
  if(paieParPeriodes(a)){
    let p=a.periodesPaie[m]; return p ? indemnitesPeriode(a, dateLocale(p.debut), dateLocale(p.fin)) : 0;
  }
  return a.cal ? indemnitesMoisCivil(a, m) : 0;
}
// Paie(s) sur laquelle(lesquelles) part une semaine : [{mois: 0..11 | 'jan2028', part}] (part des jours de la semaine)
function paiesSemaine(a, w){
  let j=joursSemaine(a,w);if(!j.length)return [];
  let periodes=paieParPeriodes(a)?a.periodesPaie:null,o={};
  j.forEach(function(d){
    let dt=new Date(2027,d.month,d.day),cle;
    if(periodes){
      let i=periodes.findIndex(function(p){ return dt>=dateLocale(p.debut)&&dt<=dateLocale(p.fin); });
      cle=i>=0?i:(dt>dateLocale(periodes[periodes.length-1].fin)?'jan2028':'dec2026');
    } else cle=d.month;
    o[cle]=(o[cle]||0)+1/j.length;
  });
  return Object.keys(o).map(function(k){ return {mois: isNaN(+k)?k:+k, part:o[k]}; });
}

function payrollPayMonth(a, moisIdx) {
  // moisIdx : 0=janvier...11=décembre
  let periodes = a.periodesPaie || buildPeriodesPaie();
  let periode = periodes[moisIdx];
  if (!periode) return 0;

  let debut = dateLocale(periode.debut);
  let fin = dateLocale(periode.fin);

  // Salaires mensualisés (nov. 2026) : le salaire de base des roulants est celui du mois civil, le même chaque mois ;
  // seules les variables suivent la période de paie de 4 ou 5 semaines.
  // Janvier : + les variables de décembre 2026 saisies (le salaire de base de décembre 2026 a été payé en décembre 2026)
  let msJan2026 = moisIdx === 0 ? varDec2026Total(a) : 0;

  // Variables des semaines de la période (au prorata des jours compris dans la période)
  let hsR = hsRows(a);
  let ms = msJan2026 + msRoulantBaseMois(a, moisIdx);

  hsR.forEach(function(r) {
    // Trouver les jours de cette semaine dans le calendrier
    let daysOfWeek = joursSemaine(a, r.week);
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

    // Variables pro-ratisées de cette semaine (HS majorées − retenues)
    ms += variablesRoulantSemaine(a, r) * ratio;
  });

  // Masse salariale non-roulants et DR : salaires mensualisés, un mois de salaire par mois de paie

  // Non-roulants : ligne globale CG = un salaire mensuel par mois de paie.
  // À défaut, ancien calcul au coût journalier pro-rata de la période.
  let msNonRoulants = msNRMensuel(a)!==null ? msNRMois(a, moisIdx) : a.employees
    ? a.employees.filter(function(e) {
        return !['DEA','AA','TAXI','TPMR','FACTURIERE'].includes(e.qual);
      }).reduce(function(s, e) {
        return s + (+e.coutJour || 0) * (1 - partRoulant(e)) * (+e.joursSem || 5) * 52 / 12; // mensualisé
      }, 0)
    : 0;

  // HS improductives : réparties sur les semaines de la période
  let msHSImp = 0;
  if (a.hsImproductif) {
    hsR.forEach(function(r) {
      let hs = a.hsImproductif[r.week] ? +a.hsImproductif[r.week] : 0;
      if (!hs) return;
      let daysOfWeek = joursSemaine(a, r.week);
      if (!daysOfWeek.length) return;
      let daysInPeriode = daysOfWeek.filter(function(d) {
        let dt = new Date(2027, d.month, d.day);
        return dt >= debut && dt <= fin;
      }).length;
      let ratio = daysInPeriode / daysOfWeek.length;
      if (ratio <= 0) return;
      msHSImp += hs * coutHoraireImproductif(a) * coefHSSemaine(a,r,mainMonth(a,r.week)) * ratio;
    });
  }

  // Indemnités repas sur la période de paie
  let repasPeriode = indemnitesPeriode(a, debut, fin);

  // DR pro-rata
  let msDR = msNRMensuel(a)!==null ? 0 : (+a.drCostAnnual || 0) * (+a.drPct || 0) / 100 / 12; // mensualisé

  // Lissage de la 5e semaine de variables sur le trimestre (voir lissage5eSemaine)
  // + variation du stock de congés payés du mois (provision : dotation des jours acquis, reprise des jours posés)
  return ms + msNonRoulants + msHSImp + repasPeriode + msDR + lissage5eSemaine(a, moisIdx) + variationStockCPMois(a, moisIdx) + variationStockCPNRMois(a, moisIdx);
}

// ── Lissage de la 5e semaine de variables (règle du contrôle de gestion, nov. 2026) ──
// Chaque trimestre compte un mois de paie à 5 semaines de variables (janvier, avril, juillet, octobre)
// et deux mois à 4 semaines. On ne garde que 4 semaines de variables par mois et on lisse la 5e :
//   mois à 5 semaines : − (coût des HS du mois : taux plein + majorations 25 % et 50 %) / 5 × 2/3
//   chacun des 2 mois à 4 semaines du trimestre : + la moitié de ce montant.
// Le total du trimestre est inchangé ; chaque mois porte 4 semaines 1/3 de variables.
function nbSemPeriode(p){
  if(!p || !p.debut || !p.fin) return 0;
  return Math.round(((dateLocale(p.fin) - dateLocale(p.debut)) / 86400000 + 1) / 7);
}
// Coût des heures supplémentaires rattachées à un mois de paie (roulants + improductifs ;
// pour janvier, les HS de décembre 2026 saisies dans « Variables déc. 2026 », charges comprises)
function coutHSPeriodePaie(a, moisIdx){
  let periodes = a.periodesPaie || buildPeriodesPaie();
  let p = periodes[moisIdx]; if(!p) return 0;
  let debut = dateLocale(p.debut), fin = dateLocale(p.fin);
  let total = 0;
  hsRows(a).forEach(function(r){
    let jours = joursSemaine(a, r.week);
    if(!jours.length) return;
    let dedans = jours.filter(function(d){ let dt = new Date(2027, d.month, d.day); return dt >= debut && dt <= fin; }).length;
    if(!dedans) return;
    let ratio = dedans / jours.length, m = mainMonth(a, r.week);
    let hsP = hsDesJours(a, r, function(d){ let dt = new Date(2027, d.month, d.day); return dt >= debut && dt <= fin; });
    total += hsP * chMois(a, m) * coefHSSemaine(a, r, m) * (1 + TAUX_PRECARITE_CDD*partCDDSemaine(a, r.week));
    let hsImp = a.hsImproductif && a.hsImproductif[r.week] ? +a.hsImproductif[r.week] : 0;
    if(hsImp) total += hsImp * coutHoraireImproductif(a) * coefHSSemaine(a, r, m) * ratio;
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
  let jours = Math.round((new Date(2027,0,1) - dateLocale(p.debut)) / 86400000);
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

// Jours fériés (nov. 2026) : un férié du lundi au samedi retire 7 h par ETP roulant présent ce jour-là (au prorata des heures
// et de la part roulante) ; le dimanche ne compte pas. L'équipe de permanence reste disponible à hauteur du besoin du jour
// (CA du férié ÷ TXR) : seules les heures au-delà sont retirées. Ces heures fériées chômées restent payées (comme un congé).
function ferieChomeJour(a,d){
  if(!d||d.type!=='ferie')return 0;
  if(new Date(2027,d.month,d.day).getDay()===0)return 0;
  let cle=cleJour(d.month,d.day);
  let h=7*a.employees.filter(estRoulantPart).reduce(function(s,e){return empPresent(e,cle)?s+(+e.hours||0)/35*partRoulant(e):s;},0);
  let t=txrDuMois(a,d.month),besoin=t>0?(+d.total||0)/t:0;
  return Math.max(0,h-besoin);
}
function ferieChomeSemaine(a,w,m){return joursSemaine(a,w).reduce(function(s,d){return (m===undefined||d.month===m)?s+ferieChomeJour(a,d):s;},0);}
// Poids habituel d'un jour dans une semaine normale (activité de référence du mois : jour de semaine, samedi, dimanche),
// null sans activité de référence
function poidsJourSemaine(a,d){
  let poids=function(type){ let t=0; ['san','sai','tp'].forEach(function(k){ let r=a.refs&&a.refs[k]&&a.refs[k][d.month]; if(r&&r[type]!=null) t+=+r[type]||0; }); return t; };
  let sem=poids('semaine'),sam=poids('samedi'),dim=poids('dimanche'),tot=5*sem+sam+dim;
  if(!(tot>0)) return null;
  let j=new Date(2027,d.month,d.day).getDay();
  return (j===0?dim:j===6?sam:sem)/tot;
}
// Part d'une semaine incomplète (1er-3 janvier, 27-31 décembre) dans une semaine normale : somme des poids habituels
// des jours présents (lundi-vendredi pèsent bien plus que le week-end) ; 1 pour une semaine complète ; n/7 sans référence
function partSemainePartielle(a,w){
  let jrs=joursSemaine(a,w),n=jrs.length;
  if(!n||n>=7) return 1;
  let t=0; for(let i=0;i<n;i++){ let p=poidsJourSemaine(a,jrs[i]); if(p===null) return n/7; t+=p; }
  return t;
}
function pres(a,w){
  let base=baseHWeek(a,w);
  // Semaine partielle de l'année (1er-3 janvier, 27-31 décembre) : base au prorata du poids habituel de ces jours dans
  // la semaine (lundi-vendredi pèsent bien plus que samedi-dimanche), et non au nombre de jours
  base=base*partSemainePartielle(a,w);
  let p=a.presence[w]||{cp:0,other:0};
  let m=mainMonth(a,w);
  // Maladie : taux de chaque jour selon son mois (semaine à cheval = moyenne des deux mois pondérée par les jours)
  let jrs=joursSemaine(a,w),tx=function(mm){return a.sick[mm]!==null&&a.sick[mm]!==undefined?+a.sick[mm]:0;};
  // (jour par jour : chaque jour pèse selon son poids habituel dans la semaine)
  let pds=jrs.map(function(d){return poidsJourSemaine(a,d);}),okP=pds.length&&pds.every(function(x){return x!==null;});
  let sp=okP?pds.reduce(function(s,x){return s+x;},0):0;
  let rate=!jrs.length?tx(m):(okP&&sp>0?jrs.reduce(function(s,d,i){return s+tx(d.month)*pds[i];},0)/sp:jrs.reduce(function(s,d){return s+tx(d.month);},0)/jrs.length);
  // CP en jours ouvrables (6 par semaine, 1 J = 35/6 h) ; autres absences en jours de 7 h.
  // Autres absences (décision nov. 2026) : « payées » (formation, événements familiaux,
  // récupération…) coûtées au taux horaire comme les congés ; « non payées » (sans solde) non coûtées.
  // Semaine incomplète (jour par jour, nov. 2026) : les jours saisis sont des jours de 2027 ; un jour d'absence retire
  // la capacité moyenne d'un jour ouvrable de la semaine incomplète (sa capacité ÷ ses jours ouvrables), et non 35/6 h.
  // Les jours fériés ne sont pas des jours de congé : ils sont retirés de la fenêtre d'absence.
  let fJ=1;
  if(jrs.length&&jrs.length<7){
    let hors=jrs.filter(function(d){return d.type!=='ferie';}),ouvr=hors.filter(function(d){return new Date(2027,d.month,d.day).getDay()!==0;}).length;
    let part=0; for(let i=0;i<hors.length;i++){ let q=poidsJourSemaine(a,hors[i]); if(q===null){ part=hors.length/7; break; } part+=q; }
    fJ=ouvr>0?part*6/ouvr:0;
  }
  let cpH=(+p.cp||0)*CP_HEURES_JOUR*fJ; // CP en jours ouvrables (6 par semaine)
  let otherH=(+p.other||0)*7*fJ;
  let otherPaidH=(+p.otherPaid||0)*7*fJ;
  let ferieH=ferieChomeSemaine(a,w);
  // Semaine incomplète : un férié ne retire pas plus que la capacité habituelle de ce jour au-delà du besoin
  if(jrs.length&&jrs.length<7&&ferieH>0){ let bp=baseHWeek(a,w); ferieH=jrs.reduce(function(s,d){ let f=ferieChomeJour(a,d); if(!f) return s; let pj=poidsJourSemaine(a,d),t=txrDuMois(a,d.month),bj=t>0?(+d.total||0)/t:0; return s+(pj===null?f:Math.min(f,Math.max(0,bp*pj-bj))); },0); }
  // Maladie sur les heures réellement prévues (jour par jour : un salarié en repos un jour férié n'y est pas malade)
  let mal=Math.max(0,base-ferieH)*rate/100;
  let av=Math.max(0,base-cpH-mal-otherH-otherPaidH-ferieH);
  return {base,cp:+p.cp||0,cpH,other:+p.other||0,otherH,otherPaid:+p.otherPaid||0,otherPaidH,ferieH,m,rate,mal,av,etp:av/35,fJ};
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

// Postes de charges saisis par le REX (nov. 2026) : 4 en % du CA différent chaque mois, 2 en montant fixe par mois.
// Au premier passage, les valeurs déjà posées par le contrôleur de gestion sont reprises, converties dans ce mode
// (même montant mois par mois). Une ligne saisie par le REX porte saisieREX : l'import du classeur CG ne l'écrase plus.
const LIGNES_CHARGES_REX=[['Matériels ambulances','pctMois'],['Carburant','pctMois'],['Entretiens petits équipements','pctMois'],['Fourniture bureau - vêtements','pctMois'],['Sous traitance','month'],['Entretiens véhicules - batîment','month']];
function modeChargeREX(l){let r=LIGNES_CHARGES_REX.find(function(x){return x[0]===l;});return r?r[1]:null;}
// Valeurs à afficher au REX pour un poste (sans rien modifier) : 12 % du CA ou 12 montants
function valeursChargeREX(a,l){
  let mode=modeChargeREX(l),x=a.rex&&a.rex[l];
  if(!x)return Array(12).fill(null);
  if(x.mode===mode)return (mode==='pctMois'?(x.pcts||[]):(x.values||[])).slice(0,12).concat(Array(12).fill(null)).slice(0,12);
  let montants=M.map(function(_,m){return manual(a,l,m);});
  if(mode==='month')return montants.map(function(v){return v?Math.round(v):null;});
  let caAn=M.reduce(function(s,_,m){return s+monthCA(a,m);},0);
  if(caAn>0)return montants.map(function(v,m){let ca=monthCA(a,m);return ca>0&&v?Math.round(v/ca*10000)/100:null;});
  // CA pas encore construit : taux unique déduit du mode CG (taux fixe, ou montant annuel rapporté à l'objectif de CA)
  let t=x.mode==='pct'&&+x.pct?+x.pct:(+a.targetCA>0?Math.round(montants.reduce(function(s,v){return s+v;},0)/+a.targetCA*10000)/100:0);
  return Array(12).fill(t?t:null);
}
// Passe le poste dans le mode REX (reprise des valeurs CG) avant une saisie
function versSaisieREX(a,l){
  let mode=modeChargeREX(l);if(!mode)return null;
  if(!a.rex)a.rex={};
  let x=a.rex[l]||{values:Array(12).fill(null),mode:'month',chargeType:'variable',allocationKey:'monthly12',pct:0,annual:0};
  if(x.mode!==mode){let v=valeursChargeREX(a,l);x=Object.assign({},x,{mode:mode});if(mode==='pctMois')x.pcts=v;else x.values=v;}
  else x=Object.assign({},x,mode==='pctMois'?{pcts:(x.pcts||Array(12).fill(null)).slice()}:{values:(x.values||Array(12).fill(null)).slice()});
  x.saisieREX=true;a.rex=Object.assign({},a.rex);a.rex[l]=x;return x;
}
function setChargeREX(a,l,m,v){let x=versSaisieREX(a,l);if(!x)return a;let n=v===''||v===null||v===undefined?null:+String(v).replace(',','.');if(modeChargeREX(l)==='pctMois')x.pcts[m]=n;else x.values[m]=n;return a;}
// Postes travaillés par le REX (saisieREX) avec au moins une valeur : sert à l'avancement, sans recalcul du CA
function chargesREXRemplies(a){return LIGNES_CHARGES_REX.filter(function(r){let x=a.rex&&a.rex[r[0]];if(!x||!x.saisieREX)return false;return (r[1]==='pctMois'?(x.pcts||[]):(x.values||[])).some(function(v){return v!==null&&v!==undefined&&v!==''&&+v!==0;});}).length;}
// Seuil unique du ratio masse salariale / CA (direction des opérations, nov. 2026) : au-dessus, à signaler.
const SEUIL_MS_CA=62;
function sig(a,m){let v=l=>manual(a,l,m),ca=monthCA(a,m),marge=ca-v("Achats Matières premières et sous traitance")-v("Variations stock marchandises et autres approvisionnements"),aa=["Electricité - eau - chauffage","Matériels ambulances","Carburant","Entretiens petits équipements","Fourniture bureau - vêtements","Sous traitance","Crédit bail et location véhicules","Location téléphonie - informatique - mobilité","Location immobilières et charges locatives","Entretiens véhicules - batîment","Maintenance informatique","Assurance","Formation - documentation","Honoraires et prestations de services","Publicité - cadeaux","Frais de déplacement - missions réceptions","Péages","Affranchissement","Téléphonie - internet","Frais bancaires et cotisations"].reduce((s,l)=>s+v(l),0),va=marge-aa,pay=payrollMonth(a,m),qp=estStructure(a)?0:v("Quote-part MS siège")+v("Quote-part régulation mutualisée"),ebe=va+v("Subventions d'exploitation")-v("Impôts, taxes et versements assimilés")-pay-qp,rex=ebe+v("Reprises s/ charges et transferts")+v("Autres produits")-v("Dotations amortissements et provisions")-v("Autres charges"),rf=v("Produits financiers")-v("Charges financières"),rcai=rex+rf,re=v("Produits exceptionnels")-v("Charges exceptionnelles"),rn=rcai+re-v("Impôt sur les sociétés")-v("Participation aux bénéfices");return {"Chiffre d'affaires":ca,"Charges de personnel":pay+qp,"MARGE BRUTE GLOBALE":marge,"Autres Achats et charges externes":aa,"VALEUR AJOUTEE":va,"EXCEDENT BRUT D'EXPLOITATION":ebe,"RESULTAT D'EXPLOITATION":rex,"RESULTAT FINANCIER":rf,"RESULTAT COURANT AVANT IMPOT":rcai,"RESULTAT EXCEPTIONNEL":re,"RESULTAT NET":rn}}

// Part à +50 % du mois (0 à 1) : calculée (auto) ou saisie (manuel)
function tauxHS50Mois(a, mois){
  if(hs50Auto(a)) return parts50AutoMois(a).parMois[mois] || 0;
  return tauxHS50Saisi(a, mois);
}
// Part annuelle à +50 % (0 à 1), pondérée par les HS en auto, moyenne simple des mois saisis en manuel
function partHS50Annuelle(a){
  if(hs50Auto(a)){ let x = parts50AutoMois(a), t = x.hs.reduce(function(s,v){return s+v;},0); return t>0 ? x.h50.reduce(function(s,v){return s+v;},0)/t : 0; }
  let v = (a.hs50 || []).filter(function(x){ return x!==null && x!==undefined; });
  return v.length ? v.reduce(function(s,x){ return s + (+x||0); },0) / v.length / 100 : 0;
}
function tauxHS50Saisi(a, mois){
  if(!a.hs50) return 0;
  let v = a.hs50[mois];
  if(v===null || v===undefined) return 0;
  return Math.max(0, Math.min(100, +v)) / 100;
}

function typeDay(date,a){let iso=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0'),wd=date.getDay();if(feries.includes(iso))return 'ferie';if(wd===0)return 'dimanche';if(wd===6)return 'samedi';if(isVac(iso,a.schoolZone))return 'vacances';return 'semaine'}

function weekRefDate(a, week){
  let days=joursSemaine(a,week);
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
  let jours = joursSemaine(a, week);
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
  // Référence périmée : les congés acquis ont changé depuis la dernière répartition automatique
  // (équipe, dates, part roulante, absentéisme…) → comparer n'aurait pas de sens (audit CP nov. 2026).
  let totOpt = Object.keys(a.cpOptimal).reduce(function(s,k){ return s + (+a.cpOptimal[k] || 0); }, 0);
  let gen = cpGeneres(a);
  if(Math.abs(totOpt - gen) > Math.max(0.5, gen * 0.05)){
    return { mesurable:false, perimee:true, surcout:0, hsSup:0, semaines:[] };
  }
  // Coût HS actuel (avec les choix du REX)
  let coutActuel = coutHSTotal(a);
  // Coût HS de la répartition optimale recalculé sur les données ACTUELLES (même équipe, même objectif,
  // même coût horaire) : seul le placement des congés diffère, le surcoût mesure donc uniquement le choix du REX.
  let ref = Object.assign({}, a, { presence: {} });
  Object.keys(a.presence || {}).forEach(function(w){ ref.presence[w] = Object.assign({}, a.presence[w], { cp: +a.cpOptimal[w] || 0 }); });
  Object.keys(a.cpOptimal).forEach(function(w){ if(!ref.presence[w]) ref.presence[w] = { cp: +a.cpOptimal[w] || 0, other: 0 }; });
  let coutOptimal = coutHSTotal(ref);
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
    if(x.mode==='pctMois'&&(x.pcts||[]).some(p=>(+p||0)>20))pctHigh++;
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

function coutRoulantSemaine(a, r, mTaux, hsForce){
  let m = mainMonth(a, r.week);
  let ch = chMois(a, mTaux===undefined ? m : mTaux);
  // Heures travaillées + heures supplémentaires + maintien sur arrêts + indemnité de congés payés (salaire maintenu)
  // + absences payées (formation, événements familiaux, récupération…) au taux horaire comme les congés
  let hsW = hsForce===undefined ? r.hs : hsForce;
  let cout = (r.av*ch) + (hsW*ch*coefHSSemaine(a, r, mTaux===undefined ? m : mTaux, hsW)) + ((r.mal||0)*ch*ratioMaintien(a)) + ((r.cpH||0)*ch) + ((r.otherPaidH||0)*ch) + ((r.ferieH||0)*ch);
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
// Facturière : son coût n'est pas dans la ligne non-roulants (intégré à part) ; sa part roulante compte, rien n'est déduit.
function heuresRoulantesNR(a,m){let ref=m===undefined?null:'2027-'+String(m+1).padStart(2,'0')+'-15';return (a.employees||[]).reduce(function(s,e){if(isRoulant(e.qual)||String(e.qual||'').toUpperCase()==='FACTURIERE'||!estRoulantPart(e))return s;if(ref&&!empPresent(e,ref))return s;return s+(+e.hours||0)*partRoulant(e);},0)}
function transfertRoulantNR(a,m){return heuresRoulantesNR(a,m)*52/12*chMois(a,m===undefined?0:m)}
// MS non roulante (nov. 2026, demande du contrôle de gestion) : exactement la ligne saisie dans Données agences,
// brut mensuel × (1 + charges), sans lien avec l'équipe, les % roulants ni la maladie.
function msNRMois(a, m){
  let cm=msNRMensuel(a);
  return cm===null ? 0 : cm;
}
// Salarié de qualification non roulante déjà payé dans la ligne MS non roulante : sa part roulante
// compte dans la capacité en heures mais n'est pas coûtée une 2e fois dans la MS roulante.
function couvertParLigneNR(a,e){return msNRMensuel(a)!==null&&!isRoulant(e.qual)&&String(e.qual||'').toUpperCase()!=='FACTURIERE';}

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
      : x.mode === 'pctMois' ? (x.pcts || []).some(function(p){ return +p > 0; })
      : x.mode === 'annual' ? (+x.annual > 0)
      : (x.values || []).some(function(v){ return v !== null && v !== undefined && +v !== 0; });
    if(saisi) n++;
  });
  return n;
}

// Charges à reporter sur la paie de janvier 2028 : heures du 06/12/2027 au 31/12/2027
// (port fidèle de chargesReport2028).
// Salaire de base mensualisé des roulants (nov. 2026, art. L3242-1 du Code du travail) : heures du contrat × 52/12
// × taux horaire du mois, le même chaque mois quel que soit le nombre de semaines de la période de paie ; au prorata
// des jours du mois en cas d'entrée ou de sortie ; prime de précarité des CDD comprise. Congés payés et absences
// payées sont dans ce salaire (maintien) ; HS et retenues sont des variables (variablesRoulantSemaine).
function msRoulantBaseMois(a,m){
  let nbj=new Date(2027,m+1,0).getDate(),ch=chMois(a,m);
  return (a.employees||[]).filter(function(e){return estRoulantPart(e)&&!couvertParLigneNR(a,e);}).reduce(function(s,e){
    let f=1;
    if(e.dateEntree||e.dateSortie){let p=0;for(let d=1;d<=nbj;d++)if(empPresent(e,cleJour(m,d)))p++;f=p/nbj;}
    return s+(+e.hours||0)*partRoulant(e)*52/12*ch*f*(1+(isCDD(e)?TAUX_PRECARITE_CDD:0));
  },0);
}
// Variables d'une semaine, payées sur la période de paie qui la contient : HS majorées, moins les retenues
// (part de la maladie non maintenue, absences non payées), précarité CDD comprise
function variablesRoulantSemaine(a,r){
  let m=mainMonth(a,r.week),ch=chMois(a,m);
  let v=(r.hs||0)*ch*coefHSSemaine(a,r,m)-(r.mal||0)*ch*(1-ratioMaintien(a))-(r.otherH||0)*ch;
  return v*(1+TAUX_PRECARITE_CDD*partCDDSemaine(a,r.week));
}
// Heures supplémentaires réalisées du 06/12/2027 au 31/12/2027 : payées sur la paie de janvier 2028 (hors budget 2027
// quand la masse salariale suit les périodes de paie). {hs, cout} ; zéro en calcul par mois civil.
function hsPayees2028(a){
  if(!paieParPeriodes(a)) return {hs:0,cout:0};
  let debut=new Date(2027,11,6),hs=0,cout=0;
  hsRows(a).forEach(function(r){
    if(!(r.hs>0)) return;
    let h=hsDesJours(a,r,function(d){ return new Date(2027,d.month,d.day)>=debut; });
    if(h>0){ hs+=h; cout+=h*chMois(a,11)*coefHSSemaine(a,r,11); }
  });
  return {hs:hs,cout:cout};
}
function chargesReport2028(a){
  // Variables du 06/12/2027 au 31/12/2027 (HS, retenues, HS improductives) : payées sur la paie de janvier 2028.
  // Les salaires mensualisés de décembre (roulants, non-roulants, DR) sont payés en décembre : rien n'est reporté.
  let debut = new Date(2027, 11, 6), fin = new Date(2027, 11, 31), ms = 0;
  hsRows(a).forEach(function(r){
    let daysOfWeek = joursSemaine(a, r.week);
    if(!daysOfWeek.length) return;
    let ratio = daysOfWeek.filter(function(d){ let dt = new Date(2027, d.month, d.day); return dt >= debut && dt <= fin; }).length / daysOfWeek.length;
    if(ratio <= 0) return;
    ms += variablesRoulantSemaine(a, r) * ratio;
    let hsImp = a.hsImproductif && a.hsImproductif[r.week] ? +a.hsImproductif[r.week] : 0;
    if(hsImp) ms += hsImp * coutHoraireImproductif(a) * coefHSSemaine(a, r, mainMonth(a, r.week)) * ratio;
  });
  return Math.round(ms);
}

export { ferieChomeJour, ferieChomeSemaine, partSemainePartielle, poidsJourSemaine, partCapaciteMois, hsPayees2028, paieParPeriodes };
export { partsMoisSemaine, hsDuMois, hsDesJours };
export { partsEntieres };
export { txrDuMois, txrModule, txrEffectif };
export {
  cleJour,
  chargesReport2028, nbSemPeriode, coutHSPeriodePaie, lissage5eSemaine, baseDec2026, CP_JOURS_MOIS, CP_HEURES_JOUR, cpAcquisMois, cpPrisMois, variationStockCPMois, caFunMois, caFunJour, caFunAnnuel, msRoulantBaseMois, couvertParLigneNR, lignesStructure, totalLignesMois, totalLigneAn, ligneStructureVide, etpNR, coutJourCPNR, cpNRPrisMois, variationStockCPNRMois, variablesRoulantSemaine, CP_ACQUIS_MALADIE, moisDeSemaine, absPartMois, setAbsPartMois, partSemaineMois, heuresDispoAnnuelles, STRUCTURES, LIB_STRUCTURES, LIGNES_SIEGE, LIGNES_QUOTE_PART, estDetailSIG, libLigneSIG, partRoulant, estRoulantPart, estStructure, estSiege, vueExploitation, resultatAffiche, lignesSIG, caStructure,
  TAUX_PRECARITE_CDD, VAR_DEC_RUBRIQUES, salariesNR, cpNRAcquisMois, cpNRAcquis, cpNRSaisis, cpNRVide, repartirCPNRAuto, avecCacheMoteur, joursSemaine, SEUIL_MS_CA, LIGNES_CHARGES_REX, modeChargeREX, valeursChargeREX, versSaisieREX, setChargeREX, chargesREXRemplies, fmtCoutH, costHourJuin, chMois, ratioMaintien, tauxAbsMois, isCDD, partCDDSemaine, coutRoulantSemaine, msNRMensuel, msNRMois, heuresRoulantesNR, transfertRoulantNR, varDecDetail, varDecCalc, varDec2026Total, chargesCGSaisies, payrollMonth, payrollMonthCivil, payrollPayMonth, needWeeks, manual, monthCA, pres, weekRefDate, T, M, amount, ann, hsTot, hsParPersonne, qualifierSemaine, coutDuChoixREX, memoriserRepartitionOptimale, chargesSummary, auditAlerts, isEditableREX, agency, annualCA, annualCAWeight, baseH, baseHWeek, between, buildPeriodesPaie, dateLocale, indemnitesMS, paiesSemaine, indemnitesSemaine, coefHSMois, coefHSSemaine, part50Semaine, partHS50Annuelle, hs50Auto, HS25_PAR_ETP, coefHSMoyen, coutHSTotal, coutHoraireImproductif, cpGeneres, cpPlanifies, empPresent, genCal, hsRows, impactCPSemaine, isRoulant, isVac, isoWeek, mainMonth, refAgenceSeuils, refAgenceSeuilsBase, refs, sig, tauxHS50Mois, typeDay, weeks,
};