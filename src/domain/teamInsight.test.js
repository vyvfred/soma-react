import { describe, it, expect } from 'vitest';
import { teamInsight } from './teamInsight.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

describe('teamInsight — KPI et interprétation', () => {
  it('compte les salariés (hors FACTURIERE) et l’ETP roulant', () => {
    const a = agenceReference(); // 3 roulants (35+35+24 h) + 1 régulateur
    const r = teamInsight(a);
    expect(r.nbSal).toBe(4); // aucun FACTURIERE dans la référence
    // ETP roulant = (35+35+24)/35 = 2.685…
    expect(r.etpTotal).toBeCloseTo((35 + 35 + 24) / 35, 5);
    expect(r.capaciteAn).toBe(Math.round(94 * 52));
  });

  it('sans salarié : invite à saisir l’équipe', () => {
    const a = agenceReference();
    a.employees = [];
    expect(teamInsight(a).phrase).toMatch(/Ajoutez vos salariés/);
  });

  it('avec objectif atteignable : signale une couverture sans heures supp.', () => {
    const a = agenceReference();
    a.targetCA = 500000; a.targetTXR = 250;
    expect(teamInsight(a).phrase).toMatch(/sans recourir aux heures supplémentaires/);
  });

  it('avec objectif hors de portée : signale la capacité manquante', () => {
    const a = agenceReference();
    a.targetCA = 3000000; a.targetTXR = 250;
    expect(teamInsight(a).phrase).toMatch(/Il manque environ/);
  });

  it('sans objectif : renvoie à l’étape 1', () => {
    const a = agenceReference();
    a.targetCA = 0; a.targetTXR = 0;
    expect(teamInsight(a).phrase).toMatch(/Renseignez votre objectif/);
  });
});
