import { ann, amount, monthCA, hsTot, coutHSTotal, estStructure, M } from './calculations.js';
import { anneeRep, atterrissage2026, annuel2025, completerAtterrissageCA, reperesAgence, ratioMoisRep, ratioLigneRep, serieRep, valRep } from './reperes.js';
// Synthèse du budget (refonte nov. 2026), commune à tous les rôles : l'essentiel du budget 2027 face à 2026, 2025 et à la
// moyenne du réseau, deux graphiques (CA mois par mois, passage du résultat 2026 au résultat 2027), les points à regarder.
// Aucun seuil imposé ; couleurs neutres. Données (syntheseVue) et rendu HTML (syntheseVueHTML) identiques dans les deux versions.
function svPct(v,b){return b?v/b*100:null;}
function svEvol(x,y){return x&&y?(x/y-1)*100:null;}
function syntheseVue(a,r0,reseau,opts){
  opts=opts||{};
  let r=completerAtterrissageCA(r0,a&&a.histCA),res26=anneeRep(reseau,2026),struct=estStructure(a);
  let ca=ann(a,"Chiffre d'affaires"),ms=ann(a,'Charges de personnel'),ext=ann(a,'Autres Achats et charges externes'),rex=ann(a,"RESULTAT D'EXPLOITATION");
  let a26=function(cle){return anneeRep(r,2026)?atterrissage2026(r,cle).val:null;};
  let ca26=a26('ca');if(ca26===null&&+a.histCA>0)ca26=+a.histCA;
  let ca25=annuel2025(r,'ca'),ms26=a26('perso'),ext26=a26('ext'),rex26=a26('rex');
  let resL=opts.libResultat||"Résultat d'exploitation",resV=opts.resultat!==undefined?opts.resultat:rex;
  let obj=+a.targetCA||0;
  let kpis=[
    {cle:'ca',label:"Chiffre d'affaires 2027",valeur:ca,type:'euro',sous:obj&&!struct?'objectif '+svK(obj)+' ('+svSigne(svEvol(ca,obj),' %')+')':'',
      comps:[{lib:'vs 2026',val:svEvol(ca,ca26),type:'evol'},{lib:'vs 2025',val:svEvol(ca,ca25),type:'evol'}]},
    {cle:'res',label:resL,valeur:resV,type:'euro',sous:ca?svP(svPct(resV,ca))+' du CA':'',
      comps:[{lib:'2026',val:svPct(rex26,ca26),type:'ratio',ref:svPct(rex,ca)},{lib:'réseau 2026',val:ratioLigneRep(res26,"RESULTAT D'EXPLOITATION"),type:'ratio',ref:svPct(rex,ca)}]},
    {cle:'ms',label:'Masse salariale / CA',valeur:svPct(ms,ca),type:'ratio',sous:svK(ms)+' de charges de personnel',
      comps:[{lib:'2026',val:svPct(ms26,ca26),type:'ratio',ref:svPct(ms,ca)},{lib:'réseau 2026',val:ratioLigneRep(res26,'Charges de personnel'),type:'ratio',ref:svPct(ms,ca)}]},
    {cle:'ext',label:'Charges externes / CA',valeur:svPct(ext,ca),type:'ratio',sous:svK(ext)+' de charges externes',
      comps:[{lib:'2026',val:svPct(ext26,ca26),type:'ratio',ref:svPct(ext,ca)},{lib:'réseau 2026',val:ratioLigneRep(res26,'Autres Achats et charges externes'),type:'ratio',ref:svPct(ext,ca)}]}
  ];
  if(!struct&&(a.employees||[]).length){
    let t=hsTot(a),cout=coutHSTotal(a);
    kpis.push({cle:'hs',label:'Heures supplémentaires',valeur:t.hs,type:'heures',sous:svK(cout)+' sur l\'année',comps:[{lib:'coût / CA',val:svPct(cout,ca),type:'ratioSimple'}]});
  }
  // CA mois par mois : budget 2027, 2026 (réalisé puis atterrissage), réalisé 2025
  let r26=anneeRep(r,2026),r25=anneeRep(r,2025);
  let s26=r26?M.map(function(_,m){let mc=r26.moisClos||0;if(m<mc)return valRep(serieRep(r26,'reel','ca')[m]);let e=r26.estim&&r26.estim.ca?valRep(r26.estim.ca[m]):null;return e!==null?e:valRep(serieRep(r26,'budget','ca')[m]);}):null;
  let mensuel={ca27:M.map(function(_,m){return monthCA(a,m);}),ca26:s26,ca25:r25?M.map(function(_,m){return valRep(serieRep(r25,'reel','ca')[m]);}):null,moisClos26:r26?r26.moisClos||0:0,
    ms27:M.map(function(_,m){let c=monthCA(a,m);return c?amount(a,'Charges de personnel',m)/c*100:null;}),msRes26:res26?M.map(function(_,m){return ratioMoisRep(res26,'perso',m);}):null};
  // Passage du résultat 2026 au résultat 2027
  let pont=null;
  if(rex26!==null&&ca26&&ms26!==null&&ext26!==null&&ca){
    let dCA=ca-ca26,dExt=-(ext-ext26),dMS=-(ms-ms26),autres=rex-(rex26+dCA+dExt+dMS);
    pont=[{lib:'Résultat 2026',val:rex26,type:'total'},{lib:'Chiffre d\'affaires',val:dCA,type:'delta'},{lib:'Charges externes',val:dExt,type:'delta'},{lib:'Masse salariale',val:dMS,type:'delta'},{lib:'Autres postes',val:autres,type:'delta'},{lib:'Résultat 2027',val:rex,type:'total'}];
  }
  // Points à regarder : repères 2026 (sinon rien), sans doublon
  let x=r0?reperesAgence(a,r0):null,points=x?x.alertes.slice():[];
  if(resV<0)points.unshift({niveau:'attention',texte:resL+' 2027 négatif : '+svK(resV)+(ca?' ('+svP(svPct(resV,ca))+' du CA)':'')});
  return {ca:ca,kpis:kpis,mensuel:mensuel,pont:pont,points:points,avecRepere:!!r26,nbReseau:reseau&&reseau.nbAgences||0};
}
// ── Rendu ──
function svEsc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function svNb(v,d){return (Math.round(v*Math.pow(10,d||0))/Math.pow(10,d||0)).toLocaleString('fr-FR');}
function svK(v){if(v===null||v===undefined||!isFinite(v))return '—';return Math.abs(v)>=1e6?svNb(v/1e6,2)+' M€':svNb(v/1000)+' k€';}
function svP(v){return v===null||v===undefined||!isFinite(v)?'—':svNb(v,1)+' %';}
function svSigne(v,u){return v===null||v===undefined||!isFinite(v)?'—':(v>0?'+':v<0?'−':'')+svNb(Math.abs(v),1)+u;}
function svValeur(k){if(k.valeur===null||k.valeur===undefined||!isFinite(k.valeur))return '—';if(k.type==='euro')return svK(k.valeur);if(k.type==='heures')return svNb(k.valeur)+' h';return svP(k.valeur);}
function svComp(c){
  if(c.val===null||c.val===undefined||!isFinite(c.val))return '<span class="sv-comp"><span class="sv-comp-lib">'+svEsc(c.lib)+'</span> —</span>';
  if(c.type==='evol')return '<span class="sv-comp"><span class="sv-fleche">'+(c.val>0.05?'▲':c.val<-0.05?'▼':'＝')+'</span> '+svSigne(c.val,' %')+' <span class="sv-comp-lib">'+svEsc(c.lib)+'</span></span>';
  if(c.type==='ratioSimple')return '<span class="sv-comp">'+svP(c.val)+' <span class="sv-comp-lib">'+svEsc(c.lib)+'</span></span>';
  let d=c.ref!==null&&c.ref!==undefined&&isFinite(c.ref)?c.ref-c.val:null;
  return '<span class="sv-comp"><span class="sv-comp-lib">'+svEsc(c.lib)+'</span> '+svP(c.val)+(d!==null?' <span class="sv-ecart">('+svSigne(d,' pt')+')</span>':'')+'</span>';
}
function svCarte(k){return '<div class="sv-kpi" data-testid="sv-kpi-'+k.cle+'"><div class="sv-kpi-lib">'+svEsc(k.label)+'</div><div class="sv-kpi-val">'+svValeur(k)+'</div>'+(k.sous?'<div class="sv-kpi-sous">'+svEsc(k.sous)+'</div>':'')+'<div class="sv-kpi-comps">'+k.comps.map(svComp).join('')+'</div></div>';}
// Graphique du CA mensuel : barres 2027, courbes 2026 et 2025
function svGraphMensuel(m){
  let W=640,H=230,g=44,d=12,b=28,h0=H-b,larg=(W-g-d)/12;
  let toutes=m.ca27.concat(m.ca26||[]).concat(m.ca25||[]).filter(function(v){return v!==null&&isFinite(v);});
  let max=Math.max(1,Math.max.apply(null,toutes))*1.08,y=function(v){return h0-(v/max)*(h0-10);};
  let s='<svg viewBox="0 0 '+W+' '+H+'" class="sv-svg" role="img" aria-label="Chiffre d\'affaires mois par mois">';
  for(let i=0;i<=4;i++){let v=max*i/4,yy=y(v);s+='<line x1="'+g+'" x2="'+(W-d)+'" y1="'+yy+'" y2="'+yy+'" class="sv-grille"/><text x="'+(g-6)+'" y="'+(yy+3)+'" class="sv-axe" text-anchor="end">'+svEsc(svK(v))+'</text>';}
  m.ca27.forEach(function(v,i){let x=g+i*larg+larg*0.18,w=larg*0.64;s+='<rect x="'+x+'" y="'+y(v||0)+'" width="'+w+'" height="'+Math.max(0,h0-y(v||0))+'" class="sv-barre"><title>'+M[i]+' 2027 : '+svEsc(svK(v))+'</title></rect><text x="'+(g+i*larg+larg/2)+'" y="'+(H-10)+'" class="sv-axe" text-anchor="middle">'+M[i]+'</text>';});
  let courbe=function(serie,cls,an,mc){if(!serie)return '';let pts=[],pts2=[];serie.forEach(function(v,i){if(v===null||!isFinite(v))return;let p=(g+i*larg+larg/2)+','+y(v);if(mc!==undefined&&i>=mc){if(!pts2.length&&pts.length)pts2.push(pts[pts.length-1]);pts2.push(p);}else pts.push(p);});
    let out=pts.length>1?'<polyline points="'+pts.join(' ')+'" class="'+cls+'"/>':'';if(pts2.length>1)out+='<polyline points="'+pts2.join(' ')+'" class="'+cls+' sv-pointille"/>';
    serie.forEach(function(v,i){if(v!==null&&isFinite(v))out+='<circle cx="'+(g+i*larg+larg/2)+'" cy="'+y(v)+'" r="2.6" class="'+cls+'-pt"><title>'+M[i]+' '+an+' : '+svEsc(svK(v))+'</title></circle>';});return out;};
  s+=courbe(m.ca25,'sv-c25','2025')+courbe(m.ca26,'sv-c26','2026',m.moisClos26);
  return s+'</svg>';
}
// Passage du résultat 2026 au résultat 2027 (cascade)
function svGraphPont(p){
  let W=640,H=230,g=8,d=8,h0=H-46,n=p.length,larg=(W-g-d)/n,cum=0,niv=[];
  p.forEach(function(e){if(e.type==='total'){niv.push([0,e.val]);cum=e.val;}else{niv.push([cum,cum+e.val]);cum+=e.val;}});
  let vals=[0];niv.forEach(function(x){vals.push(x[0],x[1]);});
  let mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals),et=(mx-mn)||1;mn-=et*0.08;mx+=et*0.12;
  let y=function(v){return 14+(mx-v)/(mx-mn)*(h0-14);};
  let s='<svg viewBox="0 0 '+W+' '+H+'" class="sv-svg" role="img" aria-label="Passage du résultat 2026 au résultat 2027">';
  s+='<line x1="'+g+'" x2="'+(W-d)+'" y1="'+y(0)+'" y2="'+y(0)+'" class="sv-zero"/>';
  p.forEach(function(e,i){
    let a0=niv[i][0],a1=niv[i][1],top=y(Math.max(a0,a1)),hh=Math.max(1.5,Math.abs(y(a0)-y(a1))),x=g+i*larg+larg*0.16,w=larg*0.68;
    let cls=e.type==='total'?'sv-pont-total':(e.val>=0?'sv-pont-plus':'sv-pont-moins');
    s+='<rect x="'+x+'" y="'+top+'" width="'+w+'" height="'+hh+'" class="'+cls+'"><title>'+svEsc(e.lib)+' : '+svEsc(svK(e.val))+'</title></rect>';
    if(i<n-1)s+='<line x1="'+(x+w)+'" x2="'+(g+(i+1)*larg+larg*0.16)+'" y1="'+y(a1)+'" y2="'+y(a1)+'" class="sv-lien"/>';
    s+='<text x="'+(x+w/2)+'" y="'+(top-5)+'" class="sv-val" text-anchor="middle">'+(e.type==='delta'&&e.val>0?'+':'')+svEsc(svK(e.val))+'</text>';
    let mots=e.lib.split(' '),l1=mots.slice(0,Math.ceil(mots.length/2)).join(' '),l2=mots.slice(Math.ceil(mots.length/2)).join(' ');
    s+='<text x="'+(x+w/2)+'" y="'+(H-26)+'" class="sv-axe" text-anchor="middle">'+svEsc(l1)+'</text>'+(l2?'<text x="'+(x+w/2)+'" y="'+(H-13)+'" class="sv-axe" text-anchor="middle">'+svEsc(l2)+'</text>':'');
  });
  return s+'</svg>';
}
function syntheseVueHTML(v,opts){
  opts=opts||{};
  let h='<div class="sv-grille-kpi">'+v.kpis.map(svCarte).join('')+'</div><div class="sv-note sv-note-kpi">Entre parenthèses : écart du budget 2027 en points de CA. ▲▼ : évolution du chiffre d\'affaires.</div>';
  h+='<div class="sv-graphes">';
  h+='<div class="sv-carte" data-testid="sv-graphe-mensuel"><div class="sv-titre">Chiffre d\'affaires mois par mois</div>'+svGraphMensuel(v.mensuel)
    +'<div class="sv-legende"><span><i class="sv-l-barre"></i>Budget 2027</span>'+(v.mensuel.ca26?'<span><i class="sv-l-c26"></i>2026'+(v.mensuel.moisClos26<12?' (pointillé : atterrissage)':'')+'</span>':'')+(v.mensuel.ca25?'<span><i class="sv-l-c25"></i>Réalisé 2025</span>':'')+'</div></div>';
  if(v.pont)h+='<div class="sv-carte" data-testid="sv-graphe-pont"><div class="sv-titre">Du résultat 2026 au résultat 2027</div>'+svGraphPont(v.pont)
    +'<div class="sv-legende"><span><i class="sv-l-plus"></i>améliore le résultat</span><span><i class="sv-l-moins"></i>le réduit</span></div></div>';
  else h+='<div class="sv-carte sv-vide"><div class="sv-titre">Du résultat 2026 au résultat 2027</div><p>Disponible dès que le tableau de bord 2026 de l\'agence est importé par le contrôle de gestion.</p></div>';
  h+='</div>';
  if(v.points.length){
    let ic={alerte:'●',attention:'●',info:'●'};
    h+='<div class="sv-carte" data-testid="sv-points"><div class="sv-titre">'+(opts.valideur?'Points d\'attention pour votre décision':'À regarder')+'</div><ul class="sv-points">'
      +v.points.map(function(p){return '<li class="sv-pt-'+p.niveau+'"><span>'+ic[p.niveau]+'</span>'+svEsc(p.texte)+'</li>';}).join('')+'</ul><div class="sv-note">Repères pour éclairer la décision, pas des blocages.</div></div>';
  }
  return h;
}
// Avancement du REX (six jalons) : affiché sur la Synthèse du REX
function svAvancementHTML(av){
  if(!av)return '';
  let j=[['Objectif et contexte 2027',av.objectif,av.objectif?'fixés':'à compléter'],['Références de CA',av.refsPct>=100,av.refsPct+' %'],['Équipe',av.nbSalaries>0,av.nbSalaries+' salarié'+(av.nbSalaries>1?'s':'')],
    ['Absentéisme',av.absSaisis>=12,av.absSaisis+' / 12 mois'],['Mois validés',av.moisValides>=12,av.moisValides+' / 12'],['Charges du REX',(av.chargesREX||0)>=6,(av.chargesREX||0)+' / 6 postes']];
  return '<div class="sv-carte" data-testid="sv-avancement"><div class="sv-titre">Avancement de votre budget <span class="sv-pct">'+av.pct+' %</span></div><div class="sv-barre-av"><i style="width:'+Math.max(0,Math.min(100,av.pct))+'%"></i></div><ul class="sv-jalons">'
    +j.map(function(x){return '<li class="'+(x[1]?'ok':'')+'"><span>'+(x[1]?'✓':'○')+'</span>'+svEsc(x[0])+' <em>'+svEsc(x[2])+'</em></li>';}).join('')+'</ul></div>';
}
export { syntheseVue, syntheseVueHTML, svAvancementHTML, svK, svP };
