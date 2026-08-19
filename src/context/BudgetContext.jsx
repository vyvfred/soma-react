import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { loadAgencyBudget, saveAgencyBudget } from '../lib/budgetApi.js';

// Contexte du budget en cours d'édition (pour le REX : son agence ; pour le CG :
// l'agence ouverte). Remplace l'état global + l'autosave silencieux de l'app actuelle.

const BudgetContext = createContext(null);
const SAVE_DEBOUNCE_MS = 900;

export function BudgetProvider({ agenceNom, children }) {
  const [agency, setAgency] = useState(null);
  const [statut, setStatut] = useState('brouillon');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error

  const budgetIdRef = useRef(null);
  const metaRef = useRef(null);
  const versionRef = useRef('v1');
  const timerRef = useRef(null);
  const inFlightRef = useRef(Promise.resolve()); // sérialise les sauvegardes
  const pendingRef = useRef(null);               // dernière agence modifiée non encore sauvegardée

  // Sauvegarde sérialisée : chaque enregistrement attend la fin du précédent,
  // ce qui garantit que budgetIdRef est connu avant un 2e appel (évite le double insert
  // sur un budget neuf). statut est lu via une ref pour ne pas recréer la fonction.
  const statutRef = useRef(statut);
  statutRef.current = statut;

  const persist = useCallback((a) => {
    const run = async () => {
      await inFlightRef.current.catch(() => {}); // attendre la sauvegarde précédente
      setSaveStatus('saving');
      try {
        const id = await saveAgencyBudget({
          budgetId: budgetIdRef.current,
          activeVersion: versionRef.current,
          meta: metaRef.current,
          statut: statutRef.current,
          agency: a
        });
        budgetIdRef.current = id; // capte l'id au premier enregistrement (insert)
        pendingRef.current = null;
        setSaveStatus('saved');
      } catch (err) {
        setSaveStatus('error');
      }
    };
    const p = run();
    inFlightRef.current = p;
    return p;
  }, []);

  // Chargement initial (et rechargement au changement d'agence).
  useEffect(() => {
    let active = true;
    if (!agenceNom) { setLoading(false); setAgency(null); return; }
    setLoading(true); setError(null);
    loadAgencyBudget(agenceNom)
      .then((res) => {
        if (!active) return;
        setAgency(res.agency);
        setStatut(res.statut);
        budgetIdRef.current = res.budgetId;
        metaRef.current = res.meta || { activeVersion: 'v1', submittedVersion: null, descriptions: { v1: '', v2: '', v3: '' } };
        versionRef.current = res.activeVersion || 'v1';
        setLoading(false);
      })
      .catch((err) => { if (active) { setError(err.message || 'Erreur de chargement'); setLoading(false); } });
    return () => {
      active = false;
      // Flush : si une édition est en attente, la sauvegarder avant de changer d'agence
      // (les refs budgetId/meta/version tiennent encore les valeurs de l'agence courante).
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        if (pendingRef.current) persist(pendingRef.current);
      }
    };
  }, [agenceNom, persist]);

  // Un budget n'est modifiable que s'il est en brouillon ou refusé (comme le mode
  // consultation de l'app actuelle). Empêche l'autosave d'écraser un budget engagé.
  const editable = statut === 'brouillon' || (typeof statut === 'string' && statut.startsWith('refuse'));

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

  const value = { agency, statut, loading, error, saveStatus, update, editable, agenceNom };
  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget doit être utilisé dans <BudgetProvider>');
  return ctx;
}
