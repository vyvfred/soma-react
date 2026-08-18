# SOMA — Migration React / Vite

## Sprint 2 — Premiers écrans (démarré)

### Objectif du sprint
Porter les écrans **simples** en composants React et établir le **pattern de
migration** réutilisable : comment un écran remplace proprement un panneau
d'attente, sans jamais casser la coquille. Ce sprint pose l'infrastructure et
livre le premier écran réel de bout en bout.

---

### Ce qui est livré

**1. Infrastructure de migration écran par écran**
```
src/components/screens/
├── index.js            registre des écrans migrés (SCREENS)
└── AideScreen.jsx      premier écran porté
```
La coquille (`AppShell`) consulte le registre : si un panneau y figure, son
composant s'affiche ; sinon, on retombe automatiquement sur le panneau d'attente.
**Ajouter un écran = ajouter une ligne au registre.** C'est ce mécanisme qui rend
la migration incrémentale et sûre : chaque écran porté est activé isolément.

**2. Premier écran réel — Aide**
```
src/domain/faq.js       données FAQ (extraites verbatim) + mapping rôle→FAQ
src/domain/faq.test.js  tests mapping + intégrité des données
src/components/screens/AideScreen.jsx
```
L'écran Aide affiche une FAQ repliable adaptée au profil connecté (REX, CG,
valideur, admin). Les **textes sont repris verbatim** de l'application actuelle
(20 questions REX, 14 CG, 12 valideur, 7 admin). Le comportement repliable passe
désormais par l'état React au lieu de la manipulation directe du DOM, mais le
rendu et les contenus sont identiques.

---

### Le pattern, en pratique
Pour porter l'écran suivant :
1. extraire ses données/logique dans `src/domain/` si nécessaire (comme `faq.js`) ;
2. créer le composant dans `src/components/screens/` ;
3. l'enregistrer dans `SCREENS` (une ligne) ;
4. ajouter ses tests.

Les écrans ne recalculent rien : ils importent le noyau du Sprint 1
(`src/domain/calculations.js`), dont la barrière de tests garantit l'iso-résultat.

---

### Definition of Done — atteinte ✅
- [x] Registre d'écrans en place ; repli automatique sur le panneau d'attente.
- [x] Premier écran (Aide) porté, branché, fonctionnel pour les 4 profils.
- [x] Données FAQ extraites verbatim ; textes identiques à l'actuel.
- [x] Tests verts : 16/16 (13 noyau de calcul + 3 FAQ).
- [x] `npm run build` réussit avec l'écran intégré.
- [x] Application actuelle non modifiée.

---

### Reste à faire dans le Sprint 2
Les autres écrans **simples** (≈ 21 restants : écrans d'administration, dashboards
légers, modales) suivent exactement le même pattern. Ils s'ajouteront un à un au
registre, chacun avec ses tests, sans toucher au reste.

### Après les écrans simples
Écrans **moyens** (19) puis **lourds** (12 : Présence/RH, Vue comparative,
Consolidation, Validation, graphiques), traités avec le plus de soin car ils
consomment le plus le noyau de calcul.
