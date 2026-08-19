// Moteur de validation collégiale — extrait verbatim de l'application actuelle.
// Fonctions PURES : elles opèrent sur la structure `validation` d'un budget
// (etage, decisions par role, historique) et renvoient un nouvel état + un
// résultat. AUCUNE écriture ni effet de bord : la persistance est faite par
// l'appelant. C'est le cœur du workflow — donc verrouillé par des tests.

const VALIDATION_STAGES = [
  { etage: 1, validateurs: ['dr'],        label: 'Directeur Régional' },
  { etage: 2, validateurs: ['cg','df'],   label: 'Contrôle de gestion & Finances' },
  { etage: 3, validateurs: ['dg','pdg'],  label: 'Direction' }
];
const VALIDATOR_LABELS = { dr:'Directeur Régional', cg:'Contrôleur de gestion', df:'Directeur Financier', dg:'Direction (DG, directeurs opérationnels)', pdg:'Direction (DG, directeurs opérationnels)' };
const VALIDATOR_ROLES = ['dr','cg','df','dg','pdg'];

function newValidation(){
  return {
    etage: 1,
    statut: 'en_cours', // en_cours | valide | refuse
    decisions: { dr:null, cg:null, df:null, dg:null, pdg:null },
    historique: [] // trace des cycles précédents (refus notamment)
  };
}

function ensureValidation(v){
  if(!v || typeof v !== 'object') return newValidation();
  if(!v.decisions) v.decisions = { dr:null, cg:null, df:null, dg:null, pdg:null };
  VALIDATOR_ROLES.forEach(function(r){ if(!(r in v.decisions)) v.decisions[r] = null; });
  if(!v.etage) v.etage = 1;
  if(!v.statut) v.statut = 'en_cours';
  if(!v.historique) v.historique = [];
  return v;
}

function validateursEtage(etage){
  let s = VALIDATION_STAGES.find(function(x){return x.etage === etage;});
  return s ? s.validateurs : [];
}

function etageComplet(v, etage){
  return validateursEtage(etage).every(function(r){
    return v.decisions[r] && v.decisions[r].decision === 'valide';
  });
}

function appliquerDecision(v, role, decision, commentaire, parNom){
  v = ensureValidation(v);
  // Sécurité : le rôle doit être attendu à l'étage courant
  if(!validateursEtage(v.etage).includes(role)){
    return { ok:false, message:'Ce budget n\'est pas à votre étape de validation.' };
  }
  if(!commentaire || !commentaire.trim()){
    return { ok:false, message:'Un commentaire est obligatoire pour justifier votre décision.' };
  }
  let entry = { decision: decision, commentaire: commentaire.trim(), date: new Date().toISOString(), par: parNom||'' };
  v.decisions[role] = entry;

  if(decision === 'refuse'){
    // Trace dans l'historique avant reset
    v.historique.push({ type:'refus', etage:v.etage, role:role, commentaire:commentaire.trim(), date:entry.date, par:entry.par });
    v.statut = 'refuse';
    // Reset des décisions, retour étage 1
    v.decisions = { dr:null, cg:null, df:null, dg:null, pdg:null };
    v.etage = 1;
    return { ok:true, refus:true, message:'Budget refusé. Il retourne au REX pour correction.', validation:v };
  }

  // Décision = valide : étage complet ?
  if(etageComplet(v, v.etage)){
    v.historique.push({ type:'etage_validé', etage:v.etage, date:entry.date });
    if(v.etage >= 3){
      v.statut = 'valide';
      return { ok:true, definitif:true, message:'Budget définitivement validé par tous les étages.', validation:v };
    } else {
      v.etage += 1;
      return { ok:true, etageSuivant:v.etage, message:'Étage validé. Le budget passe à l\'étape suivante.', validation:v };
    }
  }
  return { ok:true, message:'Votre validation est enregistrée. En attente des autres validateurs de cette étape.', validation:v };
}

function decisionLabel(d) {
  return {valide:'Validé',refuse:'Refusé',complement:'Complément demandé',orientation:'Orientation donnée'}[d]||d;
}

function enAttenteDe(v, role){
  v = ensureValidation(v);
  if(v.statut !== 'en_cours') return false;
  if(!validateursEtage(v.etage).includes(role)) return false;
  return !(v.decisions[role] && v.decisions[role].decision === 'valide');
}


export {
  VALIDATION_STAGES, VALIDATOR_LABELS, VALIDATOR_ROLES,
  newValidation, ensureValidation, validateursEtage, etageComplet,
  appliquerDecision, decisionLabel, enAttenteDe
};
