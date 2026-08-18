# SOMA — Migration React / Vite

## Sprint 2 (suite) — Premier écran de saisie + infrastructure d'écriture

### Le cap franchi
Jusqu'ici les écrans étaient en **lecture**. Cet incrément introduit l'**écriture**
vers Supabase : état modifiable, sauvegarde automatique, et premier écran de saisie
(Objectif). C'est le cran de complexité au-dessus annoncé.

### Livrable
```
src/lib/budgetApi.js            + saveAgencyBudget (fidèle à saveBudgetToSupabase)
src/context/BudgetContext.jsx   état budget éditable + autosave débounced
src/domain/objectifInsight.js   analyse de cohérence de l'objectif (pure)
src/domain/objectifInsight.test.js   5 tests (seuils 85/100/115)
src/components/screens/ObjectifScreen.jsx   écran de saisie Objectif
```

### Comment marche la sauvegarde
`BudgetContext` remplace l'état global `S.agencies[S.active]` + l'autosave silencieux
de l'application actuelle :
- il charge le budget de l'agence du REX au montage ;
- chaque modification passe par `update(...)`, qui met à jour l'état **et** programme
  une sauvegarde différée (~0,9 s) ;
- un statut de sauvegarde est exposé (Enregistrement… / Enregistré / Non enregistré) ;
- `saveAgencyBudget` reproduit fidèlement `saveBudgetToSupabase` : il recharge les
  autres versions pour ne pas les écraser, écrit la version active, et fait un
  update si le budget existe, un insert sinon.

### Garde-fou important
Un budget **engagé dans le circuit de validation** (soumis / validé) passe en
**lecture seule** : les champs sont désactivés et l'autosave est bloqué. C'est le
même comportement que le mode consultation de l'application actuelle — il évite
qu'une saisie n'écrase un budget déjà soumis.

### L'écran Objectif
Port fidèle du cœur de `renderObjectif` : les deux décisions du REX (objectif de CA,
TXR cible) et l'interprétation de SOMA. L'analyse de cohérence (objectif vs capacité
de l'effectif, avec verdict cohérent / heures supp. / au-delà de la capacité) est
extraite en fonction pure `objectifInsight`, testée sur ses seuils.

*Hors périmètre de cet incrément* (à porter ensuite) : le versioning des budgets
(v1/v2/v3), la barre de statut et le circuit de soumission — machinerie annexe de
l'écran Objectif, indépendante de la saisie elle-même.

### Tests — 31, tous verts
+5 nouveaux sur `objectifInsight` (guidage + seuils de tension). Build OK.

---

### ⚠️ À vérifier en priorité maintenant
Cet incrément **écrit dans ta vraie base Supabase**. C'est exactement le moment où
faire tourner l'application chez toi et vérifier un cycle de saisie (ouvrir Objectif
en REX, modifier le CA cible, voir « Enregistré », recharger la page) prend tout son
sens — avant d'aller plus loin sur les autres écrans de saisie.

### État de la migration
| Sprint | Objet | État |
|---|---|---|
| 0 | Socle | ✅ |
| 1 | Noyau de calcul + couche données | ✅ |
| 2 | Aide · Synthèse · Prévisionnel · **Objectif (saisie)** | ✅ en cours |

Écrans migrés : **Aide, Synthèse, Prévisionnel, Objectif**.
Prochain écran de saisie naturel : **Équipe** (gestion des salariés).
