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
      { say: 'Bon à savoir : Kapitaro ne garde pas ton argent et ne passe aucun ordre. Pour investir, tu passes par ta banque ou ton courtier, et tu retrouves ensuite tout ici.', do: [{ point: '.pos-row' }] },
      { say: 'Tu fixes un objectif, par exemple cinquante mille euros dans dix ans, et Kapitaro te montre comment y arriver, mois après mois.', do: [{ click: '#bnav-objectif' }, { wait: 1200 }, { point: '#obj-results canvas, #obj-results' }] },
      { say: 'Chaque mois, un plan te propose comment répartir ton versement, en s’appuyant sur les vrais cours et l’actualité.', do: [{ scroll: '#monthly-addall-btn' }, { wait: 400 }, { point: '#monthly-addall-btn' }] },
      { say: 'Et l’assistant IA répond à tes questions, simplement.', do: [{ click: '#bnav-ai' }, { wait: 900 }, { js: 'window.__tutoAiDemo && window.__tutoAiDemo()' }] },
      { say: 'Pour commencer, un petit tutoriel va se lancer pour créer ton premier objectif. Laisse-toi guider.', do: [{ js: "showOnboarding(true); var k = document.getElementById('ob-btn-skip'); if (k) k.textContent = 'Passer';" }, { wait: 900 }, { click: '#onboarding-modal .ob-profile-card' }] },
      { say: 'Ensuite, sur chaque page, le bouton lecture t’explique à quoi elle sert en trente secondes.', do: [{ js: "document.getElementById('onboarding-modal').style.display='none'; nav('portfolio')" }, { wait: 900 }, { click: '.kp-tuto-btn' }] },
      { say: 'Kapitaro est un outil pédagogique : il ne remplace pas un conseiller agréé, et investir comporte un risque de perte en capital.', do: [{ js: 'window.__tutoEndCard && window.__tutoEndCard()' }] },
    ],
  },
  accueil: {
    title: 'L’accueil',
    page: 'home',
    beats: [
      { say: 'Voici ton accueil : en un coup d’œil, la valeur totale de tes placements et leur évolution.', do: [{ js: "nav('home')" }, { wait: 500 }, { point: '#home-metrics' }] },
      { say: 'Juste en dessous, ton score de santé et les alertes du jour te montrent ce qui mérite ton attention.', do: [{ scroll: '#home-score' }, { point: '#home-score, #home-alerts' }] },
      { say: 'Et ici, ta progression vers ton objectif, calculée avec les vrais cours.', do: [{ scroll: '#home-obj, #home-metrics' }, { point: '#home-obj, #home-metrics' }] },
      { say: 'Bon à savoir : Kapitaro ne garde pas ton argent et ne passe aucun ordre. Pour investir, tu passes par ta banque ou ton courtier ; Kapitaro t’aide à tout suivre au même endroit.', do: [{ scroll: '#home-platforms-wrap, #home-metrics' }, { point: '#home-platforms-wrap, #home-metrics' }] },
      { say: 'Reviens chaque jour : le briefing du matin te résume l’essentiel en quelques secondes.', do: [{ scroll: '#home-metrics' }, { point: '#home-metrics' }] },
    ],
  },
  portefeuille: {
    title: 'Le portefeuille',
    page: 'portfolio',
    beats: [
      { say: 'Le portefeuille réunit tous tes placements, avec leur valeur à jour et ta plus-value.', do: [{ click: '#bnav-portfolio' }, { wait: 900 }, { point: '#port-metrics' }] },
      { say: 'Pour ajouter une action, touche Ajouter, puis cherche-la par son nom.', do: [{ click: '#port-add-btn' }, { wait: 900 }, { click: '#f-search' }, { type: ['#f-search', 'Apple'] }, { wait: 1500 }] },
      { say: 'Choisis-la dans la liste et indique ta quantité : le prix se remplit tout seul. Il ne reste qu’à l’ajouter au portefeuille.', do: [{ click: '#ac-drop .ac-item' }, { wait: 1500 }, { click: '#f-qty' }, { type: ['#f-qty', '5'] }, { wait: 600 }, { click: 'button[onclick="addPos()"]' }] },
      { say: 'Le bouton Importer charge le relevé de ton courtier, en PDF, Excel ou CSV, pour tout ajouter d’un coup.', do: [{ js: "nav('portfolio')" }, { wait: 700 }, { point: '#btn-import-pos' }] },
      { say: 'Prix live met les cours à jour, et Sélectionner permet de gérer plusieurs lignes à la fois.', do: [{ point: '#btn-prix-live' }, { wait: 1500 }, { point: '#btn-select-mode' }] },
      { say: 'Enfin, touche une ligne pour voir son détail : graphique, analyse, question à l’IA ou modification.', do: [{ click: '.pos-row' }, { wait: 800 }, { point: '[id^="posdetail-"] button' }] },
    ],
  },
  objectif: {
    title: 'L’objectif',
    page: 'objectif',
    beats: [
      { say: 'L’objectif, c’est la somme que tu veux atteindre, et quand. Tout part de là.', do: [{ click: '#bnav-objectif' }, { wait: 1000 }, { point: '#obj-chart-amount, #obj-results' }] },
      { say: 'La courbe montre où te mènent tes versements : en plein, la valeur avec les intérêts, en pointillé, l’argent versé. Fais glisser le curseur pour voir n’importe quelle année.', do: [{ point: '#obj-chart' }, { wait: 1500 }, { point: '#obj-slider' }, { js: "(async () => { const s = document.getElementById('obj-slider'); if (!s) return; const go = async (a, b) => { const st = a > b ? -3 : 3; for (let v = a; st < 0 ? v >= b : v <= b; v += st) { s.value = v; try { updateObjSlider(v); } catch (e) {} await new Promise(r => setTimeout(r, 45)); } }; await go(100, 25); await new Promise(r => setTimeout(r, 400)); await go(25, 100); })()" }] },
      { say: 'Juste en dessous, ta progression réelle : ce que valent aujourd’hui tes placements, comparé à ton objectif.', do: [{ point: '#obj-real-bar' }] },
      { say: 'Tu peux avoir jusqu’à trois objectifs. Si l’un n’est pas atteignable, Kapitaro te dit ce qu’il faudrait changer : la durée, le versement ou le rendement.', do: [{ scroll: '#obj-tabs' }, { point: '#obj-tabs' }, { wait: 1200 }, { point: '#obj-feasibility, #obj-tabs' }] },
      { say: 'La zone À surveiller signale les lignes qui pèsent trop lourd ou qui ont beaucoup baissé.', do: [{ scroll: '#obj-smart-alerts' }, { point: '#obj-smart-alerts' }] },
      { say: 'Chaque mois, le plan du mois répartit ton versement entre ETF et actions, selon ta cible. Chaque ligne affiche ses vrais chiffres : performance, baisse maximale, volatilité et dernière actualité.', do: [{ scroll: '#obj-monthly-plan' }, { point: '#obj-monthly-plan' }, { wait: 1500 }, { point: '#obj-monthly-plan [onclick^="openActionFromObjectif"]' }] },
      { say: 'Le bouton Tout ajouter enregistre le plan en un clic : tu vérifies les montants, et les lignes que tu détiens déjà sont renforcées.', do: [{ scroll: '#monthly-addall-btn' }, { click: '#monthly-addall-btn' }, { wait: 2500 }] },
      { say: 'Plus bas, ta répartition de départ : le socle en ETF monde, les satellites, puis les actions. Elle reste la même tant que tu ne crées pas un nouveau plan.', do: [{ js: "var m = document.getElementById('pr-modal'); if (m) m.remove();" }, { wait: 300 }, { scroll: '#obj-etf-plan' }, { point: '#obj-etf-plan' }] },
      { say: 'Enfin, tu peux ajuster ta part d’actions et d’ETF, modifier ton objectif ou demander une analyse à l’IA. Ce sont des suggestions pédagogiques : c’est toujours toi qui décides.', do: [{ scroll: 'button[onclick="openAllocModal()"]' }, { point: 'button[onclick="openAllocModal()"]' }, { wait: 1300 }, { point: 'button[onclick="resetObj(\'edit\')"]' }, { wait: 1300 }, { point: 'button[onclick="nav(\'ai\')"]' }] },
    ],
  },
  assistant: {
    title: 'L’assistant IA',
    page: 'ai',
    beats: [
      { say: 'L’assistant IA connaît ton portefeuille, ton objectif et ton profil.', do: [{ js: 'window.isPremiumUser = () => false' }, { click: '#bnav-ai' }, { wait: 900 }, { point: '#ai-chat' }] },
      { say: 'Pose-lui une question comme à un ami qui s’y connaît : il t’explique avec les vrais cours et l’actualité, et c’est toi qui décides.', do: [{ scroll: '#ai-in' }, { point: '#ai-in' }, { js: 'window.__tutoAiDemo && window.__tutoAiDemo()' }] },
      { say: 'En version gratuite, tu as quinze questions offertes, puis trois par jour.', do: [{ point: '#ai-chat' }] },
      { say: 'Avec Premium, les questions sont illimitées, et l’agent travaille pour toi chaque jour : verdict sur ton portefeuille, alertes, priorités et signaux IA.', do: [{ js: "try { renderAgentTabs(); setAgentView('sample'); } catch (e) {}" }, { wait: 900 }, { scroll: '#agent-tabs' }, { point: '#agent-tabs button:nth-child(2), #agent-tabs' }, { wait: 1200 }, { scroll: '#agent-verdict' }, { point: '#agent-verdict' }] },
    ],
  },
  bilan: {
    title: 'Le bilan patrimonial',
    page: 'bilan',
    beats: [
      { say: 'Le bilan patrimonial, inclus dans Premium, fait le point complet sur ta situation : revenus, épargne, projets et placements.', do: [{ js: 'openBilan()' }, { wait: 1200 }, { point: '#bilan-modal' }] },
      { say: 'Réponds à quelques questions simples : cela prend environ cinq minutes.', do: [{ point: '#bilan-content button, #bilan-content' }] },
      { say: 'Tu obtiens une répartition adaptée à ton profil, que l’assistant IA utilise ensuite pour mieux te répondre.', do: [{ point: '#bilan-content' }] },
    ],
  },
  sante: {
    title: 'La santé du portefeuille',
    page: 'sante',
    beats: [
      { say: 'La santé de ton portefeuille, c’est une note sur dix, calculée sur tes vrais placements.', do: [{ js: "nav('sante')" }, { wait: 900 }, { point: '#sante-content' }] },
      { say: 'Elle regarde la diversification, le poids de chaque ligne, la part d’ETF et la performance.', do: [{ scroll: '#sante-content > div:nth-child(2)' }, { point: '#sante-content > div:nth-child(2)' }] },
      { say: 'Les points en orange te montrent quoi améliorer en priorité.', do: [{ scroll: '#sante-content > div:nth-child(3)' }, { point: '#sante-content > div:nth-child(3)' }] },
    ],
  },
  depenses: {
    title: 'Mes dépenses',
    page: 'depenses',
    beats: [
      { say: 'Mes dépenses te montre où part ton argent chaque mois. Cette fonction fait partie de Premium.', do: [{ js: "nav('depenses')" }, { wait: 900 }, { point: '#dep-root' }] },
      { say: 'Importe simplement le relevé de ta banque, en CSV, Excel ou PDF.', do: [{ scroll: '#dep-root label:has(input[type=file])' }, { click: '#dep-root label:has(input[type=file])' }, { upload: ['#dep-root input[type=file]', 'releve-exemple.csv'] }, { wait: 1500 }] },
      { say: 'Kapitaro retrouve tes abonnements et classe tes dépenses : ce qui est vital, et ce qui ne l’est pas.', do: [{ js: 'window.scrollTo(0, 0)' }, { wait: 400 }, { point: '#dep-pie, #dep-root' }] },
      { say: 'Tu vois aussi combien tu économiserais en réduisant certaines dépenses, et ce que cela donnerait une fois investi.', do: [{ scroll: '#dep-savings' }, { point: '#dep-savings' }] },
    ],
  },
  actualites: {
    title: 'Les actualités',
    page: 'news',
    beats: [
      { say: 'Les actualités te montrent ce qui bouge sur les marchés et dans les entreprises que tu suis.', do: [{ click: '#bnav-news' }, { wait: 1200 }, { point: '#news-page-content' }] },
      { say: 'L’onglet Entreprises résume simplement les dernières nouvelles de tes placements.', do: [{ click: '#news-fil-entreprises' }, { wait: 800 }] },
      { say: 'Et l’onglet Matières premières suit l’or, le pétrole ou le cuivre en direct.', do: [{ click: '#news-fil-matieres' }, { wait: 800 }] },
    ],
  },
};
