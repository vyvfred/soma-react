// Classeur des charges du réseau — fonctions PURES, identiques à la version mono-fichier.
import { T, STRUCTURES, LIGNES_SIEGE, LIGNES_QUOTE_PART } from './calculations.js';

// ═══ Classeur des charges du réseau (CG) ═══
// Une feuille « Réseau » : postes en lignes, agences et structures en colonnes, montant annuel
// (réparti ÷ 12 ou au prorata du CA selon la colonne Répartition) ou « 3,2 % » du CA.
// Une feuille « Mensuel » facultative : un poste d'une agence saisi mois par mois.
var CLASSEUR_MOIS = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
var CLASSEUR_REP = { monthly12: '÷ 12', ca: 'prorata CA' };
// Postes du classeur : toutes les lignes saisissables, plus CA et charges de personnel (structures seulement)
function postesClasseur(){
  return T.filter(function(r){ return r.type !== 'subtotal'; }).map(function(r){ return r.label; });
}
// Le poste est-il saisissable pour cette entité ?
function posteAutorise(nom, poste){
  var structure = STRUCTURES.indexOf(nom) >= 0;
  if(poste === "Chiffre d'affaires" || poste === 'Charges de personnel') return structure;
  if(LIGNES_SIEGE.indexOf(poste) >= 0) return nom === 'SIEGE';
  if(LIGNES_QUOTE_PART.indexOf(poste) >= 0) return !structure;
  return true;
}
function fmtPctClasseur(p){ return String(Math.round((+p||0)*100)/100).replace('.', ',') + ' %'; }
function nombreClasseur(v){
  if(typeof v === 'number') return v;
  var t = String(v).replace(/[\s  €]/g,'').replace(',', '.');
  return t === '' || isNaN(+t) ? NaN : +t;
}

// entites : [{ nom, data }] — data = version du budget (soumise, sinon active) ou null
function construireClasseurCharges(entites){
  var postes = postesClasseur();
  var reseau = [['Poste', 'Répartition'].concat(entites.map(function(e){ return e.nom; }))];
  var mensuel = [['Agence', 'Poste'].concat(CLASSEUR_MOIS)];
  postes.forEach(function(poste){
    // Répartition de la ligne : clé la plus fréquente parmi les montants annuels
    var cles = { monthly12: 0, ca: 0 };
    entites.forEach(function(e){ var x = e.data && e.data.rex && e.data.rex[poste];
      if(x && x.mode === 'annual' && +x.annual) cles[x.allocationKey === 'ca' ? 'ca' : 'monthly12']++; });
    var cleLigne = cles.ca > cles.monthly12 ? 'ca' : 'monthly12';
    var ligne = [poste, CLASSEUR_REP[cleLigne]];
    entites.forEach(function(e){
      if(!posteAutorise(e.nom, poste)){ ligne.push('—'); return; }
      var x = e.data && e.data.rex && e.data.rex[poste];
      if(!x){ ligne.push(''); return; }
      if(x.mode === 'pct'){ ligne.push(+x.pct ? fmtPctClasseur(x.pct) : ''); return; }
      if(x.mode === 'pctMois'){
        var ps = (x.pcts || []).map(function(v){ return v === null || v === undefined || v === '' ? '' : +v; });
        if(ps.some(function(v){ return v !== '' && v !== 0; })){
          ligne.push('mensuel');
          mensuel.push([e.nom, poste].concat(CLASSEUR_MOIS.map(function(_, m){ return ps[m] === '' || ps[m] === undefined ? '' : fmtPctClasseur(ps[m]); })));
        } else ligne.push('');
        return;
      }
      if(x.mode === 'annual'){
        var cle = x.allocationKey === 'ca' ? 'ca' : 'monthly12';
        if(!+x.annual){ ligne.push(''); return; }
        ligne.push(cle === cleLigne ? +x.annual : (+x.annual) + ' ' + CLASSEUR_REP[cle]); return;
      }
      var vals = (x.values || []).map(function(v){ return v === null || v === undefined || v === '' ? '' : +v; });
      if(vals.some(function(v){ return v !== '' && v !== 0; })){
        ligne.push('mensuel');
        mensuel.push([e.nom, poste].concat(CLASSEUR_MOIS.map(function(_, m){ return vals[m] === undefined ? '' : vals[m]; })));
      } else ligne.push('');
    });
    reseau.push(ligne);
  });
  var aide = [
    ['Classeur des charges ' + 'du réseau — budget 2027'],
    [''],
    ['Feuille « Réseau » : une ligne par poste, une colonne par agence ou structure.'],
    ['• Montant annuel en euros : réparti sur l\'année selon la colonne « Répartition » de la ligne (« ÷ 12 » ou « prorata CA »).'],
    ['• Pourcentage du CA : écrivez par exemple « 3,2 % ». Le montant suit alors le CA mensuel de l\'agence.'],
    ['• Pour une autre répartition sur une seule agence : « 48000 prorata CA » ou « 48000 ÷ 12 ».'],
    ['• Case vide : la valeur actuelle dans SOMA n\'est pas modifiée. Pour mettre un poste à zéro, écrivez 0.'],
    ['• « — » : poste non applicable (CA et charges de personnel sont calculés par SOMA pour les agences ; IS et participation sur le Siège seulement).'],
    ['• « mensuel » : le poste est saisi mois par mois dans la feuille « Mensuel ».'],
    [''],
    ['Feuille « Mensuel » (facultative) : une ligne Agence + Poste avec ses 12 montants. Elle prime sur la feuille Réseau pour ce poste.'],
    ['Dans « Mensuel », vous pouvez aussi écrire un % du CA différent chaque mois (par exemple « 2,1 % » en janvier, « 3 % » en juillet) : le montant suit le CA de chaque mois. Une même ligne contient soit des montants, soit des %.'],
    [''],
    ['Import : écran Charges CG, « Importer le classeur ». SOMA affiche les changements par agence avant d\'enregistrer.'],
    ['Les charges importées s\'appliquent à toutes les versions (V1, V2, V3) du budget de chaque agence.']
  ];
  return { reseau: reseau, mensuel: mensuel, aide: aide };
}

