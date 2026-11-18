// Suivi des REX par le DR (nov. 2026) — texte identique dans le mono-fichier (index.html) et ici.
// Pour chaque agence du périmètre : le ou les REX et leur dernière activité, le statut du budget, son avancement
// par jalon, la dernière modification, et s'il faut relancer. avancementFn = avancementBudget(d, updatedAt, maintenant).
const JALONS_AVANCEMENT=[['Objectif','objectif'],['Références CA','refs'],['Équipe','equipe'],['Absentéisme','abs'],['Mois validés','mois'],['Charges','charges']];
const SEUIL_RELANCE_JOURS=7;
function jalonsAvancement(av){
  av=av||{};
  let v={objectif:av.objectif?100:0,refs:+av.refsPct||0,equipe:av.nbSalaries?100:0,abs:Math.round((+av.absSaisis||0)/12*100),mois:Math.round((+av.moisValides||0)/12*100),charges:Math.round((+av.chargesREX||0)/6*100)};
  return JALONS_AVANCEMENT.map(function(j){return {lib:j[0],pct:v[j[1]]};});
}
function detailJalon(j,av){
  av=av||{};
  if(j.lib==='Objectif')return av.objectif?'fixé':'à fixer';
  if(j.lib==='Références CA')return j.pct+' % des cases';
  if(j.lib==='Équipe')return (av.nbSalaries||0)+' salarié'+((av.nbSalaries||0)>1?'s':'');
  if(j.lib==='Absentéisme')return (av.absSaisis||0)+'/12 mois';
  if(j.lib==='Mois validés')return (av.moisValides||0)+'/12';
  return (av.chargesREX||0)+'/6 postes';
}
// agences : noms du périmètre ; budgets : {agence: {statut, data (version suivie), updated_at}} ; rexListe : lignes de suivi_rex()
function suiviAgencesRex(agences,budgets,rexListe,avancementFn,maintenant){
  maintenant=maintenant||Date.now();
  let lignes=(agences||[]).map(function(nom){
    let b=budgets&&budgets[nom];
    let rex=(rexListe||[]).filter(function(r){return r.agence===nom||(r.agences_supp||[]).indexOf(nom)>=0;}).map(function(r){
      let t=r.derniere_activite?Date.parse(r.derniere_activite):null;
      return {nom:r.nom||r.email||'—',email:r.email,activite:t,jours:t?Math.floor((maintenant-t)/86400000):null,nbConnexions:+r.nb_connexions||0,saisies:+r.saisies||0,principale:r.agence===nom};
    });
    let statut=b?(b.statut||'brouillon'):null;
    let av=b?avancementFn(b.data||{},b.updated_at,maintenant):null;
    let etat=!b?'non_commence':statut==='brouillon'?((av&&av.pct>0)?'en_cours':'non_commence'):statut==='valide_pdg'?'valide':'soumis';
    let jm=av?av.joursSansModif:null;
    let motifs=[];
    if(etat==='non_commence'||etat==='en_cours'){
      if(!rex.length)motifs.push('aucun REX rattaché');
      else if(rex.every(function(r){return !r.activite;}))motifs.push('REX jamais connecté');
      if(etat==='non_commence')motifs.push('budget non commencé');
      else if(jm!==null&&jm>=SEUIL_RELANCE_JOURS)motifs.push('aucune modification depuis '+jm+' jours');
    }
    return {agence:nom,statut:statut,etat:etat,av:av,pct:av?av.pct:0,jalons:jalonsAvancement(av),rex:rex,joursSansModif:jm,maj:b?b.updated_at:null,aRelancer:motifs.length>0,motifs:motifs};
  });
  let ordre={non_commence:0,en_cours:1,soumis:2,valide:3};
  lignes.sort(function(x,y){return (y.aRelancer?1:0)-(x.aRelancer?1:0)||ordre[x.etat]-ordre[y.etat]||x.pct-y.pct||x.agence.localeCompare(y.agence);});
  let n=function(e){return lignes.filter(function(l){return l.etat===e;}).length;};
  let enCours=lignes.filter(function(l){return l.etat==='en_cours'||l.etat==='non_commence';});
  let moy=enCours.length?Math.round(enCours.reduce(function(s,l){return s+l.pct;},0)/enCours.length):null;
  return {lignes:lignes,kpi:{total:lignes.length,nonCommences:n('non_commence'),enCours:n('en_cours'),soumis:n('soumis'),valides:n('valide'),aRelancer:lignes.filter(function(l){return l.aRelancer;}).length,avancementMoyen:moy}};
}
function ilYALisible(jours){if(jours===null||jours===undefined)return 'jamais';if(jours<=0)return 'aujourd\'hui';if(jours===1)return 'hier';return 'il y a '+jours+' jours';}

export { JALONS_AVANCEMENT, SEUIL_RELANCE_JOURS, jalonsAvancement, detailJalon, suiviAgencesRex, ilYALisible };
