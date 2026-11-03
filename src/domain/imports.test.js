import { describe, it, expect } from 'vitest';
import { parseRefAgences, colonnesRefAgences, parseRegistre, contratImport, dateImport, mapEmploi, fusionnerEquipe, parseVariablesDec, trouverAgence } from './imports.js';
import { agencesOps } from '../config/agences.js';

const ops = agencesOps();
const SG = 'SAINT GILLES CROIX DE VIE';

describe('Import « Données agences »', () => {
  const entete = ['Agence', 'CA 2025', 'CA 2026', 'TXR 2026', 'Absentéisme %', 'Taux brut 1er janvier', 'Taux brut 1er juin', 'Charges patronales %', 'MS non-roulante brut mensuel', 'Charges non-roulants %'];

  it('ne confond plus le taux de juin ni les colonnes non-roulantes', () => {
    const c = colonnesRefAgences(entete);
    expect(entete[c.tauxHoraireBrut]).toBe('Taux brut 1er janvier');
    expect(entete[c.tauxHoraireBrutJuin]).toBe('Taux brut 1er juin');
    expect(entete[c.tauxChargePatronal]).toBe('Charges patronales %');
    expect(entete[c.msNRBrutMensuel]).toBe('MS non-roulante brut mensuel');
    expect(entete[c.msNRTauxCharges]).toBe('Charges non-roulants %');
    expect(entete[c.histCA]).toBe('CA 2026');
  });

  it('lit chaque agence, calcule le coût horaire et signale les inconnues', () => {
    const r = parseRefAgences([['Données agences 2027'], entete,
      [SG, 4050000, 4100000, 92, 8, 20.07, 20.35, 42, 6800, 42],
      ['ANGERS', 3000000, '', 85, '', '19,8', '', 41, '', ''],
      ['INCONNUE', 1, 1, 1, 1, 1, 1, 1, 1, 1]], ops);
    expect(r.saisies[SG]).toMatchObject({ histCA2025: 4050000, tauxHoraireBrut: 20.07, tauxHoraireBrutJuin: 20.35, tauxChargePatronal: 42, msNRBrutMensuel: 6800, msNRTauxCharges: 42, costHour: 28.5 });
    expect(r.saisies.ANGERS).toEqual({ histCA2025: 3000000, histTXR2026: 85, tauxHoraireBrut: 19.8, tauxChargePatronal: 41, costHour: 27.92 });
    expect(r.inconnues).toEqual(['INCONNUE']);
  });

  it('refuse un fichier sans en-tête', () => {
    expect(parseRefAgences([['a', 'b']], ops).erreur).toMatch(/Agence/);
  });
});

