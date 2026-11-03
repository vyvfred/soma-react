// Imports Excel du contrôleur de gestion — fonctions PURES (port de la version mono-fichier,
// avec les corrections de novembre 2026). Elles reçoivent les lignes déjà lues du
// classeur (tableau de tableaux, en-tête compris) et rendent des données prêtes à
// enregistrer. La lecture du fichier se fait dans lib/importExcel.js.

// Noms d'agence du registre de paie → noms SOMA
export const AGENCE_MAP = {
  'ANGERS': 'ANGERS', 'ANGOULEME': 'ANGOULEME', 'ANNECY': 'ANNECY',
  'BOURG-EN-BRESSE': 'BOURG EN BRESSE', 'BRIVE': 'BRIVE', 'CAHORS': 'CAHORS',
  'CHAMBERY': 'CHAMBERY', 'CHATELLERAULT': 'CHATELLERAULT', 'CLERMONT': 'CLERMONT',
  'COGNAC': 'COGNAC', 'DIJON': 'DIJON', 'EVREUX': 'EVREUX', 'LAVAL': 'LAVAL',
  'LE MANS': 'LE MANS', 'LIMOGES': 'LIMOGES', 'MOISSAC': 'MOISSAC', 'NANTES': 'NANTES',
  'PARTHENAY': 'PARTHENAY', 'POITIERS': 'POITIERS', 'RENNES': 'RENNES', 'SIEGE': 'SIEGE',
  'ST GILLES': 'SAINT GILLES CROIX DE VIE', 'THYEZ': 'THYEZ', 'TOULOUSE': 'TOULOUSE',
  'TOURS': 'TOURS', 'TULLE': 'TULLE', 'VANNES': 'VANNES'
};

const sansAccents = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const enTete = (h) => sansAccents(h).toLowerCase().trim();
const vide = (v) => v === null || v === undefined || String(v).trim() === '';
const nombre = (v) => (typeof v === 'number' ? v : parseFloat(String(v).replace(/[\s ]/g, '').replace(',', '.')));

// Ligne d'en-tête : la première qui contient « agence » et au moins une autre colonne
// (une ligne de titre « Données agences 2027 » n'est pas prise pour l'en-tête)
function ligneEnTete(rows) {
  return rows.findIndex((r) => (r || []).some((c) => enTete(c).includes('agence'))
    && (r || []).filter((c) => !vide(c)).length >= 2);
}

// Retrouve l'agence SOMA à partir d'un nom de fichier (nom exact, alias du registre, ou inclusion)
export function trouverAgence(nomBrut, agences) {
  const nom = String(nomBrut || '').trim().toUpperCase();
  if (!nom) return null;
  const alias = AGENCE_MAP[nom];
  return agences.find((a) => a.nom === nom || a.nom === alias)
    || agences.find((a) => nom.includes(a.nom) || a.nom.includes(nom))
    || null;
}

// ── Données agences ────────────────────────────────────────────────
// Colonnes reconnues par leur intitulé. Correction : « Taux brut 1er juin » et les colonnes
// non-roulantes ne sont plus confondues avec le taux de janvier ou les charges patronales.
export function colonnesRefAgences(headers) {
  const h = headers.map(enTete);
  const nr = (x) => x.includes('non') && x.includes('roul');
  const idx = (test) => h.findIndex(test);
  return {
    nom: idx((x) => x.includes('agence')),
    histCA2025: idx((x) => x.includes('2025')),
    histCA: idx((x) => x.includes('2026') && !x.includes('obj') && !x.includes('txr')),
    histTXR2026: idx((x) => x.includes('txr')),
    targetAbsRate: idx((x) => x.includes('abs')),
    tauxHoraireBrut: idx((x) => x.includes('brut') && !x.includes('juin') && !nr(x)),
    tauxHoraireBrutJuin: idx((x) => x.includes('brut') && x.includes('juin')),
    tauxChargePatronal: idx((x) => x.includes('charge') && x.includes('patron') && !nr(x)),
    costHour: idx((x) => x.includes('cout') && !nr(x)),
    targetCA: idx((x) => x.includes('objectif') || x.includes('obj')),
    msNRBrutMensuel: idx((x) => nr(x) && !x.includes('charge')),
    msNRTauxCharges: idx((x) => nr(x) && x.includes('charge'))
  };
}

