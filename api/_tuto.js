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
// Pubs : l'accroche change, la suite est commune (aucune promesse de gain : règles AMF et Meta sur la finance)
function adBeats(hook, hookShort) {
  return [
    { say: hook, do: [{ js: "nav('home')" }, { js: 'window.__tutoAdHook && window.__tutoAdHook(' + JSON.stringify(hookShort) + ')' }, { wait: 300 }, { point: '#home-metrics' }] },
    { say: 'Kapitaro réunit tous tes placements au même endroit, avec leur valeur à jour.', do: [{ js: 'window.__tutoAdHook && window.__tutoAdHook(null)' }, { click: '#bnav-portfolio' }, { wait: 1100 }, { scroll: '.pos-row:nth-of-type(3)' }] },
    { say: 'Tu fixes ton objectif, et chaque mois, un plan te montre comment avancer.', do: [{ click: '#bnav-objectif' }, { wait: 1000 }, { point: '#obj-results canvas, #obj-results' }] },
    { say: 'Une question ? L’assistant IA te répond, simplement.', do: [{ click: '#bnav-ai' }, { wait: 700 }, { js: 'window.__tutoAiDemo && window.__tutoAiDemo()' }] },
    { say: 'Kapitaro ne touche pas à ton argent : tu gardes la main. Essaie gratuitement sur kapitaro point f r.', do: [{ js: 'window.__tutoAdEnd && window.__tutoAdEnd()' }] },
  ];
}

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
  // ── Pubs (≈ 25 s, format vertical 9:16, version téléphone seulement) : même vidéo, 3 accroches à tester ──
  pub_epargne: { title: '📣 Pub · Épargne qui dort', page: null, ad: true, speed: 1.08, beats: adBeats('Tu as de l’épargne qui dort, mais tu ne sais pas par où commencer ?', 'Ton épargne dort ? 😴') },
  pub_bourse: { title: '📣 Pub · La bourse, rien compris', page: null, ad: true, speed: 1.08, beats: adBeats('La bourse, tu n’y comprends rien ? Normal : personne ne te l’a jamais expliquée simplement.', 'La bourse ? 🤯 Rien compris') },
  // Pub v2 (voix + musique douce + gros textes) : gestes à l'écran dans tuto/ads/pub_objectif.json
  pub_objectif: { title: '📣 Pub v2 · 100 €/mois, combien dans 10 ans ?', page: null, ad: true, speed: 1.08, beats: [{"say":"100 euros par mois. Combien ça donne dans 10 ans ?"},{"say":"Tu mets 500 euros au départ, puis 100 euros chaque mois, placés à 5 % par an."},{"say":"Dans cette simulation, ton objectif de 15 000 euros serait atteint en 9 ans environ."},{"say":"Simule ton objectif gratuitement sur kapitaro point f r. Kapitaro ne touche jamais à ton argent."}] },
  pub_eparpille: { title: '📣 Pub · Placements éparpillés', page: null, ad: true, speed: 1.08, beats: adBeats('Actions, ETF, cryptos… tu t’y perds entre toutes tes applis ?', 'Tes placements ? 🧩 Éparpillés partout') },
  accueil: {
    title: 'L’accueil',
    page: 'home',
    beats: [
      { say: 'Voici ton accueil : en un coup d’œil, la valeur totale de tes placements et leur évolution.', do: [{ js: "nav('home')" }, { wait: 500 }, { point: '#home-metrics' }] },
      { say: 'Juste en dessous, ton score de santé et les alertes du jour te montrent ce qui mérite ton attention.', do: [{ scroll: '#home-score' }, { point: '#home-score, #home-alerts' }] },
      { say: 'Et ici, ta progression vers ton objectif, calculée avec les vrais cours.', do: [{ scroll: '#home-obj, #home-metrics' }, { point: '#home-obj, #home-metrics' }] },
      { say: 'Une question, ou tu ne sais pas où aller ? Touche la bulle verte en bas à droite : l’assistant d’aide te répond tout de suite.', do: [{ js: "var h = document.getElementById('kp-help-btn'); if (h) h.style.setProperty('display', 'flex', 'important');" }, { wait: 300 }, { click: '#kp-help-btn' }, { wait: 1800 }, { js: "var p = document.getElementById('kp-help'); if (p) p.classList.remove('open'); var h = document.getElementById('kp-help-btn'); if (h) h.style.removeProperty('display');" }] },
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

// ── Version anglaise des tutoriels de l'appli (pas des pubs) ──
// Mêmes scènes et mêmes gestes que la version française (les sélecteurs ne dépendent pas de la langue) ; seule la voix change.
// say : une phrase par scène, dans le même ordre que TUTOS[id].beats. do : remplace les gestes d'une scène (index → gestes) si besoin.
// Fichiers : tuto/<id>__en/timing.json, tuto/<id>__en.mp4, tuto/<id>__en__desktop.mp4, manifest « <id>__en » et « <id>__en__desktop ».
// Mêmes règles : ton pédagogique, aucune promesse de gain, jamais « achète » ni « vends », vocabulaire valable dans toutes les régions.
export const TUTOS_EN = {
  presentation: {
    title: 'What is Kapitaro?',
    say: [
      'Kapitaro is your co-pilot for building your future savings.',
      'All your investments, stocks, ETFs, crypto prices and gold, in one place, with their up-to-date value.',
      'Good to know: Kapitaro never holds your money and never places orders. You invest through your own bank or broker, then track everything here.',
      'You set a goal, for example fifty thousand in ten years, and Kapitaro shows you how to get there, month after month.',
      'Each month, a plan suggests how you could split your contribution, based on real prices and the latest news.',
      'And the AI assistant answers your questions, in plain English.',
      'To get started, a short guided tour helps you create your first goal. Just follow along.',
      'After that, on every page, the play button explains what it is for in thirty seconds.',
      'Kapitaro is an educational tool: it does not replace a licensed financial adviser, and investing involves the risk of losing money.',
    ],
    do: { 6: [{ js: "showOnboarding(true); var k = document.getElementById('ob-btn-skip'); if (k) k.textContent = 'Skip';" }, { wait: 900 }, { click: '#onboarding-modal .ob-profile-card' }] },
  },
  accueil: {
    title: 'The home page',
    say: [
      'This is your home page: at a glance, the total value of your investments and how it is changing.',
      'Just below, your health score and today’s alerts show you what deserves your attention.',
      'And here, your progress toward your goal, calculated with real prices.',
      'Got a question, or not sure where to go? Tap the green bubble at the bottom right: the help assistant answers right away.',
      'Come back every day: the morning briefing sums up what matters in a few seconds.',
    ],
  },
  portefeuille: {
    title: 'The portfolio',
    say: [
      'The portfolio brings all your investments together, with their current value and your gain or loss.',
      'To add a stock, tap Add, then search for it by name.',
      'Pick it from the list and enter your quantity: the price fills in on its own. Then just add it to your portfolio.',
      'The Import button loads your broker statement, as a PDF, Excel or CSV file, to add everything at once.',
      'Live price updates the prices, and Select lets you manage several lines at once.',
      'Finally, tap a line to see its details: chart, analysis, a question for the AI, or edits.',
    ],
  },
  objectif: {
    title: 'Your goal',
    say: [
      'Your goal is the amount you want to reach, and by when. Everything starts from there.',
      'The curve shows where your contributions could take you: the solid line is the value with returns, the dotted line is the money you put in. Drag the slider to see any year.',
      'Just below, your real progress: what your investments are worth today, compared with your goal.',
      'You can have up to three goals. If one is out of reach, Kapitaro tells you what would need to change: the time frame, the contribution or the return.',
      'The To watch area flags holdings that weigh too much or have dropped a lot.',
      'Each month, the monthly plan splits your contribution between ETFs and stocks, according to your target. Every line shows its real figures: performance, maximum drop, volatility and latest news.',
      'The Add all button saves the plan in one click: you check the amounts, and lines you already hold are topped up.',
      'Further down, your starting allocation: the core in global ETFs, the satellites, then the stocks. It stays the same until you create a new plan.',
      'Finally, you can adjust your share of stocks and ETFs, edit your goal or ask the AI for an analysis. These are educational suggestions: you always make the decisions.',
    ],
  },
  assistant: {
    title: 'The AI assistant',
    say: [
      'The AI assistant knows your portfolio, your goal and your profile.',
      'Ask it a question as you would a friend who knows the subject: it explains things using real prices and the news, and you make the call.',
      'On the free plan, you get fifteen questions to start, then three per day.',
      'With Premium, questions are unlimited, and the agent works for you every day: a portfolio verdict, alerts, priorities and AI signals.',
    ],
  },
  bilan: {
    title: 'The financial check-up',
    say: [
      'The financial check-up, included with Premium, gives you a complete picture of your situation: income, savings, plans and investments.',
      'Answer a few simple questions: it takes about five minutes.',
      'You get an allocation suited to your profile, which the AI assistant then uses to give you better answers.',
    ],
  },
  sante: {
    title: 'Portfolio health',
    say: [
      'Your portfolio health is a score out of ten, calculated on your real investments.',
      'It looks at diversification, the weight of each line, the share of ETFs and performance.',
      'The points in orange show you what to improve first.',
    ],
  },
  depenses: {
    title: 'My spending',
    say: [
      'My spending shows you where your money goes each month. This feature is part of Premium.',
      'Simply import your bank statement, as a CSV, Excel or PDF file.',
      'Kapitaro finds your subscriptions and sorts your spending: what is essential, and what is not.',
      'You also see how much you could save by cutting back on some expenses, and what that could become once invested.',
    ],
    do: { 1: [{ scroll: '#dep-root label:has(input[type=file])' }, { click: '#dep-root label:has(input[type=file])' }, { upload: ['#dep-root input[type=file]', 'sample-statement-en.csv'] }, { wait: 1500 }] },
  },
  actualites: {
    title: 'The news',
    say: [
      'The news shows you what is moving in the markets and in the companies you follow.',
      'The Companies tab sums up the latest news about your investments, simply.',
      'And the Commodities tab tracks gold, oil and copper live.',
    ],
  },
};

// Tutoriel dans la langue demandée (fr par défaut) : { title, page, ad, speed, beats:[{say, do}] }, ou null s'il n'existe pas
export function tutoFor(id, lang) {
  const t = TUTOS[id];
  if (!t) return null;
  if (lang !== 'en') return t;
  const e = TUTOS_EN[id];
  if (!e || t.ad || e.say.length !== t.beats.length) return null;
  return { ...t, title: e.title, beats: t.beats.map((b, i) => ({ ...b, say: e.say[i], do: (e.do && e.do[i]) || b.do })) };
}
