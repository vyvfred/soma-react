import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
// Bascule entre les profils d'un utilisateur qui en a plusieurs (ex. directeur régional + directeur financier + administrateur)
const LIBELLES = { rex: 'REX', cg: 'Contrôleur de gestion', dr: 'Directeur régional', df: 'Directeur financier', dg: 'Direction', pdg: 'Direction', admin: 'Administrateur' };
export default function ChoixProfil() {
  const { vraiProfil, changerRole } = useAuth();
  const [encours, setEncours] = useState(false);
  const [err, setErr] = useState(null);
  const roles = (vraiProfil && vraiProfil.rolesDispo) || [];
  if (roles.length < 2) return null;
  async function choisir(r) {
    if (r === vraiProfil.role) return;
    setEncours(true); setErr(null);
    try { await changerRole(r); } catch (e) { setErr(e.message || 'Bascule impossible'); setEncours(false); }
  }
  return (
    <label data-testid="choix-profil" title="Vous avez plusieurs profils : choisissez celui avec lequel travailler" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, margin: 0 }}>
      <span style={{ color: 'var(--ink65)' }}>Profil</span>
      <select data-testid="choix-profil-select" value={vraiProfil.role} disabled={encours} onChange={(e) => choisir(e.target.value)} style={{ width: 'auto', margin: 0, padding: '4px 8px', fontSize: 12 }}>
        {roles.map((r) => <option key={r} value={r}>{LIBELLES[r] || r}</option>)}
      </select>
      {err ? <span style={{ color: 'var(--orange)' }}>{err}</span> : null}
    </label>
  );
}
