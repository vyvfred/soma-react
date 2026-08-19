import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { FAQ, faqKeyForRole, FAQ_ROLE_LABEL } from '../../domain/faq.js';

// Écran Aide — FAQ adaptée au profil connecté.
// Port fidèle de renderAide() : mêmes textes (données FAQ verbatim), même
// comportement repliable. La bascule ouvert/fermé passe par l'état React
// au lieu de la manipulation directe du DOM.
export default function AideScreen() {
  const { profile } = useAuth();
  const key = faqKeyForRole(profile.role);
  const items = FAQ[key] || [];
  const [open, setOpen] = useState(() => new Set());

  function toggle(i) {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  return (
    <div className="card" style={{ maxWidth: 820 }}>
      <h2 style={{ marginBottom: 6 }}>Aide &amp; questions fréquentes</h2>
      <p className="hint" style={{ marginBottom: 16 }}>
        Les réponses ci-dessous sont adaptées à votre profil. Cliquez sur une question pour dérouler la réponse.
      </p>

      <div
        style={{
          marginBottom: 16, padding: '10px 14px', background: 'var(--blue-light)',
          border: '1px solid var(--blue2)', fontSize: 13, color: 'var(--blue2)'
        }}
      >
        Aide pour votre profil : <b>{FAQ_ROLE_LABEL[key]}</b>
      </div>

      {items.map((qa, i) => {
        const isOpen = open.has(i);
        return (
          <div key={i} style={{ border: '1px solid var(--border)', marginBottom: 8, background: 'var(--bg2)' }}>
            <button
              onClick={() => toggle(i)}
              style={{
                width: '100%', textAlign: 'left', padding: '14px 16px', background: 'transparent',
                border: 'none', color: 'var(--ink)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12
              }}
            >
              <span>{qa[0]}</span>
              <span style={{ color: 'var(--violet2)', fontSize: 18, flexShrink: 0 }}>{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen ? (
              <div style={{ padding: '0 16px 16px', fontSize: 13, lineHeight: 1.7, color: 'var(--ink65)' }}>
                {qa[1]}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
