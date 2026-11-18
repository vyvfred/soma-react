import TexteLectureSeule from '../TexteLectureSeule.jsx';
import { champSaisiDR } from '../../domain/saisiesDR.js';
import { partRoulant, estRoulantPart } from '../../domain/calculations.js';
import { useRef, useState } from 'react';
import { VERSIONS, VERSION_LABELS } from '../../domain/versions.js';
import { useBudget } from '../../context/BudgetContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { teamInsight, etpParMois } from '../../domain/teamInsight.js';
import { isRoulant, M } from '../../domain/calculations.js';
import { parseEquipe } from '../../domain/imports.js';
import { TRIS_EQUIPE, majOrdreEquipe } from '../../domain/triEquipe.js';
import { lireClasseur } from '../../lib/importExcel.js';
import { etatConges, rafraichirConges } from '../../domain/rafraichirConges.js';
import { repartirCPAuto } from '../../domain/repartitionCP.js';

const QUALS = ['DEA', 'AA', 'TAXI', 'TPMR', 'REGULATEUR', 'REX'];
const CONTRACTS = ['CDI', 'CDD', 'APPRENTI', 'INTERIM'];
const NUM_FIELDS = ['hours', 'hoursM', 'hsTarget', 'pctRoulant', 'joursSem', 'coutJour'];

