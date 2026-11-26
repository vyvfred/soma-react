// Écriture d'un classeur modèle (domain/exportAgenceDetail.js) en .xlsx mis en forme, avec ExcelJS (chargé à la demande).
const FORMATS = {
  eur: '#,##0 €;[Red]-#,##0 €', h: '#,##0.0', pct: '0.0%', pct100: '0.0', int: '0', date: 'dd/mm/yyyy', dec2: '#,##0.00', dec3: '0.000'
};
const COUL = { saisie: 'FF1F4FD8', soma: 'FF6B6B6B', formule: 'FF111111', controle: 'FF9A6B00', note: 'FF555555' };

async function excel() { const m = await import('exceljs'); return m.default || m; }

function remplirFeuille(ws, f) {
  (f.largeurs || []).forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  f.lignes.forEach((ligne, ri) => {
    const row = ws.getRow(ri + 1);
    (ligne || []).forEach((c, ci) => {
      if (c === null || c === undefined) return;
      const cell = row.getCell(ci + 1);
      if (typeof c !== 'object' || c instanceof Date) { cell.value = c; return; }
      if (c.f) cell.value = { formula: c.f, result: c.v === null || c.v === undefined || c.v === '' ? undefined : c.v };
      else cell.value = c.v === undefined ? null : c.v;
      if (c.fmt && FORMATS[c.fmt]) cell.numFmt = FORMATS[c.fmt];
      const k = c.k;
      if (k === 'titre') cell.font = { bold: true, size: 14, color: { argb: 'FF0B2A4A' } };
      else if (k === 'entete') {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B2A4A' } };
        cell.alignment = { wrapText: true, vertical: 'middle' };
      } else if (k === 'total') {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF6' } };
      } else if (k === 'note') cell.font = { italic: true, color: { argb: COUL.note } };
      else if (k && COUL[k]) cell.font = { color: { argb: COUL[k] }, italic: k === 'soma' };
      if (k === 'saisie') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F6FF' } };
    });
    if (ligne && ligne.some((c) => c && c.k === 'entete')) row.height = 30;
  });
  if (f.gel) ws.views = [{ state: 'frozen', xSplit: f.gel.x || 0, ySplit: f.gel.y || 0 }];
}

// Construit le fichier .xlsx (ArrayBuffer)
export async function classeurVersXlsx(modele) {
  const ExcelJS = await excel();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SOMA'; wb.created = new Date();
  wb.calcProperties = { fullCalcOnLoad: true }; // Excel recalcule toutes les formules à l'ouverture
  modele.feuilles.forEach((f) => remplirFeuille(wb.addWorksheet(f.nom.slice(0, 31)), f));
  return wb.xlsx.writeBuffer();
}

function telecharger(buffer, nom, type) {
  const blob = new Blob([buffer], { type: type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob), lien = document.createElement('a');
  lien.href = url; lien.download = nom; document.body.appendChild(lien); lien.click(); lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function telechargerClasseurDetaille(modele, nom) { telecharger(await classeurVersXlsx(modele), nom); }

// Plusieurs classeurs dans un .zip : fichiers = [{ modele, nom }]
export async function telechargerZipClasseurs(fichiers, nomZip, surProgression) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (let i = 0; i < fichiers.length; i++) {
    zip.file(fichiers[i].nom, await classeurVersXlsx(fichiers[i].modele));
    if (surProgression) surProgression(i + 1, fichiers.length);
  }
  telecharger(await zip.generateAsync({ type: 'arraybuffer' }), nomZip, 'application/zip');
}
