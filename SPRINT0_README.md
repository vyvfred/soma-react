# SOMA — Migration React / Vite

## Sprint 0 — Socle technique

### Objectif du sprint
Mettre en place une application React + Vite qui **démarre réellement**, se connecte à Supabase,
gère l'authentification et présente la coquille de navigation par rôle — avec la charte visuelle
actuelle. Aucun écran métier n'est encore porté : c'est le socle sur lequel les sprints suivants
viendront brancher les écrans un à un.

Ce sprint applique la méthode validée : **incrémental, jamais table rase**. L'application actuelle
(`index.html` à la racine du dépôt) continue de fonctionner sans être touchée.

---

### Périmètre

**Inclus dans ce sprint**
- Projet Vite + React opérationnel (build vérifié).
- Client Supabase branché sur le vrai projet (mêmes identifiants publics que l'appli actuelle).
- Authentification réelle : connexion par e-mail / mot de passe, chargement du profil, déconnexion,
  reprise de session au rechargement — reproduction fidèle du flux existant (`signInWithPassword`
  puis lecture de la table `profiles`).
- Coquille applicative avec navigation par rôle (REX, CG/DF, DR, DG, Admin), reprise des mêmes
  panneaux et écrans d'atterrissage que l'application actuelle.
- Reprise de la charte CSS existante (tokens de couleur, typographie).
- Workflow de déploiement GitHub Pages prêt à l'emploi (désactivé par défaut).

**Explicitement hors périmètre (sprints suivants)**
- Le contenu des écrans métier : chaque vue affiche un panneau d'attente honnête qui indique
  qu'elle sera portée ultérieurement (aucune fonctionnalité simulée).
- Le portage de la logique de calcul (HS, CP, présence, prévisionnel…) → **Sprint 1**.
- Le mode démonstration.

---

### Livrables

```
soma-react/
├── package.json               dépendances + scripts
├── vite.config.js             config Vite (base '/SOMA/' pour GitHub Pages)
├── index.html                 point d'entrée + polices
├── .github/workflows/deploy.yml   déploiement Pages (désactivé par défaut)
└── src/
    ├── main.jsx               montage React + import des styles
    ├── App.jsx                aiguillage splash / connexion / coquille
    ├── lib/supabase.js        client Supabase
    ├── config/roles.js        libellés de rôle (repris à l'identique)
    ├── config/panels.js       navigation par rôle (reprise fidèle de setupUI)
    ├── context/AuthContext.jsx  session, connexion, déconnexion, profil
    ├── components/
    │   ├── LoginScreen.jsx    écran de connexion
    │   ├── AppShell.jsx       barre du haut + nav + zone d'écran
    │   └── PlaceholderPanel.jsx  panneau d'attente honnête
    └── styles/
        ├── legacy.css         charte historique (reprise telle quelle)
        └── shell.css          styles du socle
```

---

### Definition of Done — atteinte ✅
- [x] `npm install` puis `npm run build` réussissent sans erreur.
- [x] La connexion utilise le vrai Supabase et charge le profil depuis `profiles`.
- [x] La navigation affichée dépend du rôle du profil connecté, à l'identique de l'actuel.
- [x] La charte visuelle (couleurs, polices) est reprise.
- [x] L'application actuelle n'est pas modifiée ; le déploiement Pages n'est pas détourné.
- [x] Aucun bouton ne fait semblant de fonctionner (règle SOMA respectée).

---

### Comment lancer en local
```bash
cd soma-react
npm install
npm run dev      # démarre le serveur de dev, ouvre l'URL affichée
```
Se connecter avec un compte existant (par ex. le compte admin, ou le compte CG de Florent).
Chaque entrée de menu ouvre un panneau d'attente : c'est attendu à ce stade.

Pour vérifier le build de production :
```bash
npm run build && npm run preview
```

---

### Intégration au dépôt
Déposer ce dossier `soma-react/` sur une **branche dédiée** (ex. `react-migration`), pas sur `main`.
Le site en ligne actuel reste inchangé. Le workflow de déploiement ne s'activera que le jour où
vous déciderez de basculer Pages sur la version React (voir les commentaires dans `deploy.yml`).

---

### Sprint suivant proposé — Sprint 1 : logique métier + données
Porter les calculs et la couche Supabase en modules indépendants du framework, **avec des tests
qui comparent chaque résultat à l'application actuelle**. C'est l'étape qui sécurise toute la
migration : elle isole le seul vrai risque (les calculs) avant de toucher aux écrans.
