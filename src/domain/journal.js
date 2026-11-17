// Journal des connexions (nov. 2026) — texte identique dans le mono-fichier (index.html) et ici.
// Une « connexion » = une ouverture de SOMA avec une session valide. Tant que l'onglet est visible,
// un signal part toutes les 60 s (durée) avec le nombre d'enregistrements réussis depuis le dernier signal.
// Après 30 min sans signal (onglet caché, veille), le retour ouvre une nouvelle connexion.
// rpc(nom, params) → Promise<{data, error}> (sb.rpc) ; env = {visible(), appareil(), maintenant()} pour les tests.
const JOURNAL_SIGNAL_MS=60000,JOURNAL_PAUSE_MS=30*60000;
function journalEnvNavigateur(){return {
  visible:function(){return typeof document==='undefined'||document.visibilityState!=='hidden';},
  appareil:function(){try{return window.matchMedia&&window.matchMedia('(max-width: 760px)').matches?'téléphone':'ordinateur';}catch(e){return 'ordinateur';}},
  maintenant:function(){return Date.now();}
};}
function creerJournal(rpc,env){
  env=env||journalEnvNavigateur();
  let j={id:null,actif:false,attente:0,dernier:0,ouverture:null,minuterie:null};
  function ouvrir(){
    if(j.ouverture)return j.ouverture;
    j.ouverture=Promise.resolve().then(function(){return rpc('journal_ouvrir',{p_appareil:env.appareil()});})
      .then(function(r){j.id=r&&!r.error&&r.data?r.data:null;j.dernier=env.maintenant();},function(){j.id=null;})
      .then(function(){j.ouverture=null;});
    return j.ouverture;
  }
  function signal(force){
    if(!j.actif||(!force&&!env.visible()))return Promise.resolve();
    let suite=(!j.id||env.maintenant()-j.dernier>JOURNAL_PAUSE_MS)?(j.id=null,ouvrir()):Promise.resolve();
    return suite.then(function(){
      if(!j.id)return;
      let n=j.attente;j.attente=0;
      return Promise.resolve().then(function(){return rpc('journal_signal',{p_id:j.id,p_saisies:n});})
        .then(function(r){if(!r||r.error||r.data===false){j.attente+=n;j.id=null;}else j.dernier=env.maintenant();},function(){j.attente+=n;});
    });
  }
  function surVisibilite(){signal(true);}
  return {
    etat:j,
    signal:signal,
    demarrer:function(){
      if(j.actif)return Promise.resolve();
      j.actif=true;j.id=null;
      if(typeof setInterval!=='undefined')j.minuterie=setInterval(function(){signal(false);},JOURNAL_SIGNAL_MS);
      if(typeof document!=='undefined')document.addEventListener('visibilitychange',surVisibilite);
      return ouvrir();
    },
    arreter:function(){
      if(!j.actif)return Promise.resolve();
      let p=signal(true);
      j.actif=false;
      if(j.minuterie)clearInterval(j.minuterie);
      j.minuterie=null;
      if(typeof document!=='undefined')document.removeEventListener('visibilitychange',surVisibilite);
      return p.then(function(){j.id=null;});
    },
    noterSaisie:function(){if(j.actif)j.attente++;}
  };
}
function dureeLisible(min){min=Math.round(+min||0);if(min<1)return '< 1 min';if(min<60)return min+' min';let h=Math.floor(min/60),m=min%60;return h+' h'+(m?' '+String(m).padStart(2,'0'):'');}
// Écran admin : dernière activité connue (journal, sinon dernière authentification), indicateurs et tri.
function derniereActivite(s){let a=s.derniere?Date.parse(s.derniere):0,b=s.derniere_auth?Date.parse(s.derniere_auth):0;return Math.max(a||0,b||0)||null;}
function syntheseJournal(stats,maintenant,tri){
  maintenant=maintenant||Date.now();
  let lignes=(stats||[]).map(function(s){return Object.assign({},s,{activite:derniereActivite(s),nb_connexions:+s.nb_connexions||0,nb_jours:+s.nb_jours||0,duree_minutes:+s.duree_minutes||0,saisies:+s.saisies||0});});
  let jour=24*3600000,depuis=function(ms){return lignes.filter(function(l){return l.activite&&maintenant-l.activite<=ms;}).length;};
  let cles={activite:function(l){return -(l.activite||0);},connexions:function(l){return -l.nb_connexions;},temps:function(l){return -l.duree_minutes;},saisies:function(l){return -l.saisies;},nom:function(l){return String(l.nom||l.email||'').toLowerCase();}};
  let k=cles[tri]||cles.activite;
  lignes.sort(function(x,y){let a=k(x),b=k(y);return a<b?-1:a>b?1:String(x.nom||'').localeCompare(String(y.nom||''));});
  return {lignes:lignes,kpi:{total:lignes.length,aujourdhui:depuis(jour),semaine:depuis(7*jour),jamais:lignes.filter(function(l){return !l.activite;}).length,connexions:lignes.reduce(function(s,l){return s+l.nb_connexions;},0),saisies:lignes.reduce(function(s,l){return s+l.saisies;},0)}};
}

export { JOURNAL_SIGNAL_MS, JOURNAL_PAUSE_MS, journalEnvNavigateur, creerJournal, dureeLisible, derniereActivite, syntheseJournal };
