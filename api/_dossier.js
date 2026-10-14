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
};