describe('Import du registre RH', () => {
  const H = ['Agence', 'Bureau', 'Matricule', 'Nom', 'Prenom', 'Date_entree', 'Date_sortie', 'Motifobs', 'Type Contrat', 'Libelle_emploi', 'Qualification', 'Diplome', 'Horaire_Mensuel'];
  const L = (ag, nom, prenom, entree, sortie, contrat, emploi) => [ag, '', '1', nom, prenom, entree, sortie, '', contrat, emploi, '', '', 151.67];
  const rows = [H,
    L('ST GILLES', 'MARTIN', 'Paul', '01/03/2019', '', 'Contrat à durée indéterminée', "AMBULANCIER DIPLÔMÉ D'ETAT"),
    L('', 'DURAND', 'Lea', '01/06/2027', '30/09/2027', 'C.D.D', 'AUXILIAIRE AMBULANCIER'),
    L('', 'PETIT', 'Hugo', '02/01/2026', '', 'CDD', 'AUXILIAIRE AMBULANCIER'),
    L('', 'LEROY', 'Anne', '01/09/2015', '', 'Contrat à durée indéterminée', 'REGULATEUR'),
    L('', 'MOREAU', 'Luc', '01/01/2010', '15/12/2026', 'Contrat à durée indéterminée', "AMBULANCIER DIPLOME D'ETAT"),
    L('', 'BLANC', 'Eve', '01/01/2020', '', 'Contrat à durée indéterminée', 'ASSISTANTE ADMINISTRATIVE'),
    L('NANTES', 'BERNARD', 'Zoe', 46023, '', 'Contrat à durée déterminée', 'AUXILIAIRE AMBULANCIER')
  ];
  const decoder = (n) => (n === 46023 ? { y: 2026, m: 1, d: 1 } : null);
  const r = parseRegistre(rows, decoder);
  const sg = r.parAgence[SG];
  const par = (nom) => sg.find((e) => e.nom.startsWith(nom));

  it('reconnaît tous les libellés de CDD', () => {
    expect(['CDD', 'C.D.D', 'Contrat à durée déterminée', 'contrat a duree determinee'].map(contratImport)).toEqual(['CDD', 'CDD', 'CDD', 'CDD']);
    expect(['CDI', 'Contrat à durée indéterminée', 'Contrat d\'apprentissage', 'Intérim', ''].map(contratImport)).toEqual(['CDI', 'CDI', 'APPRENTI', 'INTERIM', 'CDI']);
    expect(par('PETIT').contract).toBe('CDD');
    expect(r.parAgence.NANTES[0].contract).toBe('CDD');
  });

  it('garde un CDD saisonnier avec ses dates 2027 et écarte les sortis avant 2027', () => {
    expect(par('DURAND')).toMatchObject({ contract: 'CDD', dateEntree: '2027-06-01', dateSortie: '2027-09-30' });
    expect(par('MOREAU')).toBeUndefined();
    expect(par('MARTIN')).toMatchObject({ qual: 'DEA', dateEntree: '', dateSortie: '' });
  });

  it('garde les heures des non-roulants et écarte les administratifs purs', () => {
    expect(par('LEROY')).toMatchObject({ qual: 'REGULATEUR', pctRoulant: 0, hours: 35 });
    expect(par('BLANC')).toBeUndefined();
    expect(r.ecartes).toBe(2);
  });

  it('lit les dates Excel (nombres) et les dates texte', () => {
    expect(dateImport('30/09/2027')).toBe('2027-09-30');
    expect(dateImport('2027-06-01')).toBe('2027-06-01');
    expect(dateImport('')).toBe('');
    expect(dateImport('n/a')).toBeNull();
    expect(dateImport(46023, decoder)).toBe('2026-01-01');
  });

  it('reconnaît les emplois avec ou sans accents', () => {
    expect(mapEmploi('Ambulancier diplômé d\'État').qual).toBe('DEA');
    expect(mapEmploi('Chauffeur de taxi').qual).toBe('TAXI');
  });

  it('n\'écrase pas une équipe déjà construite par le REX', () => {
    const team = [{ nom: 'X' }];
    const versionne = { versions: { v1: { employees: [{ nom: 'REX' }] } }, meta: {}, validation: { statut: 'en_cours' } };
    expect(fusionnerEquipe(versionne, team).remplace).toBe(false);
    const vide = { versions: { v1: { employees: [] } }, meta: {}, validation: { statut: 'en_cours' } };
    const f = fusionnerEquipe(vide, team);
    expect(f.remplace).toBe(true);
    expect(f.data.versions.v1.employees).toEqual(team);
    expect(f.data.validation).toEqual({ statut: 'en_cours' });
    expect(Object.keys(f.data)).not.toContain('employees');
    expect(fusionnerEquipe({ histCA: 1 }, team).data).toEqual({ histCA: 1, employees: team });
  });
});

describe('Import des variables de décembre 2026', () => {
  it('lit les rubriques, reconnaît les noms du registre, ignore les cellules vides', () => {
    const r = parseVariablesDec([
      ['Agence', 'HS 25 %', 'HS 50 %', 'Dimanches et fériés', 'Primes', 'Indemnités repas'],
      ['ST GILLES', 4100, 1500, 2000, 500, 1200],
      ['ANGERS', 3000, 800, 1500, '', 900],
      ['INCONNUE', 1, 1, 1, 1, 1]
    ], ops);
    expect(r.saisies[SG]).toEqual({ hs25: 4100, hs50: 1500, dimFeries: 2000, primes: 500, repas: 1200 });
    expect(r.saisies.ANGERS).toEqual({ hs25: 3000, hs50: 800, dimFeries: 1500, repas: 900 });
    expect(r.inconnues).toEqual(['INCONNUE']);
  });

  it('retrouve une agence par alias ou par inclusion', () => {
    expect(trouverAgence('st gilles', ops).nom).toBe(SG);
    expect(trouverAgence('AGENCE DE NANTES', ops).nom).toBe('NANTES');
    expect(trouverAgence('', ops)).toBeNull();
  });
});
