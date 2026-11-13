// Port identique à la version mono (même texte, exports ajoutés).
// ── Saisie du DR à la place du REX (nov. 2026) ──
// Un DR peut ouvrir le budget d'une agence de sa région et le saisir à la place du REX. Chaque valeur qu'il
// modifie est marquée : elle s'affiche dans une autre couleur, jusqu'à ce que le REX la modifie à son tour.
// Marques : a.saisiesDR = { "chemin.du.champ": 1 } ; pour l'équipe, e._dr = ["hours", …] sur le salarié.
var CHAMPS_HORS_SUIVI_DR = /^(saisiesDR|moisActif|cal|calScolaire|updatedAt|cgLocked)(\.|$)|(^|\.)_dr(\.|$)/;
export function cheminsModifies(avant, apres, prefixe, out){
  out = out || []; prefixe = prefixe || '';
  var estObj = function(v){ return v !== null && typeof v === 'object'; };
  if(!estObj(avant) || !estObj(apres)){
    var vide = function(v){ return v === undefined || v === null || v === '' || v === 0; };
    if(vide(avant) && vide(apres)) return out;
    var x = JSON.stringify(avant === undefined ? null : avant), y = JSON.stringify(apres === undefined ? null : apres);
    if(x !== y) out.push(prefixe.replace(/\.$/, ''));
    return out;
  }
  var cles = {};
  Object.keys(avant).forEach(function(k){ cles[k] = 1; });
  Object.keys(apres).forEach(function(k){ cles[k] = 1; });
  Object.keys(cles).forEach(function(k){ cheminsModifies(avant[k], apres[k], prefixe + k + '.', out); });
  return out;
}
// Met à jour les marques de « apres » d'après ce qui a changé depuis « avant ». parDR : la saisie vient du DR.
// Renvoie true si les marques ont changé.
export function marquerSaisiesDR(avant, apres, parDR){
  if(!apres) return false;
  var avantMarques = JSON.stringify([apres.saisiesDR || {}, (apres.employees || []).map(function(e){ return e && e._dr; })]);
  var nAv = ((avant && avant.employees) || []).length, nAp = (apres.employees || []).length;
  var marques = Object.assign({}, apres.saisiesDR || {});
  var emps = null;
  cheminsModifies(avant || {}, apres).forEach(function(c){
    if(!c || CHAMPS_HORS_SUIVI_DR.test(c)) return;
    var mn = c.match(/^employees\.(\d+)$/);
    if(mn){
      // Salarié ajouté : toute la ligne prend la marque de son auteur
      var j = +mn[1];
      if(!(nAp > nAv && j >= nAv)) return;
      emps = emps || (apres.employees || []).slice();
      var ne = emps[j]; if(!ne || typeof ne !== 'object') return;
      ne = Object.assign({}, ne);
      if(parDR) ne._dr = Object.keys(ne).filter(function(k){ return k !== '_dr'; }); else delete ne._dr;
      emps[j] = ne;
      return;
    }
    var m = c.match(/^employees\.(\d+)\.([^.]+)/);
    if(m){
      var i = +m[1];
      // Équipe : des lignes supprimées décalent les suivantes, on ne marque alors rien ; des lignes ajoutées sont marquées
      if(nAp < nAv || (nAp > nAv && i < nAv)) return;
      emps = emps || (apres.employees || []).slice();
      var e = emps[i]; if(!e) return;
      var l = (e._dr || []).filter(function(f){ return f !== m[2]; });
      if(parDR) l.push(m[2]);
      e = Object.assign({}, e);
      if(l.length) e._dr = l; else delete e._dr;
      emps[i] = e;
      return;
    }
    if(m === null && /^employees(\.|$)/.test(c)) return;
    if(parDR) marques[c] = 1; else delete marques[c];
  });
  if(emps) apres.employees = emps;
  apres.saisiesDR = marques;
  return JSON.stringify([apres.saisiesDR, (apres.employees || []).map(function(e){ return e && e._dr; })]) !== avantMarques;
}
export function estSaisieDR(a, chemin){ return !!(a && a.saisiesDR && a.saisiesDR[chemin]); }
export function champSaisiDR(e, champ){ return !!(e && e._dr && e._dr.indexOf(champ) >= 0); }
export function aDesSaisiesDR(a){
  if(!a) return false;
  if(a.saisiesDR && Object.keys(a.saisiesDR).length) return true;
  return (a.employees || []).some(function(e){ return e && e._dr && e._dr.length; });
}
