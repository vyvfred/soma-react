import { describe, it, expect } from 'vitest';
import { ETAPES_VISITE_REX, positionBulle } from './visiteGuidee.js';
import { PANELS_REX } from '../config/panels.js';

describe('visite guidée REX', () => {
  it('chaque étape ouvre un écran REX existant et a un titre et un texte courts', () => {
    const ids = PANELS_REX.map((p) => p[0]);
    ETAPES_VISITE_REX.forEach((e) => {
      expect(ids).toContain(e.ecran);
      expect(e.titre.length).toBeGreaterThan(3);
      expect(e.texte.split(/\s+/).length).toBeLessThanOrEqual(45);
    });
  });
  it('suit les 8 étapes du menu dans l\'ordre', () => {
    const ordre = ETAPES_VISITE_REX.map((e) => e.titre.match(/^(\d)\./)).filter(Boolean).map((m) => +m[1]);
    expect(ordre).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it('place la bulle sous la cible, sinon au-dessus, sinon en bas ; centrée sans cible', () => {
    expect(positionBulle({ left: 100, top: 100, width: 200, height: 40, bottom: 140 }, 1200, 800, 380, 180)).toMatchObject({ top: 152, place: 'dessous' });
    expect(positionBulle({ left: 100, top: 600, width: 200, height: 40, bottom: 640 }, 1200, 800, 380, 180)).toMatchObject({ top: 408, place: 'dessus' });
    expect(positionBulle({ left: 0, top: 50, width: 1200, height: 700, bottom: 750 }, 1200, 800, 380, 180).place).toBe('bas');
    expect(positionBulle(null, 1200, 800, 380, 180)).toEqual({ left: 410, top: 310, place: 'centre' });
    expect(positionBulle({ left: 1150, top: 10, width: 40, height: 20, bottom: 30 }, 1200, 800, 380, 180).left).toBe(808);
  });
});
