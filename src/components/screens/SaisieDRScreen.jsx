import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNav } from '../../context/NavContext.jsx';
import { loadAgencesRegion, loadNetworkBudgets } from '../../lib/budgetApi.js';
import { estModifiable } from '../../domain/versions.js';
import { statutLabel } from '../../config/statut.js';

// Le DR saisit le budget d'une agence de sa région à la place du REX (nov. 2026).
// Ses saisies s'affichent en orange jusqu'à ce que le REX les modifie.
export default function SaisieDRScreen() {
  const { profile } = useAuth();
  const navigate = useNav();
  const [etat, setEtat] = useState({ loading: true, agences: [], budgets: {}, error: null });
  useEffect(() => {
    let actif = true;
    Promise.all([loadAgencesRegion(profile.region_id), loadNetworkBudgets()])
      .then(([agences, budgets]) => { if (actif) setEtat({ loading: false, agences: agences.slice().sort(), budgets, error: null }); })
      .catch((e) => { if (actif) setEtat({ loading: false, agences: [], budgets: {}, error: e.message || String(e) }); });
    return () => { actif = false; };
  }, [profile.region_id]);

  return (
    <section className="panel active">
      <h2>Saisir pour un REX</h2>
      <p className="hint" style={{ maxWidth: 760 }}>
        Ouvrez le budget d'une agence de votre région pour le saisir à la place du REX, par exemple pendant un accompagnement.
        Tout ce que vous saisissez s'affiche <span className="legendeDR"><i /> en orange</span> : le REX voit ce que vous avez modifié.
        Dès qu'il modifie une de ces valeurs, elle reprend la couleur normale. Un budget déjà soumis ne se saisit plus : il se valide dans « Budgets à valider ».
      </p>
      {etat.loading ? <p>Chargement…</p> : null}
      {etat.error ? <p className="hint" style={{ color: 'var(--orange)' }}>Erreur : {etat.error}</p> : null}
      {!etat.loading && !etat.error && !etat.agences.length ? <p className="hint">Aucune agence n'est rattachée à votre région. Le contrôleur de gestion fait l'affectation.</p> : null}
      {etat.agences.length ? (
        <div style={{ overflowX: 'auto' }}>
          <table data-testid="saisie-dr-agences" style={{ borderCollapse: 'collapse', minWidth: 460 }}>
            <thead><tr>{['Agence', 'Statut', ''].map((h) => <th key={h} style={{ textAlign: 'left', padding: '6px 10px' }}>{h}</th>)}</tr></thead>
            <tbody>
              {etat.agences.map((nom) => {
                const b = etat.budgets[nom];
                const ok = b && estModifiable(b.statut);
                return (
                  <tr key={nom}>
                    <td style={{ padding: '6px 10px' }}><b>{nom}</b></td>
                    <td style={{ padding: '6px 10px' }}>{b ? <span className={'statut ' + b.statut}>{statutLabel(b.statut)}</span> : <span className="hint">Budget pas encore créé</span>}</td>
                    <td style={{ padding: '6px 10px' }}>
                      <button disabled={!ok} title={!b ? 'Le budget sera créé à la première connexion du REX ou par le contrôleur de gestion' : (!ok ? 'Budget en validation' : '')}
                        onClick={() => navigate('__saisir', nom)} style={{ width: 'auto', margin: 0 }}>✎ Saisir le budget</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
