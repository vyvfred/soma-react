import { describe, it, expect } from 'vitest';
import { creerJournal, dureeLisible, JOURNAL_PAUSE_MS, syntheseJournal } from './journal.js';

function banc() {
  const appels = []; let t = 1000000, vis = true, prochainId = 1, refusSignal = false;
  const rpc = async (nom, p) => {
    appels.push([nom, p]);
    if (nom === 'journal_ouvrir') return { data: prochainId++, error: null };
    if (nom === 'journal_signal') return refusSignal ? { data: false, error: null } : { data: true, error: null };
    return { data: null, error: { message: 'inconnu' } };
  };
  const env = { visible: () => vis, appareil: () => 'ordinateur', maintenant: () => t };
  return { appels, rpc, env, avancer: (ms) => { t += ms; }, cacher: () => { vis = false; }, montrer: () => { vis = true; }, refuser: (v) => { refusSignal = v; } };
}

describe('journal des connexions', () => {
  it('démarrer ouvre une connexion, une seule même si appelé deux fois', async () => {
    const b = banc(), j = creerJournal(b.rpc, b.env);
    await j.demarrer(); await j.demarrer();
    expect(b.appels.filter((a) => a[0] === 'journal_ouvrir')).toHaveLength(1);
    expect(j.etat.id).toBe(1);
    await j.arreter();
  });

  it('les enregistrements partent avec le signal suivant, puis le compteur repart à zéro', async () => {
    const b = banc(), j = creerJournal(b.rpc, b.env);
    await j.demarrer();
    j.noterSaisie(); j.noterSaisie(); j.noterSaisie();
    await j.signal(false);
    expect(b.appels.at(-1)).toEqual(['journal_signal', { p_id: 1, p_saisies: 3 }]);
    await j.signal(false);
    expect(b.appels.at(-1)).toEqual(['journal_signal', { p_id: 1, p_saisies: 0 }]);
    await j.arreter();
  });

  it('onglet caché : pas de signal automatique, mais un signal forcé passe', async () => {
    const b = banc(), j = creerJournal(b.rpc, b.env);
    await j.demarrer(); b.cacher();
    const n = b.appels.length;
    await j.signal(false);
    expect(b.appels.length).toBe(n);
    await j.signal(true);
    expect(b.appels.length).toBe(n + 1);
    await j.arreter();
  });

  it('retour après plus de 30 min : nouvelle connexion', async () => {
    const b = banc(), j = creerJournal(b.rpc, b.env);
    await j.demarrer();
    b.avancer(JOURNAL_PAUSE_MS + 1000);
    await j.signal(false);
    expect(b.appels.filter((a) => a[0] === 'journal_ouvrir')).toHaveLength(2);
    expect(b.appels.at(-1)[1].p_id).toBe(2);
    await j.arreter();
  });

  it('signal refusé par la base : saisies conservées et nouvelle connexion au signal suivant', async () => {
    const b = banc(), j = creerJournal(b.rpc, b.env);
    await j.demarrer(); j.noterSaisie(); j.noterSaisie();
    b.refuser(true); await j.signal(false);
    expect(j.etat.id).toBe(null);
    b.refuser(false); await j.signal(false);
    expect(b.appels.at(-1)).toEqual(['journal_signal', { p_id: 2, p_saisies: 2 }]);
    await j.arreter();
  });

  it('arrêter envoie un dernier signal puis plus rien ; les saisies hors session ne comptent pas', async () => {
    const b = banc(), j = creerJournal(b.rpc, b.env);
    await j.demarrer(); j.noterSaisie();
    await j.arreter();
    expect(b.appels.at(-1)).toEqual(['journal_signal', { p_id: 1, p_saisies: 1 }]);
    j.noterSaisie(); const n = b.appels.length;
    await j.signal(true);
    expect(b.appels.length).toBe(n);
  });

  it('une base injoignable ne fait pas planter', async () => {
    const j = creerJournal(async () => { throw new Error('réseau'); }, { visible: () => true, appareil: () => 'téléphone', maintenant: () => 0 });
    await expect(j.demarrer()).resolves.toBeUndefined();
    await expect(j.signal(false)).resolves.toBeUndefined();
    await j.arreter();
  });

  it('durée lisible', () => {
    expect(dureeLisible(0)).toBe('< 1 min');
    expect(dureeLisible(42)).toBe('42 min');
    expect(dureeLisible(60)).toBe('1 h');
    expect(dureeLisible(125)).toBe('2 h 05');
  });

  it('synthèse admin : activité = journal ou à défaut dernière authentification, indicateurs, tri', () => {
    const now = Date.parse('2026-11-17T15:00:00Z');
    const stats = [
      { nom: 'B', nb_connexions: '3', duree_minutes: '50', saisies: '12', derniere: '2026-11-17T14:00:00Z', derniere_auth: '2026-11-10T08:00:00Z' },
      { nom: 'A', nb_connexions: 0, duree_minutes: 0, saisies: 0, derniere: null, derniere_auth: '2026-11-12T08:00:00Z' },
      { nom: 'C', nb_connexions: 0, duree_minutes: 0, saisies: 0, derniere: null, derniere_auth: null }
    ];
    const r = syntheseJournal(stats, now);
    expect(r.lignes.map((l) => l.nom)).toEqual(['B', 'A', 'C']);
    expect(r.kpi).toEqual({ total: 3, aujourdhui: 1, semaine: 2, jamais: 1, connexions: 3, saisies: 12 });
    expect(syntheseJournal(stats, now, 'nom').lignes.map((l) => l.nom)).toEqual(['A', 'B', 'C']);
    expect(syntheseJournal(stats, now, 'temps').lignes[0].nom).toBe('B');
  });
});
