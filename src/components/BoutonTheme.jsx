import { useState } from 'react';
import { themeCourant, appliquerTheme } from '../lib/theme.js';
// Bascule clair / sombre dans la barre du haut
export default function BoutonTheme() {
  const [th, setTh] = useState(themeCourant());
  const sombre = th === 'dark';
  return (
    <button type="button" data-testid="btn-theme" className="soma-btn-ghost" onClick={() => setTh(appliquerTheme(sombre ? 'light' : 'dark'))}
      title={sombre ? 'Passer au thème clair' : 'Passer au thème sombre'} aria-label={sombre ? 'Passer au thème clair' : 'Passer au thème sombre'}
      style={{ width: 'auto', margin: 0, padding: '6px 10px', fontSize: 15, lineHeight: 1 }}>
      {sombre ? '☀' : '☾'}
    </button>
  );
}
