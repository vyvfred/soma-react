import { useBudget } from '../../context/BudgetContext.jsx';
import { M, LIB_STRUCTURES, lignesStructure, totalLignesMois, totalLigneAn, ligneStructureVide, annualCA, ann } from '../../domain/calculations.js';
import { euro } from '../../domain/format.js';

// Budget d'une structure (Siège, centre de formation, réseau adhérent, exceptionnel ; nov. 2026), préparé par le contrôleur
// de gestion : pas d'activités ni de calendrier, mais une ou plusieurs lignes de CA et de masse salariale, nommées,
// avec une valeur par mois. Les autres charges se saisissent dans « Charges CG ».

const BLOCS = [
  { cle: 'lignesCA', titre: "Chiffre d'affaires", ajout: '+ Ajouter une source de CA', exemple: 'ex : Formations inter-entreprises', defaut: 'Source de CA' },
  { cle: 'lignesMS', titre: 'Masse salariale (chargée)', ajout: '+ Ajouter une ligne de masse salariale', exemple: 'ex : Direction générale', defaut: 'Ligne de masse salariale' }
];
const cel = { padding: '3px 3px' };
const n0 = (v) => Math.round(v).toLocaleString('fr-FR');

function BlocLignes({ a, bloc, editable, update }) {
  const lignes = lignesStructure(a, bloc.cle);
  const muter = (fn) => update((d) => { d[bloc.cle] = lignesStructure(d, bloc.cle).map((l) => ({ ...l, valeurs: (l.valeurs || Array(12).fill(null)).slice() })); fn(d[bloc.cle]); return d; });
  const ajouter = () => muter((ls) => ls.push(ligneStructureVide(lignes.length ? '' : bloc.defaut)));
  const supprimer = (i) => { if (window.confirm('Supprimer la ligne « ' + (lignes[i].nom || 'sans nom') + ' » ?')) muter((ls) => ls.splice(i, 1)); };
  const renommer = (i, v) => muter((ls) => { ls[i].nom = v; });
  const saisir = (i, m, v) => muter((ls) => { ls[i].valeurs[m] = v === '' ? null : +String(v).replace(',', '.'); });
  const repartir = (i) => { const t = window.prompt('Montant annuel à répartir à parts égales sur les 12 mois (€)'); if (t === null || t.trim() === '') return; const v = +t.replace(/\s/g, '').replace(',', '.'); if (isNaN(v)) return; muter((ls) => { ls[i].valeurs = Array(12).fill(Math.round(v / 12 * 100) / 100); }); };
  const totMois = M.map((_, m) => totalLignesMois(a, bloc.cle, m));
  return (
    <div className="card" data-testid={'structure-' + bloc.cle}>
      <h3 style={{ marginTop: 0 }}>{bloc.titre}</h3>
      {lignes.length ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr><th style={{ ...cel, textAlign: 'left', minWidth: 190 }}>Nom de la ligne</th>{M.map((m) => <th key={m} style={cel}>{m}</th>)}<th style={cel}>Total</th><th style={cel} /></tr></thead>
            <tbody>
              {lignes.map((l, i) => (
                <tr key={l.id || i} data-testid={bloc.cle + '-ligne'}>
                  <td style={cel}><input type="text" data-testid={bloc.cle + '-nom-' + i} value={l.nom || ''} placeholder={bloc.exemple} disabled={!editable} onChange={(e) => renommer(i, e.target.value)} style={{ width: '100%' }} /></td>
                  {M.map((_, m) => (
                    <td key={m} style={cel}><input type="number" data-testid={bloc.cle + '-' + i + '-' + m} value={l.valeurs && l.valeurs[m] !== null && l.valeurs[m] !== undefined ? l.valeurs[m] : ''} placeholder="0" disabled={!editable}
                      onChange={(e) => saisir(i, m, e.target.value)} style={{ width: 86, padding: '6px 4px', textAlign: 'right' }} /></td>
                  ))}
                  <td className="num" style={{ ...cel, fontWeight: 700, whiteSpace: 'nowrap' }}>{n0(totalLigneAn(l))}</td>
                  <td style={{ ...cel, whiteSpace: 'nowrap' }}>{editable ? <>
                    <button type="button" className="secondary" title="Répartir un montant annuel sur les 12 mois" onClick={() => repartir(i)} style={{ width: 'auto', margin: 0, padding: '4px 8px', fontSize: 11 }}>÷12</button>{' '}
                    <button type="button" className="secondary" data-testid={bloc.cle + '-suppr-' + i} title="Supprimer la ligne" onClick={() => supprimer(i)} style={{ width: 'auto', margin: 0, padding: '4px 8px', fontSize: 11 }}>✕</button>
                  </> : null}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--border)' }}>
                <td style={{ ...cel, fontWeight: 700 }}>Total {bloc.titre.toLowerCase()}</td>
                {totMois.map((v, m) => <td key={m} className="num" style={{ ...cel, fontWeight: 700, textAlign: 'right' }}>{n0(v)}</td>)}
                <td className="num" data-testid={bloc.cle + '-total'} style={{ ...cel, fontWeight: 700 }}>{n0(totMois.reduce((s, v) => s + v, 0))}</td><td />
              </tr>
            </tbody>
          </table>
        </div>
      ) : <p className="hint" style={{ fontSize: 12 }}>Aucune ligne pour l'instant.</p>}
      {editable ? <button type="button" data-testid={bloc.cle + '-ajouter'} onClick={ajouter} style={{ width: 'auto', marginTop: 10, fontSize: 12, padding: '7px 14px' }}>{bloc.ajout}</button> : null}
    </div>
  );
}

export default function StructureScreen() {
  const { agency: a, editable, update } = useBudget();
  const ca = annualCA(a), ms = ann(a, 'Charges de personnel');
  return (
    <>
      <div className="card">
        <h2 style={{ marginBottom: 6 }}>Budget 2027 · {LIB_STRUCTURES[a.name] || a.name}</h2>
        <p className="hint" style={{ fontSize: 13, margin: 0 }}>
          Structure préparée par le contrôleur de gestion, sans activités, calendrier ni équipe.
          Créez les lignes de <b>chiffre d'affaires</b> et de <b>masse salariale</b> dont vous avez besoin et saisissez-les mois par mois (÷12 répartit un montant annuel).
          Les autres charges sont dans <b>Charges CG</b>, le compte de résultat dans <b>Prévisionnel</b>.
        </p>
        <div className="kpis" style={{ marginTop: 14 }}>
          <div className="kpi"><div className="label">CA 2027</div><div className="value" data-testid="structure-ca">{euro(Math.round(ca))}</div><div className="note">{lignesStructure(a, 'lignesCA').length} ligne(s)</div></div>
          <div className="kpi"><div className="label">Masse salariale 2027</div><div className="value" data-testid="structure-ms">{euro(Math.round(ms))}</div><div className="note">{lignesStructure(a, 'lignesMS').length} ligne(s)</div></div>
        </div>
      </div>
      {BLOCS.map((b) => <BlocLignes key={b.cle} a={a} bloc={b} editable={editable} update={update} />)}
    </>
  );
}
