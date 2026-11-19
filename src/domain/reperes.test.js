import { describe, it, expect } from 'vitest';
import { lireTableauDeBord, atterrissage2026, annuel2025, reperesAgence, agenceDuTDB } from './reperes.js';
import { agency } from './calculations.js';

const AG = ['POITIERS', 'SAINT GILLES CROIX DE VIE', 'CENTRE DE FORMATION', 'SIEGE', 'CAHORS'];
function onglet(nom, ca, rex, mc) {
  const tete = [nom]; const cols = [];
  for (let m = 0; m < 12; m++) { tete.push('date', '% CA', 'B ' + String(m + 1).padStart(2, '0') + '-26', '% CA'); cols.push(1 + m * 4); }
  const ligne = (lab, reel, bud) => { const r = [lab]; for (let m = 0; m < 12; m++) r.push(m < mc ? reel : '', 1, bud, 1); return r; };
  return [tete, ligne("Chiffre d'affaires", ca, ca), ligne('Autres Achats et charges externes', ca * 0.25, ca * 0.25), ligne('Charges de personnel', ca * 0.65, ca * 0.65), ligne("RESULTAT D'EXPLOITATION", rex, rex * 2)];
}

describe('Tableau de bord 2026 : lecture', () => {
  it('reconnaît les agences par le nom en A1', () => {
    expect(agenceDuTDB('ST GILLES', AG)).toBe('SAINT GILLES CROIX DE VIE');
    expect(agenceDuTDB('FORMATION (Interne + Externe)', AG)).toBe('CENTRE DE FORMATION');
    expect(agenceDuTDB('Siège', AG)).toBe('SIEGE');
    expect(agenceDuTDB('VYV AMBULANCE', AG)).toBe(null);
  });
  it('réalisé des mois clos, budget, 2025 de l\'onglet « 26 Vs 25 »', () => {
    const comp = [['Agences', 'TDB', 'Janvier', '', 'Février'], ['', '', 2026, 2025, 2026, 2025], ['Poitiers', 'CA', 100, 90, 100, 95], ['', 'REX', 5, 4, 5, 3]];
    const res = lireTableauDeBord({ '86P': onglet('POITIERS', 100000, 5000, 10), '26 Vs 25': comp, 'VYV AMB': onglet('VYV AMBULANCE', 1, 1, 10) }, AG);
    const p = res.parAgence.POITIERS;
    expect(p.moisClos).toBe(10);
    expect(p.n1.ca.slice(0, 2)).toEqual([90, 95]);
    expect(annuel2025(p, 'rex')).toBe(7);
    expect(res.inconnues).toEqual([]);
  });
});

describe('Atterrissage et alertes', () => {
  const r = () => lireTableauDeBord({ x: onglet('CAHORS', 160000, 8000, 10) }, AG).parAgence.CAHORS;
  it('atterrissage = réalisé + estimation CG (à défaut budget 2026, signalé)', () => {
    const p = r();
    expect(atterrissage2026(p, 'ca')).toEqual({ val: 1920000, manquants: 2, moisClos: 10 });
    p.estim = { ca: Array(12).fill(null) }; p.estim.ca[10] = 150000; p.estim.ca[11] = 140000;
    expect(atterrissage2026(p, 'ca')).toEqual({ val: 1890000, manquants: 0, moisClos: 10 });
  });
  it('objectif 2027 très éloigné de l\'atterrissage : alerte « erreur de saisie »', () => {
    const a = agency('CAHORS'); a.rex = a.rex || {};
    const x = reperesAgence({ ...a, name: 'SIEGE', rex: { "Chiffre d'affaires": { mode: 'annual', annual: 1094000 } } }, r());
    expect(x.alertes[0].niveau).toBe('alerte');
    expect(x.alertes[0].texte).toMatch(/erreur de saisie/);
  });
  it('budget 2026 non tenu et atterrissage provisoire signalés', () => {
    const x = reperesAgence(agency('CAHORS'), r());
    expect(x.alertes.some((al) => /Budget 2026 non tenu/.test(al.texte))).toBe(true);
    expect(x.alertes.some((al) => /Atterrissage provisoire/.test(al.texte))).toBe(true);
  });
});
