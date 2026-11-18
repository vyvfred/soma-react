import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { loadAgencyBudget, saveAgencyBudget, loadBudgetData, writeBudgetData, submitBudget } from '../lib/budgetApi.js';
import { appliquerRefCG, descriptionCopie } from '../domain/refCG.js';
import { marquerSaisiesDR } from '../domain/saisiesDR.js';
import { creerHistorique, viderHistorique, noterAvant, annulerHisto, retablirHisto } from '../domain/historique.js';
import { useAuth } from './AuthContext.jsx';
import { toast } from '../components/Toast.jsx';
import { journal } from '../lib/journalAppli.js';
import { reprendreBlocs, alerteRepriseBlocs, motifRefusSuppression, donneesSansVersion } from '../domain/blocsVersion.js';
import { estModifiable, cibleDuplication, agenceDeVersion, copieVersion, comparerVersions, VERSION_LABELS } from '../domain/versions.js';

// Contexte du budget en cours d'édition (pour le REX : son agence ; pour le CG :
// l'agence ouverte). Remplace l'état global + l'autosave silencieux de l'app actuelle,
// et porte la gestion des versions V1/V2/V3 et la soumission.

const BudgetContext = createContext(null);
const SAVE_DEBOUNCE_MS = 900;
const DEFAULT_META = () => ({ activeVersion: 'v1', submittedVersion: null, descriptions: { v1: '', v2: '', v3: '' } });

