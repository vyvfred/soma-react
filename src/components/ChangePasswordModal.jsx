import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { toast } from './Toast.jsx';

// Changement de mot de passe (port de openChangePwd / doChangePwd), aussi ouvert
// automatiquement après un lien « mot de passe oublié ».
export default function ChangePasswordModal({ onClose }) {
  const { changerMotDePasse, recuperation, setRecuperation } = useAuth();
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [msg, setMsg] = useState(recuperation ? 'Saisissez votre nouveau mot de passe.' : '');
  const [busy, setBusy] = useState(false);
  const fermer = () => { setRecuperation(false); onClose && onClose(); };
  const valider = async () => {
    setBusy(true);
    const r = await changerMotDePasse(p1, p2);
    setBusy(false);
    if (!r.ok) { setMsg(r.message); return; }
    toast(r.message, 'success');
    onClose && onClose();
  };
  return (
    <div className="modal" style={{ padding: 20 }} onClick={(e) => { if (e.target === e.currentTarget) fermer(); }}>
      <div className="modalCard" style={{ width: '100%', maxWidth: 420 }} data-testid="change-pwd">
        <h3 style={{ marginTop: 0 }}>{recuperation ? 'Choisissez un nouveau mot de passe' : 'Changer mon mot de passe'}</h3>
        <label style={{ fontSize: 12 }}>Nouveau mot de passe (8 caractères minimum)
          <input type="password" autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 12, display: 'block', marginTop: 10 }}>Confirmer
          <input type="password" autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') valider(); }} style={{ display: 'block', width: '100%', marginTop: 4 }} />
        </label>
        {msg ? <div data-testid="change-pwd-msg" style={{ fontSize: 12, color: 'var(--orange, #c45300)', marginTop: 10 }}>{msg}</div> : null}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={fermer} style={{ flex: 1, margin: 0, background: 'transparent', color: 'var(--ink65)', border: '1px solid var(--border)' }}>Annuler</button>
          <button onClick={valider} disabled={busy} style={{ flex: 1, margin: 0, fontWeight: 700 }}>{busy ? '…' : 'Enregistrer'}</button>
        </div>
      </div>
    </div>
  );
}