export function parseRefAgences(rows, agences) {
  const hr = ligneEnTete(rows);
  if (hr < 0) return { erreur: 'En-tête « Agence » non trouvée.', saisies: {}, inconnues: [] };
  const col = colonnesRefAgences(rows[hr]);
  const saisies = {}, inconnues = [];
  for (let i = hr + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const brut = row[col.nom];
    if (vide(brut)) continue;
    const ag = trouverAgence(brut, agences);
    if (!ag) { inconnues.push(String(brut).trim().toUpperCase()); continue; }
    const d = {};
    Object.keys(col).forEach((k) => {
      if (k === 'nom' || col[k] < 0) return;
      const v = row[col[k]];
      if (vide(v)) return;
      const n = nombre(v);
      if (k === 'costHour' && !(n > 0)) return;
      if (!isNaN(n)) d[k] = n;
    });
    if (d.costHour === undefined && d.tauxHoraireBrut && d.tauxChargePatronal) {
      d.costHour = Math.round(d.tauxHoraireBrut * (1 + d.tauxChargePatronal / 100) * 100) / 100;
    }
    if (Object.keys(d).length) saisies[ag.nom] = { ...(saisies[ag.nom] || {}), ...d };
  }
  return { saisies, inconnues };
}

// ── Registre RH ────────────────────────────────────────────────────
export function mapEmploi(libelle) {
  const l = sansAccents(libelle).toUpperCase().trim();
  if (l.includes('AMBULANCIER DIPLOME')) return { qual: 'DEA', roulant: true };
  if (l.includes('AUXILIAIRE AMBULANCIER')) return { qual: 'AA', roulant: true };
  if (l.includes('CONDUCTEUR AMBULANCIER')) return { qual: 'AA', roulant: true };
  if (l.includes('CHAUFFEUR DE TAXI')) return { qual: 'TAXI', roulant: true };
  if (l.includes('MOBILITE REDUITE') || l.includes('TPMR')) return { qual: 'TPMR', roulant: true };
  if (l.includes('CONDUCTEUR SCOLAIRE')) return { qual: 'TPMR', roulant: true };
  if (l.includes('CONDUCTEUR DE PERSONNE')) return { qual: 'TPMR', roulant: true };
  if (l.includes('REGULATEUR') || l.includes('REGULATION')) return { qual: 'REGULATEUR', roulant: false };
  if (l.includes('RESPONSABLE EXPLOITATION') || l.includes("RESPONSABLE D'EXPLOITATION")) return { qual: 'REX', roulant: false };
  if (l.includes('DIRECTEUR REGIONAL')) return { qual: 'DR', roulant: false };
  if (l.includes('FACTURATION') || l.includes('FACTURI')) return { qual: 'FACTURIERE', roulant: false };
  return { qual: 'ADMIN', roulant: false };
}

// Type de contrat → CDI / CDD / APPRENTI / INTERIM
// (correction : avant, seul « C.D.D » était reconnu comme CDD)
export function contratImport(v) {
  const c = sansAccents(v).toUpperCase().replace(/[.\s]/g, '');
  if (c.includes('INDETERMIN') || c.includes('CDI')) return 'CDI';
  if (c.includes('CDD') || c.includes('DETERMIN')) return 'CDD';
  if (c.includes('APPRENTI')) return 'APPRENTI';
  if (c.includes('INTERIM')) return 'INTERIM';
  return 'CDI';
}

// Date du registre → 'aaaa-mm-jj' ; '' si absente ; null si illisible.
// decoderSerie(n) convertit une date Excel (nombre de jours) en {y, m, d}.
export function dateImport(v, decoderSerie) {
  if (vide(v)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  if (typeof v === 'number') {
    const d = decoderSerie ? decoderSerie(v) : null;
    return d ? d.y + '-' + pad(d.m) + '-' + pad(d.d) : null;
  }
  const t = String(v).trim();
  let m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) { let y = +m[3]; if (y < 100) y += 2000; return y + '-' + pad(m[2]) + '-' + pad(m[1]); }
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[0].slice(0, 10) : null;
}

const QUALS_BUDGETEES = ['DEA', 'AA', 'TAXI', 'TPMR', 'REGULATEUR', 'REX', 'FACTURIERE'];

