# SOMA — Migration React / Vite

## Sprint 1 — Logique métier + données (dé-risquage)

### Objectif du sprint
Sortir le **noyau de calcul métier** de l'application actuelle vers un module
indépendant du framework, et le **verrouiller par des tests**. C'est l'étape qui
neutralise le seul vrai risque de la migration : reproduire les calculs budgétaires
à l'identique. Une fois ce noyau prouvé, la réécriture des écrans devient mécanique.

### Méthode
Le noyau n'a **pas été réécrit à la main** (source d'erreurs). Il a été **extrait
verbatim** de `index.html` par analyse de la fermeture de dépendances : à partir des
fonctions de calcul cibles (HS, CP, paie, prévisionnel, compte de résultat…), toutes
les fonctions appelées ont été tracées automatiquement, puis extraites telles quelles.
La logique est donc iso-comportement par construction.

---

### Livrable

```
src/domain/
├── calculations.js                    36 fonctions pures (402 lignes)
├── calculations.test.js               13 tests (unitaires + non-régression)
└── __fixtures__/agenceReference.js    agence de test déterministe
```

**`calculations.js`** — noyau de calcul pur, sans DOM ni état global. Il expose
notamment : `annualCA`, `monthCA`, `baseH`, `coefHSMois`, `coefHSMoyen`, `coutHSTotal`,
`cpGeneres`, `cpPlanifies`, `impactCPSemaine`, `payrollMonth`, `payrollMonthCivil`,
`payrollPayMonth`, `buildPeriodesPaie`, `sig` (compte de résultat), `hsRows`,
`refAgenceSeuils`, ainsi que la fabrique `agency()` et le calendrier `genCal()`.

Chaque fonction prend l'objet agence `a` en paramètre et renvoie une valeur — aucune
ne lit l'état global. Les deux fonctions qui lisaient l'état global dans l'application
(`A()` qui renvoie l'agence active, et `completion()` qui lit le profil connecté) ont
été **volontairement laissées de côté** : elles seront portées avec une petite
adaptation (passage de l'agence et du rôle en paramètre) au prochain passage.

---

### Tests — deux niveaux

**1. Vérifications indépendantes (justesse).** Valeurs calculées à la main, qui
prouvent que la logique est correcte et pas seulement stable. Exemples :
- `coefHSMois` : 0 % de HS à 50 → 1,25 ; 50 % → 1,375 ; 100 % → 1,50.
- `baseH` : somme des heures roulantes pondérées (régulateur exclu).
- `isRoulant`, `between`, `tauxHS50Mois` (bornage [0,100]).

**2. Non-régression (golden master).** Sorties de référence du noyau actuel sur une
agence de test déterministe. **Ces valeurs ne doivent pas changer** pendant la
réécriture ; toute divergence signale une régression. Exemples verrouillés :
CA annuel 949 600 €, capacité roulante 94 h, masse salariale de janvier 17 805 €,
résultat net de janvier 63 595 €, 53 semaines ISO 2027.

```bash
cd soma-react
npm install
npm run test        # 13 tests, tous verts
```

---

### Definition of Done — atteinte ✅
- [x] Le noyau de calcul est isolé dans un module sans dépendance au framework.
- [x] Extraction verbatim (iso-comportement garanti par construction).
- [x] Le module tourne réellement (vérifié en exécution).
- [x] Tests indépendants (valeurs à la main) **et** tests de non-régression : 13/13 verts.
- [x] `npm run build` continue de réussir.
- [x] Application actuelle non modifiée.

---

### Ce que ça change pour la suite
Les écrans à venir (Sprint 2 et suivants) ne recalculeront rien eux-mêmes : ils
importeront ce noyau. La barrière de tests garantit que ce qu'ils affichent reste
identique aux chiffres de l'application actuelle.

### Sprint suivant proposé — Sprint 2 : premiers écrans
Porter les écrans **simples** (22 vues : aide, écrans admin, dashboards légers…),
branchés sur le noyau de calcul et la couche données. Objectif : valider
l'architecture de composants et prendre du rythme avant les écrans lourds.
