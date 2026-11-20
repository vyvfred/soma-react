import { cpGeneres, cpPlanifies, cpNRAcquis, repartirCPNRAuto, partsEntieres, moisDeSemaine } from './calculations.js';
// Mise à jour des congés payés après un changement qui modifie les jours ACQUIS (audit CP nov. 2026) :
// équipe (ajout, suppression, import, reprise d'une autre version), dates d'entrée / de sortie, temps de travail,
// part roulante, qualification, absentéisme.
// Roulants : si des congés étaient déjà posés, seule la différence de jours acquis est ajoutée ou retirée sur les mois
// non validés (ajustement minimal, nov. 2026) : les congés déjà placés et les mois validés ne bougent pas.
// Non-roulants : la répartition 60/20/20 est refaite seulement si elle venait du bouton « Répartir »
// (cpNR.auto) ; une saisie à la main n'est jamais écrasée, le compteur « Reste à poser » signale l'écart.
function etatConges(a){return {gen:cpGeneres(a),nr:cpNRAcquis(a)};}
function rafraichirConges(a,avant,repartirRoulants){
  let r={roulants:false,nonRoulants:false};
  // Roulants : seule la variation des jours acquis est ajoutée ou retirée (ajustement minimal), le planning en place ne bouge pas
  if(Math.abs(cpGeneres(a)-avant.gen)>0.05&&cpPlanifies(a)>0&&+a.targetCA>0&&+a.targetTXR>0){repartirRoulants(a,undefined,cpGeneres(a)-avant.gen);r.roulants=true;}
  if(Math.abs(cpNRAcquis(a)-avant.nr)>0.05&&a.cpNR&&a.cpNR.auto){repartirCPNRAuto(a);r.nonRoulants=true;}
  return r;
}
// Règle d'acquisition 2024 (nov. 2026 : 80 % du rythme pendant les arrêts maladie). Un budget enregistré avant
// a ses congés posés sur l'ancien total acquis : à la première ouverture en modification, la répartition des roulants
// est refaite une fois sur les mois non validés (comme après un changement d'absentéisme). Renvoie true si le budget a changé.
function appliquerRegleCP2024(a,repartirRoulants){
  if(!a||a.regleCP===2024)return false;
  a.regleCP=2024;
  if(cpPlanifies(a)>0&&+a.targetCA>0&&+a.targetTXR>0&&Math.abs(cpPlanifies(a)-cpGeneres(a))>0.05)repartirRoulants(a);
  return true;
}
// Unité des CP (nov. 2026) : jours OUVRABLES, 6 par semaine. Un budget saisi avant en jours ouvrés (5 par semaine, 7 h)
// est converti une fois (× 6/5) au chargement : les heures retirées de la présence restent les mêmes. Renvoie true si converti.
function convertirCPOuvrables(a){
  if(!a||a.uniteCP==='ouvrables')return false;
  let r=function(v){return Math.round((+v||0)*6/5*10)/10;};
  Object.keys(a.presence||{}).forEach(function(w){
    let p=a.presence[w];if(!p)return;
    if(p.cpMois&&typeof p.cpMois==='object'){let s=0;Object.keys(p.cpMois).forEach(function(m){p.cpMois[m]=r(p.cpMois[m]);s+=p.cpMois[m];});p.cp=Math.round(s*10)/10;}
    else if(+p.cp)p.cp=r(p.cp);
  });
  if(a.cpOptimal)Object.keys(a.cpOptimal).forEach(function(w){a.cpOptimal[w]=r(a.cpOptimal[w]);});
  if(a.cpNR&&Array.isArray(a.cpNR.jours))a.cpNR.jours=a.cpNR.jours.map(function(v){return (v===null||v===undefined||v==='')?v:r(v);});
  if(Array.isArray(a.cpEnveloppes))a.cpEnveloppes=a.cpEnveloppes.map(function(e){return Object.assign({},e,{cible:r(e.cible),verrouille:r(e.verrouille),budget:r(e.budget)});});
  if(+a.cpReliquat)a.cpReliquat=r(a.cpReliquat);
  a.uniteCP='ouvrables';return true;
}
// Congés en jours entiers (nov. 2026) : un budget posé avant en demi-journées ou en décimales est arrondi une fois au
// chargement, en gardant le total de l'agence (méthode des plus forts restes, semaine par semaine) ; les parts par mois des
// semaines à cheval et les jours des non-roulants deviennent entiers aussi. Renvoie true si quelque chose a été arrondi.
function arrondirCPEntiers(a){
  if(!a||a.cpEntiers)return false;
  let entier=function(v){return Math.abs((+v||0)-Math.round(+v||0))<1e-9;};
  let cles=Object.keys(a.presence||{}),change=false;
  let aArrondir=cles.filter(function(w){let p=a.presence[w];return p&&!entier(p.cp);});
  if(aArrondir.length){
    let total=aArrondir.reduce(function(s,w){return s+(+a.presence[w].cp||0);},0);
    let parts=partsEntieres(Math.round(total),aArrondir.map(function(w){return +a.presence[w].cp||0;}));
    a.presence=Object.assign({},a.presence);
    aArrondir.forEach(function(w,i){a.presence[w]=Object.assign({},a.presence[w],{cp:parts[i]});});
    change=true;
  }
  // Parts par mois des semaines à cheval : entières, avec le même total que la semaine
  cles.forEach(function(w){let p=a.presence[w];if(!p||!p.cpMois||typeof p.cpMois!=='object')return;
    let ms=Object.keys(p.cpMois);if(ms.every(function(m){return entier(p.cpMois[m]);})&&Math.abs(ms.reduce(function(s,m){return s+(+p.cpMois[m]||0);},0)-(+p.cp||0))<1e-9)return;
    let pe=partsEntieres(+p.cp||0,ms.map(function(m){return Math.max(0,+p.cpMois[m]||0);}));let o={};ms.forEach(function(m,i){o[m]=pe[i];});
    a.presence[w]=Object.assign({},p,{cpMois:o});change=true;});
  if(a.cpOptimal)Object.keys(a.cpOptimal).forEach(function(w){if(!entier(a.cpOptimal[w])){a.cpOptimal[w]=Math.round(+a.cpOptimal[w]||0);change=true;}});
  if(a.cpNR&&Array.isArray(a.cpNR.jours)&&a.cpNR.jours.some(function(v){return v!==null&&v!==undefined&&v!==''&&!entier(v);})){
    let idx=[],poids=[];a.cpNR.jours.forEach(function(v,i){if(v!==null&&v!==undefined&&v!==''){idx.push(i);poids.push(+v||0);}});
    let pe=partsEntieres(Math.round(poids.reduce(function(s,v){return s+v;},0)),poids);let j=a.cpNR.jours.slice();idx.forEach(function(i,k){j[i]=pe[k];});
    a.cpNR=Object.assign({},a.cpNR,{jours:j});change=true;}
  if(+a.cpReliquat&&!entier(a.cpReliquat))a.cpReliquat=Math.round(a.cpReliquat);
  a.cpEntiers=true;return change;
}
export { etatConges, rafraichirConges, appliquerRegleCP2024, convertirCPOuvrables, arrondirCPEntiers };
