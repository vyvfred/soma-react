# SOMA React — Mise à niveau novembre 2026

Report dans soma-react des évolutions et corrections faites sur la version
mono-fichier (vyvfred/SOMA) début novembre 2026. Les deux versions partagent la
même base Supabase.

## Corrections (défauts présents dans les deux versions)
- **Coût des HS improductives en période de paie** : variable `w` non définie dans
  `payrollPayMonth` (plantage du compte de résultat). Corrigé : `mainMonth(a, r.week)`.
- **Données agences enregistrées hors de la version lue par le REX** : la fusion se
  faisait au premier niveau du jsonb. Nouveau module `domain/refCG.js` : écriture
  dans chaque version (V1/V2/V3), récupération des champs orphelins, état de
  validation conservé. Seuls les champs saisis sont envoyés.
- **Historique des refus effacé** à la première correction du REX : `buildBudgetData`
  conserve désormais `data.validation`.
- **Budgets jamais soumis « à valider »** chez le DR : filtrés dans l'écran Validation.
- **Compteur « Charges saisies »** toujours à 0 (champ `cgCharges` inexistant) :
  `chargesCGSaisies()`.
- **Couleurs des alertes** de l'écran Contrôles (niveaux `warning` / `critique`).
- **Agence de démonstration** retirée de la liste des agences.

## Paramétrage salarial 2027 (réunion de paramétrage des taux et coûts salariaux)
Moteur (`domain/calculations.js`, fonctions reprises à l'identique du mono-fichier) :
- taux horaire au 1er janvier et au 1er juin (`chMois`, `costHourJuin`) ;
- ratio de maintien de salaire sur les arrêts maladie / AT (`ratioMaintien`) ;
- absentéisme unique roulants / improductifs (`cpGeneres`) ;
- provision de 10 % de prime de précarité sur les heures CDD (`partCDDSemaine`) ;
- masse salariale non-roulante en une ligne globale, quote-part DR incluse
  (`msNRMensuel`, `msNRMois`), qui remplace le coût par jour et la ligne DR.

Écrans : colonnes et ratio réseau dans Données agences, bloc « Paramétrage
salarial » dans Charges CG, alertes de paramétrage dans Contrôles, plus de coût par
jour ni de ligne DR dans Équipe.

## Variables de paie de décembre 2026
Nouvel écran CG `variablesdec` : saisie brute par rubrique (HS 25 %, HS 50 %,
dimanches et fériés, primes, repas), charges patronales appliquées sauf aux repas,
total reporté sur la paie de janvier (`varDec2026Total`). Un ancien montant global
reste compté. L'écran Périodes de paie affiche un résumé et un lien.

## Parcours guidé du CG
- `domain/cgParcours.js` : 7 étapes, état calculé sur le réseau.
- `components/CgGuide.jsx` : encadré en haut de chaque écran du parcours, parcours
  complet sur le Tableau de bord, bouton « Aide détaillée » vers la bonne question.
- `domain/faqCg.js` : FAQ du CG rangée par étapes (27 questions), adaptée aux écrans
  de cette version. FAQ REX : 4 questions ajoutées.

## Vérification
- 120 tests au vert (89 d'origine + 31 nouveaux : `parametrage2027`, `refCG`,
  `cgParcours`).
- Moteur comparé au mono-fichier sur trois scénarios (paramétrage complet, ancien
  modèle, mois civil) : résultats identiques au centime.
- Parcours CG complet joué dans un navigateur contre une base simulée : 21 contrôles
  au vert.

## Pas encore porté (existe dans le mono-fichier)
Imports Excel (Données agences, registre RH), export Excel de la consolidation,
vue Supervision du tableau de bord, bloc des HS improductives de l'écran Présence.
