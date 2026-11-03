import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { loadAgencyBudget, saveAgencyBudget, loadBudgetData, writeBudgetData, submitBudget } from '../lib/budgetApi.js';
import { appliquerRefCG } from '../domain/refCG.js';
import { estModifiable, cibleDuplication, agenceDeVersion, copieVersion, comparerVersions, VERSION_LABELS } from '../domain/versions.js';

// Contexte du budget en cours d'édition (pour le REX : son agence ; pour le CG :
// l'agence ouverte). Remplace l'état global + l'autosave silencieux de l'app actuelle,
// et porte la gestion des versions V1/V2/V3 et la soumission.

const BudgetContext = createContext(null);
const SAVE_DEBOUNCE_MS = 900;
const DEFAULT_META = () => ({ activeVersion: 'v1', submittedVersion: null, descriptions: { v1: '', v2: '', v3: '' } });

export function BudgetProvider({ agenceNom, lectureSeule = false, children }) {
  const [agency, setAgency] = useState(null);
  const [statut, setStatut] = useState('brouillon');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
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
        const id = await saveAgencyBudget({
          budgetId: budgetIdRef.current,
          activeVersion: versionRef.current,
          meta: metaRef.current,
          statut: statutRef.current,
          agency: a
        });
        budgetIdRef.current = id;
        setBudgetId(id);
        pendingRef.current = null;
        setVersionsRemplies((p) => ({ ...p, [versionRef.current]: true }));
        setSaveStatus('saved');
      } catch (err) {
        setSaveStatus('error');
      }
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

  // Sauvegarde manuelle : enregistre l'état courant même sans modification en attente
  const saveNow = useCallback(async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const a = pendingRef.current || agencyRef.current;
    if (a) await persist(a);
  }, [persist]);

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
        if (lectureSeule && sv && sv !== res.activeVersion && res.data && res.data.versions && res.data.versions[sv]) {
          res.agency = agenceDeVersion(agenceNom, res.data, sv);
          res.activeVersion = sv;
        }
        setAgency(res.agency);
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
  }, [agenceNom, persist, lectureSeule]);

  // Un budget n'est modifiable qu'en brouillon, refusé ou complément demandé
  const editable = !lectureSeule && estModifiable(statut);

  const update = useCallback((mutator) => {
    if (!editable) return;
    setAgency((prev) => {
      if (!prev) return prev;
      const next = mutator({ ...prev });
      pendingRef.current = next;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => persist(next), SAVE_DEBOUNCE_MS);
      return next;
    });
  }, [persist, editable]);

  // Données écrites par le CG pendant que l'agence est ouverte : mises à jour en mémoire,
  // sinon la sauvegarde automatique suivante réécrirait l'ancienne version.
  // brut = true : simple remplacement de champs (ex. équipe importée), sans verrou CG.
  const applyExternal = useCallback((nom, data, brut = false) => {
    if (!nom || nom !== agenceNom) return;
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
    setAgency(a);
    const remplie = !!(data.versions && data.versions[v] && Object.keys(data.versions[v]).length);
    return remplie
      ? 'Version ' + VERSION_LABELS[v] + ' active'
      : 'Version ' + VERSION_LABELS[v] + ' vide — repartez de zéro ou dupliquez une autre version';
  }, [agenceNom, flush, majMeta]);

  // Duplique la version active vers la première version libre et bascule dessus
  const duplicateVersion = useCallback(async () => {
    await flush();
    if (!budgetIdRef.current) return { ok: false, message: 'Le budget doit d\'abord être enregistré.' };
    const { data } = await loadBudgetData(budgetIdRef.current);
    const source = versionRef.current;
    const cible = cibleDuplication(data, source);
    if (!cible) return { ok: false, message: 'Les 3 versions sont déjà utilisées. Videz-en une ou modifiez une version existante.' };
    const versions = { ...(data.versions || {}), [cible]: copieVersion(agencyRef.current) };
    const m = { ...(metaRef.current || DEFAULT_META()) };
    m.descriptions = { ...(m.descriptions || {}), [cible]: (m.descriptions && m.descriptions[source] ? m.descriptions[source] : '') + ' (copie)' };
    m.activeVersion = cible;
    const out = { ...data, versions, meta: m };
    await writeBudgetData(budgetIdRef.current, out);
    versionRef.current = cible;
    setActiveVersion(cible);
    majMeta(m);
    setVersionsRemplies((p) => ({ ...p, [cible]: true }));
    return { ok: true, cible, message: 'Version ' + VERSION_LABELS[cible] + ' créée à partir de ' + VERSION_LABELS[source] };
  }, [flush, majMeta]);

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
    majMeta({ ...(metaRef.current || DEFAULT_META()), submittedVersion: versionRef.current });
    await saveNow();
  }, [majMeta, saveNow]);

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
    agency, statut, loading, error, saveStatus, update, editable, agenceNom, applyExternal,
    budgetId, activeVersion, meta, versionsRemplies, validation,
    switchVersion, duplicateVersion, setVersionDesc, chooseSubmittedVersion, compareVersions, submit, saveNow, flush
  };
  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget doit être utilisé dans <BudgetProvider>');
  return ctx;
}
