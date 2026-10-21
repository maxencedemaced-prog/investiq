// api/_dossier.js — Reels « Dossier décodé » : scripts écrits à la main (voix off + visuel de chaque scène).
// Le rendu se fait avec video/src/Dossier.jsx (style 'dossier'), la voix avec ElevenLabs (voiceOver de _reel.js).
// Règles : pédagogie seulement, chiffres présentés comme des exemples avec un rendement hypothétique, jamais de promesse de gain.
// Chiffres vérifiés : 100 €/mois à 7 %/an (taux mensuel = 7 %/12) → 40 ans : 262 481 €, 30 ans : 121 997 € ; règle de 72 à 6 % → 12 ans.
export const DOSSIERS = {
  'interets-composes': {
    num: '004',
    title: 'INTÉRÊTS COMPOSÉS',
    chapters: ['LE PIÈGE', 'LE MÉCANISME', 'LA RÈGLE'],
    caption: 'Deux personnes, la même somme chaque mois… et l’une finit avec plus de deux fois plus que l’autre. Le secret a un nom : les intérêts composés. 📁\n\nExemple pédagogique avec un rendement hypothétique de 7 %/an : les rendements ne sont pas garantis et investir comporte un risque de perte en capital.\n\nCalcule ton propre scénario gratuitement sur kapitaro.fr',
    hashtags: '#interetscomposes #epargne #investir #financepersonnelle #bourse #etf #argent #kapitaro',
    beats: [
      { chapter: 0, visual: 'title', hud: '×2', hudLabel: 'ÉCART FINAL', kw: [['DEUX PERSONNES', 'personnes'], ['MÊME SOMME', 'somme'], ['MÊME PLACEMENT', 'placement'], ['×2 À L’ARRIVÉE', 'deux']], say: 'Deux personnes. Même somme chaque mois. Même placement. Pourtant, l’une finit avec plus de deux fois plus que l’autre.' },
      { chapter: 0, visual: 'compare', hud: '10 ANS', hudLabel: 'D’AVANCE', kw: [['LÉA · 25 ANS', 'cinq'], ['TOM · 35 ANS', 'trente'], ['100 € / MOIS', 'euros'], ['JUSQU’À 65 ANS', 'soixante']], say: 'Léa commence à vingt-cinq ans. Tom, à trente-cinq. Chacun met cent euros par mois, jusqu’à soixante-cinq ans.' },
      { chapter: 1, visual: 'snowball', hud: 'EN MARCHE', hudLabel: 'EFFET BOULE DE NEIGE', hudColor: 'green', kw: [['LE SECRET', 'secret'], ['INTÉRÊTS COMPOSÉS', 'composés'], ['GAINS SUR GAINS', 'rapportent'], ['BOULE DE NEIGE', 'neige']], say: 'Le secret, ce sont les intérêts composés. Tes gains rapportent à leur tour des gains, comme une boule de neige qui grossit en roulant.' },
      { chapter: 1, visual: 'curve', hud: '7 %/AN', hudLabel: 'RENDEMENT D’EXEMPLE', hudColor: 'green', kw: [['AU DÉBUT…', 'début'], ['ÇA DÉCOLLE', 'décolle'], ['LE TEMPS', 'temps']], say: 'Au début, ça ne se voit presque pas. Puis la courbe décolle : c’est le temps qui fait le travail.' },
      { chapter: 1, visual: 'result', hud: '+12 000 €', hudLabel: 'VERSÉS EN PLUS PAR LÉA', leftValue: 262481, rightValue: 121997, kw: [['7 % / AN (EXEMPLE)', 'sept'], ['≈ 262 000 €', 'soixante-deux'], ['≈ 122 000 €', 'vingt-deux'], ['+12 000 € VERSÉS', 'douze']], say: 'Avec un rendement d’exemple de sept pour cent par an, Léa finit avec environ deux cent soixante-deux mille euros. Tom, cent vingt-deux mille. Elle n’a versé que douze mille euros de plus.' },
      { chapter: 2, visual: 'rule', hud: '72', hudLabel: 'LA RÈGLE À RETENIR', hudColor: 'green', rate: '6 %', years: '12 ANS', kw: [['RÈGLE DE 72', 'règle'], ['DOUBLER', 'doubler'], ['≈ 12 ANS', 'douze']], say: 'Retiens la règle de soixante-douze : divise soixante-douze par le rendement annuel. Tu obtiens le nombre d’années pour doubler ton capital. À six pour cent, environ douze ans.' },
      { chapter: 2, visual: 'end', hud: 'DÉCODÉ', hudLabel: 'DOSSIER CLOS', hudColor: 'green', say: 'Les rendements ne sont jamais garantis. Mais le temps, lui, joue pour toi. Calcule ton scénario gratuitement sur Kapitaro.' },
    ],
  },

  // Chiffres vérifiés : 200 €/mois pendant 30 ans, rendement d'exemple 6 %/an avant frais → frais 0,2 % (net 5,8 %) : 193 387 € ;
  // frais 2 % (net 4 %) : 138 810 € ; écart 54 577 € ; versé 72 000 €.
  // Version PUB courte (≈ 13 s) du dossier intérêts composés : résultat d'entrée, finit sur le simulateur d'objectif. Mêmes chiffres vérifiés que 004.
  'pub-lea-tom': {
    num: '008',
    title: 'LÉA ET TOM',
    chapters: ['LE RÉSULTAT', 'LA RAISON', 'TON TOUR'],
    speed: 1.1,
    caption: 'Même somme, même placement… et pourtant deux fois plus à l’arrivée. 📁\n\nExemple pédagogique avec un rendement hypothétique de 7 %/an : les rendements ne sont pas garantis et investir comporte un risque de perte en capital.\n\nSimule ton objectif gratuitement sur kapitaro.fr',
    hashtags: '#interetscomposes #epargne #investir #financepersonnelle #kapitaro',
    beats: [
      { chapter: 0, visual: 'result', hud: '×2', hudLabel: 'ÉCART FINAL', leftValue: 262481, rightValue: 121997, kw: [['100 € / MOIS', 'euros'], ['MÊME PLACEMENT', 'placement'], ['×2 POUR LÉA', 'fois']], say: 'Cent euros par mois, même placement. Léa finit avec deux fois plus que Tom.' },
      { chapter: 1, visual: 'compare', hud: '10 ANS', hudLabel: 'D’AVANCE', kw: [['SEULE DIFFÉRENCE', 'différence'], ['10 ANS PLUS TÔT', 'dix']], say: 'Sa seule différence ? Elle a commencé dix ans plus tôt.' },
      { chapter: 2, visual: 'end', hud: 'À TOI', hudLabel: 'TON SCÉNARIO', hudColor: 'green', cta: 'Simule ton objectif · kapitaro.fr', note: 'Exemple : 100 €/mois de 25 ou 35 ans à 65 ans, rendement hypothétique de 7 %/an.', say: 'Et toi, ça donne quoi ? Simule ton objectif gratuitement sur Kapitaro.' },
    ],
  },
  'frais-caches': {
    num: '005',
    title: 'FRAIS CACHÉS',
    chapters: ['LE PIÈGE', 'LE CALCUL', 'LA PARADE'],
    caption: '1 %, 2 % de frais… ça paraît rien. Sur 30 ans, ça peut faire une différence de plus de 50 000 €. 📁\n\nExemple pédagogique : 200 €/mois pendant 30 ans, rendement hypothétique de 6 %/an avant frais. Les rendements ne sont pas garantis et investir comporte un risque de perte en capital.\n\nCalcule ce que les frais te coûtent avec le calculateur gratuit sur kapitaro.fr',
    hashtags: '#frais #epargne #investir #etf #assurancevie #financepersonnelle #argent #kapitaro',
    beats: [
      { chapter: 0, visual: 'title', hud: '−54 577 €', hudLabel: 'PARTIS EN FRAIS', kw: [['1 %, 2 %…', 'pour'], ['ÇA PARAÎT RIEN', 'rien'], ['30 ANS', 'trente'], ['> 50 000 €', 'cinquante']], say: 'Un pour cent, deux pour cent… ça paraît rien. Pourtant, sur trente ans, des frais peuvent te coûter plus de cinquante mille euros.' },
      { chapter: 0, visual: 'leak', hud: '2 %/AN', hudLabel: 'FRAIS D’EXEMPLE', kw: [['CHAQUE ANNÉE', 'année'], ['TOUT TON CAPITAL', 'capital'], ['DISCRÈTEMENT', 'discrètement'], ['MÊME EN BAISSE', 'baisse']], say: 'Les frais de gestion sont prélevés chaque année, sur tout ton capital. Discrètement. Même les années où ton placement baisse.' },
      { chapter: 1, visual: 'compare', hud: '200 €/MOIS', hudLabel: 'MÊME VERSEMENT', hudColor: 'green', left: 'PLACEMENT A', leftSub: 'FRAIS 0,2 %/AN', right: 'PLACEMENT B', rightSub: 'FRAIS 2 %/AN', kw: [['DEUX PLACEMENTS', 'placements'], ['200 € / MOIS', 'euros'], ['30 ANS', 'trente'], ['SEULE DIFFÉRENCE', 'différence']], say: 'Prends deux placements identiques. Deux cents euros par mois, pendant trente ans. Seule différence : les frais.' },
      { chapter: 1, visual: 'result', hud: '−54 577 €', hudLabel: 'D’ÉCART AU BOUT DE 30 ANS', left: 'FRAIS 0,2 %', leftSub: '72 000 € VERSÉS', right: 'FRAIS 2 %', rightSub: '72 000 € VERSÉS', leftValue: 193387, rightValue: 138810, kw: [['6 % AVANT FRAIS', 'six'], ['≈ 193 000 €', 'quatre-vingt-treize'], ['≈ 139 000 €', 'trente-neuf'], ['−54 000 €', 'cinquante-quatre']], say: 'Avec un rendement d’exemple de six pour cent avant frais, le premier finit vers cent quatre-vingt-treize mille euros. Le second, cent trente-neuf mille. Cinquante-quatre mille euros partis en frais.' },
      { chapter: 2, visual: 'rule', hud: 'DIC', hudLabel: 'LE DOCUMENT À LIRE', hudColor: 'green', rows: [[['FRAIS', 'g', 130]], [['COURANTS', 'w', 120]]], caption: 'DOCUMENT D’INFORMATIONS CLÉS (DIC) DE CHAQUE PLACEMENT', kw: [['LA PARADE', 'parade'], ['FRAIS COURANTS', 'courants'], ['LE DIC', 'informations'], ['COMPARE', 'compare']], say: 'La parade : regarde toujours les frais courants, indiqués dans le document d’informations clés de chaque placement. Et compare avant de choisir.' },
      { chapter: 2, visual: 'end', hud: 'DÉCODÉ', hudLabel: 'DOSSIER CLOS', hudColor: 'green', cta: 'Calcule tes frais · kapitaro.fr', note: 'Exemple pédagogique avec un rendement hypothétique de 6 %/an avant frais.', say: 'Sur le long terme, chaque pour cent compte. Calcule ce que les frais te coûtent avec le calculateur gratuit de Kapitaro.' },
    ],
  },

  // Chiffres vérifiés : inflation d'exemple 3 %/an → 1 000 € valent 744 € d'aujourd'hui au bout de 10 ans (1000 / 1,03^10) ;
  // règle de 72 : 72 / 3 = 24 ans pour que les prix doublent.
  'inflation': {
    num: '006',
    title: 'INFLATION',
    chapters: ['LE PIÈGE', 'LE MÉCANISME', 'LA RÈGLE'],
    caption: 'Ton argent ne bouge pas sur ton compte… et pourtant il achète un peu moins chaque année. Le coupable : l’inflation. 📁\n\nExemple pédagogique avec une inflation hypothétique de 3 %/an. Investir comporte un risque de perte en capital.\n\nCalcule l’effet de l’inflation avec le calculateur gratuit sur kapitaro.fr',
    hashtags: '#inflation #epargne #pouvoirdachat #investir #financepersonnelle #argent #kapitaro',
    beats: [
      { chapter: 0, visual: 'title', hud: '−26 %', hudLabel: 'POUVOIR D’ACHAT EN 10 ANS', kw: [['IL DORT', 'dort'], ['IL NE BOUGE PAS', 'bouge'], ['UN PEU MOINS', 'moins']], say: 'Ton argent dort sur un compte. Il ne bouge pas. Pourtant, chaque année, il achète un peu moins de choses.' },
      { chapter: 1, visual: 'shrink', hud: '3 %/AN', hudLabel: 'INFLATION D’EXEMPLE', shrinkFrom: 1000, shrinkTo: 744, shrinkYears: 10, kw: [['L’INFLATION', 'inflation'], ['3 % / AN', 'trois'], ['1 000 €', 'mille'], ['≈ 744 €', 'quarante-quatre']], say: 'C’est l’inflation : la hausse des prix. Avec trois pour cent par an, mille euros n’achètent plus, dix ans plus tard, que l’équivalent de sept cent quarante-quatre euros d’aujourd’hui.' },
      { chapter: 1, visual: 'result', hud: '−256 €', hudLabel: 'DE POUVOIR D’ACHAT', left: 'AUJOURD’HUI', leftSub: 'CE QUE TU AS', right: 'DANS 10 ANS', rightSub: 'CE QUE ÇA ACHÈTE', leftValue: 1000, rightValue: 744, kw: [['TOUJOURS 1 000 €', 'affiche'], ['POUVOIR D’ACHAT', 'pouvoir'], ['−1/4', 'quart']], say: 'Ton solde affiche toujours mille euros. Mais ton pouvoir d’achat, lui, a fondu d’un quart.' },
      { chapter: 2, visual: 'rule', hud: '72', hudLabel: 'LA RÈGLE À L’ENVERS', hudColor: 'green', rows: [[['72', 'g'], ['÷', 'dim', 120], ['3 %', 'w']], [['=', 'dim', 120], ['24 ANS', 'red', 150]]], caption: 'POUR QUE LES PRIX DOUBLENT (ESTIMATION)', kw: [['RÈGLE DE 72', 'règle'], ['À L’ENVERS', 'envers'], ['≈ 24 ANS', 'vingt-quatre']], say: 'La règle de soixante-douze marche aussi à l’envers : divise soixante-douze par l’inflation. À trois pour cent, les prix doublent en vingt-quatre ans environ.' },
      { chapter: 2, visual: 'leak', hud: '< INFLATION', hudLabel: 'UNE ÉPARGNE QUI S’ÉRODE', leakLabel: 'RENDEMENT < INFLATION', leakSub: 'LE POUVOIR D’ACHAT S’ÉRODE', kw: [['MOINS QUE L’INFLATION', 'inflation'], ['PERD DE LA VALEUR', 'valeur'], ['SANS BAISSER', 'baisser']], say: 'C’est pour ça qu’une épargne qui rapporte moins que l’inflation perd de la valeur, même sans jamais baisser.' },
      { chapter: 2, visual: 'end', hud: 'DÉCODÉ', hudLabel: 'DOSSIER CLOS', hudColor: 'green', cta: 'Calcule l’effet · kapitaro.fr', note: 'Exemple pédagogique avec une inflation hypothétique de 3 %/an.', say: 'Comprendre l’inflation, c’est la première étape pour en tenir compte dans ton épargne. Calcule son effet avec le calculateur gratuit de Kapitaro.' },
    ],
  },

  // Chiffres vérifiés : 100 €/mois, prix d'exemple 10 € / 8 € / 5 € / 10 € → 10 + 12,5 + 20 + 10 = 52,5 parts pour 400 € ;
  // prix moyen payé 400 / 52,5 = 7,62 € ; moyenne des prix 8,25 €.
  'dca': {
    num: '007',
    title: 'INVESTIR CHAQUE MOIS',
    chapters: ['LE PIÈGE', 'LA MÉTHODE', 'LE BILAN'],
    caption: 'Acheter au plus bas, revendre au plus haut… personne n’y arrive vraiment. L’investissement programmé (DCA) propose une autre méthode. 📁\n\nExemple pédagogique avec des prix fictifs. Le DCA ne garantit aucun gain et investir comporte un risque de perte en capital.\n\nSimule ton investissement programmé gratuitement sur kapitaro.fr',
    hashtags: '#dca #investissementprogramme #epargne #investir #etf #bourse #financepersonnelle #kapitaro',
    beats: [
      { chapter: 0, visual: 'title', hud: '?', hudLabel: 'LE BON MOMENT', kw: [['AU PLUS BAS', 'bas'], ['AU PLUS HAUT', 'haut'], ['PERSONNE', 'personne']], say: 'Acheter au plus bas, revendre au plus haut. Tout le monde en rêve. Personne n’y arrive vraiment.' },
      { chapter: 1, visual: 'dca', hud: '100 €/MOIS', hudLabel: 'MONTANT FIXE', hudColor: 'green', showParts: false, kw: [['MÊME SOMME', 'somme'], ['CHAQUE MOIS', 'mois'], ['QUOI QU’IL ARRIVE', 'arrive'], ['SANS DEVINER', 'chercher']], say: 'L’investissement programmé consiste à investir la même somme, chaque mois, quoi qu’il arrive. Sans chercher le bon moment.' },
      { chapter: 1, visual: 'dca', hud: '52,5 PARTS', hudLabel: 'POUR 400 € INVESTIS', hudColor: 'green', kw: [['10 € → 10 PARTS', 'dix'], ['5 € → 20 PARTS', 'vingt'], ['PLUS DE PARTS', 'achète']], say: 'Exemple : cent euros par mois. Quand le prix est à dix euros, tu obtiens dix parts. Quand il tombe à cinq, vingt parts. Ton argent achète plus de parts quand c’est moins cher.' },
      { chapter: 2, visual: 'rule', hud: '7,62 €', hudLabel: 'PRIX MOYEN PAYÉ', hudColor: 'green', rows: [[['7,62 €', 'g', 140]], [['VS', 'dim', 90], ['8,25 €', 'w', 120]]], caption: 'TON PRIX MOYEN PAYÉ, CONTRE LA MOYENNE DES PRIX (EXEMPLE)', kw: [['PRIX MOYEN', 'moyen'], ['7,62 €', 'sept'], ['8,25 €', 'huit']], say: 'Sur ces quatre mois, ton prix moyen payé tombe à sept euros soixante-deux, alors que la moyenne des prix était de huit euros vingt-cinq.' },
      { chapter: 2, visual: 'rule', hud: '≠', hudLabel: 'PAS DE MIRACLE', rows: [[['LISSER', 'g', 130]], [['≠', 'dim', 100], ['GARANTIR', 'red', 120]]], caption: 'LE DCA RÉDUIT L’EFFET DU MOMENT CHOISI, PAS LE RISQUE', kw: [['AUCUN GAIN GARANTI', 'garantit'], ['TU PERDS AUSSI', 'perds'], ['LISSER', 'lisse'], ['PLUS DE DEVINETTES', 'devinettes']], say: 'Attention, ça ne garantit aucun gain : si le marché baisse longtemps, tu perds aussi. Mais ça lisse ton prix d’achat, et ça t’évite de jouer aux devinettes.' },
      { chapter: 2, visual: 'end', hud: 'DÉCODÉ', hudLabel: 'DOSSIER CLOS', hudColor: 'green', cta: 'Simule le tien · kapitaro.fr', note: 'Exemple pédagogique avec des prix fictifs.', say: 'Régulier, simple, sans stress. Simule ton investissement programmé gratuitement sur Kapitaro.' },
    ],
  },

  // Chiffres vérifiés : 10 000 € à 1,5 %/an pendant 10 ans → 11 605 € (10000 × 1,015^10) ; avec 2 %/an d'inflation,
  // valeur en euros d'aujourd'hui 11 605 / 1,02^10 = 9 520 € ; rendement réel ≈ 1,5 − 2 = −0,5 %/an. Taux d'exemple, pas le taux en vigueur.
  'livret': {
    num: '009',
    title: 'LIVRET : LE FAUX GAIN',
    chapters: ['LE PIÈGE', 'LE CALCUL', 'LA FORMULE'],
    caption: 'Ton livret t’affiche des intérêts chaque année… et pourtant tu peux t’appauvrir. 📁\n\nExemple pédagogique avec un taux de 1,5 %/an et une inflation de 2 %/an hypothétiques (pas les taux en vigueur). Le livret reste utile pour l’argent disponible.\n\nCalcule l’effet de l’inflation avec le calculateur gratuit sur kapitaro.fr',
    hashtags: '#livreta #epargne #inflation #pouvoirdachat #financepersonnelle #argent #kapitaro',
    beats: [
      { chapter: 0, visual: 'title', hud: '−480 €', hudLabel: 'POUVOIR D’ACHAT EN 10 ANS', kw: [['DES INTÉRÊTS', 'intérêts'], ['CHAQUE ANNÉE', 'année'], ['T’APPAUVRIR ?', 'appauvrir']], say: 'Ton livret t’affiche des intérêts chaque année. Pourtant, tu peux quand même t’appauvrir. Comment ?' },
      { chapter: 1, visual: 'result', hud: '+1 605 €', hudLabel: 'AFFICHÉS SUR LE RELEVÉ', left: 'SUR TON RELEVÉ', leftSub: '10 000 € PLACÉS', right: 'CE QUE ÇA ACHÈTE', rightSub: 'EN EUROS D’AUJOURD’HUI', leftValue: 11605, rightValue: 9520, kw: [['1,5 % / AN (EXEMPLE)', 'virgule'], ['≈ 11 600 €', 'onze'], ['2 % D’INFLATION', 'inflation'], ['≈ 9 500 €', 'neuf']], say: 'Exemple : dix mille euros à un virgule cinq pour cent par an. Dix ans plus tard, ton relevé affiche onze mille six cents euros. Mais avec deux pour cent d’inflation par an, ils n’achètent plus que l’équivalent de neuf mille cinq cents euros d’aujourd’hui.' },
      { chapter: 2, visual: 'rule', hud: 'RÉEL', hudLabel: 'LA FORMULE À RETENIR', hudColor: 'green', rows: [[['1,5 %', 'w'], ['−', 'dim', 120], ['2 %', 'red']], [['=', 'dim', 120], ['−0,5 %', 'red', 150]]], caption: 'TON RENDEMENT RÉEL PAR AN (APPROXIMATION)', kw: [['RENDEMENT RÉEL', 'réel'], ['TAUX − INFLATION', 'moins'], ['−0,5 % / AN', 'zéro']], say: 'La formule à retenir : rendement réel égale taux moins inflation. Ici, un virgule cinq moins deux : moins zéro virgule cinq pour cent par an.' },
      { chapter: 2, visual: 'rule', hud: 'UTILE', hudLabel: 'MAIS PAS POUR TOUT', rows: [[['DISPONIBLE', 'g', 120]], [['≠', 'dim', 100], ['RENTABLE', 'w', 120]]], caption: 'UN LIVRET SERT SURTOUT À GARDER DE L’ARGENT DISPONIBLE', kw: [['DISPONIBLE', 'disponible'], ['SANS RISQUE', 'risque'], ['RENDEMENT RÉEL', 'réel']], say: 'Le livret reste très pratique : ton argent est disponible et sans risque de perte. Mais pour un objectif lointain, regarde toujours son rendement réel.' },
      { chapter: 2, visual: 'end', hud: 'DÉCODÉ', hudLabel: 'DOSSIER CLOS', hudColor: 'green', cta: 'Calcule l’effet · kapitaro.fr', note: 'Exemple pédagogique : taux de 1,5 %/an et inflation de 2 %/an hypothétiques.', say: 'Calcule l’effet de l’inflation sur ton épargne avec le calculateur gratuit de Kapitaro.' },
    ],
  },

  // Chiffres vérifiés : 10 000 € − 30 % = 7 000 € ; pour revenir à 10 000 € il faut +42,9 % (10000/7000 − 1) ; après −50 % il faut +100 %.
  'krach': {
    num: '010',
    title: 'LE KRACH',
    chapters: ['LA CHUTE', 'LE PIÈGE', 'LA LEÇON'],
    caption: 'Krach boursier : ton portefeuille perd 30 %. Tu vends, ou tu tiens ? 📁\n\nExemple pédagogique avec une baisse hypothétique de 30 %. Les performances passées ne préjugent pas des performances futures et investir comporte un risque de perte en capital.\n\nConstruis ton plan gratuitement sur kapitaro.fr',
    hashtags: '#krach #bourse #investir #etf #psychologie #financepersonnelle #argent #kapitaro',
    beats: [
      { chapter: 0, visual: 'title', hud: '−30 %', hudLabel: 'BAISSE D’EXEMPLE', kw: [['KRACH', 'krach'], ['−30 %', 'trente'], ['TU VENDS ?', 'vends'], ['TU TIENS ?', 'tiens']], say: 'Krach boursier. Ton portefeuille perd trente pour cent en quelques semaines. Tu vends, ou tu tiens ?' },
      { chapter: 0, visual: 'result', hud: '−3 000 €', hudLabel: 'SUR LE PAPIER', left: 'AVANT', leftSub: 'TON PORTEFEUILLE', right: 'APRÈS LA BAISSE', rightSub: '−30 %', leftValue: 10000, rightValue: 7000, kw: [['10 000 €', 'dix'], ['7 000 €', 'sept'], ['SUR LE PAPIER', 'papier'], ['SI TU VENDS', 'vends']], say: 'Dix mille euros deviennent sept mille. Sur le papier, c’est une perte. Elle ne devient définitive que si tu vends.' },
      { chapter: 1, visual: 'rule', hud: '+43 %', hudLabel: 'POUR REVENIR AU DÉPART', rows: [[['−30 %', 'red', 110], ['→', 'dim', 90], ['+43 %', 'g', 110]], [['−50 %', 'red', 110], ['→', 'dim', 90], ['+100 %', 'g', 110]]], caption: 'HAUSSE NÉCESSAIRE POUR RETROUVER LE POINT DE DÉPART', kw: [['LE PIÈGE', 'piège'], ['+43 %', 'quarante-trois'], ['×2', 'doubler']], say: 'Le piège des pourcentages : après une baisse de trente pour cent, il faut une hausse de quarante-trois pour cent pour revenir au départ. Après une baisse de moitié, il faut doubler.' },
      { chapter: 2, visual: 'compare', hud: 'REBOND', hudLabel: 'CELUI QUI TIENT', hudColor: 'green', left: 'A TENU', leftSub: 'A PU PROFITER DU REBOND', right: 'A VENDU', rightSub: 'PERTE ENCAISSÉE', kw: [['AU PLUS BAS', 'bas'], ['LE REBOND', 'rebond'], ['PARFOIS DES ANNÉES', 'années'], ['RIEN DE GARANTI', 'garantit']], say: 'Celui qui vend au plus bas encaisse la perte et rate souvent le rebond. Les grands indices mondiaux ont fini par remonter après chaque krach, parfois au bout de plusieurs années. Mais le passé ne garantit rien.' },
      { chapter: 2, visual: 'end', hud: 'DÉCODÉ', hudLabel: 'DOSSIER CLOS', hudColor: 'green', cta: 'Fais ton plan · kapitaro.fr', note: 'Exemple pédagogique avec une baisse hypothétique de 30 %. Les performances passées ne préjugent pas des performances futures.', say: 'Un bon antidote à la panique : un plan clair, décidé à l’avance. Construis le tien gratuitement sur Kapitaro.' },
    ],
  },

  // Repères : un ETF MSCI World contient environ 1 400 entreprises (le nombre varie) ; frais courants fréquents des ETF indiciels ≈ 0,1 à 0,5 %/an.
  'etf': {
    num: '011',
    title: 'L’ETF',
    chapters: ['L’ÉNIGME', 'LE PANIER', 'LE BILAN'],
    caption: 'Une seule ligne dans ton portefeuille… et un petit bout d’environ 1 400 entreprises dans le monde. Le secret : l’ETF. 📁\n\nContenu pédagogique : aucun ETF n’est recommandé. Un ETF suit son marché, à la hausse comme à la baisse, et investir comporte un risque de perte en capital.\n\nSuis tes ETF gratuitement sur kapitaro.fr',
    hashtags: '#etf #msciworld #bourse #investir #diversification #financepersonnelle #kapitaro',
    beats: [
      { chapter: 0, visual: 'title', hud: '≈ 1 400', hudLabel: 'ENTREPRISES EN UNE LIGNE', kw: [['UNE SEULE LIGNE', 'ligne'], ['≈ 1 400 ENTREPRISES', 'quatre'], ['LE SECRET', 'secret']], say: 'Avec une seule ligne dans ton portefeuille, tu peux détenir un petit bout d’environ mille quatre cents entreprises dans le monde. Le secret ?' },
      { chapter: 1, visual: 'rule', hud: 'ETF', hudLabel: 'C’EST QUOI ?', hudColor: 'green', rows: [[['ETF', 'g', 170]], [['=', 'dim', 110], ['PANIER', 'w', 130]]], caption: 'UN FONDS QUI COPIE UN INDICE ET S’ACHÈTE EN BOURSE COMME UNE ACTION', kw: [['UN PANIER', 'panier'], ['COPIE UN INDICE', 'indice'], ['COMME UNE ACTION', 'action']], say: 'Un ETF, c’est un panier d’actions qui copie un indice, comme le MSCI World. Et il s’achète en bourse, comme une action.' },
      { chapter: 1, visual: 'compare', hud: 'DIVERSIFIÉ', hudLabel: 'LE RISQUE EST RÉPARTI', hudColor: 'green', left: 'ETF MONDE', leftSub: '≈ 1 400 ENTREPRISES', right: '1 ACTION', rightSub: '1 SEULE ENTREPRISE', kw: [['UNE PETITE PARTIE', 'partie'], ['UNE SEULE ACTION', 'seule'], ['TOUT CHUTE', 'chute']], say: 'Si une entreprise du panier s’effondre, elle ne pèse qu’une petite partie de l’ensemble. Avec une seule action, c’est tout ton placement qui chute.' },
      { chapter: 2, visual: 'rule', hud: 'FRAIS', hudLabel: 'SOUVENT BAS', rows: [[['FRAIS', 'w', 120]], [['≈ 0,1 À 0,5 %', 'g', 110]]], caption: 'FRAIS COURANTS ANNUELS FRÉQUENTS (À VÉRIFIER DANS LE DIC)', kw: [['FRAIS BAS', 'frais'], ['0,1 À 0,5 % / AN', 'zéro'], ['IL BAISSE AUSSI', 'baisse']], say: 'Autre atout : des frais souvent bas, entre zéro virgule un et zéro virgule cinq pour cent par an. Mais attention : un ETF suit son marché, il baisse aussi quand le marché baisse.' },
      { chapter: 2, visual: 'end', hud: 'DÉCODÉ', hudLabel: 'DOSSIER CLOS', hudColor: 'green', cta: 'Suis tes ETF · kapitaro.fr', note: 'Contenu pédagogique : aucun ETF n’est recommandé.', say: 'Suis tes ETF et la répartition de ton portefeuille gratuitement sur Kapitaro.' },
    ],
  },

  // Repère courant : 3 à 6 mois de dépenses ; exemple 1 800 €/mois → 5 400 € à 10 800 €.
  'precaution': {
    num: '012',
    title: 'ÉPARGNE DE PRÉCAUTION',
    chapters: ['L’IMPRÉVU', 'LE REPÈRE', 'OÙ LA RANGER'],
    caption: 'Voiture en panne, frigo qui lâche, perte d’emploi… Sans réserve, un imprévu devient vite une dette. 📁\n\nRepère indicatif (3 à 6 mois de dépenses), à adapter à ta situation.\n\nCalcule ton épargne de précaution gratuitement sur kapitaro.fr',
    hashtags: '#epargnedeprecaution #epargne #budget #livreta #financepersonnelle #argent #kapitaro',
    beats: [
      { chapter: 0, visual: 'title', hud: '?', hudLabel: 'TA RÉSERVE', kw: [['PANNE', 'panne'], ['FRIGO', 'frigo'], ['PERTE D’EMPLOI', 'emploi'], ['UNE DETTE', 'dette']], say: 'Voiture en panne, frigo qui lâche, perte d’emploi. Sans réserve, un imprévu devient vite une dette.' },
      { chapter: 1, visual: 'rule', hud: 'LE REPÈRE', hudLabel: 'LE PLUS CITÉ', hudColor: 'green', rows: [[['3', 'g'], ['À', 'dim', 110], ['6 MOIS', 'g']]], caption: 'DE DÉPENSES COURANTES, MIS DE CÔTÉ', kw: [['3 À 6 MOIS', 'trois'], ['DE DÉPENSES', 'dépenses'], ['PRÉCAUTION', 'précaution']], say: 'Le repère le plus courant : garder de côté trois à six mois de dépenses. C’est ton épargne de précaution.' },
      { chapter: 1, visual: 'result', hud: '1 800 €/MOIS', hudLabel: 'DÉPENSES D’EXEMPLE', left: '6 MOIS', leftSub: 'CONFORTABLE', right: '3 MOIS', rightSub: 'MINIMUM', leftValue: 10800, rightValue: 5400, kw: [['1 800 € / MOIS', 'huit'], ['≈ 5 400 €', 'quatre'], ['≈ 10 800 €', 'dix']], say: 'Exemple : tu dépenses mille huit cents euros par mois. Ta réserve se situe entre cinq mille quatre cents et dix mille huit cents euros.' },
      { chapter: 2, visual: 'rule', hud: 'OÙ ?', hudLabel: 'LA RANGER', rows: [[['DISPONIBLE', 'g', 110]], [['+', 'dim', 100], ['SANS RISQUE', 'w', 110]]], caption: 'UN LIVRET OU UN COMPTE ÉPARGNE, PAS LA BOURSE', kw: [['DISPONIBLE', 'disponible'], ['SANS RISQUE', 'risque'], ['PAS EN BOURSE', 'bourse'], ['ENSUITE', 'ensuite']], say: 'Cet argent doit rester disponible et sans risque : sur un livret, pas en bourse. Et c’est seulement ensuite qu’on pense à investir.' },
      { chapter: 2, visual: 'end', hud: 'DÉCODÉ', hudLabel: 'DOSSIER CLOS', hudColor: 'green', cta: 'Calcule ta réserve · kapitaro.fr', note: 'Repère indicatif, à adapter à ta situation (emploi, famille, logement).', say: 'Calcule ton épargne de précaution gratuitement sur Kapitaro.' },
    ],
  },

  // Chiffres vérifiés : 100 €/mois à 6 %/an (taux mensuel 6 %/12) jusqu'à 65 ans → dès 25 ans (40 ans) : 199 149 € ;
  // dès 35 ans (30 ans) : 100 452 € ; dès 45 ans (20 ans) : 46 204 € ; versés : 48 000 / 36 000 / 24 000 € ; ratio 40 ans / 20 ans ≈ 4,3.
  'commencer-tot': {
    num: '013',
    title: '25, 35 OU 45 ANS',
    chapters: ['LA QUESTION', 'LE CALCUL', 'LA LEÇON'],
    caption: 'Commencer à 25, 35 ou 45 ans : on a fait le calcul, et l’écart est énorme. 📁\n\nExemple pédagogique : 100 €/mois jusqu’à 65 ans avec un rendement hypothétique de 6 %/an. Les rendements ne sont pas garantis et investir comporte un risque de perte en capital.\n\nSimule ton objectif gratuitement sur kapitaro.fr',
    hashtags: '#interetscomposes #epargne #investir #retraite #financepersonnelle #argent #kapitaro',
    beats: [
      { chapter: 0, visual: 'title', hud: '×4', hudLabel: 'ÉCART FINAL', kw: [['25 ANS', 'vingt-cinq'], ['35 ANS', 'trente-cinq'], ['45 ANS', 'quarante-cinq'], ['LE CALCUL', 'calcul']], say: 'Commencer à vingt-cinq, trente-cinq ou quarante-cinq ans : est-ce que ça change vraiment quelque chose ? On a fait le calcul.' },
      { chapter: 1, visual: 'rule', hud: '100 €/MOIS', hudLabel: 'JUSQU’À 65 ANS', hudColor: 'green', rows: [[['25 ANS', 'w', 80], ['→', 'dim', 80], ['≈ 199 000 €', 'g', 90]], [['35 ANS', 'w', 80], ['→', 'dim', 80], ['≈ 100 000 €', 'g', 90]], [['45 ANS', 'w', 80], ['→', 'dim', 80], ['≈ 46 000 €', 'w', 90]]], caption: '100 €/MOIS JUSQU’À 65 ANS, RENDEMENT D’EXEMPLE 6 %/AN', kw: [['6 % / AN (EXEMPLE)', 'six'], ['≈ 199 000 €', 'quatre-vingt-dix-neuf'], ['≈ 100 000 €', 'cent'], ['≈ 46 000 €', 'quarante-six']], say: 'Cent euros par mois jusqu’à soixante-cinq ans, à six pour cent par an en exemple. Dès vingt-cinq ans : environ cent quatre-vingt-dix-neuf mille euros. Dès trente-cinq ans : cent mille. Dès quarante-cinq ans : quarante-six mille.' },
      { chapter: 1, visual: 'result', hud: '×4', hudLabel: 'POUR 2× PLUS VERSÉ', left: 'DÈS 25 ANS', leftSub: '48 000 € VERSÉS', right: 'DÈS 45 ANS', rightSub: '24 000 € VERSÉS', leftValue: 199149, rightValue: 46204, kw: [['2× PLUS VERSÉ', 'deux'], ['×4 À L’ARRIVÉE', 'quatre']], say: 'Celui qui commence à vingt-cinq ans verse deux fois plus. Mais il finit avec plus de quatre fois plus.' },
      { chapter: 2, visual: 'rule', hud: 'LE TEMPS', hudLabel: 'TON MEILLEUR ALLIÉ', hudColor: 'green', rows: [[['COMMENCER', 'g', 120]], [['>', 'dim', 100], ['ATTENDRE', 'w', 120]]], caption: 'MÊME AVEC UN PETIT MONTANT', kw: [['LE TEMPS', 'temps'], ['UN PETIT MONTANT', 'petit'], ['AUJOURD’HUI', 'aujourd']], say: 'La leçon : c’est le temps qui fait le gros du travail. Mieux vaut commencer avec un petit montant aujourd’hui que d’attendre d’avoir plus.' },
      { chapter: 2, visual: 'end', hud: 'DÉCODÉ', hudLabel: 'DOSSIER CLOS', hudColor: 'green', cta: 'Simule ton objectif · kapitaro.fr', note: 'Exemple pédagogique : 100 €/mois jusqu’à 65 ans, rendement hypothétique de 6 %/an.', say: 'Et toi, ça donne quoi ? Simule ton objectif gratuitement sur Kapitaro.' },
    ],
  },
};