const th = { textAlign: 'left', fontSize: 11, color: 'var(--ink65)', padding: '6px 8px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
const td = { padding: '4px 8px', borderBottom: '1px solid var(--border)' };

// Info-bulles des colonnes (reprises verbatim du mono-fichier)
const AIDE_COLONNES = {
  'Qualif.': 'DEA = ambulancier diplômé, AA = auxiliaire, TAXI = chauffeur taxi, TPMR = transport PMR. Ces qualifications sont roulantes. REGULATEUR et REX sont non-roulants.',
  'H. base': 'Heures travaillées par semaine. Ex : 35h pour un temps plein, 17,5h pour un mi-temps.',
  '% roul.': 'Part du temps passée en roulant (sur la route). 100% pour un ambulancier à temps plein roulant. Pour un salarié partagé, indiquez sa part roulante : par exemple 50% pour une personne mi-roulant, mi-régulation. Le reste est compté comme improductif. Vaut aussi pour un régulateur ou un REX qui roule une partie de son temps (0 % = ne roule pas) : sa part roulante compte dans les heures et les ETP roulants.',
  'Entrée 2027': 'Date d\'arrivée en 2027. Laissez vide si la personne est déjà présente au 1er janvier.',
  'Sortie 2027': 'Date de départ en 2027 (fin de CDD, retraite...). Laissez vide si la personne reste toute l\'année.',
  'ETP': 'Équivalent temps plein : heures ÷ 35. Un temps plein = 1 ETP.'
};

export default function EquipeScreen() {
  const { agency: a, loading, error, editable, update, agenceNom, activeVersion, versionsRemplies, reprendreVersion } = useBudget();
  const [repriseMsg, setRepriseMsg] = useState(null);
  const { profile } = useAuth();
  // Import Excel de la liste du personnel : réservé au contrôle de gestion et à l'administration (pas aux REX)
  const peutImporter = !!profile && ['cg', 'admin'].includes(profile.role);
  const fichier = useRef(null);
  const [importMsg, setImportMsg] = useState(null);
  // Tri d'affichage (mémorisé sur ce navigateur) ; l'ordre est figé pendant la saisie
  const [tri, setTriEtat] = useState(() => { try { return localStorage.getItem('soma.triEquipe') || 'saisie'; } catch (e) { return 'saisie'; } });
  const etatTri = useRef(null);
  const setTri = (t) => { setTriEtat(t); etatTri.current = null; try { localStorage.setItem('soma.triEquipe', t); } catch (e) { /* stockage indisponible */ } };

  if (!agenceNom) return <div className="card"><h2>Équipe</h2><p className="hint">Aucune agence n'est rattachée à votre profil.</p></div>;
  if (loading) return <div className="card"><h2>Équipe</h2><p className="hint">Chargement du budget…</p></div>;
  if (error) return <div className="card"><h2>Équipe</h2><p className="hint">Impossible de charger le budget : {error}</p></div>;
  if (!a) return <div className="card"><h2>Équipe — {agenceNom}</h2><p className="hint">Budget non commencé pour cette agence.</p></div>;

  const sourcesEquipe = VERSIONS.filter((v) => v !== activeVersion && versionsRemplies && versionsRemplies[v]);
  etatTri.current = majOrdreEquipe(etatTri.current, a.employees, tri, agenceNom);
  const ordre = etatTri.current.ordre;
  const { nbSal, etpTotal, capaciteAn, phrase } = teamInsight(a);
  const evolution = etpParMois(a);

  // Import Excel de l'équipe (port de handleExcelImport) : feuille « Saisie personnel »
  async function importer(e) {
    if (!peutImporter) return;
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { rows } = await lireClasseur(file, (noms) => noms.find((n) => n.toLowerCase().includes('saisie')));
      const r = parseEquipe(rows);
      if (r.erreur) { setImportMsg({ ok: false, t: r.erreur }); return; }
      if (!r.employees.length) { setImportMsg({ ok: false, t: 'Aucun salarié trouvé. Vérifiez le fichier.' }); return; }
      if (a.employees.length > 0 && !window.confirm(r.employees.length + ' salariés trouvés. Remplacer la liste existante ?')) return;
      majEquipe((d) => { d.employees = r.employees; return d; });
      setImportMsg({ ok: true, t: r.employees.length + ' salariés importés !' + (r.ignores ? ' (' + r.ignores + ' facturier(s) ignoré(s))' : '') });
    } catch (err) {
      setImportMsg({ ok: false, t: 'Erreur de lecture : ' + (err.message || err) });
    }
  }

  // Toute modification de l'équipe peut changer les congés acquis : les répartitions de CP sont remises à jour
  // (copie de la présence et des CP non-roulants avant de les modifier, l'état précédent reste intact pour l'annulation).
  function majEquipe(fn) {
    update((draft) => {
      const av = etatConges(draft);
      fn(draft);
      const d = { ...draft, presence: Object.fromEntries(Object.entries(draft.presence || {}).map(([k, v]) => [k, { ...v }])), cpNR: draft.cpNR ? { ...draft.cpNR } : draft.cpNR };
      rafraichirConges(d, av, repartirCPAuto);
      return d;
    });
  }
  // Mutations — reproduisent setEmp / delEmp / addEmployee / setDR de l'app actuelle.
  function setEmp(i, field, value) {
    majEquipe((draft) => {
      const emps = draft.employees.slice();
      const e = { ...emps[i] };
      const avantRoulant = isRoulant(e.qual);
      e[field] = NUM_FIELDS.includes(field) ? +value : value;
      // Changement de famille de qualification : % roulant remis à sa valeur par défaut (100 % roulant, 0 % sinon)
      if (field === 'qual' && isRoulant(value) !== avantRoulant) e.pctRoulant = isRoulant(value) ? 100 : 0;
      if (field === 'name') e.nom = value;
      if (field === 'contract') e.contrat = value;
      if ((field === 'dateEntree' || field === 'dateSortie') && e.dateEntree && e.dateSortie && e.dateSortie < e.dateEntree) {
        alert('Attention : la date de sortie (' + e.dateSortie + ') est antérieure à la date d\'entrée (' + e.dateEntree + '). Ce salarié ne sera compté sur aucune semaine. Corrigez les dates.');
      }
      emps[i] = e;
      draft.employees = emps;
      return draft;
    });
  }
  function delEmp(i) {
    majEquipe((draft) => { draft.employees = draft.employees.filter((_, idx) => idx !== i); return draft; });
  }
  function addEmployee() {
    majEquipe((draft) => {
      draft.employees = draft.employees.concat({ name: 'Nouveau salarié', qual: 'DEA', contract: 'CDI', hours: 35, hoursM: 0, hsTarget: 3, pctRoulant: 100, joursSem: 5, coutJour: 0, dateEntree: '', dateSortie: '' });
      return draft;
    });
  }
  function addPoste() {
    majEquipe((draft) => {
      draft.employees = draft.employees.concat({ name: 'Poste prévisionnel', qual: 'DEA', contract: 'CDD', hours: 35, hoursM: 0, hsTarget: 3, pctRoulant: 100, joursSem: 5, coutJour: 0, dateEntree: '2027-06-01', dateSortie: '2027-09-30' });
      return draft;
    });
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: 14 }}>Équipe — {agenceNom}</h2>

      {editable && !a.employees.length && sourcesEquipe.length ? (
        <div data-testid="equipe-vide" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14, padding: '12px 14px', border: '1px solid var(--orange)', background: 'var(--orange-light, rgba(196,83,0,.10))', fontSize: 13 }}>
          <span style={{ flex: 1, minWidth: 220 }}>⚠ Cette version ({VERSION_LABELS[activeVersion]}) ne contient aucun salarié.</span>
          {sourcesEquipe.map((v) => (
            <button key={v} data-testid={'equipe-reprendre-' + v} style={{ width: 'auto', margin: 0 }}
              onClick={async () => { const r = await reprendreVersion(v, ['equipe']); setRepriseMsg(r.message); }}>Reprendre l'équipe de la {VERSION_LABELS[v]}</button>
          ))}
        </div>
      ) : null}
      {repriseMsg ? <p className="hint" data-testid="equipe-reprise-msg" style={{ marginTop: -6 }}>{repriseMsg}</p> : null}

      <div className="teamKpiRow" style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        <Kpi label="Salariés" value={nbSal} sub={nbSal > 1 ? 'personnes' : 'personne'} />
        <Kpi label="Effectif" value={etpTotal.toFixed(1) + ' ETP'} sub="équivalent temps plein" />
        <Kpi label="Capacité" value={capaciteAn > 0 ? capaciteAn.toLocaleString('fr-FR') + ' h' : '—'} sub="heures / an" />
      </div>

      <div style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink65)', marginBottom: 16 }}
        dangerouslySetInnerHTML={{ __html: phrase }} />

      {!editable ? (
        <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--blue-light, rgba(61,111,214,.10))', border: '1px solid var(--blue2, #3d6fd6)', fontSize: 13, color: 'var(--blue2, #3d6fd6)' }}>
          <TexteLectureSeule />
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12, color: 'var(--ink65)' }}>
        <label htmlFor="tri-equipe" style={{ margin: 0 }}>Trier par</label>
        <select id="tri-equipe" data-testid="tri-equipe" value={tri} onChange={(ev) => setTri(ev.target.value)} style={{ width: 'auto', fontSize: 12 }}>
          {TRIS_EQUIPE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {tri !== 'saisie' ? <span style={{ fontSize: 11 }}>Un salarié ajouté apparaît en bas jusqu'au prochain tri.</span> : null}
      </div>
      <div data-visite="equipe" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Nom', 'Qualif.', 'Contrat', 'H. base', '% roul.', 'Jours/sem', 'Entrée 2027', 'Sortie 2027', 'ETP', ''].map((h, i) => (
                <th key={i} style={h === 'Nom' ? { ...th, cursor: 'pointer' } : th} data-testid={h === 'Nom' ? 'th-nom' : undefined} title={h === 'Nom' ? 'Trier par nom' : undefined}
                  onClick={h === 'Nom' ? () => setTri(tri === 'nomAZ' ? 'nomZA' : 'nomAZ') : undefined}>{h}{h === 'Nom' ? (tri === 'nomAZ' ? ' ▲' : tri === 'nomZA' ? ' ▼' : ' ⇅') : ''}{AIDE_COLONNES[h] ? <span className="aide-info">i<span className="aide-tip">{AIDE_COLONNES[h]}</span></span> : null}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordre.map((i) => {
              const e = a.employees[i];
              const nom = e.name || e.nom || '';
              const contrat = e.contract || e.contrat || 'CDI';
              const roul = isRoulant(e.qual) || estRoulantPart(e);
              const etp = roul ? ((+e.hours || 0) * partRoulant(e) / 35).toFixed(2) : '—';
              const isCddSais = contrat === 'CDD' && (e.dateEntree || e.dateSortie);
              return (
                <tr key={i}>
                  <td style={td}>
                    <input data-saisie-dr={champSaisiDR(e, 'name') ? '1' : undefined} type="text" value={nom} disabled={!editable} onChange={(ev) => setEmp(i, 'name', ev.target.value)} style={{ width: 150 }} />
                    {isCddSais ? <span style={{ fontSize: 9, background: 'var(--orange, #c45300)', color: '#fff', padding: '1px 4px', marginLeft: 4 }}>CDD</span> : null}
                  </td>
                  <td style={td}>
                    <select data-saisie-dr={champSaisiDR(e, 'qual') ? '1' : undefined} value={e.qual} disabled={!editable} onChange={(ev) => setEmp(i, 'qual', ev.target.value)} style={{ width: 90 }}>
                      {QUALS.map((q) => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </td>
                  <td style={td}>
                    <select data-saisie-dr={champSaisiDR(e, 'contract') ? '1' : undefined} value={contrat} disabled={!editable} onChange={(ev) => setEmp(i, 'contract', ev.target.value)} style={{ width: 74 }}>
                      {CONTRACTS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td style={td}><input data-saisie-dr={champSaisiDR(e, 'hours') ? '1' : undefined} type="number" value={e.hours || 0} disabled={!editable} onChange={(ev) => setEmp(i, 'hours', ev.target.value)} style={{ width: 60 }} /></td>
                  <td style={td}><input data-saisie-dr={champSaisiDR(e, 'pctRoulant') ? '1' : undefined} type="number" value={Math.round(partRoulant(e) * 100)} min="0" max="100" disabled={!editable} onChange={(ev) => setEmp(i, 'pctRoulant', ev.target.value)} style={{ width: 55 }} />%</td>
                  <td style={td}><input data-saisie-dr={champSaisiDR(e, 'joursSem') ? '1' : undefined} type="number" value={e.joursSem || 5} min="1" max="7" disabled={!editable} onChange={(ev) => setEmp(i, 'joursSem', ev.target.value)} style={{ width: 50 }} /></td>
                  <td style={td}><input data-saisie-dr={champSaisiDR(e, 'dateEntree') ? '1' : undefined} type="date" value={e.dateEntree || ''} min="2027-01-01" max="2027-12-31" disabled={!editable} onChange={(ev) => setEmp(i, 'dateEntree', ev.target.value)} style={{ width: 140, fontSize: 11 }} /></td>
                  <td style={td}><input data-saisie-dr={champSaisiDR(e, 'dateSortie') ? '1' : undefined} type="date" value={e.dateSortie || ''} min="2027-01-01" max="2027-12-31" disabled={!editable} onChange={(ev) => setEmp(i, 'dateSortie', ev.target.value)} style={{ width: 140, fontSize: 11 }} /></td>
                  <td style={{ ...td, textAlign: 'right' }} className="num">{etp}</td>
                  <td style={td}>
                    <button className="danger" disabled={!editable} onClick={() => delEmp(i)} style={{ padding: '4px 8px', fontSize: 11 }}>✕</button>
                  </td>
                </tr>
              );
            })}
            <tr style={{ background: 'var(--blue-light, rgba(61,111,214,.10))' }}>
              <td colSpan={10} style={{ ...td, fontSize: 12 }}>
                La masse salariale des non-roulants (régulateurs, responsables, quote-part du DR) est saisie en une ligne globale par le contrôleur de gestion.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {editable ? (
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={addEmployee}>+ Ajouter un salarié</button>
          <button className="secondary" onClick={addPoste}>+ Poste prévisionnel (CDD saisonnier)</button>
          {peutImporter ? <button className="secondary" data-testid="importer-equipe" onClick={() => fichier.current && fichier.current.click()}>📥 Importer depuis Excel</button> : null}
          {peutImporter ? <input ref={fichier} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={importer} data-testid="fichier-equipe" /> : null}
          {importMsg ? <span data-testid="equipe-import-msg" style={{ fontSize: 13, color: importMsg.ok ? 'var(--green, #2e7d6f)' : 'var(--orange, #c45300)' }}>{importMsg.t}</span> : null}
        </div>
      ) : null}

      {evolution ? (
        <details className="objCollapse" style={{ marginTop: 16 }} data-testid="evolution-effectif">
          <summary>Évolution de l'effectif dans l'année</summary>
          <div className="objCollapseBody">
            <p className="hint" style={{ marginBottom: 12 }}>Nombre d'ETP roulants présents chaque mois, selon les dates d'entrée et de sortie saisies.</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '0 8px' }}>
              {evolution.map((etp, m) => {
                const max = Math.max(...evolution, 1);
                return (
                  <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: 9, color: 'var(--ink65)', marginBottom: 2 }}>{etp.toFixed(0)}</div>
                    <div style={{ width: '100%', background: 'linear-gradient(to top,var(--violet),var(--violet2))', height: Math.round(etp / max * 100) + '%', minHeight: 2 }} />
                    <div style={{ fontSize: 9, color: 'var(--ink65)', marginTop: 3 }}>{M[m].slice(0, 3)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </details>
      ) : null}
    </div>
  );
}

function Kpi({ label, value, sub }) {
  return (
    <div className="teamKpi" style={{ flex: 1, minWidth: 140, padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
      <div className="teamKpiLabel" style={{ fontSize: 11, color: 'var(--ink65)' }}>{label}</div>
      <div className="teamKpiValue" style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      {sub ? <div className="teamKpiSub" style={{ fontSize: 11, color: 'var(--ink30)' }}>{sub}</div> : null}
    </div>
  );
}
