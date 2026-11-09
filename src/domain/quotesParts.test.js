import { describe, it, expect } from 'vitest';
import { agency, ann, amount, lignesSIG, LIGNES_QUOTE_PART } from './calculations.js';
import { posteAutorise, construireClasseurCharges } from './classeurCharges.js';
import { sigAnnuelEntite } from './consolideSIG.js';
import { agenceReference } from './__fixtures__/agenceReference.js';

// Demande de Florent (nov. 2026) : quote-part MS siège + quote-part régulation mutualisée,
// montant annuel par agence selon une clé libre, lissé à l'identique sur 12 mois ; 0 = agence non concernée.
const avecQuotesParts = (siege, regul) => {
  const a = agenceReference();
  a.rex['Quote-part MS siège'] = { mode: 'annual', annual: siege, allocationKey: 'monthly12', values: Array(12).fill(null), chargeType: 'fixe' };
  a.rex['Quote-part régulation mutualisée'] = { mode: 'annual', annual: regul, allocationKey: 'monthly12', values: Array(12).fill(null), chargeType: 'fixe' };
  return a;
};

describe('Quotes-parts siège et régulation mutualisée', () => {
  it('deux lignes juste sous les charges de personnel', () => {
    const l = lignesSIG(agency('NANTES'), 'cg').map((r) => r.label);
    const i = l.indexOf('Charges de personnel');
    expect(l.slice(i + 1, i + 3)).toEqual(LIGNES_QUOTE_PART);
  });
  it('montant annuel lissé à l\'identique sur 12 mois, déduit de l\'EBE', () => {
    const base = agenceReference(), a = avecQuotesParts(36000, 12000);
    for (let m = 0; m < 12; m++) {
      expect(amount(a, 'Quote-part MS siège', m)).toBe(3000);
      expect(amount(a, 'Quote-part régulation mutualisée', m)).toBe(1000);
    }
    expect(Math.round(ann(base, "EXCEDENT BRUT D'EXPLOITATION") - ann(a, "EXCEDENT BRUT D'EXPLOITATION"))).toBe(48000);
    expect(Math.round(ann(base, 'RESULTAT NET') - ann(a, 'RESULTAT NET'))).toBe(48000);
    expect(Math.round(ann(a, 'Charges de personnel'))).toBe(Math.round(ann(base, 'Charges de personnel')));
  });
  it('0 = agence non concernée par la régulation mutualisée', () => {
    const a = avecQuotesParts(36000, 0);
    expect(ann(a, 'Quote-part régulation mutualisée')).toBe(0);
  });
  it('agences uniquement : ni le Siège ni les autres structures', () => {
    expect(posteAutorise('NANTES', 'Quote-part MS siège')).toBe(true);
    ['SIEGE', 'CENTRE DE FORMATION', 'EXCEPTIONNEL', 'RESEAU ADHERENT'].forEach((s) => {
      expect(posteAutorise(s, 'Quote-part régulation mutualisée')).toBe(false);
      expect(lignesSIG(agency(s), 'cg').some((r) => LIGNES_QUOTE_PART.includes(r.label))).toBe(false);
    });
  });
  it('classeur réseau : lignes présentes, répartition ÷ 12 par défaut', () => {
    const c = construireClasseurCharges([{ nom: 'NANTES', data: avecQuotesParts(36000, 0) }, { nom: 'SIEGE', data: null }]);
    const l = c.reseau.find((r) => r[0] === 'Quote-part MS siège');
    expect(l[1]).toBe('÷ 12');
    expect(l[2]).toBe(36000);
    expect(l[3]).toBe('—');
  });
  it('consolidation : les quotes-parts figurent dans le compte de résultat de l\'entité', () => {
    const o = sigAnnuelEntite(avecQuotesParts(36000, 12000));
    expect(o['Quote-part MS siège']).toBe(36000);
    expect(o['Quote-part régulation mutualisée']).toBe(12000);
  });
});
