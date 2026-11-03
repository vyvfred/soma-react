// « Pré-remplir standards » des charges CG — port fidèle de prefillCharges.
// Mute `a` : ratios du CA calendrier, mode annuel réparti sur 12 mois (carburant en % du CA).
import { annualCA } from './calculations.js';

export const STANDARDS = [
  ['Carburant', 'pct', 5.2],
  ['Crédit bail et location véhicules', 'annual', 0.05],
  ['Location immobilières et charges locatives', 'annual', 0.028],
  ['Assurance', 'annual', 0.018],
  ['Impôts, taxes et versements assimilés', 'annual', 0.048],
  ['Honoraires et prestations de services', 'annual', 0.026],
  ['Péages', 'annual', 0.013],
  ['Charges financières', 'annual', 0.002]
];

export function prefillCharges(a) {
  const ca = annualCA(a);
  STANDARDS.forEach(([l, mode, v]) => {
    if (!a.rex || !a.rex[l]) return;
    const line = { ...a.rex[l], mode: mode === 'pct' ? 'pct' : 'annual', chargeType: 'variable', allocationKey: mode === 'pct' ? 'ca' : 'monthly12' };
    if (mode === 'pct') line.pct = v; else line.annual = Math.round(ca * v);
    a.rex = { ...a.rex, [l]: line };
  });
  return a;
}
