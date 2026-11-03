import { useState } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import { PANELS_REX } from '../config/panels.js';
import { recapBudget } from '../domain/versions.js';
import { euro } from '../domain/format.js';

// Navigation séquentielle des 7 étapes de construction (port de renderStepNav) et
// récapitulatif de fin de parcours (port de showBudgetRecap).
const ETAPES = PANELS_REX.filter((p) => p[0] !== 'aide');

function Confettis() {
  const couleurs = ['#4A9EFF', '#B76FC0', '#2e7d6f', '#E8833C', '#FFD54F'];
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {Array.from({ length: 40 }, (_, i) => (
        <span key={i} className="somaConfetti" style={{ left: (i * 37) % 100 + '%', background: couleurs[i % couleurs.length], animationDelay: (i % 10) * 0.08 + 's' }} />
      ))}
    </div>
  );
}

function RecapModal({ a, onClose, onSynthese }) {
  const r = recapBudget(a);
  const carte = (label, valeur, couleur) => (
    <div style={{ padding: '14px 16px', border: '1px solid var(--border)', background: 'var(--bg2)' }}>
      <div style={{ fontSize: 11, color: 'var(--ink65)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: couleur }}>{valeur}</div>
    </div>
  );
  return (
    <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ padding: 20 }}>
      <Confettis />
      <div className="modalCard" style={{ width: '100%', maxWidth: 480 }} data-testid="recap">
        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 6 }}>🎉</div>
        <h2 style={{ textAlign: 'center', margin: '0 0 6px' }}>Budget {a.name} construit</h2>
        <p style={{ textAlign: 'center', color: 'var(--ink65)', fontSize: 13, margin: '0 0 22px' }}>Voici le fruit de votre travail pour 2027</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 22 }}>
          {carte('Chiffre d\'affaires', euro(r.ca), 'var(--violet2)')}
          {carte('Effectif', r.etp.toFixed(1) + ' ETP', 'var(--blue2)')}
          {carte('Semaines calées', r.semaines + ' sem.', 'var(--green)')}
          {carte('Heures supp. prévues', r.hs + ' h', 'var(--orange)')}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, margin: 0, background: 'transparent', color: 'var(--ink65)', border: '1px solid var(--border)', padding: 12 }}>Continuer à modifier</button>
          <button onClick={onSynthese} style={{ flex: 1, margin: 0, background: 'linear-gradient(135deg,var(--violet),var(--violet2))', color: '#fff', border: 'none', padding: 12, fontWeight: 700 }}>Voir la synthèse</button>
        </div>
      </div>
    </div>
  );
}

export default function StepNav({ panel, onNavigate }) {
  const { agency: a, saveNow } = useBudget();
  const [recap, setRecap] = useState(false);
  const idx = ETAPES.findIndex((p) => p[0] === panel);
  if (idx < 0 || !a) return null;
  const prev = ETAPES[idx - 1], next = ETAPES[idx + 1];
  const terminer = async () => { await saveNow(); setRecap(true); };
  return (
    <div className="stepnav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
      {prev
        ? <button onClick={() => onNavigate(prev[0])} style={{ width: 'auto', margin: 0, background: 'transparent', color: 'var(--ink65)', border: '1px solid var(--border)', padding: '10px 18px' }}>← {prev[1]}</button>
        : <span />}
      <span style={{ fontSize: 12, color: 'var(--ink65)', fontWeight: 600 }}>Étape {idx + 1} / {ETAPES.length}</span>
      {next
        ? <button onClick={() => onNavigate(next[0])} style={{ width: 'auto', margin: 0, background: 'linear-gradient(135deg,var(--violet),var(--violet2))', color: '#fff', border: 'none', padding: '10px 22px', fontWeight: 700 }}>{next[1]} →</button>
        : <button onClick={terminer} style={{ width: 'auto', margin: 0, background: 'linear-gradient(135deg,var(--green),#45c87a)', color: '#fff', border: 'none', padding: '10px 22px', fontWeight: 700 }}>✓ Terminé</button>}
      {recap ? <RecapModal a={a} onClose={() => setRecap(false)} onSynthese={() => { setRecap(false); onNavigate('finance'); }} /> : null}
    </div>
  );
}
