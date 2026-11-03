import { useEffect, useState, useCallback } from 'react';
import {
  loadAdminData, createAccount, updateUserRole, updateUserAgence,
  forceStatut, resetPassword, deleteProfile
} from '../../lib/adminApi.js';
import { AGENCES, agencesOps } from '../../config/agences.js';
import { STATUT_LABELS, statutLabel } from '../../config/statut.js';
import { roleLabel } from '../../config/roles.js';
import { euro } from '../../domain/format.js';
import { useAuth } from '../../context/AuthContext.jsx';

const ROLES = ['rex', 'dr', 'cg', 'df', 'dg', 'pdg', 'admin'];

export default function AdminScreen() {
  const [state, setState] = useState({ loading: true, error: null, users: [], budgets: [] });
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({ nom: '', email: '', role: 'rex', agence: '' });
  const [creating, setCreating] = useState(false);
  const { simuler } = useAuth();

  const load = useCallback(() => {
    setState((p) => ({ ...p, loading: true }));
    loadAdminData()
      .then(({ users, budgets }) => setState({ loading: false, error: null, users, budgets }))
      .catch((err) => setState({ loading: false, error: err.message || 'Erreur de chargement', users: [], budgets: [] }));
  }, []);
  useEffect(() => { load(); }, [load]);

  function flash(text, ok = true) { setMsg({ ok, text }); setTimeout(() => setMsg(null), 5000); }

  async function submitCreate() {
    if (!form.nom.trim() || !form.email.trim()) { flash('Nom et email obligatoires.', false); return; }
    if (form.role === 'rex' && !form.agence) { flash('Sélectionnez une agence pour ce REX.', false); return; }
    setCreating(true);
    try {
      const res = await createAccount({ nom: form.nom.trim(), email: form.email.trim(), role: form.role, agence: form.role === 'rex' ? form.agence : null });
      flash(res.message, res.ok);
      if (res.ok) { setForm({ nom: '', email: '', role: 'rex', agence: '' }); load(); }
    } catch (e) { flash(e.message || 'Erreur', false); }
    finally { setCreating(false); }
  }

  async function act(fn, okText) {
    try { await fn(); flash(okText); load(); }
    catch (e) { flash(e.message || 'Erreur', false); }
  }

  if (state.loading) return <div className="card"><h2>Administration</h2><p className="hint">Chargement…</p></div>;
  if (state.error) return <div className="card"><h2>Administration</h2><p className="hint">Erreur : {state.error}</p></div>;

  return (
    <div className="card">
      <h2 style={{ marginBottom: 14 }}>Administration — utilisateurs &amp; budgets</h2>

      {msg ? (
        <div style={{ marginBottom: 16, padding: '10px 14px', border: '1px solid ' + (msg.ok ? 'var(--green, #2e7d6f)' : 'var(--orange, #c45300)'), background: msg.ok ? 'rgba(46,125,111,.10)' : 'rgba(196,83,0,.10)', fontSize: 13, color: msg.ok ? 'var(--green, #2e7d6f)' : 'var(--orange, #c45300)' }}>
          {msg.ok ? '✓ ' : '⚠ '}{msg.text}
        </div>
      ) : null}

      {/* Voir en tant que… (port de simulerRole) */}
      <div data-testid="voir-en-tant-que" style={{ marginBottom: 20, padding: '12px 14px', border: '1px solid var(--border)', background: 'var(--bg2)' }}>
        <h3 style={{ fontSize: 14, margin: '0 0 6px' }}>👁 Voir en tant que…</h3>
        <p className="hint" style={{ fontSize: 12, margin: '0 0 10px' }}>Simulez la vue d'un utilisateur sans vous déconnecter. Utile pour tester l'interface avant de la déployer.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['rex', 'REX Exploitation', 'var(--violet)'], ['cg', 'Contrôleur de gestion', 'var(--blue)'], ['dr', 'Directeur Régional', '#2C3E7A'], ['df', 'Directeur Financier', '#4A235A'], ['dg', 'Direction', '#1A5276']].map(([r, l, c]) => (
            <button key={r} onClick={() => simuler(r)} style={{ width: 'auto', margin: 0, background: c, color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, padding: '7px 12px' }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Création de compte */}
      <h3 style={{ fontSize: 14, marginBottom: 10 }}>Créer un compte</h3>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 8 }}>
        <label style={{ fontSize: 12 }}>Nom<br /><input type="text" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} style={{ width: 160 }} /></label>
        <label style={{ fontSize: 12 }}>Email<br /><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ width: 200 }} /></label>
        <label style={{ fontSize: 12 }}>Rôle<br />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
          </select>
        </label>
        {form.role === 'rex' ? (
          <label style={{ fontSize: 12 }}>Agence<br />
            <select value={form.agence} onChange={(e) => setForm({ ...form, agence: e.target.value })}>
              <option value="">— Choisir —</option>
              {agencesOps().map((a) => <option key={a.nom} value={a.nom}>{a.nom}</option>)}
            </select>
          </label>
        ) : null}
        <button onClick={submitCreate} disabled={creating}>{creating ? '⏳…' : 'Créer le compte'}</button>
      </div>
      <p className="hint" style={{ fontSize: 12, marginBottom: 24 }}>
        Le compte est créé avec le mot de passe habituel. Nécessite que « Confirm email » soit désactivé dans Supabase (Authentication → Providers → Email).
      </p>

      {/* Utilisateurs */}
      <h3 style={{ fontSize: 14, marginBottom: 10 }}>Utilisateurs ({state.users.length})</h3>
      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr>{['Nom', 'Email', 'Rôle', 'Agence', 'Actions'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '6px 8px' }}>{h}</th>)}</tr></thead>
          <tbody>
            {state.users.map((u) => (
              <tr key={u.id}>
                <td style={{ padding: '4px 8px' }}><b>{u.nom}</b></td>
                <td style={{ padding: '4px 8px', fontSize: 11, color: 'var(--ink65)' }}>{u.email}</td>
                <td style={{ padding: '4px 8px' }}>
                  <select value={u.role} onChange={(e) => act(() => updateUserRole(u.id, e.target.value), 'Rôle mis à jour.')}>
                    {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                  </select>
                </td>
                <td style={{ padding: '4px 8px' }}>
                  <select value={u.agence || ''} onChange={(e) => act(() => updateUserAgence(u.id, e.target.value), 'Agence mise à jour.')}>
                    <option value="">—</option>
                    {AGENCES.map((a) => <option key={a.nom} value={a.nom}>{a.nom}</option>)}
                  </select>
                </td>
                <td style={{ padding: '4px 8px' }}>
                  <button className="warn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => act(() => resetPassword(u.email), 'Email de réinitialisation envoyé.')}>Reset MDP</button>
                  <button className="danger" style={{ fontSize: 11, padding: '4px 8px', marginLeft: 4 }}
                    onClick={() => { if (window.confirm('Supprimer le profil de ' + u.nom + ' ? Action irréversible.')) act(() => deleteProfile(u.id), 'Profil supprimé.'); }}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Budgets */}
      <h3 style={{ fontSize: 14, marginBottom: 10 }}>Budgets ({state.budgets.length})</h3>
      {state.budgets.length ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>{['Agence', 'Statut actuel', 'CA Objectif', 'Forcer statut'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '6px 8px' }}>{h}</th>)}</tr></thead>
            <tbody>
              {state.budgets.map((b) => (
                <tr key={b.id}>
                  <td style={{ padding: '4px 8px' }}><b>{b.agence}</b></td>
                  <td style={{ padding: '4px 8px' }}><span className={'statut ' + b.statut}>{statutLabel(b.statut)}</span></td>
                  <td className="num" style={{ padding: '4px 8px' }}>{euro(b.targetCA)}</td>
                  <td style={{ padding: '4px 8px' }}>
                    <select value={b.statut} onChange={(e) => act(() => forceStatut(b.id, e.target.value), 'Statut forcé : ' + statutLabel(e.target.value))} style={{ fontSize: 11 }}>
                      {Object.keys(STATUT_LABELS).map((s) => <option key={s} value={s}>{statutLabel(s)}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="hint">Aucun budget créé pour le moment.</p>}
    </div>
  );
}
