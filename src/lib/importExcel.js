// Lecture d'un classeur Excel choisi par l'utilisateur (première feuille, ou la feuille
// désignée). La bibliothèque SheetJS n'est chargée qu'au premier import (code séparé).

async function xlsx() {
  const mod = await import('xlsx');
  return mod.default || mod;
}

// Renvoie { rows, decoderSerie } : rows = tableau de lignes (cellules vides = '').
// choisirFeuille(noms) peut renvoyer le nom de la feuille à lire.
export async function lireClasseur(file, choisirFeuille) {
  const XLSX = await xlsx();
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
  const nom = (choisirFeuille && choisirFeuille(wb.SheetNames)) || wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[nom], { header: 1, defval: '' });
  return { rows, decoderSerie: (n) => XLSX.SSF.parse_date_code(n) };
}

// Feuille « Données agences » si elle existe (comme la version mono-fichier)
export const feuilleAgences = (noms) => noms.find((n) => n.toLowerCase().includes('agence') || n.toLowerCase().includes('donn'));

// Écrit un classeur à partir de feuilles [{ nom, lignes, largeurs }] et le télécharge.
export async function telechargerClasseur(feuilles, nomFichier) {
  const XLSX = await xlsx();
  const wb = XLSX.utils.book_new();
  feuilles.forEach((f) => {
    const ws = XLSX.utils.aoa_to_sheet(f.lignes);
    if (f.largeurs) ws['!cols'] = f.largeurs.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, f.nom);
  });
  XLSX.writeFile(wb, nomFichier);
}
