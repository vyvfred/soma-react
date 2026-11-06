import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { FAQ, FAQ_CG_SECTIONS, faqKeyForRole, FAQ_ROLE_LABEL, prendreAideCible } from '../../domain/faq.js';

// Écran Aide — FAQ adaptée au profil connecté. Pour le CG, les questions sont
// rangées par étape de son parcours. Arrivée depuis le guide CG : la question
// visée est dépliée et amenée à l'écran.
export default function AideScreen() {
  const { profile } = useAuth();
  const key = faqKeyForRole(profile.role);
  const sections = (key === 'cg'
    ? FAQ_CG_SECTIONS.map((s) => ({ titre: s.t, items: s.items }))
    : [{ titre: null, items: FAQ[key] || [] }])
    // Le DF utilise aussi les écrans de suivi du contrôle de gestion
    .concat(profile.role === 'df' ? FAQ_CG_SECTIONS.filter((s) => s.t.indexOf('Suivre le réseau') >= 0).map((s) => ({ titre: 'Écrans de suivi du réseau', items: s.items })) : [])
    // L'administrateur a aussi accès au classeur des charges du réseau
    .concat(profile.role === 'admin' ? FAQ_CG_SECTIONS.filter((s) => s.t.indexOf('Charges par agence') >= 0).map((s) => ({ titre: 'Charges du réseau', items: s.items.slice(0, 1) })) : [])
    .concat(FAQ.commun && FAQ.commun.length ? [{ titre: 'Questions générales', items: FAQ.commun }] : []);
  const [open, setOpen] = useState(() => new Set());
  const refs = useRef({});

  useEffect(() => {
    const cible = prendreAideCible();
    if (!cible) return;
    let idx = 0, trouve = null;
    sections.forEach((s) => s.items.forEach((qa) => { if (trouve === null && qa[0].indexOf(cible) >= 0) trouve = idx; idx++; }));
    if (trouve === null) return;
    setOpen(new Set([trouve]));
    setTimeout(() => { const el = refs.current[trouve]; if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(i) {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  let idx = 0;
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

      {sections.map((s, si) => (
        <div key={si}>
          {s.titre ? <h3 style={{ margin: '20px 0 10px', color: 'var(--violet2)' }}>{s.titre}</h3> : null}
          {s.items.map((qa) => {
            const i = idx++;
            const isOpen = open.has(i);
            return (
              <div key={i} ref={(el) => { refs.current[i] = el; }} data-faqidx={i} style={{ border: '1px solid var(--border)', marginBottom: 8, background: 'var(--bg2)' }}>
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
                  // Textes d'aide statiques (aucune saisie utilisateur) : mise en forme <b> autorisée
                  <div className="faqAnswer" style={{ padding: '0 16px 16px', fontSize: 13, lineHeight: 1.7, color: 'var(--ink65)' }}
                    dangerouslySetInnerHTML={{ __html: qa[1] }} />
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
