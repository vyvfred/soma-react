// Visite guidée du REX (nov. 2026) — texte identique dans le mono-fichier (index.html) et ici.
// Bulles d'aide posées sur les éléments marqués data-visite="…" dans les deux versions.
// Lancée automatiquement à la première connexion d'un REX (une fois par compte et par navigateur),
// relançable depuis l'écran Aide. aller(ecran) ouvre l'écran demandé (ids communs : objectif, refs…).
const CLE_VISITE_REX='soma.visiteREX.vue';
const ETAPES_VISITE_REX=[
  {ecran:'objectif',cible:null,titre:'Bienvenue dans SOMA',texte:'En 2 minutes, voici comment construire le budget 2027 de votre agence. Vous pourrez revoir cette visite à tout moment depuis l\'écran Aide.'},
  {ecran:'objectif',cible:'menu',titre:'8 étapes, dans l\'ordre du menu',texte:'Suivez le menu de haut en bas, de l\'Objectif à la Synthèse. Votre équipe, vos historiques et vos taux sont déjà chargés par le contrôle de gestion.'},
  {ecran:'objectif',cible:'objectif',titre:'1. Objectif',texte:'Saisissez votre objectif de chiffre d\'affaires 2027 et votre TXR cible (CA par heure travaillée). SOMA vous dit aussitôt si votre effectif peut le tenir.'},
  {ecran:'objectif',cible:'versions',titre:'Versions V1, V2, V3',texte:'Testez des hypothèses sans toucher à votre budget : dupliquez la version, reprenez l\'équipe d\'une autre version, comparez-les, puis choisissez celle à soumettre (★).'},
  {ecran:'refs',cible:'refs',titre:'2. Références CA',texte:'Pour chaque mois, le CA moyen d\'une journée selon son type : semaine, vacances scolaires, samedi, dimanche, férié. C\'est la base de tout le calcul.'},
  {ecran:'cal',cible:'cal-totaux',titre:'3. Calendrier',texte:'SOMA applique vos références au calendrier 2027 de votre zone scolaire. Vérifiez les totaux du mois. Un jour particulier, comme le transport de personnes le mercredi, s\'ajuste d\'un clic sur sa case.'},
  {ecran:'team',cible:'equipe',titre:'4. Équipe',texte:'Contrôlez chaque salarié : qualification, contrat, heures, part roulante, dates d\'entrée et de sortie 2027. Ajoutez les postes prévus (CDD saisonniers).'},
  {ecran:'rh',cible:'absenteisme',titre:'5. Présence & HS — absentéisme',texte:'Commencez par l\'absentéisme mois par mois, en gardant la moyenne fixée par le contrôle de gestion. Les congés se recalculent tout seuls ensuite.'},
  {ecran:'rh',cible:'conges',titre:'Congés payés',texte:'Un clic sur « Répartir les congés automatiquement » pose les jours acquis en lissant la charge (60 % juin-octobre, 20 % / 20 % sur le reste de l\'année).'},
  {ecran:'rh',cible:'mois',titre:'Mois par mois',texte:'Ouvrez chaque mois, ajustez les congés et absences semaine par semaine, regardez les heures supplémentaires, puis « Valider ce mois ».'},
  {ecran:'charges',cible:'charges',titre:'6. Charges',texte:'Six postes sont à vous : quatre en % du CA (matériel, carburant…), deux en montant fixe par mois. Les cases sont préremplies : ajustez-les.'},
  {ecran:'previsionnel',cible:'previsionnel',titre:'7. Prévisionnel',texte:'Le compte d\'exploitation de l\'agence se construit tout seul à partir de vos saisies, jusqu\'au résultat d\'exploitation.'},
  {ecran:'finance',cible:'ms-ca',titre:'8. Synthèse',texte:'Contrôlez la masse salariale / CA mois par mois : vert jusqu\'à 62 %, orange au-delà. Les points à revoir sont signalés en haut de l\'écran.'},
  {ecran:'finance',cible:'historique',titre:'Enregistrement automatique',texte:'Tout est enregistré quelques secondes après chaque saisie. Une erreur ? ↶ annule (Ctrl+Z), ↷ rétablit, jusqu\'à 50 actions.'},
  {ecran:'objectif',cible:'soumettre',titre:'Soumettre au DR',texte:'Quand tout est prêt, « Soumettre au DR ». Votre budget passe en lecture seule ; s\'il vous est renvoyé, le motif s\'affiche ici. Date limite : 27 novembre.'},
  {ecran:'objectif',cible:'nav-aide',titre:'Besoin d\'aide ?',texte:'L\'écran Aide contient la FAQ du REX et le bouton pour revoir cette visite. Bonne construction !'}
];
// Visite du DR : ses trois écrans (validation, saisie pour un REX, consolidation de la région)
const ETAPES_VISITE_DR=[
  {ecran:'validation',cible:null,titre:'Bienvenue dans SOMA',texte:'Vous validez en premier les budgets des agences de votre région. Voici vos écrans en une minute. Vous pourrez revoir cette visite depuis l\'écran Aide.'},
  {ecran:'validation',cible:'menu',titre:'Vos écrans',texte:'Budgets à valider, Saisir pour un REX, Consolidation région. L\'écran Aide contient votre FAQ et les supports de formation des REX.'},
  {ecran:'validation',cible:'val-kpis',titre:'Budgets à valider',texte:'Les compteurs donnent les budgets qui attendent votre décision, ceux que vous avez validés et ceux que vous avez refusés.'},
  {ecran:'validation',cible:'val-fiche',titre:'La fiche de décisions',texte:'Pour chaque budget soumis : CA, masse salariale / CA, résultat et choix de congés, avec un verdict. « Voir tous les écrans » ouvre le budget en lecture.'},
  {ecran:'validation',cible:'val-decision',titre:'Valider ou refuser',texte:'Le commentaire est obligatoire. Validé, le budget passe au contrôle de gestion et au DF ; refusé, il revient au REX avec votre motif.'},
  {ecran:'saisie',cible:'saisie-agences',titre:'Saisir pour un REX',texte:'Ouvrez le budget d\'une agence pour le saisir à la place du REX, pendant un accompagnement. Vos saisies s\'affichent en orange pour lui.'},
  {ecran:'consolidation',cible:'conso-kpis',titre:'Consolidation région',texte:'L\'état de chaque agence de votre région : non commencé, brouillon, soumis, validé, et le CA consolidé.'},
  {ecran:'consolidation',cible:'conso-table',titre:'Suivre et relancer',texte:'Le tableau donne l\'avancement de chaque budget. Relancez les agences qui n\'avancent plus : les REX doivent soumettre avant le 27 novembre.'},
  {ecran:'consolidation',cible:'nav-aide',titre:'Besoin d\'aide ?',texte:'L\'écran Aide contient votre FAQ, la vidéo et la présentation de formation des REX, et le bouton pour revoir cette visite. Bonne validation !'}
];
// Visite des Directions (DF, DG, PDG) : validation après le DR et suivi du réseau
const ETAPES_VISITE_DIRECTION=[
  {ecran:'validation',cible:null,titre:'Bienvenue dans SOMA',texte:'Vous validez les budgets après le DR : le DF avec le contrôle de gestion, puis le DG et le PDG. Voici vos écrans en une minute.'},
  {ecran:'validation',cible:'menu',titre:'Vos écrans',texte:'Budgets à valider et Consolidation réseau. L\'écran Aide contient votre FAQ et les supports de formation des REX.'},
  {ecran:'validation',cible:'val-kpis',titre:'Budgets à valider',texte:'N\'apparaissent ici que les budgets validés par l\'étage précédent. Les compteurs donnent ceux qui attendent votre décision.'},
  {ecran:'validation',cible:'val-fiche',titre:'La fiche de décisions',texte:'CA, masse salariale / CA, résultat et choix de congés de l\'agence, avec un verdict. « Voir tous les écrans » ouvre le budget en lecture.'},
  {ecran:'validation',cible:'val-decision',titre:'Valider ou refuser',texte:'Le commentaire est obligatoire. Un refus renvoie le budget au REX et le circuit repart du DR. La validation du dernier étage rend le budget définitif.'},
  {ecran:'consolidation',cible:'conso-kpis',titre:'Consolidation réseau',texte:'L\'état de chaque agence du réseau, le CA consolidé et l\'avancement des budgets. Date limite de soumission des REX : 27 novembre.'},
  {ecran:'consolidation',cible:'conso-table',titre:'Suivre l\'avancement',texte:'Le tableau détaille chaque agence. Le seuil de masse salariale est de 62 % du CA sur l\'année.'},
  {ecran:'consolidation',cible:'nav-aide',titre:'Besoin d\'aide ?',texte:'L\'écran Aide contient votre FAQ, la vidéo et la présentation de formation des REX, et le bouton pour revoir cette visite.'}
];
function etapesVisitePour(role){return role==='rex'?ETAPES_VISITE_REX:role==='dr'?ETAPES_VISITE_DR:(role==='df'||role==='dg'||role==='pdg')?ETAPES_VISITE_DIRECTION:null;}
function cleVisite(uid,role){return (!role||role==='rex')?CLE_VISITE_REX+'.'+uid:'soma.visite.'+role+'.vue.'+uid;}
function visiteDejaVue(uid,role){try{return localStorage.getItem(cleVisite(uid,role))==='1';}catch(e){return true;}}
function marquerVisiteVue(uid,role){try{localStorage.setItem(cleVisite(uid,role),'1');}catch(e){}}
// Supports de formation des REX, servis par l'application React (adresse absolue : le mono-fichier s'en sert aussi)
const SUPPORTS_FORMATION={video:'https://vyv2027-react.netlify.app/formation/soma-formation-rex.mp4',pdf:'https://vyv2027-react.netlify.app/formation/soma-formation-rex.pdf'};
// Position de la bulle : sous la cible si la place le permet, sinon au-dessus, sinon centrée.
function positionBulle(r,vw,vh,bw,bh){
  let m=12;
  if(!r)return {left:Math.max(m,(vw-bw)/2),top:Math.max(m,(vh-bh)/2),place:'centre'};
  let left=Math.min(Math.max(m,r.left+r.width/2-bw/2),vw-bw-m);
  if(r.bottom+m+bh<=vh-m)return {left:left,top:r.bottom+m,place:'dessous'};
  if(r.top-m-bh>=m)return {left:left,top:r.top-m-bh,place:'dessus'};
  return {left:Math.max(m,(vw-bw)/2),top:Math.max(m,vh-bh-m),place:'bas'};
}
let VISITE_EN_COURS=null;
function lancerVisite(etapes,aller,surFin){
  if(VISITE_EN_COURS)VISITE_EN_COURS.fermer(false);
  let i=0,cible=null,fini=false,jeton=0;
  let voile=document.createElement('div'),spot=document.createElement('div'),bulle=document.createElement('div');
  voile.setAttribute('data-testid','visite-voile');
  voile.style.cssText='position:fixed;inset:0;z-index:10000;background:transparent';
  spot.style.cssText='position:fixed;z-index:10001;pointer-events:none;border:2px solid var(--violet,#7c3aed);border-radius:8px;box-shadow:0 0 0 9999px rgba(8,10,20,.62);transition:all .25s ease';
  bulle.setAttribute('data-testid','visite-bulle');bulle.setAttribute('role','dialog');bulle.setAttribute('aria-live','polite');
  bulle.style.cssText='position:fixed;z-index:10002;width:min(380px,calc(100vw - 24px));background:var(--bg2,#151826);color:var(--ink,#f3f4f6);border:1px solid var(--violet,#7c3aed);border-radius:10px;padding:16px 18px;box-shadow:0 12px 40px rgba(0,0,0,.45);font-size:14px;line-height:1.5';
  document.body.appendChild(voile);document.body.appendChild(spot);document.body.appendChild(bulle);
  function placer(){
    let r=null;
    if(cible&&document.body.contains(cible)){let b=cible.getBoundingClientRect();if(b.width>0&&b.height>0)r=b;}
    if(r){let p=6;spot.style.display='';spot.style.left=(r.left-p)+'px';spot.style.top=(r.top-p)+'px';spot.style.width=(r.width+2*p)+'px';spot.style.height=(r.height+2*p)+'px';}
    else{spot.style.display='';spot.style.left='50%';spot.style.top='50%';spot.style.width='0px';spot.style.height='0px';}
    let pos=positionBulle(r?{left:r.left,top:r.top-6,width:r.width,height:r.height+12,bottom:r.bottom+6}:null,window.innerWidth,window.innerHeight,bulle.offsetWidth||380,bulle.offsetHeight||180);
    bulle.style.left=pos.left+'px';bulle.style.top=pos.top+'px';
  }
  function bouton(txt,principal,id){return '<button data-visite-btn="'+id+'" style="width:auto;margin:0;font-size:13px;padding:7px 14px;cursor:pointer;border-radius:6px;'+(principal?'background:var(--violet,#7c3aed);color:#fff;border:none;font-weight:700':'background:transparent;color:var(--ink65,#9ca3af);border:1px solid var(--border,#333)')+'">'+txt+'</button>';}
  function afficher(){
    let e=etapes[i],n=etapes.length;
    bulle.innerHTML='<div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink65,#9ca3af);margin-bottom:4px">Visite guidée · '+(i+1)+' / '+n+'</div>'
      +'<div style="font-weight:700;font-size:16px;margin-bottom:6px">'+e.titre+'</div>'
      +'<div>'+e.texte+'</div>'
      +'<div style="display:flex;gap:8px;align-items:center;margin-top:14px">'+(i<n-1?bouton('Passer',false,'passer'):'')+'<span style="flex:1"></span>'+(i>0?bouton('← Précédent',false,'prec'):'')+bouton(i<n-1?'Suivant →':'Terminer',true,i<n-1?'suiv':'fin')+'</div>';
    placer();
    let s=bulle.querySelector('[data-visite-btn="suiv"],[data-visite-btn="fin"]');if(s)s.focus();
  }
  function trouver(nom,t,essais){
    if(t!==jeton)return;
    let el=nom?document.querySelector('[data-visite="'+nom+'"]'):null;
    let visible=el&&el.getBoundingClientRect().width>0;
    if(nom&&!visible&&essais>0){if(essais===30){cible=null;afficher();}setTimeout(function(){trouver(nom,t,essais-1);},100);return;}
    cible=visible?el:null;
    if(cible)cible.scrollIntoView({block:'center',behavior:'auto'});
    setTimeout(function(){if(t===jeton)afficher();},60);
  }
  function aEtape(k){
    i=Math.max(0,Math.min(etapes.length-1,k));let e=etapes[i],t=++jeton;
    try{if(e.ecran&&aller)aller(e.ecran);}catch(err){}
    trouver(e.cible,t,30);
  }
  function fermer(complete){
    if(fini)return;fini=true;jeton++;
    window.removeEventListener('resize',placer);window.removeEventListener('scroll',placer,true);document.removeEventListener('keydown',clavier,true);
    [voile,spot,bulle].forEach(function(x){if(x.parentNode)x.parentNode.removeChild(x);});
    VISITE_EN_COURS=null;
    if(surFin)surFin(!!complete);
  }
  function clavier(ev){
    if(ev.key==='Escape'){ev.preventDefault();fermer(false);}
    else if(ev.key==='ArrowRight'){ev.preventDefault();if(i<etapes.length-1)aEtape(i+1);else fermer(true);}
    else if(ev.key==='ArrowLeft'){ev.preventDefault();if(i>0)aEtape(i-1);}
  }
  bulle.addEventListener('click',function(ev){
    let b=ev.target.closest('[data-visite-btn]');if(!b)return;
    let a=b.getAttribute('data-visite-btn');
    if(a==='suiv')aEtape(i+1);else if(a==='prec')aEtape(i-1);else if(a==='passer')fermer(false);else if(a==='fin')fermer(true);
  });
  window.addEventListener('resize',placer);window.addEventListener('scroll',placer,true);document.addEventListener('keydown',clavier,true);
  VISITE_EN_COURS={fermer:fermer,etape:function(){return i;}};
  aEtape(0);
  return VISITE_EN_COURS;
}

export { CLE_VISITE_REX, ETAPES_VISITE_REX, ETAPES_VISITE_DR, ETAPES_VISITE_DIRECTION, etapesVisitePour, cleVisite, visiteDejaVue, marquerVisiteVue, SUPPORTS_FORMATION, positionBulle, lancerVisite };
