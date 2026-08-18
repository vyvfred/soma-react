# SOMA React — Rapport d'audit et de vérification

> Audit statique complet du code migré + exécution de la suite de tests et du build.
> **Limite importante :** cet audit ne remplace pas une exécution contre la vraie base
> Supabase. Il vérifie la correction interne du code, pas le comportement live.

## État de santé
| Vérification | Résultat |
|---|---|
| Suite de tests | **89 / 89 au vert** (17 fichiers) |
| Build de production (Vite) | **OK** |
| Imports nommés ↔ exports réels | **✓ tous cohérents** (vérifié par script) |
| Stockage navigateur interdit (localStorage) | **✓ aucun** |
| Clés de liste React (`key=`) | **✓ présentes** |
| Boutons inactifs / liens morts | **✓ aucun** |
| Données simulées / code fictif / TODO | **✓ aucun** |

## Contrôles effectués
1. **Cohérence imports/exports** — script parcourant chaque fichier : chaque import nommé correspond bien à un export réel (une fonction importée mais inexistante planterait à l'exécution même si le build « passe »).
2. **Immutabilité des mutateurs d'état** — chaque écran de saisie (Objectif, Équipe, Présence, Charges, Références, Périodes) a été vérifié : toutes les structures imbriquées (`employees`, `rex`, `sick`, `refs`, `periodesPaie`) sont **clonées** avant modification. Aucune mutation en place (qui aurait empêché un re-render ou corrompu l'état précédent).
3. **Sécurité `dangerouslySetInnerHTML`** — les 12 usages n'injectent que du contenu **contrôlé** (noms d'agence issus de la config + nombres formatés + libellés fixes). **Aucun texte libre saisi par l'utilisateur** n'y transite → pas de vecteur XSS. Les commentaires de validation sont rendus en JSX échappé.
4. **Accès potentiellement nuls** — les fonctions réseau (comparatif, consolidation, aide à la décision) lisent des données brutes ; tous les accès `.reduce/.filter/.map` sont **gardés** par un `if`/ternaire englobant. Les fonctions du noyau reçoivent des agences déjà migrées (champs garantis).
5. **Authentification** — profil manquant géré à la connexion (déconnexion + message) et au rechargement (le composant racine exige `session ET profil`, sinon écran de connexion). Pas de plantage.

## Anomalies trouvées et corrigées
### 🔴 Corrigé — Course à la double-insertion (contexte budget)
Sur un budget **neuf** (sans `id`), deux sauvegardes automatiques rapprochées pouvaient toutes deux faire un `insert` avant que la première ne réponde → **deux lignes budget** pour la même agence. Fenêtre étroite (premier enregistrement + réseau lent) mais réelle.
**Correction :** les sauvegardes sont désormais **sérialisées** — chaque enregistrement attend la fin du précédent, donc l'`id` est connu avant tout second appel. Plus de double insert.

### 🟠 Corrigé — Édition perdue au changement d'agence rapide
Le nettoyage annulait le timer d'autosave quand le CG changeait d'agence : une édition faite moins de 0,9 s avant le changement était perdue silencieusement.
**Correction :** l'édition en attente est **sauvegardée (flush)** avant de charger la nouvelle agence, en utilisant les identifiants encore valides de l'agence courante.

### 🟡 Corrigé — Code mort
Le hook `useAgencyBudget` n'était plus référencé (les écrans lisent désormais le contexte budget). **Supprimé** (principe SOMA : ne pas laisser de code inutile).

## Points notés (sans correction — comportement fidèle ou sans impact)
- **Statut `soumis` générique** : une décision de validation non finale écrit le statut `soumis` (sans suffixe), qui n'a pas de libellé dédié et s'affiche tel quel. **Fidèle à l'application actuelle** (`deciderBudget` fait de même) — à harmoniser un jour si souhaité, mais ce n'est pas une régression.
- **`PlaceholderPanel`** : désormais inatteignable (les 20 panneaux sont mappés), conservé comme filet de sécurité inoffensif.

## Ce que l'audit ne couvre pas (et qui reste à faire)
- **Exécution contre la vraie base Supabase** : chemins d'écriture (sauvegarde budget, décisions, admin, affectation) reproduits fidèlement et testés en logique pure, mais **jamais exécutés en conditions réelles**. C'est le seul moyen de valider les policies RLS, la création de comptes, et les transitions de statut de bout en bout.
- **Comparaison visuelle écran par écran** avec le mono-fichier : les golden-masters garantissent les calculs, pas le rendu.
- **SQL en attente** (`SQL_EN_ATTENTE.sql`) : à déployer pour que « Forcer statut » (admin) et « Affectation DR » fonctionnent.

## Conclusion
Le code est **structurellement sain** : cohérent, sans code mort, sans donnée fictive, avec une gestion d'état correcte après durcissement. Les deux anomalies réelles trouvées (course à la double-insertion, perte d'édition) sont **corrigées**. Il reste une seule inconnue majeure, qui ne peut être levée que par l'équipe : **faire tourner l'application contre la base réelle et vérifier un cycle complet.**
