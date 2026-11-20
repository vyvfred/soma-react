// Répartition automatique des congés des roulants (refonte nov. 2026).
// Le cœur du calcul (repartirCPAgence) est le même texte dans le mono-fichier ; ici, repartirCPAuto(a, moisLibres)
// mute `a` (presence, cpEnveloppes, cpReliquat, cpReport, cpOptimal) et le renvoie.
import { M, needWeeks, mainMonth, cpGeneres, memoriserRepartitionOptimale, genCal, moisDeSemaine, pres, CP_HEURES_JOUR, coutHSTotal, absPartMois } from './calculations.js';

// Enveloppes de la règle de l'entreprise : 60 % de juin à octobre, 20 % de novembre à janvier, 20 % de février à mai.
const ENVELOPPES_CP = [
  { nom: 'Juin – octobre', pct: 0.60, months: [5, 6, 7, 8, 9] },
  { nom: 'Novembre – janvier', pct: 0.20, months: [10, 11, 0] },
  { nom: 'Février – mai', pct: 0.20, months: [1, 2, 3, 4] }
];
// Arrondi au dixième
function r1(v) { return Math.round(v * 10) / 10; }

// Répartition en deux temps, dans chaque enveloppe :
// 1) capacité gratuite : les congés vont d'abord sur les semaines où l'équipe disponible dépasse le besoin, sans créer
//    d'heure supplémentaire, en répartissant de façon égale (part de l'équipe en congé la plus basse d'abord) ;
// 2) quand il n'y a plus de marge : chaque jour va sur la semaine où les HS par personne présente sont les plus basses,
//    ce qui garde la charge aussi plate que possible.
// Mois validés : ils ne bougent jamais. Une semaine à cheval sur un mois validé reste figée en entier.
// Enveloppe sans semaine libre (tous ses mois validés) : ce qu'il reste à y poser est reporté sur les autres enveloppes.
function repartirCPAgence(a, moisLibres) {
  if (!a.cal || !a.cal.length) genCal(a);
  let libres = moisLibres || M.map(function (_, i) { return i; }).filter(function (m) { return (a.moisVerrouilles || []).indexOf(m) < 0; });
  let semaines = needWeeks(a);
  let estLibre = function (w) { return moisDeSemaine(a, w.week).every(function (m) { return libres.indexOf(m) >= 0; }); };

  // Vider les congés des semaines libres (les parts par mois des semaines à cheval sont recalculées au prorata)
  semaines.forEach(function (w) {
    if (estLibre(w) && a.presence[w.week]) { a.presence[w.week].cp = 0; delete a.presence[w.week].cpMois; }
  });

  let generes = cpGeneres(a);
  let envelopes = ENVELOPPES_CP.map(function (e) { return { nom: e.nom, pct: e.pct, months: e.months }; });
  envelopes.forEach(function (env) {
    let dans = function (w) { return env.months.indexOf(mainMonth(a, w.week)) >= 0; };
    env.cpVerrouilles = r1(semaines.reduce(function (s, w) { return dans(w) && !estLibre(w) ? s + (+((a.presence[w.week] || {}).cp) || 0) : s; }, 0));
    env.semaines = semaines.filter(function (w) { return dans(w) && estLibre(w); });
    env.cible = r1(generes * env.pct);
    env.budgetBrut = r1(env.cible - env.cpVerrouilles);
  });

  // Mois validés au-delà de la cible de leur enveloppe : l'excédent réduit les autres enveloppes au prorata de leur place
  let excedent = envelopes.reduce(function (s, env) { return s + (env.budgetBrut < 0 ? -env.budgetBrut : 0); }, 0);
  let capacite = envelopes.reduce(function (s, env) { return s + (env.budgetBrut > 0 ? env.budgetBrut : 0); }, 0);
  envelopes.forEach(function (env) {
    if (env.budgetBrut <= 0) { env.budget = 0; return; }
    env.budget = Math.max(0, r1(env.budgetBrut - (capacite > 0 ? excedent * env.budgetBrut / capacite : 0)));
  });

  // Report : une enveloppe dont tous les mois sont validés ne peut plus rien recevoir
  let aReporter = 0;
  envelopes.forEach(function (env) { env.recu = 0; env.reporte = 0; if (!env.semaines.length && env.budget > 0.05) { env.reporte = env.budget; aReporter += env.budget; env.budget = 0; } });
  let receveurs = envelopes.filter(function (env) { return env.semaines.length; });
  let poidsRec = receveurs.reduce(function (s, env) { return s + env.pct; }, 0);
  if (aReporter > 0.05 && poidsRec > 0) receveurs.forEach(function (env) { env.recu = r1(aReporter * env.pct / poidsRec); env.budget = r1(env.budget + env.recu); });

  // Placement
  let reliquat = receveurs.length ? 0 : aReporter;
  let cache = {};
  let etat = function (w) {
    if (!cache[w.week]) {
      let p = pres(a, w.week);
      cache[w.week] = { gap: w.hours - p.av, etp: p.etp, base: p.base, cpH: p.cpH };
    }
    return cache[w.week];
  };
  envelopes.forEach(function (env) {
    let budget = env.budget, place = 0, secu = 0;
    if (budget <= 0.05) return;
    let elig = env.semaines.filter(function (w) { return etat(w).etp > 0.5; });
    while (budget - place > 0.05 && secu < 20000 && elig.length) {
      secu++;
      let reste = r1(budget - place);
      let pas = Math.min(reste > 10 ? 2 : 0.5, reste);
      // 1) capacité gratuite : semaine qui peut recevoir sans créer d'HS, la moins chargée en congés
      let best = null, ajout = 0, cle = Infinity;
      elig.forEach(function (w) {
        let e = etat(w);
        let possible = Math.min(pas, Math.floor((-e.gap / CP_HEURES_JOUR) * 2) / 2);
        if (possible <= 0) return;
        let part = e.base > 0 ? e.cpH / e.base : 0;
        if (part < cle) { cle = part; best = w; ajout = possible; }
      });
      // 2) plus de marge : HS par personne présente les plus basses, puis la semaine la moins chargée en congés
      if (!best) {
        let minR = Infinity;
        elig.forEach(function (w) { let e = etat(w); let r = Math.max(0, e.gap) / e.etp; if (r < minR) minR = r; });
        cle = Infinity;
        elig.forEach(function (w) {
          let e = etat(w);
          if (Math.max(0, e.gap) / e.etp > minR + 0.01) return;
          let part = e.base > 0 ? e.cpH / e.base : 0;
          if (part < cle) { cle = part; best = w; }
        });
        ajout = pas;
      }
      if (!best) break;
      if (!a.presence[best.week]) a.presence[best.week] = { cp: 0, other: 0 };
      a.presence[best.week].cp = r1((+a.presence[best.week].cp || 0) + ajout);
      delete cache[best.week];
      if (etat(best).etp <= 0.5) elig = elig.filter(function (w) { return w !== best; });
      place = r1(place + ajout);
    }
    if (budget - place > 0.05) reliquat += r1(budget - place);
  });

  a.cpEnveloppes = envelopes.map(function (env) {
    return { nom: env.nom, pct: env.pct, cible: env.cible, verrouille: env.cpVerrouilles, budget: env.budget, recu: env.recu, reporte: env.reporte };
  });
  a.cpReliquat = r1(reliquat);
  memoriserRepartitionOptimale(a);
  return a;
}

