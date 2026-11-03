import { useEffect, useState } from 'react';

// Notifications discrètes (port de showToast) : toast('message', 'success' | 'info' | 'warn' | 'error')
const abonnes = new Set();
export function toast(message, type = 'info') {
  abonnes.forEach((f) => f({ id: Date.now() + Math.random(), message, type }));
}

const COULEURS = {
  success: 'var(--green, #2e7d6f)',
  info: 'var(--blue2, #3d6fd6)',
  warn: '#FF8F00',
  error: 'var(--orange, #c45300)'
};

export default function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const f = (t) => {
      setItems((l) => [...l, t]);
      setTimeout(() => setItems((l) => l.filter((x) => x.id !== t.id)), 4500);
    };
    abonnes.add(f);
    return () => abonnes.delete(f);
  }, []);
  if (!items.length) return null;
  return (
    <div role="status" aria-live="polite" style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 'calc(100vw - 40px)' }}>
      {items.map((t) => (
        <div key={t.id} className="somaToast" style={{ background: 'var(--card)', border: '1px solid var(--border2)', borderLeft: '4px solid ' + (COULEURS[t.type] || COULEURS.info), padding: '10px 14px', fontSize: 13, color: 'var(--ink)', boxShadow: '0 6px 24px rgba(0,0,0,.3)', maxWidth: 420 }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
