import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { BudgetProvider } from '../context/BudgetContext.jsx';
import { NavContext } from '../context/NavContext.jsx';
import { navForRole } from '../config/panels.js';
import { roleLabel } from '../config/roles.js';
import { agencesOps } from '../config/agences.js';
import PlaceholderPanel from './PlaceholderPanel.jsx';
import { screenFor } from './screens/index.js';

// Panneaux qui portent sur UNE agence (donc concernés par la sélection d'agence CG).
const PER_AGENCY_PANELS = new Set(['objectif', 'team', 'rh', 'previsionnel', 'finance', 'rex', 'cg', 'refs', 'cal', 'periodes', 'controle']);

export default function AppShell() {
  const { profile, logout } = useAuth();
  const { panels, landing, group } = useMemo(() => navForRole(profile.role), [profile.role]);
  const [active, setActive] = useState(landing);

  // Agence courante : fixe pour le REX (son agence), sélectionnable pour le CG/DF.
  const [cgAgence, setCgAgence] = useState(null);
  const activeAgence = profile.agence || cgAgence;
  const needsPicker = !profile.agence && (profile.role === 'cg' || profile.role === 'df');

  const activeLabel = (panels.find((p) => p[0] === active) || [active, active])[1];
  const Screen = screenFor(active);
  const showPicker = needsPicker && PER_AGENCY_PANELS.has(active);

  return (
    <NavContext.Provider value={setActive}>
    <BudgetProvider agenceNom={activeAgence}>
    <div className="soma-shell">
      <header className="soma-topbar">
        <div className="soma-brand">SOMA</div>
        <div className="soma-user">
          <span className="soma-user-nom">{profile.nom}</span>
          <span className="soma-role-pill">{roleLabel(profile.role)}</span>
          <button className="soma-btn-ghost" onClick={logout}>Déconnexion</button>
        </div>
      </header>

      <div className="soma-body">
        <nav className="soma-nav" aria-label="Navigation principale">
          {group ? <div className="soma-nav-group">{group}</div> : null}
          {panels.map(([id, label]) => (
            <button
              key={id}
              className={'soma-navbtn' + (id === active ? ' current' : '')}
              onClick={() => setActive(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <main className="soma-main">
          {showPicker ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--ink65)' }}>Agence ouverte :</span>
              <select value={activeAgence || ''} onChange={(e) => setCgAgence(e.target.value || null)} style={{ minWidth: 200 }}>
                <option value="">— Choisir une agence —</option>
                {agencesOps().map((ag) => <option key={ag.nom} value={ag.nom}>{ag.nom}</option>)}
              </select>
            </div>
          ) : null}

          {showPicker && !activeAgence
            ? <div className="card"><p className="hint">Sélectionnez une agence ci-dessus pour ouvrir son budget.</p></div>
            : Screen ? <Screen /> : <PlaceholderPanel id={active} label={activeLabel} />}
        </main>
      </div>
    </div>
    </BudgetProvider>
    </NavContext.Provider>
  );
}