// Registre RH : une ligne par salarié, première ligne = en-têtes. L'agence n'est souvent
// écrite qu'une fois par groupe : elle est recopiée sur les lignes suivantes.
// Corrections : CDD reconnus quel que soit le libellé ; seules les sorties avant 2027 sont
// écartées (une fin prévue en 2027 devient la date de sortie) ; heures gardées pour les
// non-roulants (elles servent à leur coût horaire).
export function parseRegistre(rows, decoderSerie) {
  if (!rows || rows.length < 2) return { erreur: 'Fichier vide.', parAgence: {}, ecartes: 0 };
  const h = rows[0].map(enTete);
  const col = {
    agence: h.findIndex((x) => x.includes('agence')),
    nom: h.findIndex((x) => x === 'nom'),
    prenom: h.findIndex((x) => x.includes('prenom')),
    entree: h.findIndex((x) => x.includes('entree')),
    sortie: h.findIndex((x) => x.includes('sortie')),
    contrat: h.findIndex((x) => x.includes('contrat')),
    emploi: h.findIndex((x) => x.includes('libelle')),
    horaire: h.findIndex((x) => x.includes('horaire'))
  };
  const parAgence = {};
  let derniere = null, ecartes = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const agBrut = String(row[col.agence] ?? '').trim();
    if (agBrut) derniere = agBrut;
    if (!derniere || derniere.toLowerCase().includes('total')) continue;
    const nom = String(row[col.nom] ?? '').trim();
    if (!nom || nom.toLowerCase() === 'total') continue;
    const agSoma = AGENCE_MAP[derniere.toUpperCase()];
    if (!agSoma) { ecartes++; continue; }
    const sortie = col.sortie >= 0 ? dateImport(row[col.sortie], decoderSerie) : '';
    if (sortie === null || (sortie && sortie < '2027-01-01')) { ecartes++; continue; }
    const entree = col.entree >= 0 ? dateImport(row[col.entree], decoderSerie) : '';
    if (entree && entree > '2027-12-31') { ecartes++; continue; }
    const m = mapEmploi(row[col.emploi]);
    if (!QUALS_BUDGETEES.includes(m.qual)) { ecartes++; continue; }
    const horaireMensuel = nombre(row[col.horaire]) || 152;
    const prenom = String(row[col.prenom] ?? '').trim();
    (parAgence[agSoma] = parAgence[agSoma] || []).push({
      nom: (nom + ' ' + prenom).trim(),
      qual: m.qual,
      contract: contratImport(row[col.contrat]),
      hours: Math.round(horaireMensuel / 4.33 * 10) / 10,
      hoursMal: 0, hoursHS: 0,
      pctRoulant: m.roulant ? 100 : 0,
      joursSem: 5, coutJour: 0,
      dateEntree: entree && entree >= '2027-01-01' ? entree : '',
      dateSortie: sortie && sortie <= '2027-12-31' ? sortie : ''
    });
  }
  return { parAgence, ecartes };
}

// Place une équipe importée dans le jsonb `data` d'un budget existant.
// Budget versionné (déjà ouvert par le REX) : l'équipe va dans les versions SANS écraser
// une équipe que le REX a déjà construite. Budget à plat : l'équipe est remplacée.
// Renvoie { data, remplace } ; remplace = false si rien n'a été modifié.
export function fusionnerEquipe(existingData, employees) {
  const d = JSON.parse(JSON.stringify(existingData || {}));
  if (d.versions) {
    let remplace = false;
    Object.keys(d.versions).forEach((v) => {
      const ver = d.versions[v];
      if (ver && (!ver.employees || !ver.employees.length)) { ver.employees = employees; remplace = true; }
    });
    const out = { versions: d.versions, meta: d.meta };
    if (d.validation) out.validation = d.validation;
    return { data: out, remplace };
  }
  d.employees = employees;
  return { data: d, remplace: true };
}

// ── Variables de décembre 2026 ─────────────────────────────────────
export function parseVariablesDec(rows, agences) {
  const hr = ligneEnTete(rows);
  if (hr < 0) return { erreur: 'En-tête « Agence » non trouvée.', saisies: {}, inconnues: [] };
  const h = rows[hr].map(enTete);
  const col = {
    nom: h.findIndex((x) => x.includes('agence')),
    hs25: h.findIndex((x) => x.includes('25')),
    hs50: h.findIndex((x) => x.includes('50')),
    dimFeries: h.findIndex((x) => x.includes('dimanche') || x.includes('ferie')),
    primes: h.findIndex((x) => x.includes('prime') || x.includes('autre')),
    repas: h.findIndex((x) => x.includes('repas'))
  };
  const saisies = {}, inconnues = [];
  for (let i = hr + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (vide(row[col.nom])) continue;
    const ag = trouverAgence(row[col.nom], agences);
    if (!ag) { inconnues.push(String(row[col.nom]).trim().toUpperCase()); continue; }
    const det = {};
    ['hs25', 'hs50', 'dimFeries', 'primes', 'repas'].forEach((k) => {
      if (col[k] < 0 || vide(row[col[k]])) return; // une cellule vide n'efface rien
      const n = nombre(row[col[k]]);
      if (!isNaN(n)) det[k] = Math.max(0, n);
    });
    saisies[ag.nom] = { ...(saisies[ag.nom] || {}), ...det };
  }
  return { saisies, inconnues };
}
