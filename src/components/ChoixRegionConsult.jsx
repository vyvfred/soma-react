import { useEffect, useState } from 'react';
import { sb } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
// Vue « directeur régional » en consultation : choix de la région consultée (enregistré en base, puis l'application repart)
export default function ChoixRegionConsult() {
  const { profile } = useAuth();
  const [regions, setRegions] = useState([]);
  const [encours, setEncours] = useState(false);
  useEffect(() => {
    let actif = true;
    sb.from('regions').select('id,nom').order('nom').then(({ data }) => { if (actif) setRegions(data || []); });
    return () => { actif = false; };
  }, []);
  if (!profile || profile.role !== 'dr' || !profile.consultatif) return null;
  const choisir = async (id) => {
    setEncours(true);
    const { error } = await sb.rpc('choisir_region', { p_region: isNaN(+id) ? id : +id });
    if (error) { setEncours(false); return; }
    window.location.reload();
  };
  return (
    <label data-testid="choix-region-consult" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0 }}>
      <span>Région consultée</span>
      <select data-testid="choix-region-consult-select" value={profile.region_id || ''} disabled={encours} onChange={(e) => e.target.value && choisir(e.target.value)} style={{ width: 'auto', margin: 0, padding: '3px 8px', fontSize: 12 }}>
        {!profile.region_id ? <option value="">— Choisir —</option> : null}
        {regions.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
      </select>
    </label>
  );
}
