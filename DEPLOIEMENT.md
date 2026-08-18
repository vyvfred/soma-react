# Déployer SOMA (React) sur un nouveau dépôt GitHub

## 0. En local d'abord (aucun git nécessaire)
```
npm install
npm run dev        # ouvre http://localhost:5173/
```
Vérifie que l'application tourne avant de penser au déploiement.

## 1. Créer le dépôt
Sur GitHub : nouveau dépôt **public** nommé **soma-react** (vide, sans README).
Si tu choisis un autre nom, change `base: '/soma-react/'` dans `vite.config.js`
ET la même valeur dans l'URL finale.

## 2. Pousser le code
Depuis le dossier `soma-react/` :
```
git init
git add .
git commit -m "SOMA React — migration complète"
git branch -M main
git remote add origin https://github.com/vyvfred/soma-react.git
git push -u origin main
```

## 3. Activer GitHub Pages (une seule fois)
Dépôt → **Settings → Pages → Build and deployment → Source : GitHub Actions**.
C'est tout : le workflow `.github/workflows/deploy.yml` compile et publie
automatiquement à chaque push sur `main`.

## 4. Adresse du site
`https://vyvfred.github.io/soma-react/`
(le premier déploiement prend 1–2 minutes ; suis-le dans l'onglet **Actions**.)

## Notes
- Ton site actuel (`vyvfred/SOMA` → /SOMA/) n'est pas touché : les deux coexistent.
- Bascule ultérieure vers /SOMA/ : soit fusionner dans le dépôt SOMA, soit renommer
  le dépôt et ajuster `base` en conséquence.
- Le SQL en attente (SQL_SOMA_COMPLET.sql) est indépendant du déploiement front.
