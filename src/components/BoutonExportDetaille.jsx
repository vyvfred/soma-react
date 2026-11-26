import { useState } from 'react';

// Bouton d'export Excel détaillé (budget d'une agence, ou toutes les agences en .zip)
// fichiers() : renvoie { nom, modele } ou une liste de { nom, modele } (zip nomZip)
export default function BoutonExportDetaille({ fichiers, nomZip, libelle, petit, testid, titre }) {
  const [etat, setEtat] = useState(null);
  const lancer = async () => {
    setEtat('cours');
    try {
      await new Promise((r) => setTimeout(r, 30)); // laisse le bouton afficher « Génération… »
      const f = fichiers();
      const lib = await import('../lib/exportExcel.js');
      if (Array.isArray(f)) {
        const ok = f.filter(Boolean);
        if (!ok.length) throw new Error('vide');
        await lib.telechargerZipClasseurs(ok, nomZip, (i, n) => setEtat(i + '/' + n));
      } else {
        if (!f) throw new Error('vide');
        await lib.telechargerClasseurDetaille(f.modele, f.nom);
      }
      setEtat('ok');
    } catch (e) { console.error(e); setEtat('erreur'); }
  };
  const txt = etat === 'cours' ? '⏳ Génération…' : etat === 'ok' ? '✓ Exporté' : etat === 'erreur' ? '⚠ Échec, réessayer' : etat ? '⏳ ' + etat : libelle;
  return (
    <button type="button" data-testid={testid} onClick={lancer} disabled={!!etat && etat !== 'ok' && etat !== 'erreur'} title={titre}
      style={petit ? { all: 'unset', cursor: 'pointer', fontSize: 10, color: 'var(--green, #2e7d6f)', textDecoration: 'underline' }
        : { width: 'auto', margin: 0, fontSize: 12, padding: '7px 14px', fontWeight: 700 }}>{txt}</button>
  );
}
