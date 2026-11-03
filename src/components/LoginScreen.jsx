import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginScreen() {
  const { login, error, motDePasseOublie } = useAuth();
  const [oubli, setOubli] = useState(false);
  const [emailOubli, setEmailOubli] = useState('');
  const [msgOubli, setMsgOubli] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (busy) return;
    setBusy(true);
    await login(email, password);
    setBusy(false);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') handleSubmit();
  }

  return (
    <div className="soma-auth">
      <div className="soma-auth-brand">
        <h1>SOMA</h1>
        <p className="sub">Copilote de construction budgétaire — VYV Ambulance</p>
        <div className="soma-auth-tags">
          <span>Préparer le travail</span>
          <span>Sécuriser les décisions</span>
          <span>Rendre chaque budget justifiable</span>
        </div>
      </div>

      <div className="soma-auth-form">
        <h2>Connexion</h2>

        <label htmlFor="authEmail">Adresse e-mail</label>
        <input
          id="authEmail"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={onKeyDown}
        />

        <label htmlFor="authPassword">Mot de passe</label>
        <input
          id="authPassword"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={onKeyDown}
        />

        {error ? <div className="soma-auth-err">{error}</div> : null}

        <button className="soma-btn-primary" onClick={handleSubmit} disabled={busy}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>

        <button type="button" data-testid="mdp-oublie" onClick={() => { setOubli(!oubli); setEmailOubli(emailOubli || email); setMsgOubli(null); }}
          style={{ background: 'transparent', border: 'none', color: 'var(--ink65)', fontSize: 12, textDecoration: 'underline', marginTop: 12, padding: 0, width: 'auto', cursor: 'pointer' }}>
          Mot de passe oublié ?
        </button>
        {oubli ? (
          <div style={{ marginTop: 10 }}>
            <label htmlFor="forgotEmail">E-mail du compte</label>
            <input id="forgotEmail" type="email" value={emailOubli} onChange={(e) => setEmailOubli(e.target.value)} />
            <button className="soma-btn-ghost" style={{ marginTop: 8 }} onClick={async () => setMsgOubli(await motDePasseOublie(emailOubli))}>Envoyer le lien de réinitialisation</button>
            {msgOubli ? <div data-testid="mdp-oublie-msg" className={msgOubli.ok ? '' : 'soma-auth-err'} style={{ fontSize: 12, marginTop: 8, color: msgOubli.ok ? 'var(--green, #2e7d6f)' : undefined }}>{msgOubli.message}</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
