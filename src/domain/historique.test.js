import { describe, it, expect } from 'vitest';
import { creerHistorique, noterAvant, annulerHisto, retablirHisto, viderHistorique, HISTO_MAX } from './historique.js';

describe('Annuler / rétablir', () => {
  it('annule puis rétablit la dernière action', () => {
    const h = creerHistorique();
    noterAvant(h, 'A', 1000);            // A → B
    expect(annulerHisto(h, 'B')).toBe('A');
    expect(retablirHisto(h, 'A')).toBe('B');
    expect(annulerHisto(h, 'B')).toBe('A');
  });
  it('frappes rapprochées = une seule action', () => {
    const h = creerHistorique();
    noterAvant(h, '', 1000); noterAvant(h, '8', 1200); noterAvant(h, '87', 1500); // « 875 » tapé en 0,5 s
    expect(h.passe).toEqual(['']);
  });
  it('plusieurs actions espacées, retour en arrière pas à pas', () => {
    const h = creerHistorique();
    noterAvant(h, 'A', 1000); noterAvant(h, 'B', 5000); noterAvant(h, 'C', 9000); // A→B→C→D
    expect(annulerHisto(h, 'D')).toBe('C');
    expect(annulerHisto(h, 'C')).toBe('B');
    expect(annulerHisto(h, 'B')).toBe('A');
    expect(annulerHisto(h, 'A')).toBe(null);
  });
  it('une nouvelle modification efface ce qui pouvait être rétabli', () => {
    const h = creerHistorique();
    noterAvant(h, 'A', 1000); annulerHisto(h, 'B');
    noterAvant(h, 'A', 9000);
    expect(retablirHisto(h, 'X')).toBe(null);
  });
  it(HISTO_MAX + ' actions au plus ; vider', () => {
    const h = creerHistorique();
    for (let i = 0; i < 70; i++) noterAvant(h, i, i * 2000);
    expect(h.passe.length).toBe(HISTO_MAX);
    expect(h.passe[0]).toBe(70 - HISTO_MAX);
    viderHistorique(h);
    expect(annulerHisto(h, 'x')).toBe(null);
  });
});
