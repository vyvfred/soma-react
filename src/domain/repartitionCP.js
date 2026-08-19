// Répartition automatique des congés — port fidèle de repartirCPAuto().
// La SEULE transformation par rapport à l'original : la fonction prend l'agence
// `a` en paramètre (au lieu de A()) et ne déclenche pas de re-render — elle mute
// `a` (presence, cpEnveloppes, cpReliquat, cpOptimal) et le renvoie. Tout le
// calcul d'optimisation est identique.
import { M, needWeeks, mainMonth, cpGeneres, hsParPersonne, memoriserRepartitionOptimale, genCal } from './calculations.js';

export function repartirCPAuto(a, moissLibres){
  if(!a.cal.length) genCal(a);

  // Mois libres (non verrouillés)
  let libres = moissLibres || M.map(function(_,i){return i;}).filter(function(m){
    return (a.moisVerrouilles||[]).indexOf(m) < 0;
  });

  // Vider les CP des semaines des mois libres
  needWeeks(a).forEach(function(w){
    let mois = mainMonth(a, w.week);
    if(libres.indexOf(mois) >= 0){
      if(a.presence[w.week]) a.presence[w.week].cp = 0;
    }
  });

  // CP déjà posés sur les mois verrouillés
  let cpVerrouilles = needWeeks(a).reduce(function(s, w){
    let mois = mainMonth(a, w.week);
    if((a.moisVerrouilles||[]).indexOf(mois) >= 0){
      return s + (+((a.presence[w.week]||{}).cp) || 0);
    }
    return s;
  }, 0);

  let generes = cpGeneres(a);
  let restant = Math.round((generes - cpVerrouilles) * 10) / 10;
  if(restant <= 0){ render(); return; }

  // ── COUCHE 1 : enveloppes légales CONSCIENTES des mois verrouillés ──
  // Cible de chaque enveloppe = pct × total généré.
  // Budget des mois libres = cible − CP déjà posés sur les mois verrouillés de l'enveloppe.
  // Si un mois verrouillé DÉPASSE la cible de son enveloppe, l'excédent est
  // compensé en réduisant proportionnellement les autres enveloppes.
  let envelopes = [
    { nom: 'Juin – octobre',    pct: 0.60, months: [5,6,7,8,9]  },
    { nom: 'Novembre – janvier', pct: 0.20, months: [10,11,0]    },
    { nom: 'Février – mai',      pct: 0.20, months: [1,2,3,4]    }
  ];

  // CP verrouillés par enveloppe
  envelopes.forEach(function(env){
    env.cpVerrouilles = needWeeks(a).reduce(function(s, w){
      let mois = mainMonth(a, w.week);
      if(env.months.indexOf(mois) >= 0 && libres.indexOf(mois) < 0){
        return s + (+((a.presence[w.week]||{}).cp) || 0);
      }
      return s;
    }, 0);
    env.cible = Math.round(generes * env.pct * 10) / 10;
    // Budget brut des mois libres = cible − verrouillé (peut être négatif si dépassement)
    env.budgetBrut = Math.round((env.cible - env.cpVerrouilles) * 10) / 10;
  });

  // Compensation : les excédents (budgets négatifs) réduisent proportionnellement
  // les enveloppes qui ont encore de la place.
  let excedent = envelopes.reduce(function(s, env){ return s + (env.budgetBrut < 0 ? -env.budgetBrut : 0); }, 0);
  let capaciteRestante = envelopes.reduce(function(s, env){ return s + (env.budgetBrut > 0 ? env.budgetBrut : 0); }, 0);
  envelopes.forEach(function(env){
    if(env.budgetBrut <= 0){ env.budget = 0; return; }
    let reduction = capaciteRestante > 0 ? excedent * (env.budgetBrut / capaciteRestante) : 0;
    env.budget = Math.max(0, Math.round((env.budgetBrut - reduction) * 10) / 10);
  });
  // Mémoriser le bilan des enveloppes pour l'affichage en synthèse
  a.cpEnveloppes = envelopes.map(function(env){
    return { nom: env.nom, pct: env.pct, cible: env.cible, verrouille: env.cpVerrouilles, budget: env.budget };
  });

  // ── COUCHE 2 : dans chaque enveloppe, ÉGALISER les HS/personne ──
  // Principe : on ne pose JAMAIS de CP sur une semaine structurellement forte.
  // On remplit les creuses jusqu'à rejoindre le niveau des fortes → ligne plate.
  let reliquatTotal = 0;
  envelopes.forEach(function(env){
    let semaines = needWeeks(a).filter(function(w){
      let mois = mainMonth(a, w.week);
      return env.months.indexOf(mois) >= 0 && libres.indexOf(mois) >= 0;
    });
    if(!semaines.length){ reliquatTotal += env.budget; return; }

    let budgetEnv = env.budget;
    if(budgetEnv <= 0) return;

    // Remplissage itératif : à chaque pas, la semaine au plus BAS HS/personne
    // reçoit du CP. On place la TOTALITÉ du budget de l'enveloppe (les congés
    // générés doivent être posés), en gardant la charge aussi plate que possible :
    // remplir toujours la semaine la plus creuse fait monter la ligne uniformément
    // et ne charge les semaines fortes qu'en dernier recours.
    // Pas ADAPTATIF : large au début (rapide), affiné en fin (précis).
    let placeTotal = 0;
    let secu = 0;
    while(budgetEnv - placeTotal > 0.05 && secu < 5000){
      secu++;
      // 1) ratio HS/personne minimal parmi les semaines éligibles
      let minR = Infinity;
      semaines.forEach(function(w){
        let hp = hsParPersonne(a, w.week);
        if(hp.etp <= 0.5) return;
        if(hp.ratio < minR) minR = hp.ratio;
      });
      if(minR === Infinity) break; // aucune semaine éligible (sécurité effectif)
      // 2) parmi les semaines les plus creuses, celle qui porte le MOINS de CP
      //    (densité CP/ETP) → répartition égale même sans écart d'HS.
      let best = null, bestDens = Infinity;
      semaines.forEach(function(w){
        let hp = hsParPersonne(a, w.week);
        if(hp.etp <= 0.5) return;
        if(hp.ratio > minR + 0.01) return; // uniquement les semaines au plus bas niveau
        let cpNow = +((a.presence[w.week]||{}).cp) || 0;
        let dens = hp.etp > 0 ? cpNow / hp.etp : cpNow;
        if(dens < bestDens){ bestDens = dens; best = w; }
      });
      if(!best) break;
      let restAPlacer = budgetEnv - placeTotal;
      // Pas adaptatif : 2 jours tant qu'il reste beaucoup, 0.5 en finition
      let pas = restAPlacer > 10 ? 2 : 0.5;
      let ajout = Math.min(pas, restAPlacer);
      if(!a.presence[best.week]) a.presence[best.week] = {cp:0, other:0};
      a.presence[best.week].cp = Math.round(((+a.presence[best.week].cp||0) + ajout) * 10) / 10;
      placeTotal = Math.round((placeTotal + ajout) * 10) / 10;
    }
    // Reliquat éventuel (uniquement si la sécurité effectif bloque toutes les semaines)
    if(budgetEnv - placeTotal > 0.05) reliquatTotal += Math.round((budgetEnv - placeTotal) * 10) / 10;
  });

  // Mémoriser le reliquat pour le signaler au REX (fil conducteur / synthèse)
  a.cpReliquat = Math.round(reliquatTotal * 10) / 10;

  // Mémoriser cette répartition optimale comme RÉFÉRENCE (pour le coût du choix REX)
  memoriserRepartitionOptimale(a);
  return a;
}
