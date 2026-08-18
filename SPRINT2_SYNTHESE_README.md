# SOMA — Migration React / Vite

## Sprint 2 (suite) — Premier écran de données : la chaîne complète

### Ce que ce point valide
Jusqu'ici les écrans portés étaient statiques (Aide). Cet incrément livre le
**premier écran de données**, qui prouve la chaîne de bout en bout :

```
Supabase  →  budgetMapper  →  noyau de calcul  →  composant React
```

Si cette chaîne fonctionne pour un écran, elle fonctionne pour tous : c'est le
jalon architectural qui débloque les écrans de données suivants.

### Livrable
```
src/lib/budgetApi.js                  accès données (lecture d'un budget)
src/domain/format.js                  formateurs euro / pct (repris verbatim)
src/components/screens/SyntheseScreen.jsx   écran Synthèse (KPI du compte de résultat)
+ calculations.js : ajout de amount / ann / hsTot (purs, verbatim)
```

### L'écran Synthèse
Port fidèle des KPI de `renderFinance()` : CA calendrier, charges de personnel,
résultat d'exploitation, résultat net, ratio MS/CA, heures supplémentaires.
Il charge le budget de l'agence du REX connecté (`profile.agence`), le reconstruit
via le mapper, et calcule les indicateurs avec **exactement les mêmes fonctions**
que l'application actuelle (`ann`, `hsTot`). Les états de chargement, d'erreur et de
budget vide sont gérés explicitement (aucune donnée simulée).

### Verrouillage par test
Les agrégats annuels du compte de résultat sont ajoutés au golden master, sur
l'agence de référence : CA 949 600 €, charges personnel 196 797 €, REX/résultat net
752 803 €. **26 tests au total, tous verts.**

### Correctif inclus — chemin de développement
`vite.config.js` sert désormais à la **racine `/` en développement** (`npm run dev`)
et ne bascule sur `/SOMA/` que pour le **build** (GitHub Pages). Fini le
« page introuvable » en local : `http://localhost:5173/` fonctionne directement.

---

### État de la migration
| Sprint | Objet | État |
|---|---|---|
| 0 | Socle (Vite, React, Supabase, auth, nav) | ✅ |
| 1 | Noyau de calcul (39 fonctions) | ✅ |
| 1+ | Couche données (mapper) | ✅ |
| 2 | Aide + **Synthèse (chaîne complète)** | ✅ en cours |

Écrans migrés : **Aide**, **Synthèse**. Les suivants s'ajoutent au registre
`SCREENS`, un à un, chacun avec ses tests.

### Prochains écrans naturels
Maintenant que la chaîne de données est prouvée : **Prévisionnel** (même source,
tableau du compte de résultat mois par mois), puis les écrans REX de construction
(Objectif, Équipe), avant les écrans lourds (Présence/RH, Comparative, Consolidation).
