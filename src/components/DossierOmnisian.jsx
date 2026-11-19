import { useState } from 'react';
import { loadBudgetsForValidation } from '../lib/budgetApi.js';
import { chargerReperes } from '../lib/reperesApi.js';
import { dossierOmnisian, nomFichierDossier } from '../domain/dossierOmnisian.js';
import { agencesOps } from '../config/agences.js';
import { STRUCTURES, LIB_STRUCTURES } from '../domain/calculations.js';

// Dossier d'analyse à déposer dans Omnisian (direction générale et financière), nov. 2026
function telecharger(texte, nom, ext, type) {
  const url = URL.createObjectURL(new Blob([texte], { type: type + ';charset=utf-8' }));
  const lien = document.createElement('a'); lien.href = url; lien.download = nom + ext;
  document.body.appendChild(lien); lien.click(); lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function DossierOmnisian({ profile }) {
  const [agence, setAgence] = useState('');
  const [etat, setEtat] = useState('');
  const ops = agencesOps();

  const generer = async () => {
    const { budgets } = await loadBudgetsForValidation(profile);
    const rows = {}; (budgets || []).forEach((b) => { rows[b.agence] = { statut: b.statut, data: b.data, updatedAt: b.updated_at }; });
    const reperes = await chargerReperes();
    return dossierOmnisian({ rows, ops, reperes, role: profile.role, agence: agence || null });
  };
  const action = async (mode) => {
    setEtat('cours');
    try {
      const md = await generer(), nom = nomFichierDossier(agence || null);
      if (mode === 'md') telecharger(md, nom, '.md', 'text/markdown');
      else if (mode === 'txt') telecharger(md, nom, '.txt', 'text/plain');
      else await navigator.clipboard.writeText(md);
      setEtat(mode === 'copie' ? 'copie' : 'ok');
    } catch (e) { setEtat('erreur'); }
  };
  const btn = { width: 'auto', margin: 0, fontSize: 12, padding: '7px 12px' };
  return (
    <div data-testid="dossier-omnisian" style={{ border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 16, background: 'var(--bg)' }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Dossier pour Omnisian</div>
      <div style={{ fontSize: 12, color: 'var(--ink65)', lineHeight: 1.55, marginBottom: 10 }}>
        Un document à déposer dans Omnisian pour l'aider à analyser les budgets : méthode de lecture, compte de résultat consolidé, tableau comparatif
        des agences (2027 face à 2026, 2025 et à la moyenne du réseau), une fiche par agence avec le contexte rédigé par le REX et l'historique de validation,
        et des questions types. Aucun nom ni salaire individuel. Données au moment du téléchargement.
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select data-testid="dossier-perimetre" value={agence} onChange={(e) => { setAgence(e.target.value); setEtat(''); }} style={{ width: 'auto', margin: 0, fontSize: 12 }}>
          <option value="">Tout le réseau (une fiche par agence)</option>
          {ops.map((o) => <option key={o.nom} value={o.nom}>{o.nom}</option>)}
          {STRUCTURES.map((n) => <option key={n} value={n}>{LIB_STRUCTURES[n]}</option>)}
        </select>
        <button data-testid="dossier-md" style={btn} disabled={etat === 'cours'} onClick={() => action('md')}>📄 Télécharger (.md)</button>
        <button data-testid="dossier-txt" style={{ ...btn, background: 'transparent', color: 'var(--ink65)', border: '1px solid var(--border)' }} disabled={etat === 'cours'} onClick={() => action('txt')}>Texte (.txt)</button>
        <button data-testid="dossier-copier" style={{ ...btn, background: 'transparent', color: 'var(--ink65)', border: '1px solid var(--border)' }} disabled={etat === 'cours'} onClick={() => action('copie')}>Copier le texte</button>
        <span data-testid="dossier-etat" style={{ fontSize: 12, color: etat === 'erreur' ? 'var(--orange, #c45300)' : 'var(--green, #2e7d6f)' }}>
          {etat === 'cours' ? 'Préparation…' : etat === 'ok' ? '✓ Téléchargé : déposez-le dans Omnisian' : etat === 'copie' ? '✓ Copié : collez-le dans Omnisian' : etat === 'erreur' ? 'Échec, réessayez' : ''}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink65)', marginTop: 8 }}>Si Omnisian n'accepte pas le format .md, prenez la version .txt : le contenu est le même.</div>
    </div>
  );
}