// Ajustement minimal (nov. 2026) : quand les jours acquis changent (CDD, dates, absentéisme…) ou qu'un mois est validé
// avec plus ou moins de congés que prévu, SOMA ajoute ou retire SEULEMENT la différence sur les semaines des mois non
// validés, sans refaire tout le planning : les congés déjà placés (y compris ajustés à la main) ne bougent pas.
// Ajout : mêmes règles que la répartition (marge d'abord sans créer d'HS, puis HS par personne les plus basses).
// Retrait : là où il y a le plus d'HS par personne (c'est là qu'un congé de moins aide le plus), puis la semaine la plus chargée en congés.
// La différence est partagée entre les périodes selon leur écart à la cible 60 / 20 / 20.
// deltaImpose : variation à traiter (ex. jours acquis en plus après un CDD) ; sinon tout l'écart entre acquis et posés
function ajusterCPMinimal(a, moisLibres, deltaImpose) {
  if (!a.cal || !a.cal.length) genCal(a);
  let libres = moisLibres || M.map(function (_, i) { return i; }).filter(function (m) { return (a.moisVerrouilles || []).indexOf(m) < 0; });
  let semaines = needWeeks(a);
  let estLibre = function (w) { return moisDeSemaine(a, w.week).every(function (m) { return libres.indexOf(m) >= 0; }); };
  let cpDe = function (w) { return +((a.presence[w.week] || {}).cp) || 0; };
  let generes = cpGeneres(a);
  let delta = typeof deltaImpose === 'number' && isFinite(deltaImpose) ? r1(deltaImpose) : r1(generes - semaines.reduce(function (s, w) { return s + cpDe(w); }, 0));
  let envelopes = ENVELOPPES_CP.map(function (e) {
    let dans = function (w) { return e.months.indexOf(mainMonth(a, w.week)) >= 0; };
    let ws = semaines.filter(dans);
    return { nom: e.nom, pct: e.pct, months: e.months, cible: r1(generes * e.pct),
      place: r1(ws.reduce(function (s, w) { return s + cpDe(w); }, 0)),
      verrouille: r1(ws.filter(function (w) { return !estLibre(w); }).reduce(function (s, w) { return s + cpDe(w); }, 0)),
      semaines: ws.filter(estLibre) };
  });
  let cache = {};
  let etat = function (w) {
    if (!cache[w.week]) { let p = pres(a, w.week); cache[w.week] = { gap: w.hours - p.av, etp: p.etp, base: p.base, cpH: p.cpH }; }
    return cache[w.week];
  };
  let modifs = {};
  let poser = function (w, j) {
    if (!a.presence[w.week]) a.presence[w.week] = { cp: 0, other: 0 };
    a.presence[w.week] = Object.assign({}, a.presence[w.week], { cp: Math.max(0, r1(cpDe(w) + j)) });
    delete a.presence[w.week].cpMois;
    modifs[w.week] = r1((modifs[w.week] || 0) + j);
    delete cache[w.week];
  };
  let reliquat = 0;
  if (Math.abs(delta) >= 0.05) {
    a.presence = Object.assign({}, a.presence);
    let rec = envelopes.filter(function (e) { return e.semaines.length; });
    if (!rec.length) reliquat = delta > 0 ? delta : 0;
    else {
      // Partage de la différence : d'abord vers les périodes les plus éloignées de leur cible, sinon au prorata
      let ecarts = rec.map(function (e) { return Math.max(0, delta > 0 ? e.cible - e.place : e.place - e.cible); });
      let tot = ecarts.reduce(function (x, y) { return x + y; }, 0);
      let poids = rec.reduce(function (x, e) { return x + e.pct; }, 0);
      let parts = rec.map(function (e, i) { return tot > 0.05 ? Math.min(Math.abs(delta), ecarts[i]) : Math.abs(delta) * e.pct / poids; });
      let somme = parts.reduce(function (x, y) { return x + y; }, 0);
      if (somme < Math.abs(delta) - 0.05) { let manque = Math.abs(delta) - somme; parts = parts.map(function (v, i) { return v + manque * rec[i].pct / poids; }); }
      rec.forEach(function (env, i) {
        let reste = r1(parts[i]), secu = 0;
        if (delta > 0) {
          let elig = env.semaines.filter(function (w) { return etat(w).etp > 0.5; });
          while (reste > 0.05 && elig.length && secu++ < 20000) {
            let pas = Math.min(reste > 10 ? 2 : 0.5, reste), best = null, ajout = 0, cle = Infinity;
            elig.forEach(function (w) {
              let e = etat(w), possible = Math.min(pas, Math.floor((-e.gap / CP_HEURES_JOUR) * 2) / 2);
              if (possible <= 0) return;
              let part = e.base > 0 ? e.cpH / e.base : 0;
              if (part < cle) { cle = part; best = w; ajout = possible; }
            });
            if (!best) {
              let minR = Infinity; elig.forEach(function (w) { let e = etat(w), r = Math.max(0, e.gap) / e.etp; if (r < minR) minR = r; });
              cle = Infinity;
              elig.forEach(function (w) { let e = etat(w); if (Math.max(0, e.gap) / e.etp > minR + 0.01) return; let part = e.base > 0 ? e.cpH / e.base : 0; if (part < cle) { cle = part; best = w; } });
              ajout = pas;
            }
            if (!best) break;
            poser(best, ajout);
            if (etat(best).etp <= 0.5) elig = elig.filter(function (w) { return w !== best; });
            reste = r1(reste - ajout);
          }
          reliquat += Math.max(0, reste);
        } else {
          while (reste > 0.05 && secu++ < 20000) {
            let pas = Math.min(reste > 10 ? 2 : 0.5, reste);
            let cand = env.semaines.filter(function (w) { return cpDe(w) > 0.05; });
            if (!cand.length) break;
            let best = null, k1 = -Infinity, k2 = -Infinity;
            cand.forEach(function (w) {
              let e = etat(w), r = e.etp > 0 ? Math.max(0, e.gap) / e.etp : 0, part = e.base > 0 ? e.cpH / e.base : 0;
              if (r > k1 + 0.01 || (Math.abs(r - k1) <= 0.01 && part > k2)) { k1 = r; k2 = part; best = w; }
            });
            let retrait = Math.min(pas, cpDe(best));
            poser(best, -retrait);
            reste = r1(reste - retrait);
          }
        }
      });
    }
  }
  // La proposition de SOMA suit les mêmes ajustements (les changements faits à la main restent repérables)
  if (Object.keys(modifs).length) {
    let opt = Object.assign({}, a.cpOptimal || {});
    if (!a.cpOptimal) semaines.forEach(function (w) { opt[w.week] = cpDe(w) - (modifs[w.week] || 0); });
    Object.keys(modifs).forEach(function (k) { opt[k] = Math.max(0, r1((+opt[k] || 0) + modifs[k])); });
    a.cpOptimal = opt;
    // Coût des HS de la proposition (sur une copie : les ajustements faits à la main ne comptent pas)
    let presOpt = {};
    Object.keys(a.presence).forEach(function (k) { presOpt[k] = Object.assign({}, a.presence[k]); });
    Object.keys(opt).forEach(function (k) { presOpt[k] = Object.assign({ other: 0 }, presOpt[k] || {}, { cp: opt[k] }); delete presOpt[k].cpMois; });
    a.cpOptimalHSCost = coutHSTotal(Object.assign({}, a, { presence: presOpt }));
  }
  let envApres = ENVELOPPES_CP.map(function (e) { return semaines.filter(function (w) { return e.months.indexOf(mainMonth(a, w.week)) >= 0; }); });
  a.cpEnveloppes = envelopes.map(function (env, i) {
    let placeApres = r1(envApres[i].reduce(function (s, w) { return s + cpDe(w); }, 0));
    // Période close (tous ses mois validés) en dessous de sa cible : ce qui manque a été placé sur les autres périodes
    let clos = !env.semaines.length;
    return { nom: env.nom, pct: env.pct, cible: env.cible, verrouille: env.verrouille, budget: r1(placeApres - env.verrouille),
      recu: !clos ? Math.max(0, r1(placeApres - env.cible)) : 0, reporte: clos ? Math.max(0, r1(env.cible - placeApres)) : 0 };
  });
  a.cpReliquat = r1(reliquat);
  return a;
}

