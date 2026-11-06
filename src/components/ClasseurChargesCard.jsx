import { useRef, useState } from 'react';
import { agencesOps } from '../config/agences.js';
import { STRUCTURES } from '../domain/calculations.js';
import { budgetData } from '../domain/budgetMapper.js';
import { construireClasseurCharges, lireClasseurCharges, appliquerChargesBudget } from '../domain/classeurCharges.js';
import { lireClasseurMultiFeuilles, telechargerClasseurCharges } from '../lib/importExcel.js';
import { loadBudgetsBruts, ecrireChargesImportees } from '../lib/budgetApi.js';
import { statutLabel } from '../config/statut.js';

// Classeur des charges du réseau (CG) — port de telechargerClasseurCharges / importerClasseurCharges.
const entites = () => agencesOps().map((x) => x.nom).concat(STRUCTURES);

export default function ClasseurChargesCard({ agenceOuverte, onImporte }) {
  const input = useRef(null);
  const [etat, setEtat] = useState(null); // { erreurs, avert, aEcrire, lignes } | { message } | { lecture }

  async function telecharger() {
    try {
      const map = {};
      (await loadBudgetsBruts()).forEach((b) => { map[b.agence] = b; });
      const c = construireClasseurCharges(entites().map((nom) => ({ nom, data: map[nom] ? budgetData(map[nom].data) : null })));
      await telechargerClasseurCharges(c, 'SOMA_charges_reseau_2027_' + new Date().toISOString().slice(0, 10) + '.xlsx');
    } catch (e) { window.alert('Téléchargement impossible : ' + (e.message || e)); }
  }

  async function importer(ev) {
    const f = ev.target.files && ev.target.files[0]; ev.target.value = '';
    if (!f) return;
    setEtat({ lecture: true });
    try {
      const feuille = await lireClasseurMultiFeuilles(f);
      const r = lireClasseurCharges(feuille('reseau'), feuille('mensuel'), entites());
      const map = {};
      (await loadBudgetsBruts()).forEach((b) => { map[b.agence] = b; });
      const aEcrire = Object.keys(r.lignes).map((nom) => {
        const b = map[nom];
        return { nom, nouveau: !b, statut: b ? (b.statut || 'brouillon') : 'brouillon', nbPostes: appliquerChargesBudget(b ? b.data : {}, r.lignes[nom]).nbPostes };
      }).filter((l) => l.nbPostes > 0);
      setEtat({ erreurs: r.erreurs, avert: r.avertissements, aEcrire, lignes: r.lignes });
    } catch (e) { setEtat({ message: 'Classeur illisible : ' + (e.message || e), erreur: true }); }
  }

  async function valider() {
    const enValidation = etat.aEcrire.filter((l) => !l.nouveau && l.statut !== 'brouillon');
    if (enValidation.length && !window.confirm('Ces budgets sont déjà soumis ou en validation : ' + enValidation.map((l) => l.nom).join(', ') + '.\n\nLeurs charges seront quand même mises à jour. Continuer ?')) return;
    const noms = etat.aEcrire.map((l) => l.nom);
    setEtat({ lecture: true, ecriture: true });
    const { ok, ko } = await ecrireChargesImportees(noms, etat.lignes, appliquerChargesBudget);
    setEtat({ message: '✓ Charges enregistrées pour ' + ok.length + ' agence' + (ok.length > 1 ? 's' : '') + '.', ko });
    if (agenceOuverte && ok.includes(agenceOuverte) && onImporte) onImporte();
  }

  return (
    <div className="card" data-testid="classeur-charges" style={{ marginBottom: 16 }}>
      <h2 style={{ marginBottom: 8 }}>Classeur des charges du réseau</h2>
      <p className="hint" style={{ margin: '0 0 12px' }}>
        Préparez les charges de <b>toutes les agences et structures</b> dans un seul fichier Excel : une ligne par poste, une colonne par agence.
        Le classeur est pré-rempli avec ce qui est déjà saisi dans SOMA ; à l'import, SOMA vous montre les changements par agence avant d'enregistrer.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={telecharger}>⬇ Télécharger le classeur</button>
        <button className="secondary" onClick={() => input.current && input.current.click()}>⬆ Importer le classeur</button>
        <input ref={input} type="file" accept=".xlsx,.xls" data-testid="classeur-input" style={{ display: 'none' }} onChange={importer} />
      </div>
      <div data-testid="classeur-apercu" style={{ marginTop: 12 }}>
        {etat && etat.lecture ? <div className="hint">{etat.ecriture ? 'Enregistrement…' : 'Lecture du classeur…'}</div> : null}
        {etat && etat.message ? (
          <>
            <div style={{ color: etat.erreur ? 'var(--red)' : 'var(--green, #2e7d6f)', fontSize: 13 }}>{etat.message}</div>
            {etat.ko && etat.ko.length ? <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 6 }}>Échec : {etat.ko.join(', ')}</div> : null}
          </>
        ) : null}
        {etat && etat.aEcrire ? (
          <>
            {etat.erreurs.length ? (
              <div style={{ color: 'var(--orange, #c45300)', fontSize: 13, marginBottom: 8 }}>
                <b>⚠ {etat.erreurs.length} point{etat.erreurs.length > 1 ? 's' : ''} ignoré{etat.erreurs.length > 1 ? 's' : ''} :</b>
                <ul style={{ margin: '4px 0 0 18px' }}>{etat.erreurs.slice(0, 15).map((e) => <li key={e}>{e}</li>)}{etat.erreurs.length > 15 ? <li>…</li> : null}</ul>
              </div>
            ) : null}
            {etat.avert.length ? <div style={{ color: 'var(--ink65)', fontSize: 12, marginBottom: 8 }}>{etat.avert.map((e) => <div key={e}>• {e}</div>)}</div> : null}
            {!etat.aEcrire.length ? <div className="hint">Aucun changement par rapport à SOMA.</div> : (
              <>
                <table style={{ fontSize: 13, maxWidth: 640 }}>
                  <thead><tr><th>Agence / structure</th><th>Postes modifiés</th><th>Statut</th></tr></thead>
                  <tbody>
                    {etat.aEcrire.map((l) => (
                      <tr key={l.nom}><td>{l.nom}</td><td className="num">{l.nbPostes}</td><td>{l.nouveau ? 'budget créé' : <span className={'statut ' + l.statut}>{statutLabel(l.statut)}</span>}</td></tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <button onClick={valider}>Enregistrer ces charges ({etat.aEcrire.length} agence{etat.aEcrire.length > 1 ? 's' : ''})</button>
                  <button className="secondary" onClick={() => setEtat(null)}>Annuler</button>
                </div>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
