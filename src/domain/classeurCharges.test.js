import { describe, it, expect } from 'vitest';
import { agency } from './calculations.js';
import { construireClasseurCharges, lireClasseurCharges, appliquerChargesBudget } from './classeurCharges.js';

const NOMS = ['ANGERS', 'TOURS', 'SIEGE'];
const budget = (nom) => { const a = agency(nom); return a; };

describe('Classeur des charges du réseau', () => {
  it('export pré-rempli puis réimport : mêmes lignes (aller-retour)', () => {
    const angers = budget('ANGERS'), tours = budget('TOURS'), siege = budget('SIEGE');
    angers.rex['Assurance'] = { ...angers.rex['Assurance'], mode: 'annual', annual: 22000, allocationKey: 'monthly12' };
    angers.rex['Carburant'] = { ...angers.rex['Carburant'], mode: 'pct', pct: 3.2 };
    tours.rex['Assurance'] = { ...tours.rex['Assurance'], mode: 'annual', annual: 18500, allocationKey: 'ca' };
    tours.rex['Péages'] = { ...tours.rex['Péages'], mode: 'month', values: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 900] };
    siege.rex['Impôt sur les sociétés'] = { ...siege.rex['Impôt sur les sociétés'], mode: 'annual', annual: 150000, allocationKey: 'monthly12' };
    const c = construireClasseurCharges([{ nom: 'ANGERS', data: angers }, { nom: 'TOURS', data: tours }, { nom: 'SIEGE', data: siege }]);
    const ligne = (p) => c.reseau.find((r) => r[0] === p);
    expect(ligne('Assurance')).toEqual(['Assurance', '÷ 12', 22000, '18500 prorata CA', '']);
    expect(ligne('Carburant')[2]).toBe('3,2 %');
    expect(ligne('Péages')[3]).toBe('mensuel');
    expect(ligne("Chiffre d'affaires")[2]).toBe('—');
    expect(ligne('Impôt sur les sociétés')).toEqual(['Impôt sur les sociétés', '÷ 12', '—', '—', 150000]);
    const r = lireClasseurCharges(c.reseau, c.mensuel, NOMS);
    expect(r.erreurs).toEqual([]);
    expect(r.lignes.ANGERS.Assurance).toEqual({ mode: 'annual', annual: 22000, allocationKey: 'monthly12' });
    expect(r.lignes.ANGERS.Carburant).toEqual({ mode: 'pct', pct: 3.2 });
    expect(r.lignes.TOURS.Assurance).toEqual({ mode: 'annual', annual: 18500, allocationKey: 'ca' });
    expect(r.lignes.TOURS['Péages'].values[11]).toBe(900);
    expect(r.lignes.SIEGE['Impôt sur les sociétés'].annual).toBe(150000);
  });

  it('règles de lecture : vide inchangé, 0 explicite, accents et casse, erreurs signalées', () => {
    const reseau = [
      ['Poste', 'Répartition', 'angers', 'Tours', 'LYON'],
      ['carburant', 'prorata CA', '4 %', '', 5],
      ['Assurance', '÷ 12', 0, '12 500 €', 1],
      ['Loyer imaginaire', '÷ 12', 1, 1, 1],
      ["Chiffre d'affaires", '', 1000, '', ''],
      ['Impôt sur les sociétés', '', 10, '', ''],
      ['Péages', '', 'beaucoup', '', '']
    ];
    const r = lireClasseurCharges(reseau, [], NOMS);
    expect(r.lignes.ANGERS.Carburant).toEqual({ mode: 'pct', pct: 4 });
    expect(r.lignes.TOURS.Carburant).toBeUndefined(); // case vide : inchangé
    expect(r.lignes.ANGERS.Assurance).toEqual({ mode: 'annual', annual: 0, allocationKey: 'monthly12' });
    expect(r.lignes.TOURS.Assurance.annual).toBe(12500);
    expect(r.erreurs.join(' | ')).toMatch(/LYON/);
    expect(r.erreurs.join(' | ')).toMatch(/Loyer imaginaire/);
    expect(r.erreurs.join(' | ')).toMatch(/ANGERS \/ Chiffre d'affaires : poste non applicable/);
    expect(r.erreurs.join(' | ')).toMatch(/ANGERS \/ Impôt sur les sociétés : poste non applicable/);
    expect(r.erreurs.join(' | ')).toMatch(/beaucoup/);
  });

  it('feuille Mensuel prioritaire, appliquée à toutes les versions du budget', () => {
    const reseau = [['Poste', 'Répartition', 'TOURS'], ['Péages', '÷ 12', 1200]];
    const mensuel = [['Agence', 'Poste'], ['tours', 'péages', 100, '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 1100]];
    const r = lireClasseurCharges(reseau, mensuel, NOMS);
    expect(r.lignes.TOURS['Péages'].mode).toBe('month');
    const v1 = budget('TOURS'), v2 = budget('TOURS');
    v1.employees = [{ nom: 'garde' }];
    const res = appliquerChargesBudget({ versions: { v1, v2, v3: null }, meta: {} }, r.lignes.TOURS);
    expect(res.nbPostes).toBe(1);
    expect(res.data.versions.v1.rex['Péages'].values).toEqual([100, null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1100]);
    expect(res.data.versions.v2.rex['Péages'].mode).toBe('month');
    expect(res.data.versions.v1.employees).toEqual([{ nom: 'garde' }]); // le reste du budget est intact
    expect(res.data.versions.v3).toBeNull();
    expect(appliquerChargesBudget(res.data, r.lignes.TOURS).nbPostes).toBe(0); // réimport identique : rien ne change
  });
});
