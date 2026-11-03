import { useEffect, useMemo, useState } from 'react';
import { PANELS_REX } from '../config/panels.js';
import { useAuth } from '../context/AuthContext.jsx';
import { BudgetProvider } from '../context/BudgetContext.jsx';
import { NavContext } from '../context/NavContext.jsx';
import { navForRole } from '../config/panels.js';
import { roleLabel } from '../config/roles.js';
import { agencesOps } from '../config/agences.js';
import PlaceholderPanel from './PlaceholderPanel.jsx';
import { screenFor } from './screens/index.js';
import CgGuide from './CgGuide.jsx';
import StepNav from './StepNav.jsx';
import ChangePasswordModal from './ChangePasswordModal.jsx';
import { VisionOverlay, visionDejaVue } from './Vision.jsx';
import AideOnglet from './AideOnglet.jsx';
import CgAlertes from './CgAlertes.jsx';
import ToastHost from './Toast.jsx';
import { useBudget } from '../context/BudgetContext.jsx';
import { VERSION_LABELS, VERSION_COLORS } from '../domain/versions.js';
import { collecterAnomalies } from '../domain/anomalies.js';
import { toast } from './Toast.jsx';

// Sauvegarde manuelle (port de « 💾 Sauvegarder maintenant »)
function SaveButton() {
  const { agency, agenceNom, saveNow, editable } = useBudget();
  if (!agency || !agenceNom || !editable) return null;
  return (
    <button className="soma-btn-ghost" data-testid="btn-sauver" title="Sauvegarder maintenant"
      onClick={async () => { try { await saveNow(); toast('Budget enregistré', 'success'); } catch (e) { toast('Échec de l\'enregistrement', 'error'); } }}>💾</button>
  );
}

