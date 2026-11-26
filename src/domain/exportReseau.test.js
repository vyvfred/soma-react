import { describe, it, expect } from 'vitest';
import { classeurReseau } from './exportReseau.js';
import { buildPeriodesPaie } from './calculations.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

describe('Export compilé du réseau', () => {
  it('une ligne par agence, base complète, structures exclues en région', () => {
    const mk = () => { const a = agenceReference(); a.periodesPaie = buildPeriodesPaie(); a.costHour = 18; return { statut: 'brouillon', data: a }; };
    const map = { AGEN: mk(), BRIVE: mk(), SIEGE: mk() }, ops = [{ nom: 'AGEN' }, { nom: 'BRIVE' }];
    const m = classeurReseau(map, ops, {});
    expect(m.feuilles.map((f) => f.nom)).toEqual(['Synthèse réseau', 'CR par entité', 'CR consolidé mensuel', 'HS par mois', 'Base']);
    const syn = m.feuilles[0].lignes.slice(3).map((l) => l[0]);
    expect(syn).toEqual(['AGEN', 'BRIVE', 'SIEGE', expect.objectContaining({ v: 'Total' })]);
    expect(classeurReseau(map, ops, { region: true }).nbEntites).toBe(2);
  });
});
