import { useEffect, useState, useCallback } from 'react';
import { chargerJournal } from '../../lib/journalAppli.js';
import { syntheseJournal, dureeLisible } from '../../domain/journal.js';
import { roleLabel } from '../../config/roles.js';

// Administration : journal des connexions et compteur d'utilisation par utilisateur (nov. 2026).
const ROLES = ['rex', 'dr', 'cg', 'df', 'dg', 'pdg', 'admin'];
const TRIS = [['activite', 'Dernière activité'], ['connexions', 'Connexions'], ['temps', 'Temps passé'], ['saisies', 'Enregistrements'], ['nom', 'Nom']];
const th = { padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--ink65)', whiteSpace: 'nowrap' };
const td = { padding: '6px 8px', borderBottom: '1px solid var(--border)', fontSize: 13, whiteSpace: 'nowrap' };
const num = { ...td, textAlign: 'right' };

function dateHeure(v) {
  if (!v) return '—';
  const d = new Date(v);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function ilYA(ms, maintenant) {
  if (!ms) return 'jamais';
  const min = Math.round((maintenant - ms) / 60000);
  if (min < 2) return 'en ce moment';
  if (min < 60) return 'il y a ' + min + ' min';
  const h = Math.round(min / 60);
  if (h < 24) return 'il y a ' + h + ' h';
  const j = Math.round(h / 24);
  return 'il y a ' + j + ' jour' + (j > 1 ? 's' : '');
}
function Kpi({ label, value, note }) {
  return <div className="kpi"><div className="label">{label}</div><div className="value">{value}</div><div className="note">{note || ''}</div></div>;
}

export default function JournalScreen() {
  const [state, setState] = useState({ loading: true, error: null, data: null, maintenant: Date.now() });
  const [tri, setTri] = useState('activite');
  const [role, setRole] = useState('');

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    chargerJournal(200)
      .then((data) => setState({ loading: false, error: null, data, maintenant: Date.now() }))
      .catch((err) => setState({ loading: false, error: err.message || 'Erreur de chargement', data: null, maintenant: Date.now() }));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (state.loading && !state.data) return <div className="card"><h2>Journal des connexions</h2><p className="hint">Chargement…</p></div>;
  if (state.error) return <div className="card"><h2>Journal des connexions</h2><p className="hint">Erreur : {state.error}</p></div>;

  const { stats, recent } = state.data;
  const filtre = (x) => !role || x.role === role;
  const { lignes, kpi } = syntheseJournal(stats.filter(filtre), state.maintenant, tri);
  const recents = recent.filter(filtre);

  return (
    <div data-testid="journal">
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>Journal des connexions</h2>
          <button onClick={load} disabled={state.loading}>{state.loading ? '⏳…' : '↺ Actualiser'}</button>
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          Une connexion = une ouverture de SOMA. Le temps passé compte les minutes où SOMA est affiché à l'écran ; les enregistrements sont les sauvegardes automatiques réussies.
          Le journal démarre le 17 novembre 2026 : avant cette date, seule la dernière authentification est connue.
        </p>
        <div className="kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 10 }}>
          <Kpi label="Actifs aujourd'hui" value={kpi.aujourdhui} note={'sur ' + kpi.total + ' utilisateurs'} />
          <Kpi label="Actifs sur 7 jours" value={kpi.semaine} note="" />
          <Kpi label="Jamais connectés" value={kpi.jamais} note={kpi.jamais ? 'à relancer' : '✓ tous connectés'} />
          <Kpi label="Connexions" value={kpi.connexions} note={kpi.saisies + ' enregistrements'} />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap', fontSize: 13 }}>
          <label>Rôle{' '}
            <select data-testid="journal-role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">Tous</option>
              {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </select>
          </label>
          <label>Trier par{' '}
            <select data-testid="journal-tri" value={tri} onChange={(e) => setTri(e.target.value)}>
              {TRIS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>Utilisation par utilisateur</h3>
        <div style={{ overflowX: 'auto' }}>
          <table data-testid="journal-utilisateurs" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead><tr>
              <th style={th}>Utilisateur</th><th style={th}>Rôle</th><th style={th}>Agence</th>
              <th style={{ ...th, textAlign: 'right' }}>Connexions</th><th style={{ ...th, textAlign: 'right' }}>Jours</th>
              <th style={{ ...th, textAlign: 'right' }}>Temps passé</th><th style={{ ...th, textAlign: 'right' }}>Enregistrements</th>
              <th style={th}>Dernière activité</th>
            </tr></thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.user_id} style={{ color: l.activite ? undefined : 'var(--orange, #c45300)' }}>
                  <td style={td}><b>{l.nom || '—'}</b><div style={{ fontSize: 11, color: 'var(--ink65)' }}>{l.email}</div></td>
                  <td style={td}>{roleLabel(l.role)}</td>
                  <td style={td}>{l.agence || '—'}</td>
                  <td style={num}>{l.nb_connexions}</td>
                  <td style={num}>{l.nb_jours}</td>
                  <td style={num}>{l.nb_connexions ? dureeLisible(l.duree_minutes) : '—'}</td>
                  <td style={num}>{l.saisies}</td>
                  <td style={td} title={l.activite ? dateHeure(l.activite) : ''}>{ilYA(l.activite, state.maintenant)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>Dernières connexions</h3>
        {recents.length === 0 ? <p className="hint">Aucune connexion enregistrée pour l'instant.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table data-testid="journal-recent" style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead><tr>
                <th style={th}>Début</th><th style={th}>Utilisateur</th><th style={th}>Rôle</th><th style={th}>Agence</th>
                <th style={{ ...th, textAlign: 'right' }}>Durée</th><th style={th}>Appareil</th><th style={{ ...th, textAlign: 'right' }}>Enregistrements</th>
              </tr></thead>
              <tbody>
                {recents.map((r) => (
                  <tr key={r.id}>
                    <td style={td}>{dateHeure(r.debut)}</td>
                    <td style={td}>{r.nom || r.email || '—'}</td>
                    <td style={td}>{roleLabel(r.role)}</td>
                    <td style={td}>{r.agence || '—'}</td>
                    <td style={num}>{dureeLisible(r.duree_minutes)}</td>
                    <td style={td}>{r.appareil || '—'}</td>
                    <td style={num}>{r.saisies}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
