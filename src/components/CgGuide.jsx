import { useEffect, useState } from 'react';
import { useNav } from '../context/NavContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { loadBudgetsForValidation, loadAffectationData } from '../lib/budgetApi.js';
import { agencesOps } from '../config/agences.js';
import { CG_PARCOURS, cgEtapeDe, cgEtatReseau, premiereEtapeAFaire } from '../domain/cgParcours.js';
import { setAideCible } from '../domain/faq.js';

// Guide pas à pas du contrôleur de gestion : un encadré en haut de chaque écran du
// parcours (étape, quoi faire, comment, quand c'est terminé, attention, navigation),
// et le parcours complet sur le Tableau de bord.

let _cache = null, _cacheT = 0;
const _abonnes = new Set();
// Après un enregistrement (Données agences, variables, affectation) : l'état est
// rechargé et tous les encadrés affichés se mettent à jour.
export function invaliderEtatCG() { _cache = null; _abonnes.forEach((f) => f()); }
async function chargerEtat(profile, force) {
  if (!force && _cache && Date.now() - _cacheT < 8000) return _cache;
  const [{ budgets }, { drs, agMap }] = await Promise.all([loadBudgetsForValidation(profile), loadAffectationData()]);
  _cache = cgEtatReseau(budgets, agMap, drs, agencesOps());
  _cacheT = Date.now();
  return _cache;
}
function useEtatReseau(force, cle) {
  const { profile } = useAuth();
  const [etat, setEtat] = useState(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const f = () => setVersion((v) => v + 1);
    _abonnes.add(f);
    return () => { _abonnes.delete(f); };
  }, []);
  useEffect(() => {
    let on = true;
    chargerEtat(profile, force).then((e) => { if (on) setEtat(e); }).catch(() => { if (on) setEtat(false); });
    return () => { on = false; };
  }, [profile, force, cle, version]);
  return etat;
}

function lireFerme(panel) { try { return localStorage.getItem('somaGuideCG_' + panel) === 'ferme'; } catch (e) { return false; } }
function ecrireFerme(panel, ferme) { try { localStorage.setItem('somaGuideCG_' + panel, ferme ? 'ferme' : 'ouvert'); } catch (e) { /* stockage indisponible */ } }

function Chip({ st }) {
  if (!st) return <span className="cgGuideChip info">…</span>;
  const cls = st.ok === true ? 'ok' : st.ok === false ? 'todo' : 'info';
  return <span className={'cgGuideChip ' + cls}>{st.ok === true ? '✓ ' : ''}{st.txt}</span>;
}

export default function CgGuide({ panel, cle }) {
  const navigate = useNav();
  const step = cgEtapeDe(panel);
  const etat = useEtatReseau(false, cle);
  const [ouvert, setOuvert] = useState(() => !lireFerme(panel));
  useEffect(() => { setOuvert(!lireFerme(panel)); }, [panel]);
  if (!step) return null;
  const prev = CG_PARCOURS[step.n - 2], next = CG_PARCOURS[step.n];
  const toggle = () => { const o = !ouvert; setOuvert(o); ecrireFerme(panel, !o); };
  const aide = () => { setAideCible(step.aide); navigate('aide'); };

  return (
    <div className="cgGuide" data-panel={panel}>
      <div className={'cgGuideDetails' + (ouvert ? ' open' : '')}>
        <button type="button" className="cgGuideSummary" onClick={toggle} aria-expanded={ouvert}>
          <span className="cgGuideNum">Étape {step.n} / {CG_PARCOURS.length}</span> <b>{step.titre}</b>{' '}
          {etat === false ? null : <Chip st={etat ? step.etat(etat) : null} />}
          <span className="cgGuideCaret">{ouvert ? '▾' : '▸'}</span>
        </button>
        {ouvert ? (
          <div className="cgGuideBody">
            <p className="cgGuideQuoi">{step.quoi}</p>
            <div className="cgGuideCols">
              <div>
                <div className="cgGuideLbl">Comment faire</div>
                <ol>{step.comment.map((c, i) => <li key={i} dangerouslySetInnerHTML={{ __html: c }} />)}</ol>
              </div>
              <div>
                <div className="cgGuideLbl">C'est terminé quand…</div>
                <p>{step.fini}</p>
                {step.vigilance.length ? <><div className="cgGuideLbl">Attention</div><ul>{step.vigilance.map((v, i) => <li key={i}>{v}</li>)}</ul></> : null}
              </div>
            </div>
            <div className="cgGuideNav">
              {prev
                ? <button className="secondary" onClick={() => navigate(prev.panel)}>← {prev.n}. {prev.titre}</button>
                : <button className="secondary" onClick={() => navigate('cgdash')}>← Parcours</button>}
              <button className="secondary" onClick={aide}>? Aide détaillée</button>
              {next
                ? <button className="cgGuideNext" onClick={() => navigate(next.panel)}>{next.n}. {next.titre} →</button>
                : <button className="cgGuideNext" onClick={() => navigate('cgdash')}>Retour au parcours</button>}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Tableau de bord : le parcours complet, avec l'état de chaque étape
export function CgParcours() {
  const navigate = useNav();
  const etat = useEtatReseau(true);
  if (etat === null) return <div className="cgParcours"><div className="cgGuideLbl">Votre parcours de préparation</div><p className="hint">Chargement…</p></div>;
  const premiere = etat ? premiereEtapeAFaire(etat) : null;
  return (
    <div className="cgParcours">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <div className="cgGuideLbl" style={{ margin: 0 }}>Votre parcours en {CG_PARCOURS.length} étapes</div>
        {premiere
          ? <button className="cgGuideNext" onClick={() => navigate(premiere.panel)}>Reprendre : {premiere.n}. {premiere.titre} →</button>
          : etat ? <span className="cgGuideChip ok">✓ Tout est en place</span> : null}
      </div>
      <ol className="cgParcoursList">
        {CG_PARCOURS.map((s) => {
          const st = etat ? s.etat(etat) : null;
          const cls = st && st.ok === true ? 'fait' : (premiere && premiere.n === s.n ? 'courant' : '');
          return (
            <li key={s.n} className={cls} onClick={() => navigate(s.panel)}>
              <span className="cgParcoursN">{st && st.ok === true ? '✓' : s.n}</span>
              <span className="cgParcoursT"><b>{s.titre}</b><br /><span>{s.quoi}</span></span>
              {st ? <Chip st={st} /> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
