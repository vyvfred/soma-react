# SOMA — Migration React / Vite

## Complément Sprint 1 — Couche données (budget ⇄ Supabase)

La partie « données » annoncée dans le périmètre du Sprint 1 est maintenant portée.
C'est le pont entre la base et le noyau de calcul : sans lui, aucun écran de données
ne peut fonctionner.

### Livrable
```
src/domain/
├── budgetMapper.js        parse / build / migrate (fonctions pures)
└── budgetMapper.test.js   9 tests
```

### Ce que fait `budgetMapper.js`
Reproduit fidèlement `loadBudgetFromSupabase()` et `saveBudgetToSupabase()`, mais
en fonctions **pures** (aucun accès réseau — elles transforment des objets) :

- **`parseBudgetRow(row)`** — détecte la structure `data` (versionnée
  `{meta, versions, validation}` ou ancien format plat) et renvoie la version active.
- **`agencyFromRow(row)`** — reconstruit l'objet agence :
  `{...agency(nom), ...versionData, name}` puis migration. Gère aussi le budget vide
  (pré-remplissage des références CG).
- **`buildBudgetData(existing, version, meta, a)`** — sérialise l'agence pour la
  sauvegarde, en **préservant les autres versions** déjà stockées.
- **`migrateAgency(a)`** — comble les champs manquants des anciens budgets
  (port fidèle du corps de `migrateState`).

### Modèle de données réel (table `budgets`)
`{ id, agence, annee, statut, data(jsonb), updated_at }` — où `data` contient
`{ meta, versions:{v1,v2,v3}, validation }` (ou l'ancien format plat).

### Tests — 9, dont l'aller-retour
Le test clé fait `agence → buildBudgetData → parseBudgetRow → agence` et vérifie que
les champs clés (coût horaire, CA cible, TXR) sont conservés : la sauvegarde et le
chargement sont donc **symétriques**. Sont aussi couverts : détection versionné/plat,
repli sur v1, pré-remplissage du budget vide, préservation des versions, migration.

### Un mot sur la méthode
Un des tests a d'abord échoué — non pas à cause du mapper, mais parce que **mon
hypothèse de test était fausse** (je pensais que le pré-remplissage se déclenchait
là où c'est en réalité la superposition qui s'applique). La barrière de tests a fait
exactement son travail : attraper une erreur de compréhension avant qu'elle ne se
propage. C'est toute la valeur de cette approche pour la réécriture.

### État de la migration
| Sprint | Objet | État |
|---|---|---|
| 0 | Socle (Vite, React, Supabase, auth, nav) | ✅ |
| 1 | Noyau de calcul (36 fonctions, 13 tests) | ✅ |
| 1+ | Couche données (mapper, 9 tests) | ✅ |
| 2 | Écrans : infrastructure + Aide | ✅ démarré |

**Tests au total : 25, tous verts. `npm run build` réussit.**