export function BudgetProvider({ agenceNom, lectureSeule = false, saisieDR = false, children }) {
  const [agency, setAgency] = useState(null);
  const [statut, setStatut] = useState('brouillon');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const saveStatusRef = useRef('idle');
  const [saveStatus, setSaveStatusEtat] = useState('idle'); // idle | saving | saved | error
  const setSaveStatus = (v) => { saveStatusRef.current = v; setSaveStatusEtat(v); };
  const [activeVersion, setActiveVersion] = useState('v1');
  const [meta, setMeta] = useState(DEFAULT_META());
  const [versionsRemplies, setVersionsRemplies] = useState({ v1: true });
  const [validation, setValidation] = useState(null);
  const [budgetId, setBudgetId] = useState(null);

  const budgetIdRef = useRef(null);
  const metaRef = useRef(null);
  const versionRef = useRef('v1');
  const timerRef = useRef(null);
  const inFlightRef = useRef(Promise.resolve()); // sérialise les sauvegardes
  const pendingRef = useRef(null);               // dernière agence modifiée non encore sauvegardée
  const agencyRef = useRef(null);
  // Annuler / rétablir : historique du budget ouvert (vidé au chargement, au changement de version
  // et quand des données arrivent d'ailleurs, pour ne jamais défaire le travail d'un autre)
  const histRef = useRef(creerHistorique());
  const snapTexteRef = useRef(null);
  const dernierEchecRef = useRef(null); // dernier motif d'échec de sauvegarde affiché // texte JSON de snapRef (comparaison rapide)
  const [histInfo, setHistInfo] = useState({ annuler: 0, retablir: 0 });
  const majHistInfo = useCallback(() => { const h = histRef.current; setHistInfo({ annuler: h.passe.length, retablir: h.futur.length }); }, []);
  const viderHisto = useCallback(() => { viderHistorique(histRef.current); queueMicrotask(majHistInfo); }, [majHistInfo]);
  // Dernier état connu, pour repérer ce que l'utilisateur vient de modifier (marques des saisies du DR)
  const snapRef = useRef(null);
  const { profile } = useAuth();
  const saisieCGRef = useRef(false);
  saisieCGRef.current = !!(profile && ['cg', 'admin'].includes(profile.role));
  // État chargé (ou dernier état enregistré) : point de départ de la fusion à l'enregistrement
  const baseRef = useRef(null);
  const metaBaseRef = useRef(null);
  agencyRef.current = agency;

  // statut lu via une ref pour ne pas recréer la fonction de sauvegarde
  const statutRef = useRef(statut);
  statutRef.current = statut;

  // Sauvegarde sérialisée : chaque enregistrement attend la fin du précédent,
  // ce qui garantit que budgetIdRef est connu avant un 2e appel (évite le double insert).
  const persist = useCallback((a) => {
    const run = async () => {
      await inFlightRef.current.catch(() => {});
      setSaveStatus('saving');
      try {
        const avant = baseRef.current;
        const res = await saveAgencyBudget({
          budgetId: budgetIdRef.current,
          activeVersion: versionRef.current,
          meta: metaRef.current,
          agency: a,
          base: avant,
          metaBase: metaBaseRef.current,
          saisieCG: saisieCGRef.current
        });
        const id = res.id;
        baseRef.current = JSON.parse(JSON.stringify(res.version));
        metaBaseRef.current = JSON.parse(JSON.stringify(res.meta || metaRef.current || {}));
        // Rubriques enregistrées entre-temps par quelqu'un d'autre : reportées à l'écran
        // (sauf si l'utilisateur vient lui-même de les modifier)
        if (res.distantes && res.distantes.length && avant) {
          const J = (v) => JSON.stringify(v);
          const patch = (prev) => {
            if (!prev) return prev;
            const next = { ...prev };
            res.distantes.forEach((k) => { if (J(prev[k]) === J(avant[k])) next[k] = JSON.parse(JSON.stringify(res.version[k] === undefined ? null : res.version[k])); });
            return next;
          };
          snapRef.current = null; viderHistorique(histRef.current); queueMicrotask(majHistInfo);
          setAgency((prev) => { const n = patch(prev); if (pendingRef.current) pendingRef.current = patch(pendingRef.current); return n; });
          toast('Budget mis à jour avec les modifications enregistrées par un autre utilisateur', 'info');
        }
        budgetIdRef.current = id;
        setBudgetId(id);
        pendingRef.current = null;
        setVersionsRemplies((p) => ({ ...p, [versionRef.current]: true }));
        setSaveStatus('saved');
        journal.noterSaisie();
      } catch (err) {
        setSaveStatus('error');
        // Échec visible pour tous les profils (le DR n'a pas l'indicateur de sauvegarde), une fois par motif
        const motif = (err && (err.message || err.code || err.details)) || 'raison inconnue';
        if (dernierEchecRef.current !== motif) { dernierEchecRef.current = motif; toast('Modifications NON enregistrées : ' + motif, 'error'); }
        return;
      }
      dernierEchecRef.current = null;
    };
    const p = run();
    inFlightRef.current = p;
    return p;
  }, []);

  // Enregistre tout de suite ce qui est en attente (avant un changement de version, une soumission…)
  const flush = useCallback(async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (pendingRef.current) await persist(pendingRef.current);
    else await inFlightRef.current.catch(() => {});
  }, [persist]);

  // Fermeture ou changement d'onglet : enregistrement immédiat de ce qui attend, et avertissement du
  // navigateur si la page se ferme avec une modification pas encore enregistrée
  useEffect(() => {
    const enAttente = () => !!pendingRef.current || saveStatusRef.current === 'saving';
    const cache = () => { if (document.visibilityState === 'hidden' && pendingRef.current) flush(); };
    const avantFermeture = (e) => { if (!enAttente()) return undefined; flush(); e.preventDefault(); e.returnValue = ''; return ''; };
    document.addEventListener('visibilitychange', cache);
    window.addEventListener('beforeunload', avantFermeture);
    return () => { document.removeEventListener('visibilitychange', cache); window.removeEventListener('beforeunload', avantFermeture); };
  }, [flush]);

  // Sauvegarde manuelle : enregistre l'état courant même sans modification en attente
  const saveNow = useCallback(async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const a = pendingRef.current || agencyRef.current;
    if (a) await persist(a);
  }, [persist]);

  // Rechargement demandé (ex. charges importées par le classeur réseau)
  const [jetonChargement, setJetonChargement] = useState(0);
  const recharger = useCallback(() => setJetonChargement((n) => n + 1), []);

  // Chargement initial (et rechargement au changement d'agence).
  useEffect(() => {
    let active = true;
    if (!agenceNom) { setLoading(false); setAgency(null); return; }
    setLoading(true); setError(null);
    loadAgencyBudget(agenceNom)
      .then((res) => {
        if (!active) return;
        // En consultation, le valideur voit la version soumise (celle qu'il valide)
        const sv = res.meta && res.meta.submittedVersion;
        // Budget en validation : tout le monde ouvre la version officielle
        if ((lectureSeule || !estModifiable(res.statut)) && sv && sv !== res.activeVersion && res.data && res.data.versions && res.data.versions[sv]) {
          res.agency = agenceDeVersion(agenceNom, res.data, sv);
          res.activeVersion = sv;
        }
        setAgency(res.agency);        snapRef.current = null; viderHisto();
        // Point de départ de la fusion : l'état tel que chargé (null si le budget n'existe pas encore)
        // = la version BRUTE lue en base (avant les compléments par défaut de migrateAgency) :
        // sinon ces compléments passeraient pour des modifications faites par quelqu'un d'autre.
        const brute = res.data && res.data.versions ? res.data.versions[res.activeVersion] : null;
        baseRef.current = res.budgetId && brute ? JSON.parse(JSON.stringify(brute)) : null;
        metaBaseRef.current = res.meta ? JSON.parse(JSON.stringify(res.meta)) : null;
        setStatut(res.statut);
        budgetIdRef.current = res.budgetId;
        setBudgetId(res.budgetId);
        const m = res.meta || DEFAULT_META();
        if (!m.descriptions) m.descriptions = { v1: '', v2: '', v3: '' };
        metaRef.current = m;
        setMeta({ ...m });
        versionRef.current = res.activeVersion || 'v1';
        setActiveVersion(versionRef.current);
        const vs = (res.data && res.data.versions) || {};
        setVersionsRemplies({ v1: !!vs.v1 || !res.data, v2: !!(vs.v2 && Object.keys(vs.v2).length), v3: !!(vs.v3 && Object.keys(vs.v3).length) });
        setValidation(res.validation || null);
        setLoading(false);
      })
      .catch((err) => { if (active) { setError(err.message || 'Erreur de chargement'); setLoading(false); } });
    return () => {
      active = false;
      // Flush : si une édition est en attente, la sauvegarder avant de changer d'agence
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        if (pendingRef.current) persist(pendingRef.current);
      }
    };
  }, [agenceNom, jetonChargement, persist, lectureSeule]);

  // Un budget n'est modifiable qu'en brouillon, refusé ou complément demandé
  const editable = !lectureSeule && estModifiable(statut);

  const update = useCallback((mutator) => {
    if (!editable) return;
    setAgency((prev) => {
      if (!prev) return prev;
      if (!snapRef.current) { snapTexteRef.current = JSON.stringify(prev); snapRef.current = JSON.parse(snapTexteRef.current); }
      const avant = snapRef.current, avantTexte = snapTexteRef.current;
      const h = histRef.current, n0 = h.passe.length, d0 = h.dernier, f0 = h.futur;
      noterAvant(h, avant, Date.now());
      const next = mutator({ ...prev });
      marquerSaisiesDR(avant, next, saisieDR);
      const texte = JSON.stringify(next);
      snapRef.current = JSON.parse(texte); snapTexteRef.current = texte;
      // Pas une action à annuler si rien n'a changé, ou seulement le mois ouvert (simple comparaison de textes)
      const sansEffet = texte === avantTexte || (next.moisActif !== avant.moisActif && JSON.stringify({ ...next, moisActif: avant.moisActif }) === avantTexte);
      if (sansEffet) { h.passe.length = n0; h.dernier = d0; h.futur = f0; }
      pendingRef.current = next;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => persist(next), SAVE_DEBOUNCE_MS);
      return next;
    });
    queueMicrotask(majHistInfo);
  }, [persist, editable, saisieDR, majHistInfo]);

  // Remet un état de l'historique (copie : les états gardés ne sont jamais modifiés) et l'enregistre
  const appliquerEtat = useCallback((etat) => {
    const t = JSON.stringify(etat);
    const copie = JSON.parse(t);
    snapRef.current = JSON.parse(t); snapTexteRef.current = t;
    pendingRef.current = copie;
    setAgency(copie);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => persist(copie), SAVE_DEBOUNCE_MS);
    majHistInfo();
  }, [persist, majHistInfo]);
  const etatCourant = () => snapRef.current || JSON.parse(JSON.stringify(agencyRef.current));
  const annuler = useCallback(() => {
    if (!editable || !agencyRef.current) return false;
    const x = annulerHisto(histRef.current, etatCourant());
    if (!x) return false;
    appliquerEtat(x);
    return true;
  }, [editable, appliquerEtat]);
  const retablir = useCallback(() => {
    if (!editable || !agencyRef.current) return false;
    const x = retablirHisto(histRef.current, etatCourant());
    if (!x) return false;
    appliquerEtat(x);
    return true;
  }, [editable, appliquerEtat]);

  // Raccourcis clavier : Ctrl+Z (Cmd+Z) annule, Ctrl+Y ou Ctrl+Maj+Z rétablit
  useEffect(() => {
    const f = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const k = (e.key || '').toLowerCase();
      const redo = k === 'y' || (k === 'z' && e.shiftKey);
      if (k !== 'z' && k !== 'y') return;
      if (!agencyRef.current || !editable) return;
      e.preventDefault();
      // le champ en cours de frappe est relâché, pour afficher la valeur remise
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      const fait = redo ? retablir() : annuler();
      toast(fait ? (redo ? 'Modification rétablie' : 'Modification annulée') : (redo ? 'Rien à rétablir' : 'Rien à annuler'), 'info');
    };
    document.addEventListener('keydown', f);
    return () => document.removeEventListener('keydown', f);
  }, [annuler, retablir, editable]);

  // Données écrites par le CG pendant que l'agence est ouverte : mises à jour en mémoire,
  // sinon la sauvegarde automatique suivante réécrirait l'ancienne version.
  // brut = true : simple remplacement de champs (ex. équipe importée), sans verrou CG.
  const applyExternal = useCallback((nom, data, brut = false) => {
    if (!nom || nom !== agenceNom) return;
    snapRef.current = null; viderHisto();
    setAgency((prev) => {
      if (!prev) return prev;
      const next = brut ? { ...prev, ...data } : appliquerRefCG({ ...prev }, data);
      if (pendingRef.current) pendingRef.current = next;
      return next;
    });
  }, [agenceNom]);

  // ── Versions ────────────────────────────────────────────────────
  const majMeta = useCallback((m) => { metaRef.current = m; setMeta({ ...m }); }, []);

  // Bascule vers une autre version (la version courante est d'abord enregistrée)
  const switchVersion = useCallback(async (v) => {
    if (v === versionRef.current) return null;
    await flush();
    if (!budgetIdRef.current) return null;
    const { data } = await loadBudgetData(budgetIdRef.current);
    const a = agenceDeVersion(agenceNom, data, v);
    versionRef.current = v;
    setActiveVersion(v);
    majMeta({ ...(metaRef.current || DEFAULT_META()), activeVersion: v });
    snapRef.current = null; viderHisto();    setAgency(a);
    const remplie = !!(data.versions && data.versions[v] && Object.keys(data.versions[v]).length);
    baseRef.current = remplie ? JSON.parse(JSON.stringify(data.versions[v])) : null;
    metaBaseRef.current = data.meta ? JSON.parse(JSON.stringify(data.meta)) : null;
    return remplie
      ? 'Version ' + VERSION_LABELS[v] + ' active'
      : 'Version ' + VERSION_LABELS[v] + ' vide : paramétrage du CG, charges et équipe repris, le reste est à construire — ou dupliquez une autre version';
  }, [agenceNom, flush, majMeta]);

  // Duplique la version active vers la première version libre et bascule dessus
  const duplicateVersion = useCallback(async () => {
    if (!editable) return { ok: false, message: 'Budget en validation : les versions ne peuvent plus être modifiées' };
    await flush();
    if (!budgetIdRef.current) return { ok: false, message: 'Le budget doit d\'abord être enregistré.' };
    const { data } = await loadBudgetData(budgetIdRef.current);
    const source = versionRef.current;
    const cible = cibleDuplication(data, source);
    if (!cible) return { ok: false, message: 'Les 3 versions sont déjà utilisées. Videz-en une ou modifiez une version existante.' };
    const versions = { ...(data.versions || {}), [cible]: copieVersion(agencyRef.current) };
    const m = { ...(metaRef.current || DEFAULT_META()) };
    m.descriptions = { ...(m.descriptions || {}), [cible]: descriptionCopie(m.descriptions && m.descriptions[source], VERSION_LABELS[source]) };
    m.activeVersion = cible;
    const out = { ...data, versions, meta: m };
    await writeBudgetData(budgetIdRef.current, out);
    baseRef.current = JSON.parse(JSON.stringify(versions[cible]));
    metaBaseRef.current = JSON.parse(JSON.stringify(m));
    versionRef.current = cible;
    setActiveVersion(cible);
    majMeta(m);
    setVersionsRemplies((p) => ({ ...p, [cible]: true }));
    return { ok: true, cible, message: 'Version ' + VERSION_LABELS[cible] + ' créée à partir de ' + VERSION_LABELS[source] };
  }, [flush, majMeta, editable]);

  // Reprend dans la version active des blocs (équipe, objectif, présence, charges) d'une autre version.
  // Passe par update() : annulable (↶) et enregistré automatiquement.
  const reprendreVersion = useCallback(async (source, ids, confirmer) => {
    if (!editable) return { ok: false, message: 'Budget en validation : les versions ne peuvent plus être modifiées' };
    if (!ids || !ids.length) return { ok: false, message: 'Choisissez au moins un bloc à reprendre.' };
    if (source === versionRef.current) return { ok: false, message: 'Choisissez une autre version que la version active.' };
    await flush();
    if (!budgetIdRef.current) return { ok: false, message: 'Le budget doit d\'abord être enregistré.' };
    const { data } = await loadBudgetData(budgetIdRef.current);
    if (!(data.versions && data.versions[source] && Object.keys(data.versions[source]).length)) return { ok: false, message: 'La version ' + VERSION_LABELS[source] + ' est vide.' };
    const src = agenceDeVersion(agenceNom, data, source);
    const alerte = alerteRepriseBlocs(agencyRef.current, src, ids);
    if (alerte && confirmer && !confirmer(alerte)) return { ok: false, annule: true, message: 'Reprise annulée' };
    update((a) => reprendreBlocs(a, src, ids));
    return { ok: true, message: 'Données de la ' + VERSION_LABELS[source] + ' reprises dans la ' + VERSION_LABELS[versionRef.current] + ' (↶ pour annuler)' };
  }, [agenceNom, editable, flush, update]);

  // Supprime une version (V2 ou V3, non choisie pour la soumission). Si c'était la version active, retour sur la V1.
  const deleteVersion = useCallback(async (v) => {
    await flush();
    if (!budgetIdRef.current) return { ok: false, message: 'Le budget doit d\'abord être enregistré.' };
    const { data } = await loadBudgetData(budgetIdRef.current);
    const courant = { ...data, meta: { ...(data.meta || {}), ...(metaRef.current || {}) } };
    const motif = motifRefusSuppression(courant, v, editable);
    if (motif) return { ok: false, message: motif };
    const out = donneesSansVersion(courant, v);
    if (versionRef.current !== v) out.meta.activeVersion = versionRef.current;
    await writeBudgetData(budgetIdRef.current, out);
    setVersionsRemplies((p) => ({ ...p, [v]: false }));
    if (versionRef.current === v) {
      const nv = out.meta.activeVersion;
      const a = agenceDeVersion(agenceNom, out, nv);
      versionRef.current = nv;
      setActiveVersion(nv);
      snapRef.current = null; viderHisto(); setAgency(a);
      baseRef.current = out.versions && out.versions[nv] ? JSON.parse(JSON.stringify(out.versions[nv])) : null;
    } else out.meta.activeVersion = versionRef.current;
    majMeta(out.meta);
    metaBaseRef.current = JSON.parse(JSON.stringify(out.meta));
    return { ok: true, message: 'Version ' + VERSION_LABELS[v] + ' supprimée' };
  }, [agenceNom, editable, flush, majMeta, viderHisto]);

  // Description de la version active (enregistrée avec la prochaine sauvegarde)
  const setVersionDesc = useCallback((texte) => {
    const m = { ...(metaRef.current || DEFAULT_META()) };
    m.descriptions = { ...(m.descriptions || {}), [versionRef.current]: texte };
    majMeta(m);
    const a = pendingRef.current || agencyRef.current;
    if (a && editable) {
      pendingRef.current = a;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => persist(a), SAVE_DEBOUNCE_MS);
    }
  }, [majMeta, persist, editable]);

  // Choisit la version active comme version de soumission
  const chooseSubmittedVersion = useCallback(async () => {
    if (!editable) return;
    majMeta({ ...(metaRef.current || DEFAULT_META()), submittedVersion: versionRef.current });
    await saveNow();
  }, [majMeta, saveNow, editable]);

  // Comparatif des versions remplies (la version active est prise en mémoire)
  const compareVersions = useCallback(async () => {
    await flush();
    if (!budgetIdRef.current) return [];
    const { data } = await loadBudgetData(budgetIdRef.current);
    data.meta = metaRef.current || data.meta;
    return comparerVersions(agenceNom, data, versionRef.current, agencyRef.current);
  }, [agenceNom, flush]);

  // Soumission au Directeur Régional (nouveau cycle de validation)
  const submit = useCallback(async (parNom) => {
    await saveNow();
    if (!budgetIdRef.current) return { ok: false, message: 'Le budget doit d\'abord être enregistré.' };
    const d = await submitBudget(budgetIdRef.current, versionRef.current, parNom);
    majMeta(d.meta);
    setValidation(d.validation);
    setStatut('soumis_dr');
    return { ok: true, message: 'Version ' + VERSION_LABELS[versionRef.current] + ' soumise au circuit de validation (Directeur Régional)' };
  }, [saveNow, majMeta]);

  const value = {
    agency, statut, loading, error, saveStatus, update, editable, agenceNom, applyExternal, saisieDR, lectureSeule, annuler, retablir, histInfo,
    budgetId, activeVersion, meta, versionsRemplies, validation,
    switchVersion, duplicateVersion, reprendreVersion, deleteVersion, setVersionDesc, chooseSubmittedVersion, compareVersions, submit, saveNow, flush, recharger
  };
  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget doit être utilisé dans <BudgetProvider>');
  return ctx;
}