// Lit les feuilles (tableaux de lignes). nomsConnus : agences + structures.
// Retour : { lignes: { nom: { poste: ligneRex } }, erreurs: [], avertissements: [] }
function lireClasseurCharges(reseau, mensuel, nomsConnus){
  var lignes = {}, erreurs = [], avert = [];
  var postes = postesClasseur();
  var norm = function(s){ return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim(); };
  var parNorm = {}; nomsConnus.forEach(function(n){ parNorm[norm(n)] = n; });
  var posteNorm = {}; postes.forEach(function(p){ posteNorm[norm(p)] = p; });
  var poser = function(nom, poste, l){ if(!lignes[nom]) lignes[nom] = {}; lignes[nom][poste] = l; };
  if(!reseau || !reseau.length){ erreurs.push('Feuille « Réseau » introuvable ou vide.'); return { lignes: lignes, erreurs: erreurs, avertissements: avert }; }
  var tete = reseau[0] || [];
  var iRep = tete.findIndex(function(h){ return norm(h).indexOf('REPARTITION') === 0; });
  var cols = [];
  tete.forEach(function(h, i){
    if(i === 0 || i === iRep || !String(h || '').trim()) return;
    var nom = parNorm[norm(h)];
    if(!nom) erreurs.push('Colonne « ' + h + ' » : agence inconnue, ignorée.');
    else cols.push({ i: i, nom: nom });
  });
  for(var r = 1; r < reseau.length; r++){
    var row = reseau[r] || [];
    if(!String(row[0] || '').trim()) continue;
    var poste = posteNorm[norm(row[0])];
    if(!poste){ erreurs.push('Ligne ' + (r + 1) + ' : poste « ' + row[0] + ' » inconnu, ignoré.'); continue; }
    var repTxt = norm(iRep >= 0 ? row[iRep] : '');
    var cleLigne = repTxt.indexOf('CA') >= 0 ? 'ca' : 'monthly12';
    cols.forEach(function(c){
      var v = row[c.i];
      var t = String(v === null || v === undefined ? '' : v).trim();
      if(t === '' || t === '—' || t === '-' || norm(t) === 'MENSUEL') return;
      var ou = c.nom + ' / ' + poste;
      if(!posteAutorise(c.nom, poste)){ erreurs.push(ou + ' : poste non applicable, valeur ignorée.'); return; }
      if(/%\s*$/.test(t)){
        var p = nombreClasseur(t.replace('%', ''));
        if(isNaN(p)){ erreurs.push(ou + ' : « ' + t + ' » illisible.'); return; }
        if(poste === "Chiffre d'affaires"){ erreurs.push(ou + ' : le CA d\'une structure ne peut pas être un % du CA.'); return; }
        if(p > 30) avert.push(ou + ' : ' + fmtPctClasseur(p) + ' du CA, vérifiez.');
        poser(c.nom, poste, { mode: 'pct', pct: p }); return;
      }
      var cle = cleLigne, txt = t;
      var mCle = norm(t).match(/(PRORATA CA|÷ ?12|\/ ?12)$/);
      if(mCle){ cle = mCle[1] === 'PRORATA CA' ? 'ca' : 'monthly12'; txt = t.slice(0, t.length - mCle[1].length); }
      var n = typeof v === 'number' ? v : nombreClasseur(txt);
      if(isNaN(n)){ erreurs.push(ou + ' : « ' + t + ' » illisible.'); return; }
      if(STRUCTURES.indexOf(c.nom) >= 0 && cle === 'ca' && poste === "Chiffre d'affaires") cle = 'monthly12';
      poser(c.nom, poste, { mode: 'annual', annual: n, allocationKey: cle });
    });
  }
  (mensuel || []).slice(1).forEach(function(row, k){
    if(!row || !String(row[0] || '').trim()) return;
    var nom = parNorm[norm(row[0])], poste = posteNorm[norm(row[1])];
    var lig = 'Mensuel ligne ' + (k + 2);
    if(!nom){ erreurs.push(lig + ' : agence « ' + row[0] + ' » inconnue.'); return; }
    if(!poste){ erreurs.push(lig + ' : poste « ' + row[1] + ' » inconnu.'); return; }
    if(!posteAutorise(nom, poste)){ erreurs.push(lig + ' : ' + poste + ' non applicable pour ' + nom + '.'); return; }
    var vals = [], ko = false, nbPct = 0, nbMontant = 0;
    for(var m = 0; m < 12; m++){
      var v = row[2 + m], t = String(v === null || v === undefined ? '' : v).trim();
      if(t === ''){ vals.push(null); continue; }
      var estPct = /%\s*$/.test(t);
      var n = typeof v === 'number' ? v : nombreClasseur(estPct ? t.replace('%', '') : t);
      if(isNaN(n)){ erreurs.push(lig + ' : ' + CLASSEUR_MOIS[m] + ' « ' + t + ' » illisible.'); ko = true; break; }
      if(estPct) nbPct++; else nbMontant++;
      vals.push(n);
    }
    if(ko) return;
    if(nbPct && nbMontant){ erreurs.push(lig + ' : ' + nom + ' / ' + poste + ' mélange des montants et des % ; écrivez soit 12 montants, soit 12 %.'); return; }
    if(nbPct){
      if(poste === "Chiffre d'affaires"){ erreurs.push(lig + ' : le CA d\'une structure ne peut pas être un % du CA.'); return; }
      var maxP = Math.max.apply(null, vals.map(function(p){ return +p || 0; }));
      if(maxP > 30) avert.push(nom + ' / ' + poste + ' : jusqu\'à ' + fmtPctClasseur(maxP) + ' du CA sur un mois, vérifiez.');
      poser(nom, poste, { mode: 'pctMois', pcts: vals }); return;
    }
    poser(nom, poste, { mode: 'month', values: vals });
  });
  return { lignes: lignes, erreurs: erreurs, avertissements: avert };
}

