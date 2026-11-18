import { describe, it, expect } from 'vitest';
import { agency, genCal, cleJour, monthCA } from './calculations.js';
import { joursCibles, appliquerAjustJours, effacerAjustJours, nbJoursAjustes, activitesAjustables, libelleJour, libellePortee } from './ajustJours.js';

function agenceTP() {
  const a = agency('TEST');
  a.actTP = true;
  for (let m = 0; m < 12; m++) { a.refs.san[m] = { semaine: 1000, vacances: 800, samedi: 300, dimanche: 200, ferie: 200 }; a.refs.tp[m] = { semaine: 500, vacances: 100, samedi: 0, dimanche: 0, ferie: 0 }; }
  genCal(a);
  return a;
}
const jour = (a, m, d) => a.cal.find((x) => x.month === m && x.day === d);

describe('ajustement des jours du calendrier', () => {
  it('le mardi 16 mars 2027 est un jour de semaine', () => {
    const a = agenceTP();
    expect(jour(a, 2, 16).type).toBe('semaine');
    expect(libelleJour(2, 16)).toBe('Mardi 16 mars 2027');
  });
  it('ajuste le TP d\'un seul jour, garde la référence, recalcule le CA du mois', () => {
    const a = agenceTP(); const avant = monthCA(a, 2);
    appliquerAjustJours(a, joursCibles(a, 2, 16, 'jour'), { tp: 1200 });
    const j = jour(a, 2, 16);
    expect(j.ca.tp).toBe(1200); expect(j.ca.san).toBe(1000); expect(j.total).toBe(2200);
    expect(j.ref).toEqual({ san: 1000, sai: 0, tp: 500 });
    expect(jour(a, 2, 23).ca.tp).toBe(500);
    expect(monthCA(a, 2) - avant).toBe(700);
    expect(nbJoursAjustes(a)).toBe(1);
  });
  it('tous les mercredis de semaine de l\'année, sans toucher aux mercredis de vacances', () => {
    const a = agenceTP();
    const cles = joursCibles(a, 2, 17, 'annee');
    expect(cles.every((k) => new Date(k).getDay() === 3)).toBe(true);
    appliquerAjustJours(a, cles, { tp: 0 });
    const merc = a.cal.filter((x) => new Date(2027, x.month, x.day).getDay() === 3);
    expect(merc.filter((x) => x.type === 'semaine').every((x) => x.ca.tp === 0)).toBe(true);
    expect(merc.filter((x) => x.type === 'vacances').every((x) => x.ca.tp === 100)).toBe(true);
    expect(libellePortee(a, 2, 17, 'annee')).toBe("Tous les mercredis de l'année (jour de semaine)");
  });
  it('les mardis du mois seulement ; une valeur vide revient à la référence ; tout effacer', () => {
    const a = agenceTP();
    const cles = joursCibles(a, 2, 16, 'mois');
    expect(cles.length).toBeGreaterThanOrEqual(4);
    expect(cles.every((k) => k.startsWith('2027-03-'))).toBe(true);
    appliquerAjustJours(a, cles, { tp: 900 });
    appliquerAjustJours(a, [cleJour(2, 16)], { tp: '' });
    expect(jour(a, 2, 16).ca.tp).toBe(500);
    expect(jour(a, 2, 16).ref).toBe(null);
    expect(jour(a, 2, 23).ca.tp).toBe(900);
    effacerAjustJours(a);
    expect(nbJoursAjustes(a)).toBe(0);
    expect(jour(a, 2, 23).ca.tp).toBe(500);
  });
  it('les ajustements survivent à une modification des références', () => {
    const a = agenceTP();
    appliquerAjustJours(a, [cleJour(2, 16)], { tp: 1200 });
    a.refs.tp[2] = { ...a.refs.tp[2], semaine: 650 }; genCal(a);
    expect(jour(a, 2, 16).ca.tp).toBe(1200);
    expect(jour(a, 2, 23).ca.tp).toBe(650);
  });
  it('activités proposées : sanitaire toujours, les autres si cochées ; valeurs invalides ignorées', () => {
    const a = agenceTP();
    expect(activitesAjustables(a).map((x) => x[0])).toEqual(['san', 'tp']);
    appliquerAjustJours(a, [cleJour(2, 16)], { tp: 'abc' });
    expect(nbJoursAjustes(a)).toBe(0);
  });
});
