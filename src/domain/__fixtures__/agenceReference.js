import { agency, genCal } from '../calculations.js';

// Agence de référence pour les tests. Construite avec la vraie fabrique agency()
// de l'application, puis renseignée de façon déterministe. Sert de base aux
// tests de non-régression (golden master) : ses sorties ne doivent pas changer
// lors de la réécriture.
export function agenceReference() {
  const a = agency('AGENCE_TEST');
  a.schoolZone = 'B';
  a.targetTXR = 250; // taux de rendement (CA / heure) cible
  a.costHour = 28.5;
  a.employees = [
    { name: 'Roulant 1', qual: 'DEA', hours: 35, hoursM: 0, hsTarget: 3, pctRoulant: 100, joursSem: 5 },
    { name: 'Roulant 2', qual: 'AA', hours: 35, hoursM: 0, hsTarget: 3, pctRoulant: 100, joursSem: 5 },
    { name: 'Temps partiel', qual: 'DEA', hours: 24, hoursM: 0, hsTarget: 1, pctRoulant: 100, joursSem: 3 },
    { name: 'Régulateur', qual: 'REGULATEUR', hours: 35, hoursM: 3, hsTarget: 0, pctRoulant: 30, joursSem: 5, coutJour: 210 }
  ];
  for (let m = 0; m < 12; m++) {
    a.refs.san[m].semaine = 3200;
    a.refs.san[m].samedi = 1800;
    a.refs.san[m].dimanche = 1500;
    a.refs.san[m].ferie = 1500;
    a.refs.san[m].vacances = 2600;
  }
  genCal(a);
  return a;
}
