import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base '/soma-react/' pour le build (GitHub Pages, dépôt vyvfred/soma-react) ;
// racine '/' en développement local (npm run dev).
// ⚠️ Si tu renommes le dépôt, change '/soma-react/' pour '/<nom-du-depot>/'.
export default defineConfig(({ command }) => ({
  // BASE_PATH permet un autre hébergement (Netlify : '/').
  base: command === 'build' ? (process.env.BASE_PATH || '/soma-react/') : '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true
  }
}));
