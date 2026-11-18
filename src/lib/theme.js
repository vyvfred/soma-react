// Thème d'affichage (nov. 2026) : clair par défaut, sombre au choix ; mémorisé sur l'appareil
const CLE = 'soma.theme';
export function themeCourant() {
  try { return localStorage.getItem(CLE) === 'dark' ? 'dark' : 'light'; } catch (e) { return 'light'; }
}
export function appliquerTheme(t) {
  const th = t === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', th);
  try { localStorage.setItem(CLE, th); } catch (e) { /* stockage indisponible */ }
  return th;
}
