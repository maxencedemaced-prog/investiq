// api/_tuto.js — vidéos tutoriels : textes (voix off + sous-titres) et gestes du curseur, scène par scène.
// Utilisé par api/social.js (voix ElevenLabs) et par tuto/record.mjs (enregistrement de l'appli en mode démo sur GitHub Actions).
// Gestes possibles dans « do » (exécutés au début de la scène, dans l'ordre) :
//   { click: '#selecteur' }   le curseur va sur l'élément puis clique
//   { point: '#selecteur' }   le curseur va sur l'élément sans cliquer
//   { scroll: '#selecteur' }  fait défiler jusqu'à l'élément
//   { js: 'code' }            exécute du code dans la page (ex. ouvrir le tutoriel)
//   { wait: 800 }             pause en millisecondes
//   { type: ['#champ', 'texte'] }  écrit dans un champ, lettre par lettre
// Règles de fond : aucune promesse de gain, ni « achète » ni « vends », ton pédagogique, tutoiement.
export const TUTOS = {
  presentation: {
    title: 'Kapitaro, c’est quoi ?',
    page: null,
    beats: [
      { say: 'Kapitaro, c’est ton copilote pour construire ton épargne de demain.', do: [{ js: "nav('home')" }, { wait: 300 }, { point: '#home-metrics, #sec-home h1' }] },
      { say: 'Tous tes placements, actions, ETF, cryptos, or, réunis au même endroit, avec leur valeur à jour.', do: [{ click: '#bnav-portfolio' }, { wait: 1400 }, { scroll: '.pos-row:nth-of-type(3)' }] },
      { say: 'Tu fixes un objectif, par exemple cinquante mille euros dans dix ans, et Kapitaro te montre comment y arriver, mois après mois.', do: [{ click: '#bnav-objectif' }, { wait: 1200 }, { point: '#obj-results canvas, #obj-results' }] },
      { say: 'Chaque mois, un plan te propose comment répartir ton versement, en s’appuyant sur les vrais cours et l’actualité.', do: [{ scroll: '#monthly-addall-btn' }, { wait: 400 }, { point: '#monthly-addall-btn' }] },
      { say: 'Et l’assistant IA répond à tes questions, simplement.', do: [{ click: '#bnav-ai' }, { wait: 900 }, { js: 'window.__tutoAiDemo && window.__tutoAiDemo()' }] },
      { say: 'Pour commencer, un petit tutoriel va se lancer pour créer ton premier objectif. Laisse-toi guider.', do: [{ js: "showOnboarding(true); var k = document.getElementById('ob-btn-skip'); if (k) k.textContent = 'Passer';" }, { wait: 900 }, { click: '#onboarding-modal .ob-profile-card' }] },
      { say: 'Ensuite, sur chaque page, le bouton lecture t’explique à quoi elle sert en trente secondes.', do: [{ js: "document.getElementById('onboarding-modal').style.display='none'; nav('portfolio')" }, { wait: 900 }, { click: '.kp-tuto-btn' }] },
      { say: 'Kapitaro est un outil pédagogique : il ne remplace pas un conseiller agréé, et investir comporte un risque de perte en capital.', do: [{ js: 'window.__tutoEndCard && window.__tutoEndCard()' }] },
    ],
  },
};