// Centre d'attention (port de updateAttentionCenter / toggleAttentionPanel)
function AttentionCenter({ onNavigate }) {
  const { agency, agenceNom } = useBudget();
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => {
    if (!ouvert) return undefined;
    const f = (e) => { if (!e.target.closest('[data-attention]')) setOuvert(false); };
    document.addEventListener('click', f);
    return () => document.removeEventListener('click', f);
  }, [ouvert]);
  if (!agency || !agenceNom) return null;
  const l = collecterAnomalies(agency);
  return (
    <span data-attention style={{ position: 'relative', marginLeft: 12 }}>
      <button data-testid="attention" className={'somAttention ' + (l.length ? 'alert' : 'calm')} onClick={() => setOuvert(!ouvert)}>
        <span className="somAttentionDot" />
        <span className="somAttentionText">{l.length ? l.length + ' point' + (l.length > 1 ? 's' : '') + ' à vérifier' : 'Aucun point à vérifier'}</span>
      </button>
      {ouvert ? (
        <div className="attentionPanel" data-testid="attention-panel" style={{ position: 'absolute', top: '100%', left: 0, marginTop: 8, zIndex: 1000 }}>
          <div className="attentionHeader">Centre d'attention</div>
          {!l.length ? (
            <div className="attentionEmpty">✓ Tout est en ordre.<br /><span>Aucun point ne demande votre attention.</span></div>
          ) : (
            <div className="attentionList">
              {l.map((an, i) => (
                <button key={i} className="attentionItem" onClick={() => { setOuvert(false); onNavigate(an.panel); }}>
                  <span className={'attentionItemIcon ' + (an.level === 'warn' ? 'warn' : 'todo')}>{an.level === 'warn' ? '⚠' : '○'}</span>
                  <span className="attentionItemText">{an.text}</span>
                  <span className="attentionItemArrow">→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </span>
  );
}

// Version en cours d'édition, rappelée dans l'en-tête (port de updateCrumb / updateVersionIndicator)
function VersionChip() {
  const { agency, agenceNom, budgetId, activeVersion, saveStatus } = useBudget();
  if (!agency || !agenceNom) return null;
  const c = VERSION_COLORS[activeVersion] || VERSION_COLORS.v1;
  const etat = { saving: 'Enregistrement…', saved: 'Enregistré', error: 'Non enregistré' }[saveStatus] || '';
  return (
    <span className="soma-crumb" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
      <b>{agenceNom}</b>
      {budgetId ? <span data-testid="version-chip" style={{ padding: '2px 8px', borderRadius: 20, background: c.bg, color: c.fg, fontWeight: 700 }}>{VERSION_LABELS[activeVersion]}</span> : null}
      {etat ? <span style={{ color: saveStatus === 'error' ? 'var(--orange)' : 'var(--ink30)' }}>{etat}</span> : null}
    </span>
  );
}
// Bordure d'ambiance de la version en cours d'édition
function VersionBorder({ children }) {
  const { agency, budgetId, activeVersion } = useBudget();
  const c = VERSION_COLORS[activeVersion] || VERSION_COLORS.v1;
  return <main className="soma-main" style={agency && budgetId ? { borderTop: '3px solid ' + c.solid } : undefined}>{children}</main>;
}

// Panneaux qui portent sur UNE agence (donc concernés par la sélection d'agence CG).
const PER_AGENCY_PANELS = new Set(['objectif', 'team', 'rh', 'previsionnel', 'finance', 'rex', 'cg', 'refs', 'cal', 'periodes', 'controle']);

export default function AppShell() {
  const { profile, logout, simRole, simuler, recuperation } = useAuth();
  const [mdpOuvert, setMdpOuvert] = useState(false);
  const [navReduite, setNavReduite] = useState(false);
  // Vision SOMA : affichée au premier lancement de chaque utilisateur, puis sur demande
  const [vision, setVision] = useState(() => (visionDejaVue(profile.id) ? null : 'premiere'));
  // Le CG peut basculer en vue « REX exploitation » sur l'agence ouverte (port de setRole).
  const [vueRex, setVueRex] = useState(false);
  const roleNav = profile.role === 'cg' && vueRex ? 'rex' : profile.role;
  // Mode consultation : un valideur parcourt tous les écrans du REX en lecture seule (port de consulterBudget)
  const [consult, setConsult] = useState(null);
  const navRole = useMemo(() => navForRole(roleNav), [roleNav]);
  const { panels, landing, group } = consult
    ? { panels: PANELS_REX.filter((p) => p[0] !== 'aide'), landing: 'finance', group: 'Consultation — ' + consult }
    : navRole;
  const [active, setActive] = useState(landing);
  const basculerVue = (rex) => { setVueRex(rex); setActive(rex ? 'finance' : 'cgdash'); };
  // Changement de rôle simulé : revenir à l'écran d'atterrissage du rôle
  useEffect(() => { setActive(landing); setVueRex(false); }, [profile.role]); // eslint-disable-line react-hooks/exhaustive-deps

  // Agence courante : fixe pour le REX (son agence), sélectionnable pour le CG/DF.
  const [cgAgence, setCgAgence] = useState(null);
  const activeAgence = consult || profile.agence || cgAgence;
  const needsPicker = !profile.agence && ['cg', 'df', 'admin', 'rex'].includes(profile.role);

  const activeLabel = (panels.find((p) => p[0] === active) || [active, active])[1];
  const Screen = screenFor(active);
  const showPicker = !consult && needsPicker && PER_AGENCY_PANELS.has(active);

  return (
    <NavContext.Provider value={(panel, agence) => {
      if (panel === '__consulter') { setConsult(agence); setActive('finance'); return; }
      if (agence && needsPicker) setCgAgence(agence); setActive(panel);
    }}>
    <BudgetProvider agenceNom={activeAgence} lectureSeule={!!consult}>
    <div className="soma-shell">
      {consult ? (
        <div className="consultBanner" data-testid="consult-banner" style={{ display: 'flex', position: 'static' }}>
          <span className="consultBannerDot" />
          <span>Mode consultation — lecture seule</span>
          <button onClick={() => { setConsult(null); setActive('validation'); }}>↩ Revenir à la validation</button>
        </div>
      ) : null}
      {simRole ? (
        <div data-testid="sim-banner" style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', padding: '6px 14px', background: 'var(--orange, #c45300)', color: '#fff', fontSize: 13, fontWeight: 600 }}>
          <span>● Vous testez la vue « {roleLabel(simRole)} »</span>
          <button onClick={() => simuler(null)} style={{ width: 'auto', margin: 0, padding: '4px 12px', fontSize: 12, background: '#fff', color: 'var(--orange, #c45300)', border: 'none', fontWeight: 700 }}>↩ Revenir à l'administration</button>
        </div>
      ) : null}
      {vision ? <VisionOverlay premiereFois={vision === 'premiere'} userId={profile.id} onClose={() => setVision(null)} /> : null}
      {mdpOuvert || recuperation ? <ChangePasswordModal onClose={() => setMdpOuvert(false)} /> : null}
      <header className="soma-topbar">
        <div className="soma-brand">SOMA</div>
        <VersionChip />
        {['rex', 'cg'].includes(roleNav) || (profile.role === 'cg') ? <AttentionCenter onNavigate={setActive} /> : null}
        {profile.role === 'cg' ? (
          <div className="roleSwitch" data-testid="role-switch" style={{ display: 'flex', gap: 0, marginLeft: 12 }}>
            {[[true, 'REX exploitation'], [false, 'Contrôleur de gestion']].map(([rex, l]) => (
              <button key={l} onClick={() => basculerVue(rex)} style={{ width: 'auto', margin: 0, padding: '5px 12px', fontSize: 12, border: '1px solid var(--border)',
                background: vueRex === rex ? 'var(--violet2)' : 'transparent', color: vueRex === rex ? '#fff' : 'var(--ink65)', fontWeight: vueRex === rex ? 700 : 400 }}>{l}</button>
            ))}
          </div>
        ) : null}
        <div className="soma-user">
          <span className="soma-user-nom">{profile.nom}</span>
          <span className="soma-role-pill">{roleLabel(profile.role)}</span>
          {['rex', 'cg', 'admin'].includes(profile.role) ? <SaveButton /> : null}
          <button className="soma-btn-ghost" data-testid="btn-mdp" onClick={() => setMdpOuvert(true)} title="Changer mon mot de passe">🔑</button>
          <button className="soma-btn-ghost" onClick={logout}>Déconnexion</button>
        </div>
      </header>

      <div className="soma-body">
        <nav className="soma-nav" aria-label="Navigation principale" style={navReduite ? { width: 44, minWidth: 44, padding: '8px 4px', overflow: 'hidden' } : undefined}>
          <button data-testid="nav-toggle" onClick={() => setNavReduite(!navReduite)} title={navReduite ? 'Agrandir le menu' : 'Réduire le menu'}
            style={{ width: 'auto', margin: '0 0 8px', padding: '4px 10px', fontSize: 12, background: 'transparent', border: '1px solid var(--border)', color: 'var(--ink65)', alignSelf: navReduite ? 'center' : 'flex-end' }}>{navReduite ? '»' : '«'}</button>
          {navReduite ? null : <>
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
          <button className="soma-navbtn" data-testid="lien-vision" onClick={() => setVision('demande')} style={{ marginTop: 18, fontSize: 12, color: 'var(--ink65)', fontStyle: 'italic' }}>La vision de SOMA</button>
          </>}
        </nav>

        <VersionBorder>
          <AideOnglet panel={active} role={consult ? 'rex' : roleNav} onNavigate={setActive} />
          {profile.role === 'cg' && !consult ? <CgAlertes /> : null}
          {showPicker ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--ink65)' }}>Agence ouverte :</span>
              <select value={activeAgence || ''} onChange={(e) => setCgAgence(e.target.value || null)} style={{ minWidth: 200 }}>
                <option value="">— Choisir une agence —</option>
                {agencesOps().map((ag) => <option key={ag.nom} value={ag.nom}>{ag.nom}</option>)}
                {activeAgence && !agencesOps().some((ag) => ag.nom === activeAgence) ? <option value={activeAgence}>{activeAgence} (hors référentiel)</option> : null}
              </select>
              {['cg', 'admin'].includes(profile.role) ? (
                <button className="secondary" data-testid="hors-ref" style={{ width: 'auto', margin: 0, fontSize: 12, padding: '6px 12px' }}
                  onClick={() => { const n = window.prompt('Nom de l\'agence hors référentiel'); if (n && n.trim()) setCgAgence(n.trim().toUpperCase()); }}>Agence hors référentiel</button>
              ) : null}
            </div>
          ) : null}

          {!consult && (profile.role === 'cg' || profile.role === 'df') ? <CgGuide panel={active} cle={activeAgence} /> : null}

          {showPicker && !activeAgence
            ? <div className="card"><p className="hint">Sélectionnez une agence ci-dessus pour ouvrir son budget.</p></div>
            : Screen ? <Screen /> : <PlaceholderPanel id={active} label={activeLabel} />}
          {(consult || ['rex', 'cg', 'admin'].includes(profile.role)) && !(showPicker && !activeAgence) ? <StepNav panel={active} onNavigate={setActive} /> : null}
        </VersionBorder>
      </div>
    <ToastHost />
    </div>
    </BudgetProvider>
    </NavContext.Provider>
  );
}
