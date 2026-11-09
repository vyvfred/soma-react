// FAQ du contrôleur de gestion, organisée selon son parcours (7 étapes).
// Port de la version mono-fichier, adaptée aux écrans de cette version.
export const FAQ_CG_SECTIONS = [
  {
    "t": "Démarrer",
    "items": [
      [
        "Quel est mon rôle dans SOMA ?",
        "Vous préparez le cadre de chaque agence avant que les responsables d'exploitation (REX) construisent leur budget, vous saisissez les charges hors personnel, vous suivez l'avancement des agences et vous validez les budgets à la deuxième étape du circuit, avec le directeur financier. Les données que vous posez (historiques, taux, masse salariale non-roulante) sont verrouillées côté REX : elles font référence."
      ],
      [
        "Dans quel ordre préparer le réseau ?",
        "Suivez les 7 étapes du parcours CG, dans cet ordre : <b>1. Données agences</b> (références, taux, masse salariale non-roulante, ratio de maintien) ; <b>2. Périodes de paie</b> (vérifier le calendrier) ; <b>3. Variables déc. 2026</b> (variables payées en janvier) ; <b>4. Affectation DR</b> ; <b>5. Charges CG</b>, agence par agence ; <b>6. Suivre le réseau</b> (consolidation, vue comparative, graphiques) ; <b>7. Budgets à valider</b>. Les étapes 1 à 4 se font une fois pour tout le réseau, de préférence avant que les REX commencent. L'étape 5 peut se faire en parallèle du travail des REX."
      ],
      [
        "Comment savoir où j'en suis ?",
        "Le Tableau de bord affiche votre parcours en 7 étapes avec l'état de chacune (par exemple « 18/26 agences ») et un bouton pour reprendre là où vous en êtes. En haut de chaque écran du parcours, un encadré vous rappelle l'étape, ce qu'il faut faire, quand elle est terminée, et vous mène à l'étape suivante. Vous pouvez le replier ; il se souvient de votre choix. Son bouton « ? Aide détaillée » ouvre la bonne question de cette aide."
      ],
      [
        "Mes saisies sont-elles enregistrées automatiquement ?",
        "Cela dépend de l'écran. <b>Données agences</b> et <b>Variables déc. 2026</b> : cliquez sur « Enregistrer » ; tant que ce n'est pas fait, rien n'est sauvegardé (les lignes modifiées sont signalées « non enregistré »). <b>Charges CG</b> et <b>Périodes de paie</b>, sur l'agence ouverte : enregistrement automatique moins d'une seconde après la dernière modification. <b>Affectation DR</b> : enregistrée dès que vous choisissez un DR."
      ]
    ]
  },
  {
    "t": "Étape 1 — Données agences",
    "items": [
      [
        "Comment bien préparer les références des agences ?",
        "Pour chaque agence : le CA 2025 et 2026, le TXR 2026 (CA par heure travaillée), le taux d'absentéisme cible (maladie et accident du travail), le taux horaire brut au 1er janvier et au 1er juin, le taux de charges patronales des roulants, et la ligne de masse salariale non-roulante (salaire brut mensuel total et taux de charges). SOMA calcule le coût horaire chargé, affiché en fin de ligne (avec celui de juin). Ces données servent de socle au REX et de point de comparaison entre agences."
      ],
      [
        "Que se passe-t-il quand je clique sur « Enregistrer » ?",
        "Seuls les champs que vous avez modifiés sont enregistrés. Ils vont dans le budget de l'agence (toutes ses versions V1, V2, V3), le coût horaire est recalculé, et les champs de référence sont verrouillés côté REX. Le ratio de maintien de salaire est recopié dans toutes les agences qui ont un budget ; une agence créée plus tard le reprend à son ouverture. Si l'agence modifiée est celle que vous avez ouverte, son écran est mis à jour aussitôt. Un message indique le nombre d'agences enregistrées, et le nom de celles qui auraient été refusées par le serveur."
      ],
      [
        "Comment saisir la masse salariale non-roulante ?",
        "Une seule ligne par agence : le salaire brut mensuel total des non-roulants (régulateurs, responsables, administratifs et quote-part du DR) et leur taux de charges. SOMA en déduit le coût mensuel chargé. Cette ligne unique évite qu'un REX puisse déduire le salaire de son DR en consultant le budget. Elle se saisit dans Données agences ou sur l'écran Charges CG de l'agence. Sur les paies par période, elle compte pour un salaire mensuel par mois de paie, diminué de la part non maintenue des absences. Si un régulateur ou un responsable a une part roulante dans l'écran Équipe (par exemple 30 %), cette part est déjà comptée dans la masse salariale roulante : retirez-la de la ligne non-roulants pour ne pas la compter deux fois."
      ],
      [
        "Où régler le ratio de maintien de salaire ?",
        "En haut de l'écran Données agences. C'est un paramètre unique pour tout le réseau : la part du salaire que l'entreprise continue de payer pendant un arrêt maladie ou AT. Il est recopié dans toutes les agences à l'enregistrement, et repris automatiquement par une agence dont le budget est créé plus tard. Tant qu'il est vide, SOMA déduit les absences à 100%, ce qui sous-estime la masse salariale des agences à fort absentéisme."
      ],
      [
        "Pourquoi deux taux horaires ?",
        "Le Smic est revalorisé en général au 1er janvier, et parfois en cours d'année. Le taux du 1er janvier s'applique aux heures de janvier à mai, celui du 1er juin aux heures de juin à décembre. Laissez le taux de juin vide s'il n'y a pas de revalorisation : celui de janvier s'applique alors toute l'année."
      ],
      [
        "Peut-on importer les données ou les équipes depuis Excel ?",
        "Pas encore dans cette version de SOMA : les imports Excel (données agences, registre RH) existent dans la version actuelle et seront ajoutés ici. En attendant, saisissez ou ajustez les valeurs directement dans le tableau des Données agences ; les équipes se saisissent sur l'écran Équipe de chaque agence."
      ],
      [
        "Les équipes ont été importées : que se passe-t-il si je réimporte le registre ?",
        "Les équipes de toutes les agences ont été chargées à partir du registre du personnel. Un nouvel import ne remplace jamais une équipe déjà construite : seules les versions de budget dont l'équipe est vide sont remplies, et SOMA vous liste les agences non remplacées. Les REX gardent la main pour ajouter ou retirer des salariés."
      ],
      [
        "Quel calendrier scolaire SOMA utilise-t-il ?",
        "Le calendrier officiel de l'Éducation nationale (2026-2027 puis 2027-2028), selon la zone de l'agence (A, B ou C) : fin des vacances de Noël le 3 janvier, vacances d'hiver et de printemps selon la zone, été du 3 juillet au 1er septembre, Toussaint du 23 octobre au 7 novembre, Noël à partir du 18 décembre 2027. Les jours de reprise des cours sont des jours de semaine normaux. Les 11 jours fériés de 2027 sont appliqués."
      ]
    ]
  },
  {
    "t": "Étape 2 — Périodes de paie",
    "items": [
      [
        "Comment fonctionnent les périodes de paie ?",
        "Chaque mois de paie collecte les variables d'une période qui ne coïncide pas avec le mois civil (par défaut, la paie de janvier couvre du 7 décembre 2026 au 10 janvier 2027). SOMA rattache le coût des heures et des variables à la bonne période. La paie de janvier comprend donc le salaire de base des roulants du 7 au 31 décembre 2026 (calculé avec l'équipe présente fin 2026 et le coût horaire de janvier) en plus des variables de décembre saisies. Chaque trimestre compte un mois de paie à 5 semaines (janvier, avril, juillet, octobre). On ne garde que 4 semaines de variables par mois : les heures supplémentaires de la 5e semaine sont lissées sur le trimestre (le mois à 5 semaines est diminué des 2/3 de cette semaine, chacun des deux mois suivants en reçoit 1/3)."
      ],
      [
        "Les dates s'appliquent-elles à toutes les agences ?",
        "Non : les périodes sont propres à chaque agence. Choisissez l'agence dans le sélecteur « Agence ouverte » en haut de l'écran Périodes de paie, puis vérifiez ou corrigez ses dates ; la modification est enregistrée automatiquement. Si le calendrier standard correspond à votre paie, il n'y a rien à faire. « Réinitialiser le calendrier par défaut » remet le calendrier standard sur l'agence ouverte."
      ],
      [
        "Pourquoi la masse salariale ne colle pas au temps travaillé du mois ?",
        "Parce que la paie suit ses propres périodes, décalées par rapport aux mois civils, et qu'elle intègre des éléments variables (heures supplémentaires, indemnités) rattachés à la période où ils sont payés, pas à celle où ils sont travaillés."
      ]
    ]
  },
  {
    "t": "Étape 3 — Variables de décembre 2026",
    "items": [
      [
        "Comment saisir les variables de paie de décembre 2026 ?",
        "La paie de janvier 2027 règle les variables de la fin de décembre 2026. Dans l'écran Variables déc. 2026, saisissez pour chaque agence les montants bruts du réalisé : heures supplémentaires à 25% et à 50%, dimanches et fériés, primes et autres variables, indemnités repas. SOMA ajoute les charges patronales de l'agence aux éléments de salaire (pas aux indemnités repas) et reporte le total sur le mois de paie de janvier, et lui seul. Cliquez sur « Enregistrer ». Si le taux de charge de l'agence change ensuite, le total est recalculé."
      ],
      [
        "Pourquoi une agence est-elle « sans taux de charge » ?",
        "Son taux de charges patronales n'est pas encore renseigné dans Données agences. Le total affiché ne contient alors que les montants bruts, sans charges. Renseignez le taux à l'étape 1 : le total des variables se recalcule tout seul, sans ressaisie."
      ]
    ]
  },
  {
    "t": "Étape 4 — Affectation DR",
    "items": [
      [
        "Comment fonctionne l'affectation des DR ?",
        "Dans l'écran Affectation DR, choisissez pour chaque agence son directeur régional dans la liste. L'affectation est enregistrée immédiatement. Elle détermine qui valide le budget de l'agence à la première étape du circuit, et ce que le DR voit dans sa consolidation régionale. Une agence sans DR ne peut pas franchir la première étape de validation."
      ]
    ]
  },
  {
    "t": "Étape 5 — Charges par agence",
    "items": [
      [
        "Comment préparer les charges de tout le réseau en une fois ?",
        "Écran « Charges CG », carte « Classeur des charges du réseau ». « Télécharger le classeur » produit un fichier Excel pré-rempli avec ce qui est déjà saisi dans SOMA. Feuille « Réseau » : une ligne par poste, une colonne par agence et par structure. Saisissez un montant annuel (réparti « ÷ 12 » ou « prorata CA » selon la colonne Répartition de la ligne) ou un pourcentage du CA (« 3,2 % »). Une case vide ne change rien ; 0 met le poste à zéro. Feuille « Mensuel », facultative : un poste d'une agence saisi mois par mois. « Importer le classeur » affiche ensuite, par agence, le nombre de postes modifiés et les cases ignorées (agence ou poste inconnus, valeur illisible) ; rien n'est enregistré avant votre confirmation. Les charges s'appliquent à toutes les versions du budget de chaque agence ; SOMA vous demande une confirmation de plus si des budgets sont déjà en validation. Le reste des budgets (équipe, présence, références) n'est jamais modifié."
      ],
      [
        "Comment saisir les charges d'une agence ?",
        "Choisissez l'agence dans le sélecteur « Agence ouverte ». En haut de l'écran Charges CG, le bloc « Paramétrage salarial » reprend les taux horaires et la ligne non-roulante des Données agences ; vous pouvez les ajuster ici. Puis, pour chaque poste, choisissez le <b>mode</b> : saisie par mois, montant annuel (réparti en douze mois égaux ou au prorata du CA mensuel, selon la clé), ou pourcentage du CA ; et le <b>type</b>, fixe ou variable. La saisie est enregistrée automatiquement. Les lignes CA et Charges de personnel sont calculées par SOMA."
      ],
      [
        "Fixe ou variable : à quoi ça sert ?",
        "Ce classement ne change pas le résultat. Il sert à l'analyse : l'écran Contrôles et la synthèse séparent les charges fixes des charges variables, pour juger la sensibilité du résultat à l'activité."
      ],
      [
        "Que comprend exactement la masse salariale du prévisionnel ?",
        "Pour les roulants : les heures travaillées au coût horaire chargé du mois (taux du 1er janvier, puis du 1er juin), les heures supplémentaires selon leur majoration réelle (25% ou 50%), la part de salaire maintenue pendant les arrêts maladie et AT, et la provision de 10% de prime de précarité sur les heures en CDD. Pour les non-roulants : la ligne globale mensuelle, diminuée de la part non maintenue des absences. S'y ajoutent les heures supplémentaires des improductifs, les indemnités et, sur la paie de janvier, les variables de décembre 2026. C'est le coût complet du personnel, charges patronales comprises."
      ],
      [
        "À quoi sert l'écran Contrôles ?",
        "Sur l'agence ouverte, il récapitule charges fixes, charges variables, charges de personnel, heures supplémentaires et résultat, et liste les contrôles de cohérence. Ces contrôles ne bloquent rien. Il signale aussi le paramétrage salarial incomplet : ligne non-roulante absente, ratio de maintien vide, taux de juin absent."
      ],
      [
        "Comment saisir Formation, Exceptionnel, Réseau adhérent et Siège ?",
        "Ces quatre structures se gèrent comme une agence que vous complétez entièrement : ouvrez-la avec « Ouvrir une agence » (elles sont en fin de liste), puis saisissez dans « Charges CG » tout son compte de résultat, chiffre d'affaires et charges de personnel compris, mois par mois ou en montant annuel. Elles n'ont ni équipe, ni calendrier, ni REX. Elles entrent dans le compte de résultat consolidé du réseau (écran Consolidation)."
      ],
      [
        "Où saisir l'impôt sur les sociétés et la participation ?",
        "Sur le Siège uniquement : ouvrez SIEGE, écran « Charges CG », lignes « Impôt sur les sociétés » et « Participation aux bénéfices ». Le résultat net = résultat courant avant impôt + résultat exceptionnel − impôt sur les sociétés − participation. Ces lignes n'existent pas pour les agences et apparaissent dans le consolidé réseau."
      ],
      [
        "Où saisir la quote-part MS siège et la régulation mutualisée ?",
        "Deux lignes, juste sous « Charges de personnel », sur chaque agence : « Quote-part MS siège » et « Quote-part régulation mutualisée ». Saisissez le montant annuel de l'agence obtenu avec votre clé de répartition : SOMA le lisse à l'identique sur les 12 mois (répartition ÷ 12) et le déduit de l'EBE. Mettez 0 pour une agence non concernée par la régulation mutualisée : la ligne reste en place si le périmètre évolue. Le plus rapide est le classeur « Charges du réseau » : une colonne par agence. Ces lignes n'existent pas pour les structures ; le Siège reste à 0 en charges de personnel puisque tout son coût est ventilé sur les agences. La ligne « Charges de personnel » reste la masse salariale propre de l'agence."
      ]
    ]
  },
  {
    "t": "Étape 6 — Suivre le réseau",
    "items": [
      [
        "Comment suivre l'avancement des agences ?",
        "Le Tableau de bord affiche votre parcours et l'avancement de la préparation (données de référence, charges saisies). L'écran Consolidation donne l'état de chaque agence (non commencé, brouillon, soumis, validé) et ses indicateurs clés."
      ],
      [
        "Comment repérer une agence qui sort de l'ordinaire ?",
        "SOMA compare chaque agence à la médiane du réseau et signale les écarts notables. Une agence dont un indicateur s'éloigne fortement de ses pairs est mise en évidence. Cela vous permet de concentrer votre attention là où elle est utile."
      ],
      [
        "À quoi sert la vue comparative ?",
        "Elle met les agences côte à côte sur les mêmes indicateurs : TXR, absentéisme cible, coût horaire, ETP roulants, part des heures supplémentaires dans le CA. Les médianes du réseau sont affichées en haut ; les valeurs en orange s'en écartent significativement. Une agence n'est jamais bonne ou mauvaise dans l'absolu : elle l'est par rapport à ses pairs et à son contexte."
      ],
      [
        "À quoi servent les graphiques ?",
        "Ils donnent une vision d'ensemble : l'évolution du CA par agence (réalisé 2025 et 2026, budgété 2027) pour repérer les trajectoires atypiques, et un nuage qui situe chaque agence selon son taux de charge. Utile pour préparer une présentation à la direction."
      ],
      [
        "Comment savoir où en sont les budgets en préparation ?",
        "L'écran Consolidation affiche, pour chaque agence, une colonne « Avancement » : la construction du budget par le REX, sur cinq jalons à parts égales (objectif fixé, références CA, équipe, absentéisme mensuel, mois validés). Survolez la barre pour le détail ; le nombre de mois validés et la part des charges saisies par le contrôle de gestion sont rappelés dessous. Un brouillon sans modification depuis une semaine ou plus est signalé en orange, et le commentaire en haut de l'écran donne l'avancement moyen des brouillons et la liste des agences à relancer. Un directeur régional voit ses agences ; la direction, tout le réseau. L'export Excel reprend ces colonnes."
      ]
    ]
  },
  {
    "t": "Étape 7 — Valider",
    "items": [
      [
        "Mon rôle dans le circuit de validation ?",
        "Le circuit compte trois étapes : le DR de l'agence, puis le contrôleur de gestion et le directeur financier ensemble, puis la Direction. Un budget arrive dans votre écran « Budgets à valider » une fois validé par le DR. Les deux validations, la vôtre et celle du directeur financier, sont nécessaires pour qu'il passe à la Direction."
      ],
      [
        "Comment valider ou refuser un budget ?",
        "Dans « Budgets à valider », chaque budget se présente en fiche : point de départ, décisions du REX, résultat. Rédigez votre commentaire (obligatoire), puis cliquez sur « ✓ Valider » ou « ✕ Refuser ». Votre décision est enregistrée avec la date et votre nom."
      ],
      [
        "Que se passe-t-il après un refus ?",
        "Le budget revient au REX en brouillon, et toutes les validations déjà obtenues sont effacées, y compris celle du DR. Le REX voit votre motif dans un bandeau, corrige et resoumet ; un nouveau cycle commence au DR. L'historique des refus est conservé et reste visible sur la fiche."
      ]
    ]
  }
];
