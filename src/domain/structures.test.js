import { describe, it, expect } from 'vitest';
import { agency, genCal, ann, lignesSIG, resultatAffiche, estStructure } from './calculations.js';
import { consolideReseau, feuilleConsolide } from './consolideSIG.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

const siege = () => {
  const s = agency('SIEGE');
  s.rex["Chiffre d'affaires"] = { values: Array(12).fill(10000), mode: 'month' };
  s.rex['Charges de personnel'] = { annual: 60000, mode: 'annual', allocationKey: 'monthly12' };
  s.rex.Carburant = { pct: 10, mode: 'pct', allocationKey: 'ca' };
  s.rex['Produits financiers'] = { annual: 1200, mode: 'annual', allocationKey: 'monthly12' };
  s.rex['Produits exceptionnels'] = { annual: 2400, mode: 'annual', allocationKey: 'monthly12' };
  s.rex['Impôt sur les sociétés'] = { annual: 3600, mode: 'annual', allocationKey: 'monthly12' };
  s.rex['Participation aux bénéfices'] = { annual: 1200, mode: 'annual', allocationKey: 'monthly12' };
  return s;
};

describe('Structures hors agences (demande du CG)', () => {
  it('le Siège : CA, masse salariale et charges en % du CA saisis', () => {
    const s = siege();
    expect(estStructure(s)).toBe(true);
    expect(ann(s, "Chiffre d'affaires")).toBe(120000);
    expect(Math.round(ann(s, 'Charges de personnel'))).toBe(60000);
    expect(Math.round(ann(s, 'Carburant'))).toBe(12000);
  });
  it('résultat net = RCAI + exceptionnel − IS − participation', () => {
    const s = siege();
    const net = ann(s, 'RESULTAT NET');
    expect(Math.round(net)).toBe(Math.round(ann(s, 'RESULTAT COURANT AVANT IMPOT') + ann(s, 'RESULTAT EXCEPTIONNEL') - 4800));
    expect(Math.round(net)).toBe(120000 - 60000 - 12000 + 1200 + 2400 - 4800);
  });
  it('IS et participation : lignes du Siège uniquement', () => {
    expect(lignesSIG(siege(), 'cg').some((r) => r.label === 'Impôt sur les sociétés')).toBe(true);
    expect(lignesSIG(agency('CENTRE DE FORMATION'), 'cg').some((r) => r.label === 'Impôt sur les sociétés')).toBe(false);
  });
});

describe('Vue du REX d\'agence', () => {
  it('arrêt au résultat d\'exploitation pour le REX, compte complet à partir du DR', () => {
    const a = agency('NANTES');
    const rex = lignesSIG(a, 'rex');
    expect(rex[rex.length - 1].label).toBe("RESULTAT D'EXPLOITATION");
    expect(resultatAffiche(a, 'rex').lib).toBe("Résultat d'exploitation");
    const dr = lignesSIG(a, 'dr');
    expect(dr[dr.length - 1].label).toBe('RESULTAT NET');
    expect(dr.some((r) => r.label === 'Impôt sur les sociétés')).toBe(false);
  });
});

describe('Compte de résultat consolidé', () => {
  it('somme agences + structures, IS du Siège repris', () => {
    const ag = agenceReference(); ag.name = 'NANTES'; genCal(ag);
    const s = siege();
    const map = {
      NANTES: { statut: 'soumis', data: { versions: { v1: ag }, meta: { activeVersion: 'v1' } } },
      SIEGE: { statut: 'brouillon', data: { versions: { v1: s }, meta: { activeVersion: 'v1' } } }
    };
    const c = consolideReseau(map, [{ nom: 'NANTES' }, { nom: 'LAVAL' }]);
    expect(c.nbAgences).toBe(1);
    expect(Math.round(c.agences["Chiffre d'affaires"])).toBe(Math.round(ann(ag, "Chiffre d'affaires")));
    expect(Math.round(c.total["Chiffre d'affaires"])).toBe(Math.round(ann(ag, "Chiffre d'affaires") + 120000));
    expect(c.total['Impôt sur les sociétés']).toBe(3600);
    expect(Math.round(c.total['RESULTAT NET'])).toBe(Math.round(ann(ag, 'RESULTAT NET') + ann(s, 'RESULTAT NET')));
    expect(c.structures.EXCEPTIONNEL.present).toBe(false);
    expect(feuilleConsolide(c).lignes.length).toBeGreaterThan(40);
  });
});
