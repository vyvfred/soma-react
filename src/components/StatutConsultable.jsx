import { useNav } from '../context/NavContext.jsx';
import { statutLabel } from '../config/statut.js';
// Statut d'un budget, cliquable : ouvre tous les écrans du REX en consultation (lecture seule), versions comprises
export default function StatutConsultable({ agence, statut, children }) {
  const navigate = useNav();
  const st = statut || 'brouillon';
  return (
    <button type="button" data-testid={'statut-consulter-' + agence} className={'statut ' + st} onClick={() => navigate('__consulter', agence)}
      title={'Consulter le budget de ' + agence + ' (toutes ses versions), en lecture seule'}
      style={{ width: 'auto', margin: 0, cursor: 'pointer', font: 'inherit', fontSize: 'inherit', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}>
      {children || statutLabel(st)} <span aria-hidden="true">›</span>
    </button>
  );
}
