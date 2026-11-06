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

// Classeur à plusieurs feuilles : renvoie une fonction feuille(nomNormalisé) -> tableau de lignes.
// Un nombre au format pourcentage d'Excel (0,031 affiché 3,1 %) devient le texte « 3,1 % ».
export async function lireClasseurMultiFeuilles(file) {
  const XLSX = await xlsx();
  const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
  const norm = (x) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return (nom) => {
    const k = wb.SheetNames.find((x) => norm(x) === nom);
    if (!k) return [];
    const ws = wb.Sheets[k];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
    Object.keys(ws).forEach((addr) => {
      if (addr[0] === '!') return;
      const c = ws[addr];
      if (c && typeof c.v === 'number' && ((c.z && String(c.z).includes('%')) || (c.w && String(c.w).includes('%')))) {
        const rc = XLSX.utils.decode_cell(addr);
        if (aoa[rc.r]) aoa[rc.r][rc.c] = String(Math.round(c.v * 100 * 100) / 100).replace('.', ',') + ' %';
      }
    });
    return aoa;
  };
}

// Classeur des charges du réseau : 3 feuilles, colonnes figées
export async function telechargerClasseurCharges(c, nomFichier) {
  const XLSX = await xlsx();
  const wb = XLSX.utils.book_new();
  const wsA = XLSX.utils.aoa_to_sheet(c.aide); wsA['!cols'] = [{ wch: 130 }];
  const wsR = XLSX.utils.aoa_to_sheet(c.reseau); wsR['!cols'] = [{ wch: 46 }, { wch: 12 }].concat(c.reseau[0].slice(2).map(() => ({ wch: 14 })));
  const wsM = XLSX.utils.aoa_to_sheet(c.mensuel); wsM['!cols'] = [{ wch: 26 }, { wch: 46 }].concat(Array(12).fill({ wch: 10 }));
  XLSX.utils.book_append_sheet(wb, wsA, "Mode d'emploi");
  XLSX.utils.book_append_sheet(wb, wsR, 'Réseau');
  XLSX.utils.book_append_sheet(wb, wsM, 'Mensuel');
  XLSX.writeFile(wb, nomFichier);
}
