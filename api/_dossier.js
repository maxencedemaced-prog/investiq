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
      { chapter: 0, visual: 'title', hud: '×2', hudLabel: 'ÉCART FINAL', say: 'Deux personnes. Même somme chaque mois. Même placement. Pourtant, l’une finit avec plus de deux fois plus que l’autre.' },
      { chapter: 0, visual: 'compare', hud: '10 ANS', hudLabel: 'D’AVANCE', say: 'Léa commence à vingt-cinq ans. Tom, à trente-cinq. Chacun met cent euros par mois, jusqu’à soixante-cinq ans.' },
      { chapter: 1, visual: 'snowball', hud: 'EN MARCHE', hudLabel: 'EFFET BOULE DE NEIGE', hudColor: 'green', say: 'Le secret, ce sont les intérêts composés. Tes gains rapportent à leur tour des gains, comme une boule de neige qui grossit en roulant.' },
      { chapter: 1, visual: 'curve', hud: '7 %/AN', hudLabel: 'RENDEMENT D’EXEMPLE', hudColor: 'green', say: 'Au début, ça ne se voit presque pas. Puis la courbe décolle : c’est le temps qui fait le travail.' },
      { chapter: 1, visual: 'result', hud: '+12 000 €', hudLabel: 'VERSÉS EN PLUS PAR LÉA', leftValue: 262481, rightValue: 121997, say: 'Avec un rendement d’exemple de sept pour cent par an, Léa finit avec environ deux cent soixante-deux mille euros. Tom, cent vingt-deux mille. Elle n’a versé que douze mille euros de plus.' },
      { chapter: 2, visual: 'rule', hud: '72', hudLabel: 'LA RÈGLE À RETENIR', hudColor: 'green', rate: '6 %', years: '12 ANS', say: 'Retiens la règle de soixante-douze : divise soixante-douze par le rendement annuel. Tu obtiens le nombre d’années pour doubler ton capital. À six pour cent, environ douze ans.' },
      { chapter: 2, visual: 'end', hud: 'DÉCODÉ', hudLabel: 'DOSSIER CLOS', hudColor: 'green', say: 'Les rendements ne sont jamais garantis. Mais le temps, lui, joue pour toi. Calcule ton scénario gratuitement sur Kapitaro.' },
    ],
  },
};
