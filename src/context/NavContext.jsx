import { createContext, useContext } from 'react';

// Contexte de navigation : permet à un écran de demander l'affichage d'un autre
// panneau (ex. les items actionnables du tableau de bord CG). Séparé d'AppShell
// pour éviter tout import circulaire écran ⇄ coquille.
export const NavContext = createContext(() => {});
export function useNav() {
  return useContext(NavContext);
}