// Congés posés par mois (semaine à cheval : part du mois)
function cpParMois(a) {
  return M.map(function (_, m) {
    return r1(needWeeks(a).reduce(function (s, w) { return s + absPartMois(a, w.week, 'cp', m); }, 0));
  });
}
// Ce que la répartition a changé : congés par mois avant / après et coût des HS (affiché après une validation ou une relance)
function bilanRecalculCP(avantMois, avantCout, a, contexte) {
  let apres = cpParMois(a), coutApres = coutHSTotal(a);
  let deplacements = [];
  apres.forEach(function (v, m) { let d = r1(v - avantMois[m]); if (Math.abs(d) >= 0.5) deplacements.push({ m: m, delta: d }); });
  return Object.assign({ deplacements: deplacements, coutAvant: Math.round(avantCout), coutApres: Math.round(coutApres), reliquat: a.cpReliquat || 0,
    report: (a.cpEnveloppes || []).filter(function (e) { return e.reporte > 0.05; }).map(function (e) { return { nom: e.nom, jours: e.reporte }; }) }, contexte || {});
}
// Proposition de SOMA pour un mois (dernière répartition automatique) : somme des parts du mois
// Semaine figée : elle touche un mois validé, la répartition ne la modifie pas
function semaineFigee(a, w) {
  let verr = a.moisVerrouilles || [];
  return moisDeSemaine(a, w).some(function (m) { return verr.indexOf(m) >= 0; });
}
function cpProposeMois(a, m) {
  if (!a.cpOptimal) return null;
  let s = 0;
  needWeeks(a).forEach(function (w) {
    if (semaineFigee(a, w.week)) { s += absPartMois(a, w.week, 'cp', m); return; } // figée : ce qui est posé
    let tot = +a.cpOptimal[w.week] || 0; if (!tot) return;
    s += absPartMois({ cal: a.cal, presence: { [w.week]: { cp: tot } } }, w.week, 'cp', m);
  });
  return r1(s);
}
// Remettre la proposition de SOMA sur un mois non validé (semaines entièrement dans le mois ; à cheval : la part du mois)
function reprendrePropositionMois(a, m) {
  if (!a.cpOptimal) return a;
  a.presence = Object.assign({}, a.presence);
  needWeeks(a).forEach(function (w) {
    let ms = moisDeSemaine(a, w.week); if (ms.indexOf(m) < 0 || semaineFigee(a, w.week)) return;
    let tot = +a.cpOptimal[w.week] || 0;
    let p = Object.assign({ cp: 0, other: 0 }, a.presence[w.week] || {});
    if (ms.length < 2) { p.cp = tot; delete p.cpMois; }
    else {
      let parts = {};
      ms.forEach(function (mm) { parts[mm] = mm === m ? absPartMois({ cal: a.cal, presence: { [w.week]: { cp: tot } } }, w.week, 'cp', mm) : absPartMois(a, w.week, 'cp', mm); });
      p.cpMois = parts; p.cp = r1(ms.reduce(function (s, mm) { return s + parts[mm]; }, 0));
    }
    a.presence[w.week] = p;
  });
  return a;
}

export function repartirCPAuto(a, moisLibres) { return repartirCPAgence(a, moisLibres); }
export { ENVELOPPES_CP, repartirCPAgence, ajusterCPMinimal, cpParMois, bilanRecalculCP, cpProposeMois, reprendrePropositionMois };
