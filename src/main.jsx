import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './context/AuthContext.jsx';
import App from './App.jsx';

// Charte historique (tokens de couleur, typographie) reprise telle quelle,
// puis styles propres au socle React.
import './styles/legacy.css';
import './styles/shell.css';
import { appliquerTheme, themeCourant } from './lib/theme.js';

// Thème avant le premier affichage (pas de flash) : clair par défaut, sombre si choisi sur cet appareil
appliquerTheme(themeCourant());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);

// Molette de la souris sur un champ numérique : ne modifie pas la valeur saisie
document.addEventListener('wheel', function (e) { var t = document.activeElement; if (t && t.type === 'number' && t === e.target) t.blur(); }, { passive: true });