// Applique des lignes à une version (objet rex) : renvoie le nombre de postes réellement modifiés
function appliquerLignesRex(rex, lignesEntite){
  var n = 0;
  Object.keys(lignesEntite).forEach(function(poste){
    var nv = lignesEntite[poste], x = rex[poste] || { values: Array(12).fill(null), chargeType: 'variable', allocationKey: 'monthly12', pct: 0, annual: 0, mode: 'month' };
    var avant = JSON.stringify([x.mode, x.annual, x.allocationKey, x.pct, x.values, x.mode === 'pctMois' ? x.pcts : null]);
    var y = Object.assign({}, x, nv);
    if(nv.mode === 'month') y.values = nv.values.slice();
    if(nv.mode === 'pctMois') y.pcts = nv.pcts.slice();
    if(JSON.stringify([y.mode, y.annual, y.allocationKey, y.pct, y.values, y.mode === 'pctMois' ? y.pcts : null]) !== avant) n++;
    rex[poste] = y;
  });
  return n;
}
// Applique à toutes les versions d'un budget (data brute de la base). Renvoie { data, nbPostes }.
function appliquerChargesBudget(data, lignesEntite){
  var d = JSON.parse(JSON.stringify(data || {})), nb = 0;
  if(d.versions){
    Object.keys(d.versions).forEach(function(v){
      if(!d.versions[v]) return;
      if(!d.versions[v].rex) d.versions[v].rex = {};
      nb = Math.max(nb, appliquerLignesRex(d.versions[v].rex, lignesEntite));
    });
  } else {
    if(!d.rex) d.rex = {};
    nb = appliquerLignesRex(d.rex, lignesEntite);
  }
  return { data: d, nbPostes: nb };
}

export { CLASSEUR_MOIS, postesClasseur, posteAutorise, construireClasseurCharges, lireClasseurCharges, appliquerChargesBudget };
