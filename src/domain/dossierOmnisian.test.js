import { describe, it, expect } from 'vitest';
import { dossierOmnisian, nomFichierDossier } from './dossierOmnisian.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

const ops = [{ nom: 'NANTES' }, { nom: 'LAVAL' }];
function rows() {
  const a = agenceReference(); a.name = 'NANTES'; a.targetCA = 900000; a.targetTXR = 250; a.perspectives = 'Ouverture d\'un nouveau contrat de dialyse en mars.';
  return { NANTES: { statut: 'soumis_dr', data: { versions: { v1: a }, meta: { activeVersion: 'v1' }, validation: { historique: [{ type: 'refus', role: 'dr', date: '2026-11-10T10:00:00Z', commentaire: 'Revoir les HS d\'août' }] } }, updatedAt: '2026-11-18T09:00:00Z' } };
}

describe('Dossier pour Omnisian', () => {
  it('contient la méthode, la vue réseau, le tableau, les fiches et les questions', () => {
    const md = dossierOmnisian({ rows: rows(), ops, maintenant: new Date('2026-11-19T20:00:00') });
    ['## Comment lire ce dossier', '## Vue d\'ensemble du réseau', '## Tableau comparatif des agences', '### NANTES', '### LAVAL', '## Questions utiles'].forEach((t) => expect(md).toContain(t));
    expect(md).toContain('Soumis DR');
    expect(md).toContain('Ouverture d\'un nouveau contrat de dialyse');
    expect(md).toContain('Revoir les HS d\'août');
    expect(md).toMatch(/LAVAL \| non commencé/);
  });
  it('ne contient aucun nom de salarié', () => {
    const r = rows(); const emps = r.NANTES.data.versions.v1.employees;
    const md = dossierOmnisian({ rows: r, ops });
    emps.forEach((e) => { [e.nom, e.prenom, e.name].filter((x) => x && String(x).length > 2).forEach((n) => expect(md).not.toContain(String(n))); });
  });
  it('dossier d\'une seule agence : une seule fiche détaillée', () => {
    const md = dossierOmnisian({ rows: rows(), ops, agence: 'NANTES' });
    expect(md).toContain('### NANTES'); expect(md).not.toContain('### LAVAL');
    expect(nomFichierDossier('SAINT GILLES CROIX DE VIE', new Date('2026-11-19T10:00:00Z'))).toBe('SOMA_dossier_Omnisian_SAINT_GILLES_CROIX_DE_VIE_2026-11-19');
  });
});
