// i18n-en.js — dictionnaire français → anglais de Kapitaro, chargé UNIQUEMENT quand la langue est l'anglais (voir i18n.js).
// • KP_EN.strings : texte français exact (espaces normalisés) → texte anglais. Une valeur peut être un objet
//   { _: 'par défaut', US: '…', EU: '…', UK: '…' } quand le vocabulaire dépend de la région.
// • KP_EN.patterns : textes contenant des nombres ou des noms (expressions régulières).
// • KP_EN.keys : textes des nouvelles fonctions appelés par kpT('clé').
// • KP_EN.glossary / KP_EN.tabHints : remplacent les données de glossary.js et tab-hints.js.
// Le moteur en bas du fichier traduit la page au fil de l'eau (MutationObserver), y compris les textes créés par app.js.
// Mode diagnostic (hôtes de test) : ?i18n_debug=1 → window._kpMissing liste les textes français non traduits.
(function () {
  var K = window.KP_EN = window.KP_EN || {};
  var REGION = (window.kpI18n && window.kpI18n.region) || 'OTHER';
  var S = K.strings = K.strings || {};
  function add(o) { for (var k in o) S[k.replace(/\s+/g, ' ').trim()] = o[k]; }

  // Vocabulaire régional réutilisable
  var ACCOUNTS = { _: 'investment account', US: 'brokerage account / IRA', EU: 'investment account', UK: 'ISA / investment account' };
  var WORLD_ETF_SUB = { _: 'World ETF', US: 'World ETF · Brokerage', EU: 'World ETF · UCITS', UK: 'World ETF · ISA' };

  K.keys = {
    'lang.switch': 'Français',
    'auth.consent': 'I agree to the <a href="#" data-legal="cgu">Terms of Service</a> and <a href="#" data-legal="privacy">Privacy Policy</a>, and I confirm I am 18 or older.',
    'auth.consentRequired': 'Please tick the box to accept the Terms.',
    'auth.googleConsent': 'By continuing with Google, you agree to our Terms of Service and Privacy Policy and confirm you are 18 or older.',
    'region.label': 'Country / region',
    'region.sub': 'Adapts legal terms, vocabulary and disclaimers. Not tax advice.',
    'region.US': 'United States', 'region.EU': 'European Union / EEA', 'region.UK': 'United Kingdom', 'region.OTHER': 'Other country', 'region.FR': 'France (French version)',
    'dns.link': 'Do Not Sell or Share My Personal Information',
    'dns.done': 'Done: advertising cookies are off and we will not share your data for cross-context behavioral advertising. Your choice is saved on this device.',
    'lang.label': 'Language',
  };

  // ════════════ PAGE D'ACCUEIL, CONNEXION, INSCRIPTION ════════════
  add({
    'Kapitaro — Suivi de portefeuille et assistant IA': 'Kapitaro — Portfolio tracker & AI assistant',
    'Créé en France · Gratuit pour commencer': 'Made in France · Free to start',
    'Créé en France': 'Made in France',
    'Toute ton épargne au même endroit,': 'All your savings in one place,',
    'enfin claire.': 'finally clear.',
    'Actions, ETF, PEA, cryptos : suis tes placements en direct, vois ce qui va bien et ce qui coince, et pose tes questions à un assistant IA en français.': {
      _: 'Stocks, ETFs and crypto prices: track your investments live, see what’s working and what isn’t, and ask an AI assistant your questions in plain English.',
      US: 'Stocks, ETFs, IRAs and crypto prices: track your investments live, see what’s working and what isn’t, and ask an AI assistant your questions in plain English.',
      UK: 'Stocks, ETFs, ISAs and crypto prices: track your investments live, see what’s working and what isn’t, and ask an AI assistant your questions in plain English.' },
    'Créer mon compte gratuit': 'Create my free account',
    'Continuer avec Google': 'Continue with Google',
    'Sans carte bancaire · prêt en 2 minutes': 'No credit card · ready in 2 minutes',
    '👁 Essayer sans compte': '👁 Try without an account',
    'J’ai déjà un compte': 'I already have an account',
    'Kapitaro ne touche jamais à ton argent.': 'Kapitaro never touches your money.',
    'Aucun accès à ta banque ni à ton courtier, aucun ordre passé : tu investis où tu veux, l’app t’aide à y voir clair.': 'No access to your bank or broker, no orders placed: you invest wherever you like, the app just helps you see clearly.',
    'Voir Kapitaro en 1 minute': 'See Kapitaro in 1 minute',
    '✓ Sans engagement, résiliable en 1 clic': '✓ No commitment, cancel in 1 click',
    '🛡️ Tes données ne sont jamais revendues': '🛡️ Your data is never sold',
    'Portefeuille exemple': 'Sample portfolio',
    'Valeur totale': 'Total value',
    '+7,2 % au total': '+7.2% overall',
    'ETF Monde · PEA': WORLD_ETF_SUB,
    'Action · Luxe': 'Stock · Luxury',
    'Action · Tech': 'Stock · Tech',
    'Assistant IA · Analyse en cours…': 'AI assistant · Analyzing…',
    'Connexion': 'Log in',
    'Inscription': 'Sign up',
    'ou par e-mail': 'or with email',
    'Inscription par e-mail ci-dessous (30 secondes). La connexion Google ne fonctionne pas dans le navigateur d’Instagram ou de Facebook.': 'Sign up with your email below (30 seconds). Google sign-in doesn’t work inside the Instagram or Facebook browser.',
    'E-mail': 'Email',
    'Mot de passe': 'Password',
    'Mot de passe oublié ?': 'Forgot your password?',
    'Se connecter →': 'Log in →',
    'Confirmer le mot de passe': 'Confirm password',
    'Créer mon compte →': 'Create my account →',
    '15 analyses IA offertes': '15 free AI analyses',
    'à l’inscription, puis 3 par jour. Premium : illimité.': 'when you sign up, then 3 per day. Premium: unlimited.',
    'ou': 'or',
    'Gratuit pour commencer ·': 'Free to start ·',
    'Premium 9,99 €/mois': 'Premium {{monthly}}/month',
    'ou 79,99 €/an, sans engagement': 'or {{annual}}/year, no commitment',
    'Kapitaro est un outil éducatif, pas un conseiller financier agréé.': {
      _: 'Kapitaro is an educational tool, not a licensed financial adviser.',
      US: 'Kapitaro is an educational tool, not a registered investment adviser or broker-dealer.' },
    'CGU / CGV': 'Terms',
    'Mentions légales': 'Legal notice',
    'Confidentialité': 'Privacy',
    'Risques': 'Risks',
    'Outils gratuits sans compte :': 'Free tools, no account needed:',
    'Intérêts composés': 'Compound interest',
    "Objectif d'épargne": 'Savings goal',
    'ETF MSCI World': 'MSCI World ETF',
    'Épargne de précaution': { _: 'Emergency fund', UK: 'Emergency savings' },
    "Installe l'app Kapitaro": 'Install the Kapitaro app',
    "Sur ton écran d'accueil, en plein écran, avec les notifications.": 'On your home screen, full screen, with notifications.',
    "📲 Installer l'app — gratuit": '📲 Install the app — free',
    'Masquer': 'Hide',
    'Tout au même endroit': 'Everything in one place',
    'Ce que Kapitaro fait pour toi': 'What Kapitaro does for you',
    'Suivre ses placements, comprendre où on en est et savoir quoi faire ensuite, sans tableur ni jargon.': 'Track your investments, understand where you stand and know what to look at next — no spreadsheets, no jargon.',
    'Ton portefeuille en direct': 'Your portfolio, live',
    'Actions et ETF avec les prix à jour, ta performance et ta répartition. Importe ton relevé de courtier (PDF, Excel ou CSV) au lieu de tout ressaisir.': 'Stocks and ETFs with up-to-date prices, your performance and your allocation. Import your broker statement (PDF, Excel or CSV) instead of typing everything in.',
    'Un score de santé sur 10': 'A health score out of 10',
    "Diversification, concentration, part d'ETF : tu vois tout de suite ce qui va bien et ce qu'il faut améliorer en priorité.": 'Diversification, concentration, share of ETFs: see at a glance what’s going well and what to improve first.',
    'Des objectifs et un plan': 'Goals and a plan',
    "Fixe un objectif, vois s'il est réaliste et reçois un plan d'investissement chiffré, mois par mois.": 'Set a goal, see whether it’s realistic and get an illustrative month-by-month savings plan.',
    'Un assistant IA en français': 'An AI assistant in plain English',
    'Pose tes questions sur ton portefeuille et reçois des réponses claires, adaptées à ta situation et à ton niveau.': 'Ask questions about your portfolio and get clear, educational answers at your level.',
    'Une aide avant de décider': 'A second look before you decide',
    "Tu hésites à acheter ou à vendre ? Décris ton idée et obtiens une analyse chiffrée avant d'agir.": 'Thinking about a move? Describe your idea and get a figures-based educational analysis before you act.',
    'Briefing et alertes': 'Briefing and alerts',
    'Un point chaque matin sur ton téléphone et une alerte quand un prix passe sous ton seuil, même app fermée.': 'A morning update on your phone and an alert when a price crosses your threshold, even when the app is closed.',
    'Aperçu': 'Preview',
    "Clair dès le premier coup d'œil": 'Clear at first glance',
    'Score de santé': 'Health score',
    'Bon': 'Good',
    'Diversification': 'Diversification',
    'Concentration': 'Concentration',
    "Part d'ETF": 'Share of ETFs',
    'Performance': 'Performance',
    'Ton portefeuille noté sur 10, avec la priorité à améliorer.': 'Your portfolio scored out of 10, with the top thing to improve.',
    'Objectif · 50 000 € dans 15 ans': { _: 'Goal · €50,000 in 15 years', US: 'Goal · 50,000 in 15 years' },
    '/mois': '/month',
    '✓ Atteignable': '✓ Achievable',
    "Ce qu'il faut mettre de côté chaque mois, et la courbe pour y arriver.": 'How much to set aside each month, and the curve to get there.',
    'Assistant IA': 'AI assistant',
    'Mon portefeuille est-il trop concentré ?': 'Is my portfolio too concentrated?',
    'Une seule action pèse 38 % de ton portefeuille. Au-delà de 20 à 25 % sur une ligne, une mauvaise nouvelle peut peser lourd : un ETF diversifié réduit ce risque.': 'A single stock makes up 38% of your portfolio. Above 20–25% in one holding, one piece of bad news can hit hard — a diversified ETF generally reduces that risk.',
    'Des réponses simples, calculées sur tes vraies positions.': 'Simple answers, based on your actual holdings.',
    'Exemples illustratifs.': 'Illustrative examples.',
    'Comment ça marche': 'How it works',
    'Prêt en trois minutes': 'Ready in three minutes',
    'Crée ton compte gratuit': 'Create your free account',
    'Un e-mail ou ton compte Google, sans carte bancaire.': 'An email or your Google account, no credit card.',
    'Ajoute tes placements': 'Add your investments',
    'À la main, ou en important le relevé de ton courtier. Pas encore investi ? Le tutoriel te propose un premier plan.': 'Manually, or by importing your broker statement. Not invested yet? The tutorial shows you an example plan to get started.',
    'Suis, comprends, décide': 'Track, understand, decide',
    "Ton score, ton objectif et l'assistant IA t'aident à garder le cap.": 'Your score, your goal and the AI assistant help you stay on course.',
    'Tarifs': 'Pricing',
    'Commence gratuitement': 'Start for free',
    'Gratuit': 'Free',
    '0 €': { _: '€0', US: '$0' },
    'pour toujours': 'forever',
    'Suivi du portefeuille avec prix à jour': 'Portfolio tracking with up-to-date prices',
    'Score de santé et analyse de la répartition': 'Health score and allocation analysis',
    'Objectifs avec faisabilité et plan': 'Goals with feasibility check and plan',
    "Simulateur d'investissement régulier et scénarios de crise": 'Regular-investing simulator and crash scenarios',
    'Alertes chiffrées et agenda économique': 'Price alerts and economic calendar',
    '15 analyses IA offertes, puis 3 par jour': '15 free AI analyses, then 3 per day',
    'Commencer gratuitement': 'Start for free',
    'Premium': 'Premium',
    '9,99 €': '{{monthly}}',
    'par mois, ou 79,99 € par an': 'per month, or {{annual}} per year',
    'Tout le gratuit': 'Everything in Free',
    ', plus :': ', plus:',
    'Analyses IA illimitées': 'Unlimited AI analyses',
    'Agent IA complet sur tout ton portefeuille': 'Full AI agent across your whole portfolio',
    'Bilan patrimonial complet et export PDF': 'Complete financial check-up and PDF export',
    'Analyse de tes dépenses et des abonnements à résilier': 'Spending analysis and subscriptions you might cancel',
    'Conseils IA sur tes alertes': 'AI insights on your alerts',
    'Essayer, puis passer Premium': 'Try it, then go Premium',
    'Sans engagement, résiliable en un clic.': 'No commitment, cancel in one click.',
    'Questions fréquentes': 'Frequently asked questions',
    'Tu te demandes peut-être…': 'You might be wondering…',
    'Est-ce vraiment gratuit ?': 'Is it really free?',
    "Oui. La version gratuite n'a pas de limite de durée et ne demande aucune carte bancaire. Premium est une option pour ceux qui veulent l'IA illimitée et les outils avancés.": 'Yes. The free plan has no time limit and needs no credit card. Premium is an option if you want unlimited AI and advanced tools.',
    'Kapitaro a-t-il accès à mon compte chez mon courtier ?': 'Does Kapitaro have access to my brokerage account?',
    'Non. Kapitaro ne se connecte à aucune banque ni aucun courtier et ne peut passer aucun ordre : tu ajoutes toi-même tes positions, ou tu importes un relevé.': 'No. Kapitaro doesn’t connect to any bank or broker and cannot place any order: you add your holdings yourself, or import a statement.',
    'Mes données sont-elles protégées ?': 'Is my data protected?',
    'Tes données sont chiffrées lors des échanges, hébergées de façon sécurisée, et ne sont jamais vendues. Tu peux les télécharger ou supprimer ton compte à tout moment depuis les Paramètres.': 'Your data is encrypted in transit, stored securely and never sold. You can download it or delete your account at any time from Settings.',
    'Est-ce un conseil en investissement ?': 'Is this investment advice?',
    "Non. Kapitaro est un outil pédagogique d'aide à la décision : il t'aide à comprendre et à organiser tes placements, mais la décision finale t'appartient. Investir comporte un risque de perte en capital.": 'No. Kapitaro is an educational tool: it helps you understand and organize your investments, but every decision is yours. Investing involves risk, including the loss of your capital.',
    'Faut-il installer une application ?': 'Do I need to install an app?',
    "Non, Kapitaro fonctionne dans ton navigateur, sur téléphone comme sur ordinateur. Tu peux aussi l'ajouter à ton écran d'accueil pour l'ouvrir comme une app et recevoir les notifications.": 'No, Kapitaro works in your browser, on phone and computer. You can also add it to your home screen to open it like an app and get notifications.',
    'Je débute complètement, est-ce pour moi ?': 'I’m a complete beginner — is it for me?',
    "Oui, c'est même pensé pour ça : un tutoriel te guide au départ, tout est expliqué en français simple, et l'assistant répond à tes questions sans jargon.": 'Yes, it’s built for that: a tutorial guides you at the start, everything is explained in plain English, and the assistant answers your questions without jargon.',
    'Sans compte': 'No account needed',
    'Nos outils gratuits': 'Our free tools',
    "Simulateur d'intérêts composés": 'Compound interest calculator',
    'Combien épargner par mois ?': 'How much to save each month?',
    'Combien rapporte un ETF MSCI World': 'MSCI World ETF returns',
    'Investir chaque mois : 3 scénarios': 'Investing monthly: 3 scenarios',
    'Ce que les frais te coûtent': 'What fees really cost you',
    "Calculateur d'inflation": 'Inflation calculator',
    'Prêt à y voir plus clair dans tes placements ?': 'Ready to see your investments clearly?',
    'Gratuit pour commencer, sans carte bancaire.': 'Free to start, no credit card.',
    'Blog': 'Blog', 'FAQ': 'FAQ', 'Contact': 'Contact', 'Cookies': 'Cookies',
    "Kapitaro est un outil d'aide à la décision et ne constitue pas un conseil en investissement. L'éditeur n'est pas enregistré auprès de l'ORIAS ni agréé par l'AMF. Investir comporte un risque de perte en capital.": {
      _: 'Kapitaro is an educational tool and does not provide investment advice. Investing involves risk, including possible loss of capital.',
      US: 'Kapitaro provides general educational information only — not investment, tax or legal advice. Kapitaro is not a registered investment adviser or broker-dealer. Investing involves risk, including possible loss of principal.',
      EU: 'Kapitaro is an educational tool and does not provide investment advice within the meaning of MiFID II. Past performance is not a reliable indicator of future results. Capital at risk.',
      UK: 'Kapitaro is an educational tool and is not authorised by the Financial Conduct Authority to give financial advice. Past performance is not a reliable indicator of future results. Capital at risk.' },
    '© Kapitaro · Maxence De Macedo, entrepreneur individuel (Quorvia) · SIREN 902 642 016': '© Kapitaro · Maxence De Macedo, sole proprietor (trade name Quorvia), France · SIREN 902 642 016',
  });

  // ════════════ MESSAGES DE CONNEXION / INSCRIPTION (app.js) ════════════
  add({
    "Connexion Google indisponible pour l'instant.": 'Google sign-in is unavailable right now.',
    "Trop d'emails envoyés récemment. Réessaie dans environ 1 heure.": 'Too many emails sent recently. Please try again in about an hour.',
    'Adresse email invalide.': 'Invalid email address.',
    'Connexion...': 'Logging in...',
    'Création...': 'Creating...',
    'Email ou mot de passe incorrect.': 'Incorrect email or password.',
    'Entre ton email puis clique Mot de passe oublié': 'Enter your email, then click “Forgot your password?”',
    'Google bloque sa connexion dans le navigateur d’Instagram ou de Facebook : inscris-toi avec ton e-mail, ou ouvre kapitaro.fr dans ton navigateur.': 'Google blocks sign-in inside the Instagram or Facebook browser: sign up with your email, or open kapitaro.com in your regular browser.',
    'Mot de passe refusé : utilise au moins 8 caractères.': 'Password rejected: use at least 8 characters.',
    'Mot de passe trop court : au moins 8 caractères.': 'Password too short: at least 8 characters.',
    'Mots de passe différents.': 'Passwords don’t match.',
    'Ouverture de Chrome…': 'Opening Chrome…',
    'Redirection vers Google...': 'Redirecting to Google...',
    'Remplis tous les champs.': 'Please fill in all fields.',
    'Un compte existe déjà avec cet email — connecte-toi.': 'An account already exists with this email — please log in.',
    '📧 Email de réinitialisation envoyé !': '📧 Password reset email sent!',
    'Vérifie ta boîte mail': 'Check your inbox',
    "On vient d'envoyer un lien de confirmation à": 'We just sent a confirmation link to',
    'Clique dessus pour activer ton compte, puis reviens te connecter ici.': 'Click it to activate your account, then come back here to log in.',
    'Rien reçu ? Regarde dans les spams / courriers indésirables.': 'Nothing yet? Check your spam / junk folder.',
    "Renvoyer l'email": 'Resend the email',
    "J'ai confirmé → Me connecter": 'I’ve confirmed → Log in',
    'Envoi...': 'Sending...',
    'Échec — réessaie dans 1 min': 'Failed — try again in 1 min',
    '✓ Email renvoyé': '✓ Email resent',
    'Session expirée, reconnecte-toi': 'Session expired, please log in again',
    'Redirection...': 'Redirecting...',
    "🔒 Crée un compte pour t'abonner": '🔒 Create an account to subscribe',
    "🔒 Connecte-toi pour utiliser l'assistant IA. L'accès à l'IA est réservé aux comptes Kapitaro.": '🔒 Log in to use the AI assistant. AI access is for Kapitaro accounts only.',
    'Aucune réponse.': 'No answer.',
  });

  // ════════════ NAVIGATION, PAGES, PARAMÈTRES (index.html) ════════════
  add({
    'Accueil': 'Home', 'Portefeuille': 'Portfolio', 'Objectif': 'Goal', 'Santé': 'Health', 'Outils': 'Tools',
    'Actualités': 'News', 'Agent IA': 'AI agent', 'Aide décision': 'Decision helper', 'Aide à la décision': 'Decision helper',
    'Paramètres': 'Settings', 'Calculateurs': 'Calculators', 'Mes dépenses': 'My spending', 'Mon bilan': 'My check-up',
    'Mon portefeuille': 'My portfolio', 'Mon objectif': 'My goal', 'Mon compte': 'My account', 'Mon niveau': 'My level',
    'Santé du portefeuille': 'Portfolio health', 'Scénario crise': 'Crash scenario', 'Simulateur DCA': 'Regular investing simulator',
    'Patrimoine': 'Net worth', 'Nouveautés': "What's new", 'Aide': 'Help', 'Compte': 'Account', 'Abonnement': 'Subscription',
    'Notifications': 'Notifications', 'Parrainage': 'Referrals', 'Informations légales': 'Legal information', 'Mes données': 'My data',
    'Application': 'App', 'Apparence': 'Appearance', 'Thème': 'Theme', '☀️ Clair': '☀️ Light', '🌙 Sombre': '🌙 Dark', 'Sombre': 'Dark',
    'Mode démo': 'Demo mode', '👀 Mode démo —': '👀 Demo mode —', 'données fictives': 'sample data',
    'Offre gratuite': 'Free plan', 'Plus d\'analyses IA et outils avancés': 'More AI analyses and advanced tools', 'Passez à Premium · comparer': 'Go Premium · compare',
    'Modifier ton mot de passe': 'Change your password', 'Enregistrer le mot de passe': 'Save password',
    'Nouveau mot de passe (8 car. min.)': 'New password (min. 8 characters)', 'Confirme-le': 'Confirm it',
    'Se déconnecter': 'Log out', 'Déconnexion': 'Log out',
    'Questions fréquentes (FAQ)': 'Frequently asked questions (FAQ)', 'Compte, portefeuille, outils, Premium, application': 'Account, portfolio, tools, Premium, app',
    'Poser une question': 'Ask a question', "L'aide instantanée sur l'utilisation du site": 'Instant help on using the site',
    'Nous écrire': 'Email us', 'Revoir le tutoriel': 'Replay the tutorial', 'Le guide de démarrage en 4 étapes': 'The 4-step getting-started guide',
    'Réafficher les explications': 'Show tips again', "Le petit mot d'aide à l'ouverture de chaque onglet": 'The short help note when you open each tab',
    '📚 Lexique de l’investissement': '📚 Investing glossary', 'Les mots techniques expliqués simplement (ETF, PRU, volatilité…)': 'Technical words explained simply (ETF, cost basis, volatility…)',
    'Télécharger toutes mes données': 'Download all my data', 'Un fichier avec tout ce que Kapitaro garde sur toi': 'A file with everything Kapitaro stores about you',
    'Supprimer mon compte': 'Delete my account', 'Efface définitivement ton compte et toutes tes données': 'Permanently deletes your account and all your data',
    'Réinitialiser mon compte': 'Reset my account', 'Efface placements, objectifs et transactions (garde le compte) — pour re-tester': 'Clears investments, goals and transactions (keeps the account) — to start over',
    'Conditions d\'utilisation et de vente': 'Terms of Service', 'Politique de confidentialité': 'Privacy Policy', 'Avertissement sur les risques': 'Risk disclosure',
    'Profil investisseur': 'Investor profile', 'Personnalisé pour toi': 'Personalized for you',
    "L'IA s'en sert pour adapter ses conseils. Enregistré automatiquement.": 'The AI uses this to tailor its explanations. Saved automatically.',
    'Capital disponible': 'Available capital', 'Horizon': 'Time horizon', 'Tolérance au risque': 'Risk tolerance', 'Objectif principal': 'Main goal',
    'Plateforme principale': 'Main platform', 'Ta plateforme principale': 'Your main platform', 'Aucune / autre': 'None / other',
    'Proposée par défaut quand tu ajoutes un placement': 'Suggested by default when you add an investment',
    'Briefing du matin': 'Morning briefing', 'Chaque jour': 'Every day', 'Chaque lundi': 'Every Monday', '📋 Rapport hebdomadaire': '📋 Weekly report',
    'E-mails de conseils et rappels': 'Tips and reminder emails', 'La lettre du dimanche et quelques conseils pour ne pas perdre le fil, jamais de publicité': 'The Sunday newsletter and a few tips to keep you on track — never ads',
    "Même quand l'app est fermée : briefing, alertes de prix et gros mouvements. 2 alertes par jour au maximum, jamais de spam.": 'Even when the app is closed: briefing, price alerts and big moves. At most 2 alerts a day, never spam.',
    'Désactivé': 'Off', 'Actif': 'On', 'Modifier ton choix': 'Change your choice',
    'Rapport PDF du portefeuille': 'Portfolio PDF report', 'Tes positions et ta performance, à imprimer ou garder': 'Your holdings and performance, to print or keep',
    'Fermer': 'Close', 'Annuler': 'Cancel', 'Sauvegarder': 'Save', 'Effacer': 'Clear', 'Ouvrir': 'Open', 'Passer': 'Skip', 'Suivant →': 'Next →',
    '← Retour': '← Back', 'Retour': 'Back', '↻ Actualiser': '↻ Refresh', '✏ Modifier': '✏ Edit', '✏️ Modifier': '✏️ Edit', '🗑️ Supprimer': '🗑️ Delete', 'Supprimer': 'Delete',
    'Réessayer': 'Try again', '🔄 Réessayer': '🔄 Try again', 'Terminer': 'Finish', 'Valider': 'Confirm', 'Choisir...': 'Choose...', 'Tout voir': 'See all', 'Tout voir →': 'See all →', 'Voir →': 'See →',
    'Chargement...': 'Loading...', 'Chargement…': 'Loading…', 'Calcul...': 'Calculating...', 'calcul…': 'calculating…', 'Recherche en cours...': 'Searching...', 'Réflexion...': 'Thinking...',
    'Échec du chargement': 'Failed to load', 'Réessaie dans quelques secondes.': 'Try again in a few seconds.',
    'Aller à l\'accueil': 'Go to home', 'Kapitaro en une minute': 'Kapitaro in one minute', 'Vidéo de présentation': 'Intro video',
    'Explorer l\'app avec un portefeuille fictif': 'Explore the app with a sample portfolio',
  });

  // ════════════ PORTEFEUILLE, POSITIONS, ALERTES ════════════
  add({
    'Ajouter une position': 'Add a holding', '+ Ajouter une position': '+ Add a holding', '+ Ajouter': '+ Add', 'Ajouter au portefeuille': 'Add to portfolio',
    '➕ Ajouter au portefeuille': '➕ Add to portfolio', '➕ Ajouter à mon portefeuille': '➕ Add to my portfolio', '➕ Ajouter ma première position': '➕ Add my first holding',
    '✏ Modifier la position': '✏ Edit holding', 'Rechercher un titre *': 'Search for a security *', 'Recherche un titre ci-dessus': 'Search for a security above',
    'Le prix et le secteur se rempliront automatiquement — par nom ou par code (ex: AAPL, MC.PA, IWDA.L)': 'Price and sector fill in automatically — search by name or ticker (e.g. AAPL, MSFT, VOO)',
    'Ou choisis parmi les plus suivis': 'Or pick one of the most followed', 'Quantité *': 'Quantity *', 'PRU (€) *': 'Cost basis per share (€) *',
    'Prix actuel (€)': 'Current price (€)', 'Alerte prix (€)': 'Price alert (€)', '(facultatif)': '(optional)', 'Plateforme': 'Platform',
    'Secteur': 'Sector', 'Capital': 'Capital', 'Investi': 'Invested', 'Gains': 'Gains', 'Total': 'Total', 'Valeur': 'Value', 'Valeur actuelle': 'Current value',
    'Valeur totale du portefeuille': 'Total portfolio value', 'Variation aujourd\'hui': 'Change today', "Aujourd'hui": 'Today', 'Prix': 'Price', 'Prix actuel': 'Current price',
    "Prix d'achat (PRU, €)": 'Purchase price (cost basis, €)', 'Quantité (nb de parts)': 'Quantity (number of shares)', 'Qté': 'Qty', 'Type': 'Type', 'Volume': 'Volume',
    'Répartition': 'Allocation', 'Ta répartition': 'Your allocation', 'Répartition par plateforme': 'Allocation by platform', 'Par plateforme': 'By platform',
    '📦 Mes positions': '📦 My holdings', '📥 Importer tes positions': '📥 Import your holdings', '📂 Choisir mon fichier': '📂 Choose my file',
    '📄 Lecture de ton relevé…': '📄 Reading your statement…', '🔎 Identification de tes titres…': '🔎 Identifying your securities…',
    'Quelques secondes : l\'IA repère tes positions.': 'A few seconds: the AI is finding your holdings.', 'Vérifie avant d\'ajouter': 'Check before adding',
    '🔀 Tu détiens déjà cette position — elle sera fusionnée': '🔀 You already hold this — it will be merged', '⚡ Tout ajouter': '⚡ Add all',
    '⚠️ prix introuvable — saisis-le à droite': '⚠️ price not found — enter it on the right', '🔎 Actif introuvable': '🔎 Security not found',
    'Tu le détiens quand même ? Ajoute-le à la main (tu saisis toi-même le prix) :': 'Do you still hold it? Add it manually (enter the price yourself):',
    'Une autre plateforme': 'Another platform', 'Prix mis à jour manuellement': 'Price updated manually', 'perf. du jour': 'day change',
    '🔔 Alerte': '🔔 Alert', '📈 Graphique': '📈 Chart', '📈 Graphique du cours': '📈 Price chart', '📈 Voir le graphique de l’actif': '📈 See the price chart',
    '🏆 Meilleure performance': '🏆 Best performer', '📉 Plus faible performance': '📉 Weakest performer', 'Dans mon portf.': 'In my portfolio',
    'ℹ️ Tes cryptomonnaies et devises sont suivies dans ton portefeuille mais ne sont pas incluses dans ce score.': 'ℹ️ Your crypto and currencies are tracked in your portfolio but not included in this score.',
    'Tes cryptomonnaies et devises sont suivies dans ton portefeuille, mais Kapitaro ne les analyse pas. Ajoute des actions ou des ETF pour obtenir ton score de santé.': 'Your crypto and currencies are tracked in your portfolio, but Kapitaro does not analyze them. Add stocks or ETFs to get your health score.',
    '🪙 C’est une crypto': '🪙 This is a crypto', 'Pas d’analyse pour les cryptomonnaies': 'No analysis for crypto',
    '⚠️ Cette position représenterait plus d\'un tiers de ton portefeuille — pense à diversifier.': '⚠️ This holding would be more than a third of your portfolio — keep diversification in mind.',
    'Acheter / Renforcer': 'Buy / Add more', 'Vendre / Réduire': 'Sell / Reduce', 'Quel actif ?': 'Which security?', 'Montant envisagé': 'Amount considered', 'Ton intention': 'Your intention',
    'Cherche un titre ou clique sur une de tes positions': 'Search for a security or tap one of your holdings',
    "Dis-moi ce que tu envisages, l'IA te donne un avis clair et chiffré.": 'Tell me what you’re considering — the AI gives you a clear, figures-based educational view.',
    'Marché fermé — derniers prix connus affichés': 'Market closed — showing last known prices', 'Position introuvable': 'Holding not found',
    'Retiré des favoris': 'Removed from favorites', 'Lien copié': 'Link copied', '✓ Copié dans le presse-papiers !': '✓ Copied to clipboard!',
  });

  // ════════════ NOTIFICATIONS (TOASTS) ════════════
  add({
    'Aucune ligne dans le plan du mois': 'No lines in this month’s plan', 'Aucune ligne de plan à ajouter pour le moment': 'No plan lines to add for now',
    'Choisis d’abord un actif': 'Choose a security first', 'Crée un compte pour gérer tes e-mails': 'Create an account to manage your emails',
    'Enregistrement impossible': 'Couldn’t save', 'Indisponible en mode démo': 'Not available in demo mode', 'Objectif supprimé': 'Goal deleted',
    'Paiement annulé — tu peux réessayer quand tu veux': 'Payment canceled — you can try again any time', 'Partage non disponible sur ce navigateur.': 'Sharing isn’t available in this browser.',
    'Rien ajouté — vérifie les montants.': 'Nothing added — check the amounts.', 'Tu dois être connecté': 'You need to be logged in', 'Vidéo bientôt disponible': 'Video coming soon',
    '⏳ Activation de ton abonnement...': '⏳ Activating your subscription...', '⏳ Attends la réponse en cours...': '⏳ Waiting for the current answer...',
    '⚠ Indique la quantité': '⚠ Enter the quantity', '⚠ Indique le prix actuel': '⚠ Enter the current price', '⚠ Indique ton prix de revient (PRU)': '⚠ Enter your cost basis',
    '⚠ Indique une quantité valide': '⚠ Enter a valid quantity', '⚠ Recherche et sélectionne une action': '⚠ Search for and select a stock', '⚠ Remplis tous les champs': '⚠ Fill in all fields',
    '⚠ Remplis les 3 champs': '⚠ Fill in all 3 fields',
    '⚠️ Aucune position détectée dans ce fichier': '⚠️ No holdings found in this file', '⚠️ Sélectionne au moins une position': '⚠️ Select at least one holding',
    '✅ Formulaire pré-rempli — vérifie et valide !': '✅ Form pre-filled — check and confirm!', '✅ Indique la quantité achetée et valide': '✅ Enter the quantity bought and confirm',
    '✓ Compte réinitialisé — rechargement…': '✓ Account reset — reloading…', '✓ Interface adaptée à ton niveau': '✓ Interface adapted to your level', '✓ Objectif supprimé': '✓ Goal deleted',
    '✓ Position ajoutée !': '✓ Holding added!', '✓ Position modifiée !': '✓ Holding updated!', '✓ Profil enregistré': '✓ Profile saved',
    '✓ Répartition mise à jour — plan recalculé': '✓ Allocation updated — plan recalculated', '✓ Tes données ont été exportées': '✓ Your data has been exported',
    '🎁 Invité par un ami : −50 % sur ton 1er mois Premium': '🎁 Invited by a friend: 50% off your first Premium month',
    '🎉 Tout est en place — ton tableau de bord est prêt !': '🎉 All set — your dashboard is ready!',
    '🎯 Objectif sauvegardé ! Suis ta progression dans Objectif.': '🎯 Goal saved! Track your progress in Goal.', '🎯 Objectif sauvegardé !': '🎯 Goal saved!',
    '✓ Enregistré dans ton compte': '✓ Saved to your account', 'Erreur: modal manquant': 'Error: missing dialog',
  });

  // ════════════ OBJECTIF, SIMULATEURS, TUTORIEL ════════════
  add({
    'Objectif & Risque': 'Goal & risk', 'Ton objectif': 'Your goal', 'Ton budget': 'Your budget', 'Ton profil de risque': 'Your risk profile',
    'Capital visé (€)': 'Target amount (€)', 'Objectif à atteindre (€)': 'Target amount (€)', 'Capital de départ (€)': 'Starting amount (€)', 'Capital disponible (€)': 'Available capital (€)',
    'Versement mensuel (€)': 'Monthly contribution (€)', 'Durée (années)': 'Duration (years)', 'Dans combien d\'années ?': 'In how many years?',
    'Combien tu veux avoir et pourquoi': 'How much you want and why', 'Pour quel projet ?': 'For which project?', 'Ce que tu peux investir': 'What you can invest',
    'Ce que tu peux investir maintenant et chaque mois': 'What you can invest now and each month', 'Ton capital de départ': 'Your starting amount',
    'Ce que tu acceptes de voir baisser': 'How much drop you can accept', 'Quel niveau de volatilité tu peux accepter ?': 'What level of volatility can you accept?',
    'Dans combien de temps tu auras besoin de cet argent': 'When you will need this money',
    'Prudent': 'Cautious', 'Équilibré': 'Balanced', 'Agressif': 'Aggressive', 'Modérée': 'Moderate', 'Faible': 'Low', 'Élevée': 'High',
    'Perte max -10%': 'Max loss -10%', 'Perte max -25%': 'Max loss -25%', 'Perte max -40%': 'Max loss -40%',
    'Moins de 3 ans': 'Less than 3 years', '3 à 7 ans': '3 to 7 years', 'Plus de 7 ans': 'More than 7 years', '1-3 ans': '1–3 years', '3-10 ans': '3–10 years', '10-20 ans': '10–20 years', '15-25 ans': '15–25 years', '10 ans': '10 years',
    '🏖️ Retraite / Indépendance financière': '🏖️ Retirement / financial independence', '🏠 Achat immobilier': '🏠 Buying a home', '👨‍👩‍👧 Études des enfants': '👨‍👩‍👧 Children’s education',
    '🚀 Liberté financière': '🚀 Financial freedom', '✨ Autre projet': '✨ Other project', 'Retraite FIRE': 'FIRE retirement', 'Revenus passifs': 'Passive income', 'Projet précis': 'Specific project',
    'Plan court terme — Complément de salaire': 'Short-term plan — extra income',
    'Quel est ton niveau ?': 'What’s your level?', "Je n'ai jamais investi": 'I’ve never invested', "Je connais les bases, mais je n'ai pas encore investi": 'I know the basics but haven’t invested yet',
    "J'ai déjà investi, je connais les ETF": 'I’ve invested before and know ETFs', 'Je gère activement un portefeuille important': 'I actively manage a large portfolio',
    'Débutant': 'Beginner', 'Curieux': 'Curious', 'Initié': 'Experienced', 'Confirmé': 'Advanced', 'Modifiable après': 'You can change it later',
    'Étape 1 / 4': 'Step 1 / 4', 'Étape 2 / 4': 'Step 2 / 4', 'Étape 3 / 4': 'Step 3 / 4', 'Étape 1 sur 3': 'Step 1 of 3', 'Étape 2 sur 3': 'Step 2 of 3', 'Étape 3 sur 3': 'Step 3 of 3',
    'Voir mon plan →': 'See my plan →', '🤖 Générer mon plan': '🤖 Generate my plan', 'Génération de ton plan...': 'Generating your plan...', 'Ton plan est prêt !': 'Your plan is ready!',
    '🎯 Ton plan DCA personnalisé': '🎯 Your regular-investing plan (illustrative)', '🎯 Voir mon plan en détail →': '🎯 See my plan in detail →', 'Bonjour !': 'Hi there!',
    'Projection': 'Projection', 'Projection sur 10 ans': '10-year projection', 'Projection année par année': 'Year-by-year projection', '📋 Projection année par année': '📋 Year-by-year projection',
    'Valeur projetée': 'Projected value', 'Capital final estimé': 'Estimated final amount', 'Progression réelle': 'Actual progress', 'Année': 'Year',
    'TOTAL INVESTI': 'TOTAL INVESTED', 'INTÉRÊTS COMPOSÉS': 'COMPOUND INTEREST', 'MULTIPLICATEUR': 'MULTIPLIER', 'MENSUEL': 'MONTHLY', 'DURÉE': 'DURATION', 'FINAL': 'FINAL',
    '⬜ Ce que tu verses': '⬜ What you pay in', '🟩 Ce que le marché génère': '🟩 What the market generates (hypothetical)', '🏦 Capital de départ': '🏦 Starting amount',
    '💶 Versement mensuel': '💶 Monthly contribution', '📅 Durée': '📅 Duration', '📈 Rendement estimé': '📈 Assumed return', 'Rendement annuel': 'Annual return',
    'Total investi': 'Total invested', 'Simulation calculée avec un rendement moyen de': 'Simulation calculated with an average return of',
    'taux de rendement annuel constant': 'constant annual rate of return', 'Réaliste à 7%/an': 'Realistic at 7%/yr', 'Réaliste (+7 %/an)': 'Realistic (+7%/yr)',
    '⚠️ Les performances passées ne préjugent pas des performances futures. Ces simulations sont éducatives, pas un conseil en investissement.': '⚠️ Past performance is not a reliable indicator of future results. These simulations are educational, not investment advice.',
    'sont des hypothèses d\'école pour visualiser l\'écart possible, pas une prévision.': 'are textbook assumptions to visualize the possible range, not a forecast.',
    'correspond au rendement historique moyen du MSCI World sur 20 ans, dividendes réinvestis.': 'is roughly the MSCI World’s historical 20-year average return with dividends reinvested — not a forecast.',
    'correspond au rendement historique moyen du MSCI World sur 20 ans (dividendes réinvestis).': 'is roughly the MSCI World’s historical 20-year average return (dividends reinvested) — not a forecast.',
    '🎯 Créer mon premier objectif': '🎯 Create my first goal', '🎯 Créer mon objectif': '🎯 Create my goal', '✓ Valider et suivre cet objectif': '✓ Confirm and track this goal',
    '✓ Objectif atteignable avec ce plan — continue comme ça !': '✓ Goal achievable with this plan (based on the assumptions) — keep it up!', '✓ Atteint': '✓ Reached',
    'pas réaliste': 'not realistic', '⚠️ 3 objectifs déjà créés': '⚠️ 3 goals already created', '⚠ Maximum 3 objectifs atteint': '⚠ Maximum of 3 goals reached',
    'Tu as déjà 3 objectifs': 'You already have 3 goals', 'Supprime un objectif existant (bouton ×) pour en créer un nouveau.': 'Delete an existing goal (× button) to create a new one.',
    'Suis l\'évolution de ton objectif personnalisé': 'Track how your goal is progressing', 'Suis la performance de tes investissements en temps réel.': 'Track your investments’ performance in real time.',
    'Valeur de ton portefeuille et dernière séance': 'Your portfolio value and last trading session',
    'Retrouve ce plan et ton graphique de projection dans la page Objectif.': 'Find this plan and your projection chart on the Goal page.',
    'Réduit progressivement la part d\'actions à l\'approche de ton objectif': 'Gradually reduces the share of stocks as your goal gets closer',
    'Progression objectif': 'Goal progress', 'Ton plan du mois': 'Your plan for this month', 'Simulateur d\'investissement régulier': 'Regular investing simulator',
    'Charger un exemple': 'Load an example', 'Lancer mon bilan': 'Start my check-up', '🔄 Refaire mon bilan': '🔄 Redo my check-up', 'Voir mon dernier bilan': 'See my last check-up',
    '📄 Résumer mon bilan': '📄 Summarize my check-up', '📄 Exporter PDF': '📄 Export PDF',
    'Ton âge': 'Your age', 'Situation familiale': 'Family situation', 'Situation professionnelle': 'Employment status', 'Salarié(e)': 'Employee', 'Étudiant(e)': 'Student', 'Retraité(e)': 'Retired',
    'Revenu net mensuel (€)': 'Net monthly income (€)', 'Épargne actuelle (€/mois)': 'Current savings (€/month)', 'Revenus & charges': 'Income & expenses',
  });

  // ════════════ IA, PREMIUM, PARRAINAGE ════════════
  add({
    '✦ IA': '✦ AI', 'Assistant IA · ': 'AI assistant · ', 'Pose une question à ton Agent IA': 'Ask your AI agent a question',
    "Bonjour ! Je suis ton copilote IA. Je connais ton portefeuille, tes objectifs et ton profil. Pose-moi n'importe quelle question ou donne-moi un ordre.": 'Hi! I’m your AI copilot. I know your portfolio, goals and profile. Ask me anything, or ask me to do something in the app.',
    'Ton copilote financier personnel : à chaque visite il analyse ton portefeuille et te signale ce qui mérite ton attention.': 'Your personal finance copilot: on each visit it reviews your portfolio and points out what deserves your attention.',
    'Analyse complète de ton portefeuille et recommandations personnalisées.': 'A complete review of your portfolio with educational insights.',
    'Analyse complète IA': 'Full AI analysis', '🔬 Voir l\'analyse complète': '🔬 See the full analysis', 'Voir l\'analyse complète →': 'See the full analysis →',
    '🤖 Analyser': '🤖 Analyze', '🔍 Analyser': '🔍 Analyze', '🤖 Analyse IA': '🤖 AI analysis', '🤖 Analyse IA →': '🤖 AI analysis →', '🤖 Discuter avec l\'IA →': '🤖 Chat with the AI →',
    '💬 Demander à l\'IA': '💬 Ask the AI', '💬 Questions rapides': '💬 Quick questions', '💬 Comprendre': '💬 Understand', '💬 Conseil IA en cours...': '💬 AI insight in progress...',
    'Analyse du marché en cours...': 'Analyzing the market...', '📜 Historique & fiabilité IA': '📜 AI history & track record', '🧠 Mémoire active': '🧠 Memory on',
    'ⓘ Signaux éducatifs suivis et évalués à J+7 dans l\'historique — pas un conseil en investissement personnalisé. Toute décision t\'appartient.': 'ⓘ Educational signals, tracked and reviewed after 7 days in the history — not personalized investment advice. Every decision is yours.',
    'ⓘ Contexte général tiré des connaissances de l\'IA — pas un flux d\'actualité en temps réel, peut être incomplet ou daté.': 'ⓘ General context from the AI’s knowledge — not a real-time news feed; it may be incomplete or out of date.',
    '⏳ Limite gratuite atteinte': '⏳ Free limit reached', 'Voir Premium': 'See Premium', '✨ Premium': '✨ Premium', 'S\'abonner': 'Subscribe', 'Résiliable à tout moment': 'Cancel any time',
    'facturé chaque mois · sans engagement': 'billed monthly · no commitment', 'Tout ce qui est inclus dans Gratuit, plus :': 'Everything in Free, plus:', 'Tchat IA sans limite': 'Unlimited AI chat',
    'Sans plafond, avec les outils avancés': 'No cap, with advanced tools', 'Voir ce que donne Premium': 'See what Premium offers', 'Réservé aux comptes Kapitaro': 'For Kapitaro accounts only',
    '🎁 Premium offert': '🎁 Free Premium', '🎁 Invité par un ami : −50 % le 1er mois': '🎁 Invited by a friend: 50% off the first month', '−50 % sur son 1er mois Premium': '50% off their first Premium month',
    'dès qu\'il a payé son abonnement.': 'as soon as they’ve paid for their subscription.', 'Tu économises 5,00 € sur ton 1er mois': 'You save {{half}} on your first month',
    '✨ Nouveautés Kapitaro': '✨ What’s new in Kapitaro', 'Voici ce qui change dans l’appli.': 'Here’s what’s changing in the app.', '✨ Créer un compte gratuit': '✨ Create a free account',
    '🔒 Aperçu figé · portefeuille fictif': '🔒 Static preview · sample portfolio', 'Ton Agent IA t\'attend': 'Your AI agent is waiting',
    '🔓 Accueil · Portefeuille · Objectif · Assistant IA': '🔓 Home · Portfolio · Goal · AI assistant', '🔓 + Score de santé · Calculateur de dépenses · Actualités': '🔓 + Health score · Spending calculator · News',
    'Simule l\'impact des crises sur ton portefeuille et prépare ta stratégie.': 'Simulate how past crashes could affect your portfolio and think ahead.',
    'Vois ce que la régularité et les intérêts composés font de ton épargne.': 'See what regular investing and compound interest can do for your savings.',
    "Vois ce que tu paies vraiment chaque mois, repère ce qui n'est pas vital et découvre ce que ça donnerait investi.": 'See what you really spend each month, spot what isn’t essential and what it could become if invested (hypothetical).',
    'Ce que les frais te coûtent, et ce que l’inflation fait à ton épargne.': 'What fees cost you, and what inflation does to your savings.',
    'Matières premières': 'Commodities', '🥇 Matières premières': '🥇 Commodities', '🛢️ Matières premières': '🛢️ Commodities', '🪙 Cryptos': '🪙 Crypto', '💱 Devises': '💱 Currencies',
    '🏢 Actions': '🏢 Stocks', '📊 ETF': '📊 ETFs', '🌐 Tout': '🌐 All', '📰 Toutes': '📰 All', 'À la une': 'Top stories', '📈 Marchés': '📈 Markets', '🏢 Entreprises': '🏢 Companies',
    '🏢 Secteurs': '🏢 Sectors', '🌍 Macro': '🌍 Macro', '⚡ Géopolitique': '⚡ Geopolitics', '🏦 Banques centrales': '🏦 Central banks', '📅 Agenda': '📅 Calendar',
    'Titres et articles © Investing.com, ouverts depuis leur site d’origine.': 'Headlines and articles © Investing.com, opened on their original site.',
    'Recommandations IA': 'AI insights', 'Recommandation IA': 'AI insight', 'Signal IA': 'AI signal', 'Verdict': 'Verdict', 'Taux de réussite': 'Hit rate',
    '✅ Points forts': '✅ Strengths', '✅ Points positifs': '✅ Positives', '⚠️ Points négatifs': '⚠️ Negatives', '⚠️ À surveiller': '⚠️ To watch', '⚠ Risque principal': '⚠ Main risk',
    'Risques détectés': 'Risks detected', 'Risque': 'Risk', 'À surveiller dans ton portefeuille': 'Worth watching in your portfolio', '✅ Tout va bien — aucune alerte': '✅ All good — no alerts',
    'Rien à analyser pour l’instant': 'Nothing to analyze yet', 'Rien pour l\'instant': 'Nothing yet', 'Aucune pour l’instant': 'None yet',
    'Version simplifiée.': 'Simplified version.', 'outil d\'aide à la décision': 'educational decision-support tool',
  });

  // ════════════ TEXTES RELEVÉS EN PARCOURANT L'APP EN MODE DÉMO (passe 1) ════════════
  add({
    'ton@email.com': 'you@email.com', '8 caractères minimum': 'At least 8 characters',
    '🔓 Tous les outils (+ scénario de crise, DCA': '🔓 All tools (+ crash scenario, regular investing', ', aide à la décision)': ', decision helper)',
    'Banque, courtier ou plateforme où tu investis : on te la proposera par défaut quand tu ajoutes un placement. Tu peux choisir « Aucune ».': 'Bank, broker or platform where you invest: we’ll suggest it by default when you add an investment. You can choose “None”.',
    'Actions vs ETF — à toi de choisir': 'Stocks vs ETFs — your choice', '📋 Créer mon plan': '📋 Create my plan', '✨ Créer un compte gratuit →': '✨ Create a free account →',
    'Ouvrir le menu': 'Open menu', 'Retour à l’accueil Kapitaro': 'Back to Kapitaro home', 'Tes analyses IA gratuites': 'Your free AI analyses', 'Comparer les offres': 'Compare plans',
    'Fermer les notifications': 'Close notifications', 'Sélectionner plusieurs positions': 'Select several holdings', '☑️ Sélectionner': '☑️ Select', 'Tout sélectionner': 'Select all',
    'Importer tes positions depuis Trade Republic ou XTB': 'Import your holdings from a broker statement', 'Dans — ans': 'In — years', 'Où et comment investir': 'Where and how to invest',
    '🤖 Obtenir mon analyse personnalisée': '🤖 Get my AI analysis', '🎯 Sauvegarder comme objectif & générer mon plan IA': '🎯 Save as a goal & generate my AI plan', '💾 Sauvegarder dans Objectif': '💾 Save to Goal',
    'Prix moyen auquel tu as acheté': 'Average price you paid', 'Notification si le prix descend sous ce seuil': 'Notify me if the price drops below this level', '⚖️ Rééquilibrer': '⚖️ Rebalance',
    'Pose ta question ou donne un ordre...': 'Ask a question or tell me what to do...', 'Analyse complète · Généré par Claude IA': 'Full analysis · Generated by Claude AI',
    'Aide : poser une question sur Kapitaro': 'Help: ask a question about Kapitaro', "Questions sur l'utilisation du site": 'Questions about using the site', 'Pose ta question…': 'Ask your question…',
    'Ta question': 'Your question', 'Réponses automatiques ·': 'Automatic answers ·', 'toute la FAQ': 'the full FAQ', 'nous écrire': 'email us',
    'Matière première': 'Commodity', 'Dollar américain': 'US dollar', 'Euro': 'Euro', 'Livre sterling': 'British pound',
    '💡 Ton ETF Monde répartit déjà ton argent sur 1 500 entreprises': '💡 Your world ETF already spreads your money across 1,500 companies',
    '⚠️ La tech pèse 42 % du portefeuille : à surveiller': '⚠️ Tech makes up 42% of the portfolio: worth watching', '🎯 Objectif 50 000 € : sur la bonne trajectoire': '🎯 Goal €50,000: on track',
    "Voici la santé de ton portefeuille aujourd'hui.": 'Here’s your portfolio’s health today.', '🎯 Créer un objectif': '🎯 Create a goal', '💼 Ajouter tes placements': '💼 Add your investments',
    '❤️ Découvrir ton score de santé': '❤️ See your health score', 'Ajoutez une action, ETF...': 'Add a stock, ETF...', 'Discute avec ton assistant': 'Chat with your assistant',
    'Santé détaillée →': 'Detailed health →', 'Détails →': 'Details →', 'Démo': 'Demo', 'Ton exposition au secteur': 'Your exposure to the sector', 'est élevée (': 'is high (',
    '). Envisage une diversification pour réduire le risque.': '). Diversifying is one way to reduce this risk.', '▶ C’est quoi ?': '▶ What is it?', 'Voir le graphique': 'See chart',
    'Voir la répartition détaillée →': 'See detailed allocation →', 'Analyse de ton portefeuille en cours...': 'Analyzing your portfolio...',
    'ⓘ Les données sont fournies à titre indicatif et ne constituent pas un conseil en investissement.': 'ⓘ Data is provided for information only and is not investment advice.',
    'Ajoute une action ou un ETF à ton portefeuille': 'Add a stock or ETF to your portfolio', 'Quelques améliorations possibles.': 'A few possible improvements.', 'Composition du portefeuille': 'Portfolio composition',
    'Conseils personnalisés': 'Suggestions', 'Réduire la concentration': 'Reduce concentration', 'Améliorer la performance': 'Improve performance',
    "Certaines positions sous-performent le marché. L'IA peut t'aider.": 'Some holdings are underperforming the market. The AI can help you understand why.', 'Concentration élevée': 'High concentration',
    'Structures de scénarios': 'Scenario structures', "Basé sur le MSCI World et l'historique 20 ans": 'Based on the MSCI World and 20 years of history', 'ⓘ Méthodologie': 'ⓘ Methodology',
    'Récession globale, inflation persistante': 'Global recession, persistent inflation', 'RISQUE ÉLEVÉ': 'HIGH RISK', 'Valeur projetée dans 10 ans': 'Projected value in 10 years', 'Réaliste': 'Realistic',
    'Ralentissement économique (PIB faible)': 'Economic slowdown (weak GDP)', 'RISQUE MODÉRÉ': 'MODERATE RISK', "Rebond de l'économie, bull run léger": 'Economic rebound, mild bull market', 'Le scénario': 'The scenario',
    'Chocs de marché': 'Market shocks', 'Marché baissier': 'Bear market', 'Crise modérée': 'Moderate crash', 'Crise sévère': 'Severe crash', 'Crise extrême': 'Extreme crash',
    'Ces simulations sont basées sur des baisses extrêmes. En réalité, les actifs réagissent différemment selon leur type et leur horizon.': 'These simulations use extreme drops. In reality, assets react differently depending on their type and time horizon.',
    'Stratégies de résilience': 'Resilience strategies', 'Actions recommandées pour protéger et renforcer ton portefeuille en période de crise.': 'Common approaches investors use to make a portfolio more resilient in a crisis (educational).',
    'Diversification géographique': 'Geographic diversification', "Réduire l'exposition à une seule région et augmenter la diversification mondiale.": 'Reducing exposure to a single region and diversifying globally.',
    'Priorité élevée': 'High priority', "Augmenter la part de cash ou d'actifs peu corrélés (obligations, or, matières premières).": 'Holding more cash or less-correlated assets (bonds, gold, commodities).',
    'Priorité moyenne': 'Medium priority', 'DCA — Investissement régulier': 'DCA — regular investing', 'Investir de manière régulière réduit le risque et permet de profiter des rebonds.': 'Investing regularly smooths your entry price and avoids trying to time the market.',
    'Fonds de précaution': 'Emergency fund', "Garder 3 à 6 mois de dépenses en liquidités avant d'investir en bourse.": 'Keeping 3 to 6 months of expenses in cash before investing in the stock market.',
    'ⓘ Les performances passées ne préjugent pas des performances futures.': 'ⓘ Past performance is not a reliable indicator of future results.',
    'Rechercher une entreprise ou un ticker...': 'Search for a company or ticker...', 'Actualités du marché': 'Market news', "Connecte-toi pour voir les actualités générées par l'IA.": 'Log in to see AI-summarized news.',
    '👣 Débutant': '👣 Beginner', '🔒 Mes dépenses est réservé à Premium': '🔒 My spending is a Premium feature',
    'Aperçu figé sur des données fictives : importe ton relevé, vois ce que tu paies vraiment, résilie ce qui ne sert à rien et découvre ce que ça donnerait investi.': 'Static preview with sample data: import your statement, see what you really pay, cancel what you don’t use and see what it could become if invested.',
    '✦ Débloquer avec Premium': '✦ Unlock with Premium', 'Tes dépenses analysées': 'Your spending, analyzed', '🧾 Toutes tes opérations': '🧾 All your transactions', 'Changer la catégorie': 'Change category',
    '💡 Énergie & eau': '💡 Energy & water', '📱 Téléphone & internet': '📱 Phone & internet', '⚕️ Santé': '⚕️ Health', '🏛️ Impôts & taxes': '🏛️ Taxes', '🎬 Streaming vidéo': '🎬 Video streaming',
    '📰 Presse & médias': '📰 News & media', '🍽️ Restaurants & cafés': '🍽️ Restaurants & cafés', '🎮 Jeux vidéo': '🎮 Video games', '🏦 Crédits & prêts': '🏦 Loans & credit', '✈️ Voyages & hôtels': '✈️ Travel & hotels',
    '• Autres dépenses': '• Other spending', '🏦 Épargne (virements)': '🏦 Savings (transfers)', '🏋️ Salle de sport': '🏋️ Gym', '🛵 Livraison de repas': '🛵 Food delivery', '🛍️ Achats en ligne & shopping': '🛍️ Online shopping',
    'Livraison de repas': 'Food delivery', 'Salle de sport': 'Gym', 'Crédits & prêts': 'Loans & credit', 'Restaurants & cafés': 'Restaurants & cafés', 'Téléphone & internet': 'Phone & internet', 'Streaming vidéo': 'Video streaming',
    '⤢ Tout afficher en grand · trier par catégorie · exporter': '⤢ Full view · sort by category · export', '🥧 Où part ton argent': '🥧 Where your money goes', '📉 Dépenses du quotidien : à diminuer': '📉 Everyday spending to cut',
    'On ne supprime pas tous les restos : on réduit la catégorie entière avec le curseur.': 'No need to cut out restaurants entirely: reduce the whole category with the slider.', 'Remettre à zéro': 'Reset',
    'Voir le détail': 'See details', '🔁 Tes abonnements : lesquels résilier ?': '🔁 Your subscriptions: which to cancel?', 'Pour chacun, décide : je garde ou je résilie.': 'For each one, decide: keep or cancel.',
    'Tu y vas au moins une fois par semaine ? Sinon, chaque séance te coûte très cher.': 'Do you go at least once a week? If not, each visit is costing you a lot.', "Ce n'est pas ça ?": 'Not this?', 'Je résilie': 'Cancel it', '✓ Je résilie': '✓ Cancel it',
    'Tu paies peut-être trop cher : les forfaits comparables se trouvent souvent 30 à 50 % moins chers.': 'You may be paying too much: comparable plans are often 30–50% cheaper.',
    'Tu le regardes encore chaque semaine ? Un seul abonnement vidéo suffit largement.': 'Do you still watch it every week? One video subscription is usually enough.', 'Une seule appli de musique suffit : tu utilises vraiment celle-ci ?': 'One music app is enough: do you really use this one?',
    'à garder (le moins cher)': 'to keep (the cheapest)', "🎬 Tu as 2 abonnements de streaming vidéo : n'en garde qu'un, celui que tu regardes le plus.": '🎬 You have 2 video streaming subscriptions: consider keeping just the one you watch most.',
    '💰 Ce que tu pourrais économiser': '💰 What you could save', 'En agissant sur 3 postes :': 'By acting on 3 items:', 'économisés par an': 'saved per year',
    "Simulation à 7 %/an, versements mensuels, avant frais et impôts. Ce n'est pas une garantie.": 'Simulation at 7%/yr, monthly contributions, before fees and taxes. Not a guarantee.',
    '📈 Voir ce que ça donne dans le simulateur DCA': '📈 See it in the regular investing simulator', 'Le bilan patrimonial utilise tes dépenses réelles pour calculer ce que tu peux épargner.': 'The financial check-up uses your actual spending to estimate what you can save.',
    "Classement indicatif fait par des règles simples et l'IA : à toi de décider ce qui compte pour toi. Ce ne sont pas des conseils financiers personnalisés. Tes opérations restent sur cet appareil.": 'Indicative sorting by simple rules and AI: you decide what matters to you. This is not personalized financial advice. Your transactions stay on this device.',
    '. Pose-moi une question ci-dessous. Le tableau de bord complet (score, alertes, analyse IA) est inclus avec Premium.': '. Ask me a question below. The full dashboard (score, alerts, AI analysis) is included with Premium.',
    '🎯 Accélérer vers mon objectif': '🎯 Get to my goal faster', '🔄 Mon portefeuille est-il équilibré ?': '🔄 Is my portfolio balanced?', '🧮 Simuler un scénario': '🧮 Simulate a scenario',
    'Bonjour ! Ton portefeuille est à': 'Hi! Your portfolio is at', '. Je connais toutes tes positions, tes objectifs et ton profil. Que veux-tu faire ?': '. I know all your holdings, goals and profile. What would you like to do?',
    "L'IA vient de commencer à suivre ses propres recommandations. Chaque conseil affiché est enregistré avec le cours du jour, puis": 'The AI has just started tracking its own signals. Each one shown is recorded with the day’s price, then',
    'évalué automatiquement 7 jours plus tard': 'automatically reviewed 7 days later', "contre le cours réel. Les résultats s'afficheront ici — les bons comme les mauvais.": 'against the actual price. Results will show here — good and bad.',
    '💸 Impact des frais': '💸 Impact of fees', '(même versement, même durée, même rendement avant frais) qui n’ont': '(same contribution, same duration, same return before fees) that don’t have',
    'pas les mêmes frais annuels': 'the same annual fees', '. Tu vois ce que la différence te coûte à la fin.': '. See what the difference costs you in the end.', 'Capital de départ': 'Starting amount', 'Durée': 'Duration',
    'Rendement brut annuel (hypothèse)': 'Gross annual return (assumption)', 'Frais du placement A': 'Fees of investment A', 'Frais du placement B': 'Fees of investment B', ': 0,1 à 0,5 %': ': 0.03–0.5%', ': 1,5 à 2,5 %': ': 1–2.5%',
    'entre 0,3 % et 1,8 % de frais par an, pour le même placement': 'between 0.3% and 1.8% in annual fees, for the same investment', 'Total versé': 'Total paid in', 'Versé': 'Paid in',
    'Simulation pédagogique avec des hypothèses constantes, ce qui n’arrive jamais en réalité : les rendements varient et peuvent être négatifs. Ce n’est pas un conseil en investissement.': 'Educational simulation with constant assumptions, which never happens in reality: returns vary and can be negative. This is not investment advice.',
    'Notifications sur cet appareil': 'Notifications on this device', 'Disponibles avec un compte : crée le tien pour les activer.': 'Available with an account: create yours to turn them on.',
    'Analyse et recommandations': 'Analysis and insights', "Voir plus d'analyses ▾": 'See more analyses ▾', '📥 Importer mes positions': '📥 Import my holdings', 'Plus-value': 'Gain', 'Que faire ?': 'What to do?',
    'Appliquer mes suggestions': 'Apply my choices', 'en double': 'duplicate', 'par mois': 'per month', 'si investis 10 ans': 'if invested for 10 years', '📄 Faire mon bilan': '📄 Do my check-up',
    'Mon Agent': 'My agent', '📊 Analyse mon portefeuille': '📊 Analyze my portfolio', '📅 Mes options ce mois-ci': '📅 My options this month', 'Afficher en % ▾': 'Show in % ▾', 'Mes valeurs ·': 'My values ·',
    'ans': 'years', 'ex. un ETF': 'e.g. an ETF', 'ex. un fonds de banque': 'e.g. an actively managed fund', 'Capital disponible en euros': 'Available capital in euros', '🥇 Or': '🥇 Gold', 'Or': 'Gold', 'Argent': 'Silver',
    'Document contractuel — Kapitaro': 'Draft legal document — Kapitaro',
    'Idéal : 60%+': 'Ideal: 60%+', 'Min conseillé : 8': 'Suggested min: 8',
  });

  // ════════════ PASSE 3 : TEXTES EXTRAITS DU CODE (app.js, depenses.js, bilan-extra.js, push.js, applock.js, calc.js, inapp.js, glossary.js) ════════════
  // Les fragments coupés par une valeur (« Tu as utilisé » + n + « de tes analyses offertes. ») sont traduits pour se lire bout à bout.
  add({
    "✦ Voir l'exemple": '✦ See the example', '📊 Analyser mes positions': '📊 Analyze my holdings', '💰 Optimiser mon DCA': '💰 Optimize my regular investing',
    'Outil PDF indisponible, vérifie ta connexion et réessaie.': 'PDF tool unavailable, check your connection and try again.', 'Aucun résultat de bilan à exporter.': 'No check-up result to export.', '⏳ Génération...': '⏳ Generating...',
    '↻ Refaire l’analyse': '↻ Redo the analysis', '⚡ Gros mouvement aujourd’hui': '⚡ Big move today', 'Tu as un bilan': 'You have a check-up', 'Reprendre ma saisie': 'Resume where I left off', '🔊 Activer le son': '🔊 Turn on sound',
    '↪ À la place :': '↪ Alternative to consider:', 'Que ferait Kapitaro ?': 'Kapitaro’s signal', '📊 Scores santé détail': '📊 Health score details', 'Recherche une entreprise ci-dessus et clique': 'Search for a company above and click', 'pour la tracker': 'to follow it',
    'Va dans Entreprises et clique sur ☆ pour suivre': 'Go to Companies and click ☆ to follow', "Suivi à J+7 dans l'historique IA": 'Reviewed after 7 days in the AI history',
    "— pas d'ETF dans ta répartition cible. Le plan du mois ci-dessus te propose directement les actions à acheter.": '— no ETFs in your target allocation. The monthly plan above shows example stocks directly.',
    "Rappel : un portefeuille 100% actions individuelles est très concentré et volatil. Tu peux ajouter une part d'ETF via « Ajuster actions/ETF » pour diversifier.": 'Reminder: a 100% individual-stock portfolio is very concentrated and volatile. You can add a share of ETFs via “Adjust stocks/ETFs” to diversify.',
    'Que faire avec': 'What to consider with', 'qui baisse ?': 'that is falling?', 'Comment réduire mon exposition à': 'How could I reduce my exposure to', 'Agir sur': 'Act on', 'Dois-je prendre mes gains sur': 'What should I consider about taking gains on',
    'Fais une analyse approfondie et complète de mon portefeuille : diversification, risques, opportunités, corrélations, scénarios.': 'Do an in-depth analysis of my portfolio: diversification, risks, opportunities, correlations, scenarios.',
    "Fais-moi un résumé de ce qui s'est passé hier sur les marchés et l'impact sur mon portefeuille": 'Summarize what happened in the markets yesterday and the impact on my portfolio',
    "Qu'est-ce que tu sais de moi et de mon profil d'investisseur ?": 'What do you know about me and my investor profile?', 'Résume mon dernier bilan et dis-moi par quoi commencer.': 'Summarize my last check-up and tell me where to start.',
    'Quelles positions sous-performent dans mon portefeuille, et que suggères-tu ?': 'Which holdings are underperforming in my portfolio, and what should I look at?', 'Comment améliorer la diversification de mon portefeuille (': 'How could I improve my portfolio’s diversification (',
    'Comment réduire progressivement mon exposition à': 'How could I gradually reduce my exposure to', '% de mon portefeuille) ?': '% of my portfolio)?', 'À surveiller': 'To watch',
    // ── Objectifs, plan du mois ──
    "C'est le maximum. Choisis lequel remplacer par ton nouvel objectif": 'That’s the maximum. Choose which one to replace with your new goal',
    '€/mois ·': '€/month ·', 'ans ·': 'years ·', 'Génération du plan personnalisé...': 'Generating your plan...',
    'Ce mois-ci, voici quoi acheter': 'This month’s illustrative plan', 'Capital protégé, croissance douce': 'Capital preservation, gentle growth', 'Croissance visée, volatilité assumée': 'Growth-oriented, accepts volatility',
    'plus prudent avec le temps': 'more cautious over time', "tu choisis, l'IA s'adapte": 'you choose, the AI adapts',
    'Aéronautique': 'Aerospace', 'Énergie': 'Energy', 'Télécoms': 'Telecoms', 'États-Unis': 'United States', 'Luxe': 'Luxury', 'Industrie': 'Industrials', 'Finance': 'Financials', 'Consommation': 'Consumer', 'Immobilier': 'Real estate', 'Matériaux': 'Materials', 'Services publics': 'Utilities', 'Autre': 'Other',
    'ETF actions monde développées': 'Developed-world equity ETF', 'ETF marchés émergents': 'Emerging-markets ETF', 'ETF actions États-Unis': 'US equity ETF',
    'Tendance des indices indisponible.': 'Index trend unavailable.', 'Aucune actualité récupérée.': 'No news retrieved.', 'aucun secteur identifié': 'no sector identified',
    'Doublon dans ton portefeuille': 'Duplicate in your portfolio', 'Fusionner les doublons ? Les quantités sont additionnées et le prix de revient recalculé en moyenne. Ton historique d’achats est conservé.': 'Merge duplicates? Quantities are added together and the cost basis is recalculated as an average. Your purchase history is kept.',
    'fusionné': 'merged', 'aucune donnée': 'no data', 'Doublons fusionnés': 'Duplicates merged',
    'MM 50 : pas assez d’historique': '50-day MA: not enough history', 'MM 200 : pas assez d’historique sur cette période': '200-day MA: not enough history for this period', 'Moyennes mobiles disponibles à partir de 1 mois': 'Moving averages available from 1 month',
    'Mon PRU': 'My cost basis', 'Ton prix de revient n’est pas tracé : cet actif est coté en': 'Your cost basis isn’t drawn: this asset is quoted in', 'devise étrangère': 'a foreign currency',
    '% sur la période': '% over the period', ', une bougie par jour': ', one candle per day', ', une bougie par semaine': ', one candle per week', ', une bougie par mois': ', one candle per month',
    'Information uniquement, ni conseil ni signal : les performances passées ne préjugent pas des performances futures.': 'Information only — neither advice nor a signal. Past performance is not a reliable indicator of future results.',
    '◔ Marché fermé · dernier cours à': '◔ Market closed · last price at', '◔ Cours différé d’environ': '◔ Price delayed by about', 'min (règle de la bourse)': 'min (exchange rule)',
    'Étape 1/3 · Kapitaro récupère les cours réels du marché…': 'Step 1/3 · Kapitaro is fetching real market prices…', 'Étape 1/3 · Lecture des cours réels du marché…': 'Step 1/3 · Reading real market prices…',
    'Étape 2/3 · Lecture de la tendance du marché et des actualités des entreprises…': 'Step 2/3 · Reading the market trend and company news…', 'Étape 3/3 · Construction du plan…': 'Step 3/3 · Building the plan…',
    'Les cours du marché ne sont pas disponibles pour l’instant : Kapitaro ne génère pas de plan sans analyse. Réessaie dans quelques minutes.': 'Market prices aren’t available right now: Kapitaro doesn’t generate a plan without analysis. Try again in a few minutes.',
    'Les cours du marché ne sont pas disponibles pour l’instant : Kapitaro ne génère pas de répartition sans analyse. Réessaie dans quelques minutes.': 'Market prices aren’t available right now: Kapitaro doesn’t generate an allocation without analysis. Try again in a few minutes.',
    '📅 Ton plan du mois a changé': '📅 Your monthly plan has changed', 'Voir Objectif': 'See Goal', "À l'instant": 'Just now', "Le plan du mois n'a pas pu être généré.": 'This month’s plan couldn’t be generated.',
    '€/mois · généré le': '€/month · generated on', ', tendance du marché': ', market trend', ', actualités': ', news', '🎯 Tu as choisi': '🎯 You chose',
    'Cœur du portefeuille — diversification maximale': 'Portfolio core — maximum diversification',
    'La répartition n’a pas pu être générée pour l’instant (analyse indisponible). Kapitaro ne propose pas de plan sans analyse : réessaie dans un instant.': 'The allocation couldn’t be generated right now (analysis unavailable). Kapitaro doesn’t suggest a plan without analysis: try again in a moment.',
    'Départ': 'Start', '% du capital': '% of capital', '% du capital ·': '% of capital ·', 'lignes pour diversifier': 'holdings to diversify', '% du versement': '% of the contribution', '📈 Les': '📈 The',
    "% d'actions de ta cible ne sont pas détaillés ici : ton plan du mois te dit lesquelles acheter.": '% in stocks of your target aren’t detailed here: your monthly plan shows example stocks.',
    'Analyse du': 'Analysis of', 'valeurs étudiées (cours sur 1 an, tendance du marché, actualités). Le plan reste le même tant que tu ne crées pas un nouveau plan.': 'securities studied (1-year prices, market trend, news). The plan stays the same until you create a new one.',
    '3-6 mois': '3–6 months', '12+ mois': '12+ months', 'Remplacé': 'Replaced', 'Montant suggéré :': 'Illustrative amount:', "Dernières recommandations (en cours d'actualisation)": 'Latest insights (updating)',
    'départ ·': 'start ·', '€ de départ ·': '€ to start ·', '€ (premier mois)': '€ (first month)', '€ de départ': '€ to start', '· départ': '· start',
    'Choisis une devise étrangère (dollar, livre, franc suisse…) : l’euro est la devise de référence de Kapitaro.': 'Choose a foreign currency (dollar, pound, Swiss franc…): the euro is Kapitaro’s reference currency.',
    'Aucune transaction enregistrée': 'No transactions recorded', 'Équilibré à Agressif': 'Balanced to aggressive', 'Pour toi,': 'For you,', 'Plus aucune actu': 'No more news', 'Aucun favori': 'No favorites',
    'Populaires à suivre': 'Popular to follow', 'mois': 'months', 'Événements à venir': 'Upcoming events', 'PRÉCÉDENT': 'PREVIOUS', 'PRÉVISION': 'FORECAST', 'RÉSULTAT': 'ACTUAL',
    "Voir l'impact potentiel →": 'See potential impact →', 'Les actions tech montent': 'Tech stocks are rising', '🔍 Rechercher une entreprise (ex: Apple, LVMH, Tesla...)': '🔍 Search for a company (e.g. Apple, Microsoft, Tesla...)', 'Résultats': 'Results',
    "Pas d'information fiable disponible pour l'instant.": 'No reliable information available right now.', 'Données indisponibles': 'Data unavailable', 'modérée': 'moderate', 'Chargement des cours…': 'Loading prices…',
    'Les actualités sont momentanément indisponibles. Réessaie dans quelques minutes.': 'News is temporarily unavailable. Try again in a few minutes.',
    'Cours en direct, convertis en euros, mis à jour toutes les 2 minutes. Information uniquement : Kapitaro ne dit ni d’acheter ni de vendre.': 'Live prices, converted to euros, updated every 2 minutes. Information only: Kapitaro never tells you to buy or sell.',
    'Analyse indisponible pour les cryptomonnaies : ce sont des actifs trop risqués. Kapitaro te permet seulement de suivre leur cours dans ton portefeuille, sans avis ni analyse.': 'No analysis for crypto: Kapitaro only lets you follow their price in your portfolio, with no opinion or analysis.',
    'Analyse indisponible pour les devises. Kapitaro te permet seulement de suivre leur valeur dans ton portefeuille, sans avis ni analyse.': 'No analysis for currencies. Kapitaro only lets you follow their value in your portfolio, with no opinion or analysis.',
    'Analyse indisponible. Réessaie dans quelques secondes.': 'Analysis unavailable. Try again in a few seconds.', 'Pas de contexte fiable disponible pour ce ticker.': 'No reliable context available for this ticker.',
    'Ton lien de parrainage': 'Your referral link', 'Parrainage indisponible pour le moment.': 'Referrals are unavailable right now.', "Conversation effacée. Comment puis-je t'aider ?": 'Conversation cleared. How can I help?',
    'Générer mon analyse →': 'Generate my analysis →', 'aucun': 'none',
    // ── Bilan : questionnaire ──
    'Résidence principale ou investissement locatif': 'Main home or rental property', 'Préparer ma retraite': 'Prepare for retirement', 'Compléter ma pension, retraite anticipée (FIRE)': 'Top up my pension, early retirement (FIRE)',
    'Générer des revenus passifs': 'Generate passive income', 'Faire grossir mon capital': 'Grow my capital', 'Financer un projet précis': 'Fund a specific project', "Voyage, études, création d'entreprise": 'Travel, studies, starting a business',
    'Sécuriser mon épargne': 'Secure my savings', "Protéger contre l'inflation": 'Protect against inflation', 'Je vends tout immédiatement': 'I sell everything immediately', 'Je vends une partie pour limiter': 'I sell part to limit losses',
    "J'attends sans rien faire": 'I wait and do nothing', 'Je tiens et reste investi': 'I hold and stay invested', "J'en profite pour renforcer": 'I take the opportunity to buy more',
    'Décris ta situation en quelques mots...': 'Describe your situation in a few words...', "Analyse de ta capacité d'épargne": 'Analyzing your savings capacity', 'Évaluation de ton profil de risque': 'Assessing your risk profile',
    'Calcul de tes projections': 'Calculating your projections', 'Définition de ton allocation optimale': 'Defining an illustrative allocation', 'Rédaction de tes recommandations': 'Writing your educational insights',
    'Bonne capacité': 'Good capacity', 'Marge limitée': 'Limited margin', 'Budget serré': 'Tight budget', 'Génération en cours… (environ 30 secondes)': 'Generating… (about 30 seconds)',
    'Épargne de précaution insuffisante': 'Emergency fund too small', 'Bonne nouvelle : tu investis déjà régulièrement. Prochain chantier : ton matelas de sécurité, encore un peu léger pour dormir tranquille.': 'Good news: you already invest regularly. Next step: your safety cushion is still a bit light.',
    'Enregistré sur cet appareil': 'Saved on this device', '(étape': '(step', "L'analyse IA n'a pas pu être générée": 'The AI analysis couldn’t be generated', '📅 Bilan du': '📅 Check-up of',
    'Ajustée pour respecter ton profil « ': 'Adjusted to match your profile “', '€/mois · cible': '€/month · target', 'Ça fait': 'It’s been', 'jours sans nouvel investissement. Pense à placer tes': 'days without a new investment. Remember your planned',
    '€/mois pour profiter des intérêts composés.': '€/month to benefit from compound growth.', 'Voir Portefeuille': 'See Portfolio', 'Voir Santé du portefeuille': 'See Portfolio health',
    'Créer un objectif': 'Create a goal', 'Ajouter tes placements': 'Add your investments', 'Découvrir ton score de santé': 'See your health score', 'Je débute': 'I’m just starting',
    "L'essentiel : accueil, portefeuille, objectif et assistant IA.": 'The essentials: home, portfolio, goal and AI assistant.', "J'ai déjà quelques placements": 'I already have a few investments',
    'En plus : le score de santé, le calculateur de dépenses et les actualités.': 'Plus: health score, spending calculator and news.', 'Je gère un vrai portefeuille': 'I manage a real portfolio',
    'Tous les outils, avec en plus : scénario de crise, simulateur DCA, aide à la décision.': 'All tools, plus: crash scenario, regular-investing simulator, decision helper.', 'ajouté à ton menu': 'added to your menu',
    "On adapte l'appli à ton niveau pour ne pas te noyer sous les outils. Tu pourras changer à tout moment dans « Mon niveau ».": 'We adapt the app to your level so you’re not drowned in tools. You can change it any time in “My level”.',
    // ── Nouveautés ──
    'Appuie sur le mini-graphique d’une ligne du portefeuille, ou sur « 📈 Graphique » depuis une fiche, l’aide à la décision ou « Ajouter ». Bougies ou ligne, périodes, moyennes mobiles, volume et ton prix de revient.': 'Tap a holding’s mini-chart, or “📈 Chart” from a detail page, the decision helper or “Add”. Candles or line, periods, moving averages, volume and your cost basis.',
    'sur les actions européennes (règle des bourses).': 'on European stocks (exchange rule).',
    'Si un même actif est saisi sous deux noms (ex. « Air Liquide » et « AI.PA »), un bandeau te propose de les fusionner dans le portefeuille.': 'If the same asset is entered under two names (e.g. “Apple” and “AAPL”), a banner offers to merge them in your portfolio.',
    'Cryptos, matières premières et analyses': 'Crypto, commodities and analyses', 'Cryptos, devises et matières premières': 'Crypto, currencies and commodities', 'Ajoute-les depuis « Ajouter », avec des onglets par catégorie.': 'Add them from “Add”, with tabs by category.',
    'Cryptos et devises : suivi du cours seulement': 'Crypto and currencies: price tracking only', ', sans analyse.': ', with no analysis.',
    ': or, argent, platine, pétrole, gaz, cuivre (en direct ou via des ETC), avec analyse et un nouvel onglet dans Actualités.': ': gold, silver, platinum, oil, gas, copper (directly or via ETCs), with analysis and a new tab in News.',
    'Des analyses sur données réelles': 'Analyses based on real data', 'Plans, signaux et conseils s’appuient désormais sur les vrais cours, la tendance du marché et les actualités des entreprises.': 'Plans, signals and insights now rely on real prices, the market trend and company news.',
    'Plan du mois : « Tout ajouter »': 'Monthly plan: “Add all”', 'Ajoute toutes les lignes du plan en un clic (les lignes que tu détiens déjà sont renforcées). Tes plans sont enregistrés sur ton compte, identiques sur tous tes appareils.': 'Add every line of the plan in one click (holdings you already own are topped up). Your plans are saved to your account, the same on all your devices.',
    'Règle ton niveau': 'Set your level', 'Débutant, curieux, initié ou confirmé : l’appli adapte ses outils. Les Actualités (avec les matières premières) apparaissent dès le niveau 2.': 'Beginner, curious, experienced or advanced: the app adapts its tools. News (with commodities) appears from level 2.',
    'Pour bien démarrer · 2 minutes': 'Getting started · 2 minutes', 'Ajoute tes placements pour voir ton score': 'Add your investments to see your score',
    "Ton score de santé, tes alertes et l'assistant IA se basent sur ton portefeuille. Choisis comment commencer :": 'Your health score, alerts and AI assistant are based on your portfolio. Choose how to start:',
    'Bon après-midi': 'Good afternoon', 'Bonjour': 'Good morning', 'Bonsoir': 'Good evening', 'Commence ton investissement': 'Start your investing journey', "Voir plus d'analyses": 'See more analyses', 'que faire maintenant ?': 'what now?',
    'Ajoutez des positions pour voir cet indicateur.': 'Add holdings to see this indicator.', 'équilibré': 'balanced', 'pèse': 'weighs', '% de ton portefeuille': '% of your portfolio', 'est à': 'is at',
    "% vs ton prix d'achat": '% vs your purchase price', 'réduire fortement': 'reduce sharply', 'alléger': 'trim', 'À ta place, je...': 'Signal:',
    'Votre portefeuille est en excellente santé générale.': 'Your portfolio is in excellent overall health.', 'Des actions correctives recommandées.': 'Some areas could be improved.',
    "Votre portefeuille est bien diversifié sur plusieurs classes d'actifs.": 'Your portfolio is well diversified across several asset classes.', '— vise 8 ou plus pour bien diversifier.': '— 8 or more usually gives better diversification.',
    "Envisage de réduire l'exposition à": 'A large position in', '%) pour limiter le risque.': '%) increases concentration risk.',
    '✓ Importé —': '✓ Imported —', '⚠ Ajustement conseillé': '⚠ Adjustment to consider', 'Pour atteindre': 'To reach', ', voici tes options :': ', here are your options:', '💰 Augmenter à': '💰 Increase to', '€/mois': '€/month', '⏳ Allonger à': '⏳ Extend to',
    'Comment y arriver — clique pour appliquer': 'How to get there — click to apply', 'Valeur projetée dans': 'Projected value in', 'élevé': 'high', 'Impact élevé': 'High impact', 'Mon portef.': 'My portfolio',
    'Lecture des cours, de la tendance du marché et des actualités…': 'Reading prices, market trend and news…', 'Avant tout avis, Kapitaro regarde les données réelles': 'Before any view, Kapitaro looks at real data',
    'Les données de marché ne sont pas disponibles pour l’instant': 'Market data isn’t available right now', 'Kapitaro ne donne pas d’avis sans avoir regardé les cours et l’actualité. Réessaie dans quelques minutes.': 'Kapitaro gives no view without looking at prices and news. Try again in a few minutes.',
    'Élevé': 'High', 'Analyse générale': 'General analysis', 'RISQUÉ': 'RISKY', '🔎 Cherche une action ou un ETF (LVMH, IWDA, Apple…)': '🔎 Search for a stock or ETF (Apple, VOO, IWDA…)', 'Prix moyen payé': 'Average price paid',
    "Connecte-toi pour accéder à l'analyse IA.": 'Log in to access AI analysis.',
    // ── Compteur IA, Premium, offres ──
    "analyses IA offertes à l'inscription, puis": 'free AI analyses when you sign up, then', 'par jour.': 'per day.', 'Tu as utilisé': 'You’ve used', 'de tes analyses offertes.': 'of your free analyses.', 'se rechargent chaque jour.': 'refill every day.',
    'Avec Premium : analyses IA illimitées, Signaux IA, bilan patrimonial complet.': 'With Premium: unlimited AI analyses, AI signals, complete financial check-up.', 'Ton compteur IA — compte gratuit': 'Your AI counter — free account', 'Tes': 'Your',
    'analyses offertes sont utilisées et tu as consommé tes': 'free analyses are used up and you’ve used your', "analyses du jour — ce n'est pas un bug :": 'analyses for today — this isn’t a bug:',
    'Avec Premium : analyses IA illimitées, sans attendre': 'With Premium: unlimited AI analyses, no waiting', 'Signaux IA sur tes positions et les opportunités du marché': 'AI signals on your holdings and market opportunities (educational)',
    'Bilan patrimonial complet et alertes IA sur ton portefeuille': 'Complete financial check-up and AI alerts on your portfolio', "analyses du jour. Ce n'est pas un bug :": 'analyses for today. This isn’t a bug:',
    'nouvelles reviennent demain. Avec Premium, plus aucune limite.': 'new ones come back tomorrow. With Premium, no more limits.', 'Passer à Premium — illimité': 'Go Premium — unlimited', '— Fonctionnalité Premium': '— Premium feature', 'Passer à Premium —': 'Go Premium —',
    'Historique & fiabilité IA': 'AI history & track record', 'Réduire': 'Collapse', 'évaluation auto à J+': 'auto-review after day',
    'Kapitaro analyse ton portefeuille et prend position...': 'Kapitaro is analyzing your portfolio...', "Le verdict Kapitaro n'a pas pu être généré.": 'Kapitaro’s verdict couldn’t be generated.', 'Signal : réduire': 'Signal: reduce',
    "Au lieu de saisir chaque ligne à la main, importe le fichier d'export de ton courtier : Kapitaro ajoutera automatiquement toutes tes positions avec leurs quantités et prix d'achat.": 'Instead of entering each line by hand, import your broker’s export file: Kapitaro adds all your holdings with their quantities and purchase prices.',
    "Ouvre l'app Trade Republic sur ton téléphone": 'Open your broker’s app on your phone', 'Profil (en bas à droite) →': 'Profile →', 'Relevés et documents': 'Statements and documents', 'Relevé de portefeuille': 'Portfolio statement', 'et exporte-le': 'and export it',
    'Envoie-le sur ton ordinateur (mail, AirDrop...)': 'Send it to your computer (email, AirDrop...)', 'Connecte-toi à': 'Log in to', 'sur ordinateur': 'on a computer', 'Clic droit dans le tableau →': 'Right-click the table →',
    '💡 Formats acceptés :': '💡 Accepted formats:', 'PDF, CSV ou Excel': 'PDF, CSV or Excel', 'Fichier illisible — essaie un export CSV, Excel ou PDF de ton courtier': 'Unreadable file — try a CSV, Excel or PDF export from your broker',
    'Pour que les prix se mettent à jour en direct.': 'So prices update live.', 'Crée un compte pour importer un PDF': 'Create an account to import a PDF', "Ce PDF est une image scannée, sans texte lisible. Essaie l'export CSV de ton courtier.": 'This PDF is a scanned image with no readable text. Try your broker’s CSV export.',
    'Analyse du PDF impossible': 'Couldn’t analyze the PDF', 'désignation': 'name', 'détectée': 'detected',
    "Décoche ce que tu ne veux pas importer et corrige le PRU si besoin. Si tu as déjà vendu une partie d'une ligne, indique la": 'Untick what you don’t want to import and correct the cost basis if needed. If you’ve already sold part of a holding, enter the',
    ': le PRU sera recalculé pour refléter ton vrai gain. Les doublons (même nom) mettent à jour la position existante.': ': the cost basis will be recalculated to reflect your real gain. Duplicates (same name) update the existing holding.',
    'PRU absent du fichier : sans lui, le cours actuel': 'Cost basis missing from the file: without it, the current price', 'sera utilisé et ta performance affichera 0 %.': 'will be used and your performance will show 0%.',
    'Plus-value (+) ou moins-value (−)': 'Gain (+) or loss (−)', 'Importer la sélection': 'Import selection', '→ PRU ajusté': '→ cost basis adjusted', '(ligne déjà remboursée)': '(holding already paid back)', '✓ Import terminé :': '✓ Import complete:', 'ajoutée': 'added', 'à jour': 'updated', 'Session expirée': 'Session expired',
    'Suivi du portefeuille avec prix en direct': 'Portfolio tracking with live prices', "Objectifs avec faisabilité et leviers d'ajustement": 'Goals with feasibility check and levers', 'Simulateur DCA et scénarios de crise': 'Regular-investing simulator and crash scenarios',
    'Alertes chiffrées (concentration, grosses pertes)': 'Alerts with figures (concentration, big losses)', 'Agenda économique': 'Economic calendar', 'par jour': 'per day', 'illimitées': 'unlimited',
    'Agent IA complet : score, alertes et analyse de tout ton portefeuille': 'Full AI agent: score, alerts and analysis of your whole portfolio', 'Conseils IA sur tes alertes : que faire et par quoi remplacer': 'AI insights on your alerts: options and alternatives to consider',
    'Mes dépenses : analyse de ton relevé, abonnements à résilier, économies investies': 'My spending: statement analysis, subscriptions to cancel, savings invested (hypothetical)', "Analyse groupée de plusieurs positions par l'Agent IA": 'Grouped analysis of several holdings by the AI agent',
    'Pour découvrir et suivre tes investissements': 'To discover and track your investments', 'Gratuit à vie': 'Free forever', 'Ce qui est inclus :': 'What’s included:', 'Choisis ton offre': 'Choose your plan', 'Le gratuit reste gratuit à vie. Premium enlève les plafonds IA.': 'Free stays free forever. Premium removes the AI caps.',
    "Grâce au parrainage, jusqu'au": 'Thanks to a referral, until', 'Prend fin le': 'Ends on', ": tu gardes l'accès jusque-là": ': you keep access until then', '· renouvellement le': '· renews on', 'Gérer': 'Manage', 'Plus/moins-value': 'Gain/loss',
    '📄 Ton bilan patrimonial': '📄 Your financial check-up', '💡 Et si ton portefeuille était optimisé au max ?': '💡 What could a more optimized portfolio look like?', 'Fait le': 'Done on', '· retrouve-le ici, ou refais-le quand ta situation change.': '· find it here, or redo it when your situation changes.',
    "Lance ton Bilan Premium : l'IA analyse tout et te dit où tu perds de l'argent.": 'Start your Premium check-up: the AI reviews everything and shows where money may be leaking.', 'Voir mon bilan →': 'See my check-up →', 'Lancer le Bilan →': 'Start the check-up →',
    'Tout est calme': 'All quiet', 'Fais-moi un point complet sur mon portefeuille': 'Give me a full update on my portfolio', 'Priorités du jour': 'Today’s priorities', 'Voir toutes': 'See all', 'Basée sur': 'Based on', 'positions analysées': 'holdings analyzed',
    'Demander à l\'IA': 'Ask the AI', 'Génère mon rapport hebdomadaire complet': 'Generate my full weekly report', 'Diversification, risques, corrélations': 'Diversification, risks, correlations', 'Retour de la veille': 'Yesterday’s recap',
    'Marchés, actus, mon portef.': 'Markets, news, my portfolio', 'Mémoire IA': 'AI memory', 'Profil et préférences appris': 'Learned profile and preferences', 'Analyse de ton portefeuille...': 'Analyzing your portfolio...',
    'Bienvenue ! Ajoute tes premières positions pour recevoir un briefing personnalisé.': 'Welcome! Add your first holdings to get a personalized briefing.', 'Pas de données': 'No data',
    "% de l'objectif atteint · Continue le DCA": '% of the goal reached · Keep investing regularly', 'Définis un objectif pour suivre ta progression': 'Set a goal to track your progress', '→ Détails': '→ Details', 'Fonctionnalité Premium': 'Premium feature',
    'Ton prochain plan mensuel :': 'Your next monthly plan:', '(dans': '(in', 'jour': 'day', 'Chaque mois, Kapitaro prépare un nouveau plan : il répartit tes': 'Each month, Kapitaro prepares a new illustrative plan: it splits your',
    '€ du mois entre actions et ETF, selon ta cible': '€ for the month between stocks and ETFs, based on your target', "% et ce que tu détiens déjà. Il t'attendra ici dès le": '% and what you already hold. It will be waiting here from', 'Préparation du plan…': 'Preparing the plan…',
    // ── Verrouillage (applock.js) ──
    'Immédiatement': 'Immediately', 'Après 1 minute': 'After 1 minute', 'Après 5 minutes': 'After 5 minutes', 'Après 30 minutes': 'After 30 minutes', 'ton empreinte': 'your fingerprint',
    'Kapitaro est verrouillé': 'Kapitaro is locked', 'pour afficher ton portefeuille.': 'to show your portfolio.', '🔓 Déverrouiller': '🔓 Unlock', 'Se reconnecter avec mon mot de passe': 'Log in again with my password',
    'Vérification annulée ou refusée. Réessaie.': 'Verification canceled or refused. Try again.', 'Verrouiller avec': 'Lock with', "Ton portefeuille reste masqué tant que tu ne l'as pas déverrouillé, sur cet appareil.": 'Your portfolio stays hidden until you unlock it on this device.',
    'Délai de verrouillage': 'Lock delay', 'Verrouillage désactivé sur cet appareil': 'Lock disabled on this device', '🔒 Verrouillage activé sur cet appareil': '🔒 Lock enabled on this device', 'Activation annulée': 'Activation canceled',
    'Protège ton portefeuille': 'Protect your portfolio', 'Verrouille Kapitaro avec': 'Lock Kapitaro with', ": personne d'autre ne verra tes placements si on prend ton téléphone. Modifiable à tout moment dans Paramètres.": ': no one else will see your investments if someone picks up your phone. Change it any time in Settings.',
    'Activer le verrouillage': 'Turn on lock', 'Plus tard': 'Later', 'Vérification…': 'Verifying…', '✓ Préférence enregistrée': '✓ Preference saved',
    // ── Calculateurs (calc.js) ──
    'Somme aujourd’hui': 'Amount today', 'Inflation annuelle (hypothèse)': 'Annual inflation (assumption)', 'Rendement de ton épargne (hypothèse)': 'Return on your savings (assumption)', '10 000 € sur 10 ans': '€10,000 over 10 years',
    'Épargne qui dort, 20 ans': 'Idle savings, 20 years', 'Écart au bout de': 'Difference after', '% de frais par an, pour le même placement': '% in fees per year, for the same investment', 'Pouvoir d’achat de ton épargne dans': 'Purchasing power of your savings in',
    'en euros d’aujourd’hui :': 'in today’s euros:', 'tu perds': 'you lose', 'de pouvoir d’achat': 'of purchasing power', 'ton épargne garde son pouvoir d’achat': 'your savings keep their purchasing power', 'Solde affiché': 'Balance shown',
    'Sans aucun rendement': 'With no return', 'Les prix auront': 'Prices will have', 'Prix doublés en': 'Prices doubled in', 'Pouvoir d’achat avec ton rendement': 'Purchasing power with your return', 'Pouvoir d’achat sans rendement': 'Purchasing power with no return',
    'Vois ce que vaudra vraiment ton épargne dans quelques années, une fois la hausse des prix prise en compte, selon ce qu’elle rapporte.': 'See what your savings will really be worth in a few years, once rising prices are taken into account, depending on what they earn.',
    // ── Navigateur intégré (inapp.js) et installation / notifications (push.js) ──
    'Pour installer l’app et activer les notifications :': 'To install the app and turn on notifications:', 'Ouvrir dans Chrome': 'Open in Chrome', 'Pour installer l’app : touche ⋯ en haut à droite, puis « Ouvrir dans le navigateur ».': 'To install the app: tap ⋯ at the top right, then “Open in browser”.',
    'Ouvre Kapitaro dans ton navigateur pour installer l’app.': 'Open Kapitaro in your browser to install the app.', 'Crée un compte pour activer les notifications': 'Create an account to turn on notifications', 'Clé serveur manquante': 'Server key missing',
    '🔔 Notifications activées': '🔔 Notifications on', 'Notifications désactivées sur cet appareil': 'Notifications off on this device', 'Désactivation impossible :': 'Couldn’t turn off:', "Active d'abord les notifications": 'Turn on notifications first',
    'Notification envoyée : regarde ton appareil': 'Notification sent: check your device', '✓ Alertes de gros mouvements activées': '✓ Big-move alerts on', 'Alertes de gros mouvements désactivées': 'Big-move alerts off', 'Réglage impossible :': 'Couldn’t change setting:',
    'Ce navigateur ne gère pas les notifications. Essaie Chrome, Edge, Firefox ou Safari récent.': 'This browser doesn’t support notifications. Try a recent Chrome, Edge, Firefox or Safari.',
    "Sur iPhone, ajoute d'abord Kapitaro à l'écran d'accueil (Partager, puis « Sur l'écran d'accueil »), ouvre l'app depuis cette icône et reviens ici.": 'On iPhone, first add Kapitaro to your Home Screen (Share, then “Add to Home Screen”), open the app from that icon and come back here.',
    "Bloquées pour ce site. Autorise-les dans les réglages du navigateur (cadenas à côté de l'adresse), puis recharge la page.": 'Blocked for this site. Allow them in your browser settings (padlock next to the address), then reload the page.',
    'Activées': 'On', 'Désactivées': 'Off', 'Quand une action bouge de plus de 5 % en séance : les tiennes, ta watchlist et les grandes valeurs.': 'When a stock moves more than 5% in a session: yours, your watchlist and major stocks.',
    'Pour vérifier que tout arrive bien': 'To check everything arrives', '🔔 Reçois ton briefing du matin': '🔔 Get your morning briefing', "Et une alerte dès qu'un prix tombe sous ton seuil, même quand l'app est fermée.": 'And an alert as soon as a price drops below your threshold, even when the app is closed.',
    'Activer les notifications': 'Turn on notifications', '(en bas dans Safari, en haut dans Chrome), puis': '(bottom in Safari, top in Chrome), then', 'Ouvre le menu': 'Open the menu', 'de ton navigateur, puis': 'of your browser, then',
    "Sur ton écran d'accueil, en plein écran, avec les notifications. Gratuit, sans passer par un magasin d'applications.": 'On your home screen, full screen, with notifications. Free, no app store needed.', "Installer l'app sur cet appareil": 'Install the app on this device',
    'Tu es dans le navigateur d’Instagram ou de Facebook : touche': 'You’re in the Instagram or Facebook browser: tap', 'en haut à droite, puis': 'at the top right, then', '« Ouvrir dans le navigateur »': '“Open in browser”', 'Dans Safari, touche': 'In Safari, tap',
    'en bas de l’écran.': 'at the bottom of the screen.', 'Fais défiler et choisis': 'Scroll and choose', '« Sur l’écran d’accueil »': '“Add to Home Screen”', 'en haut à droite de Chrome.': 'at the top right of Chrome.', 'en bas de l’écran de Safari.': 'at the bottom of Safari.',
    'en haut à droite : l’icône Kapitaro apparaît sur ton écran d’accueil.': 'at the top right: the Kapitaro icon appears on your home screen.', 'de ton navigateur (en haut à droite).': 'of your browser (top right).', '« Installer l’application »': '“Install app”', '« Ajouter à l’écran d’accueil »': '“Add to Home screen”',
    'Confirme : l’icône Kapitaro apparaît sur ton écran d’accueil.': 'Confirm: the Kapitaro icon appears on your home screen.', 'Gratuit, en 3 gestes, sans magasin d’applications': 'Free, in 3 taps, no app store', 'J’ai compris': 'Got it',
    "Kapitaro sur ton écran d'accueil, en plein écran": 'Kapitaro on your home screen, full screen', "Ouvre ton portefeuille en un geste et reçois ton briefing du matin. Gratuit, sans passer par un magasin d'applications.": 'Open your portfolio in one tap and get your morning briefing. Free, no app store needed.',
    'Ne rate rien de ton portefeuille': 'Never miss a thing in your portfolio', "Un briefing chaque matin et une alerte dès qu'un prix passe sous ton seuil, même app fermée. Tu peux tout régler ou couper dans Paramètres.": 'A briefing every morning and an alert when a price crosses your threshold, even with the app closed. Adjust or turn it all off in Settings.',
    // ── Lexique (interface) ──
    'Voir le lexique ›': 'See the glossary ›', 'Rechercher un mot (ETF, PRU, volatilité…)': 'Search a word (ETF, cost basis, volatility…)', 'Aucun mot trouvé. Pose ta question à la bulle d’aide en bas à droite.': 'No word found. Ask the help bubble at the bottom right.',
    // ── Dépenses (depenses.js) ──
    'Énergie & eau': 'Energy & water', 'Impôts & taxes': 'Taxes', 'Presse & médias': 'News & media', 'Jeux vidéo': 'Video games', 'Voyages & hôtels': 'Travel & hotels', 'Autres dépenses': 'Other spending', 'Épargne (virements)': 'Savings (transfers)',
    'Abonnement jeux (Game Pass, PS Plus…)': 'Gaming subscription (Game Pass, PS Plus…)', 'Presse / médias en ligne': 'Online news / media', "Je n'ai pas pu distinguer les débits des crédits : tout a été compté comme dépense.": 'I couldn’t tell debits from credits: everything was counted as spending.',
    '📊 Utiliser mes dépenses analysées : ≈': '📊 Use my analyzed spending: ≈', '€/mois (abonnements, énergie, assurances…)': '€/month (subscriptions, energy, insurance…)', '✓ Charges fixes remplies depuis tes dépenses': '✓ Fixed costs filled in from your spending',
    'Impossible de charger le lecteur (connexion ?)': 'Couldn’t load the reader (connection?)', "Lecture d'un PDF : je n'ai pas pu distinguer tous les débits des crédits, vérifie les totaux.": 'Reading a PDF: I couldn’t tell all debits from credits, check the totals.',
    "Lecture d'un PDF : vérifie que les totaux te semblent justes.": 'Reading a PDF: check the totals look right.', 'Chargement du lecteur, lecture du fichier…': 'Loading the reader, reading the file…', 'Lecture du fichier…': 'Reading the file…',
    "Je n'ai trouvé aucune dépense dans ce fichier. Il faut au minimum une date, un libellé et un montant. Essaie l'export CSV ou Excel de ta banque.": 'I found no spending in this file. It needs at least a date, a description and an amount. Try your bank’s CSV or Excel export.',
    "Les photos et scans ne sont pas lus (pour ta confidentialité, rien n'est envoyé nulle part). Utilise le PDF, l'Excel ou le CSV de ta banque.": 'Photos and scans aren’t read (for your privacy, nothing is sent anywhere). Use your bank’s PDF, Excel or CSV.',
    "Impossible de lire ce fichier. Essaie l'export CSV ou Excel de ta banque.": 'Couldn’t read this file. Try your bank’s CSV or Excel export.', 'Effacer cette analyse de dépenses ?': 'Delete this spending analysis?',
    'Passer un repas sur trois à la maison, ou un resto de moins par semaine.': 'Have one meal in three at home, or one less restaurant a week.', 'Les frais de livraison et de service coûtent souvent 30 % de plus.': 'Delivery and service fees often add 30%.', 'Attendre 48 h avant chaque achat non prévu.': 'Wait 48 hours before any unplanned purchase.',
    '% · économise': '% · save', 'commerçant': 'merchant', 'classée': 'sorted', "par l'IA": 'by the AI', "L'IA n'a rien pu classer de plus": 'The AI couldn’t sort anything else', '⚠️ Classement impossible pour le moment': '⚠️ Sorting unavailable right now', "✨ Classer avec l'IA": '✨ Sort with AI', 'À classer': 'To sort',
    'Diminue une catégorie avec les curseurs ou arrête un abonnement pour voir ce que tu économiserais.': 'Lower a category with the sliders or stop a subscription to see what you’d save.', 'En agissant sur': 'By acting on', 'Simulation à': 'Simulation at',
    "%/an, versements mensuels, avant frais et impôts. Ce n'est pas une garantie.": '%/yr, monthly contributions, before fees and taxes. Not a guarantee.', '📂 Importer un relevé de compte': '📂 Import a bank statement', 'Télécharge ton relevé depuis ton espace bancaire, en': 'Download your statement from your online banking, as',
    'PDF, Excel, CSV ou OFX': 'PDF, Excel, CSV or OFX', '(1 mois, ou plusieurs pour repérer les prélèvements récurrents). Le site retrouve tes abonnements et classe tes dépenses. Les photos et scans ne sont pas lus.': '(1 month, or several to spot recurring payments). The site finds your subscriptions and sorts your spending. Photos and scans aren’t read.',
    'Ton fichier reste dans ton navigateur.': 'Your file stays in your browser.', "Il n'est ni envoyé ni enregistré. Seuls tes opérations et leur classement sont mémorisés, sur cet appareil uniquement. L'IA, si tu la laisses faire, ne voit que les noms des commerçants non reconnus, jamais les montants ni les dates.": 'It is neither sent nor stored. Only your transactions and their categories are kept, on this device only. The AI, if you allow it, only sees the names of unrecognized merchants, never amounts or dates.',
    "Laisser l'IA classer les commerçants que le site ne reconnaît pas (bars, restaurants, boutiques…). Ça compte pour 1 ou 2 analyses de ton quota.": 'Let the AI sort merchants the site doesn’t recognize (bars, restaurants, shops…). It counts as 1 or 2 analyses of your quota.',
    'Décoche pour tout garder sur ton appareil.': 'Untick to keep everything on your device.', 'Choisir un ou plusieurs fichiers': 'Choose one or more files', '✅ Ou coche tes abonnements': '✅ Or tick your subscriptions',
    'Pas de fichier sous la main ? Coche ce que tu paies et corrige les montants (les prix affichés sont indicatifs).': 'No file at hand? Tick what you pay for and correct the amounts (prices shown are indicative).', 'Analyser mes abonnements': 'Analyze my subscriptions',
    "Tu t'en sers encore ? Beaucoup d'abonnements logiciels ou cloud dorment sans qu'on s'en rende compte.": 'Do you still use it? Many software or cloud subscriptions go unused without us noticing.', "Tu y as joué ce mois-ci ? Sinon, tu peux le suspendre et le reprendre quand tu veux.": 'Did you play this month? If not, you can pause it and resume whenever you like.',
    'Tu lis vraiment tous les articles ? Sinon, un seul média suffit.': 'Do you really read all the articles? If not, one outlet is enough.', 'Beaucoup de banques en ligne offrent la carte et la tenue de compte gratuitement : ça vaut le coup de comparer.': 'Many online banks offer free cards and accounts: worth comparing.',
    'Tu en as encore vraiment besoin ? Si tu hésites, arrête-le : tu pourras le reprendre.': 'Do you really still need it? If unsure, stop it: you can always resume.', 'dépenses lues dans ton relevé': 'expenses read from your statement', '🧾 Toutes tes dépenses': '🧾 All your spending', '⤢ Tout afficher en grand · exporter': '⤢ Full view · export',
    "à classer. L'IA les range d'un coup dans les catégories ci-dessous.": 'to sort. The AI sorts them into the categories below in one go.', 'autres plus petits.': 'other smaller ones.', '· prélèvement récurrent': '· recurring payment', 'Aucun abonnement reconnu.': 'No subscription recognized.',
    "abonnements de streaming vidéo : n'en garde qu'un, celui que tu regardes le plus.": 'video streaming subscriptions: consider keeping only the one you watch most.', "d'après": 'based on', 'opérations sur': 'transactions over', "d'après tes abonnements cochés": 'based on the subscriptions you ticked',
    '✓ Contrôle : le relevé annonce': '✓ Check: the statement shows', 'de débits, j\'en ai lu': 'in debits, I read', '⚠️ Écart : le relevé annonce': '⚠️ Mismatch: the statement shows', "Non comptés dans l'analyse :": 'Not counted in the analysis:',
    '). Un virement qui est en fait un loyer ou une dépense ? Change sa catégorie dans « Tout afficher ».': '). A transfer that’s actually rent or spending? Change its category in “Full view”.', 'Par catégorie': 'By category', 'Par date': 'By date', 'Aucun résultat.': 'No results.', '✓ Catégorie modifiée pour': '✓ Category changed for',
    // ── Bilan détaillé (bilan-extra.js) ──
    'Poids logement + crédits': 'Housing + loans share', 'Confortable : il te reste de la marge pour épargner et vivre.': 'Comfortable: you have room to save and live.', 'Élevé : ton budget est déjà bien absorbé par le logement et les crédits.': 'High: your budget is already largely taken by housing and loans.',
    'Très élevé : peu de marge pour épargner ou absorber un imprévu.': 'Very high: little room to save or absorb the unexpected.', 'Reste à vivre': 'Left to live on', "Ce qui reste après loyer, crédits et charges fixes, pour les courses, les sorties et l'épargne.": 'What’s left after rent, loans and fixed costs, for groceries, going out and saving.',
    "Taux d'épargne": 'Savings rate', "Très bon niveau : c'est ce qui construit un patrimoine.": 'Very good: this is what builds wealth.', 'Correct. Viser 10 à 15 % accélère nettement le capital.': 'Fine. Aiming for 10–15% builds capital noticeably faster.', 'Faible : même 50 € de plus par mois change la trajectoire sur 10 ans.': 'Low: even 50 more per month changes the trajectory over 10 years.',
    'Ton livret couvre au moins': { _: 'Your savings account covers at least', US: 'Your high-yield savings covers at least' }, 'mois de charges : bon matelas.': 'months of expenses: a good cushion.', 'mois de charges, soit': 'months of expenses, i.e.', 'Diagnostic chiffré de ta situation': 'Your situation in figures', 'À corriger': 'To fix',
    "Plus de 70 % de ton patrimoine dort sur des livrets : au-delà du matelas de sécurité, cet argent perd du pouvoir d'achat face à l'inflation.": 'More than 70% of your wealth sits in savings accounts: beyond the safety cushion, this money loses purchasing power to inflation.',
    'Ce que tu pourrais emprunter avec les règles habituelles des banques (': 'What you could borrow under typical lending rules (', "% de revenus maximum pour l'ensemble des crédits). Modifie les hypothèses.": '% of income maximum for all loans). Change the assumptions.',
    'Taux du prêt (%)': 'Loan rate (%)', 'Durée (ans)': 'Term (years)', 'Crédits déjà en cours (€/mois)': 'Existing loan payments (€/month)',
    "Le taux est une hypothèse : il change chaque mois et dépend de ton profil, de ta durée et de ton apport. Compare plusieurs banques ou passe par un courtier, et consulte les taux publiés par les observatoires du crédit avant de décider. L'assurance emprunteur et les frais de dossier ne sont pas inclus. Estimation indicative, pas une offre de prêt.": 'The rate is an assumption: it changes often and depends on your profile, term and down payment. Compare several lenders before deciding. Loan insurance and fees are not included. Indicative estimate, not a loan offer.',
    "Ce que ton épargne investie pourrait devenir à l'âge où tu veux arrêter de travailler, et le revenu qu'elle pourrait te verser.": 'What your invested savings could become by the age you want to stop working, and the income they could provide (hypothetical).', 'Âge de départ': 'Retirement age', 'Versement (€/mois)': 'Contribution (€/month)',
    "Simulation avant frais et impôts, rendement non garanti. La rente théorique retire 4 % du capital par an (règle courante, sans épuiser le capital sur une longue période). Elle s'ajoute à ta pension de retraite légale, qui n'est pas calculée ici.": 'Simulation before fees and taxes, return not guaranteed. The theoretical income withdraws 4% of capital per year (a common rule of thumb). It comes on top of any state or workplace pension, which isn’t calculated here.',
    'Avec': 'With', 'de crédits en cours pour': 'in existing loan payments for', 'de revenus, tu dépasses déjà': 'of income, you already exceed', '% : une banque refuserait sans doute un nouveau prêt. Rembourser un crédit ou augmenter tes revenus rouvre la porte.': '%: a lender would probably refuse a new loan. Paying off a loan or increasing income reopens the door.',
    'de frais de notaire. Sur': { _: 'in closing costs. Over', EU: 'in purchase fees and taxes. Over' }, 'ans à': 'years at', '%, les intérêts coûteraient environ': '%, interest would cost about', 'Si le taux est de…': 'If the rate is…', 'Prix du bien': 'Property price', 'Selon la durée': 'By term', 'Intérêts': 'Interest',
    'Choisis un âge de départ supérieur à ton âge actuel.': 'Choose a retirement age above your current age.', 'Augmenter le versement ou partir plus tard fait vite la différence.': 'Contributing more or retiring later quickly makes a difference.',
    'Résidence principale': 'Main home', 'Résidence secondaire': 'Second home', 'Prix du bien visé (€)': 'Target property price (€)', 'Ancien ou neuf': 'Existing or new build', "Achat dans combien d'années ?": 'Buying in how many years?', '8 ans ou plus': '8 years or more',
    'Durée du prêt souhaitée': 'Desired loan term', 'Âge de départ souhaité': 'Desired retirement age', 'Revenu mensuel souhaité (€ net)': 'Desired monthly income (€ net)', 'Pension estimée (€ net/mois)': 'Estimated pension (€ net/month)',
    'Ton relevé de carrière sur info-retraite.fr donne une estimation.': { _: 'Your national pension statement gives an estimate.', US: 'Your Social Security statement (ssa.gov) gives an estimate.', UK: 'Your State Pension forecast on GOV.UK gives an estimate.' },
    'Revenu passif visé (€/mois)': 'Target passive income (€/month)', 'Nature du projet': 'Type of project', 'Études': 'Studies', "Création d'entreprise": 'Starting a business', 'Montant nécessaire (€)': 'Amount needed (€)', 'Échéance': 'Deadline',
    'Mois de charges à mettre de côté': 'Months of expenses to set aside', 'Complémentaire santé': { _: 'Health insurance', US: 'Health insurance', UK: 'Private health cover' }, 'Prévoyance (décès / invalidité)': 'Life / disability insurance', 'Je ne sais pas': 'I don’t know',
    'Tes crédits en cours': 'Your current loans', 'Durée restante (années)': 'Remaining term (years)', 'Capital restant dû (€)': 'Outstanding balance (€)', 'Rien à préciser : passe à la suite.': 'Nothing to add: move on.',
    'Apport recommandé (frais + 10 % du prix) :': 'Suggested down payment (fees + 10% of price):', 'Emprunt nécessaire :': 'Loan needed:', "→ mensualité d'environ": '→ monthly payment of about', '(3,5 % sur': '(3.5% over', 'ans, hypothèse)': 'years, assumption)', "Taux d'endettement après achat :": 'Debt-to-income after purchase:',
    "Pour réunir l'apport recommandé en": 'To save the suggested down payment in', 'Ton apport est déjà suffisant.': 'Your down payment is already enough.', 'Revenu souhaité': 'Desired income', 'Capital nécessaire (règle des 4 %) :': 'Capital needed (4% rule):', 'Versement nécessaire :': 'Contribution needed:',
    'ans (rendement': 'years (return', '%/an, avec ton capital actuel)': '%/yr, with your current capital)', 'Ta pension couvre déjà ton objectif.': 'Your pension already covers your goal.', 'Pour': 'For', 'Capital visé': 'Target amount', 'ans :': 'years:', 'dans': 'in',
    'Horizon court : garde cet argent sur un support sans risque de perte (livret), pas en bourse.': { _: 'Short horizon: people usually keep this money somewhere without risk of loss (a savings account), not in the stock market.', US: 'Short horizon: people usually keep this money somewhere without risk of loss (e.g. an FDIC-insured savings account), not in the stock market.' },
    'Horizon moyen : un support prudent reste préférable à la bourse pour ce projet.': 'Medium horizon: a cautious option is generally preferred over stocks for this project.',
    'Pas de complémentaire santé : un poste de dépense imprévu important, à revoir.': 'No health insurance: a potentially large unexpected cost, worth reviewing.', "Pas de prévoyance : en cas d'invalidité ou de décès, ton budget (et celui de ta famille) n'est pas protégé.": 'No life/disability cover: in case of disability or death, your (and your family’s) budget isn’t protected.',
    "Vérifie si tu as une prévoyance (souvent via l'employeur) : décès et invalidité sont les gros risques oubliés.": 'Check whether you have life/disability cover (often through an employer): these are the big forgotten risks.', 'Matelas visé :': 'Target cushion:', "Pour l'atteindre en 12 mois :": 'To reach it in 12 months:',
    'Fin de tes crédits dans': 'Your loans end in', ': tu libères': ': freeing up', 'Ton crédit à': 'Your loan at', "% coûte plus que ce que l'épargne investie rapporte en moyenne (": '% costs more than invested savings earn on average (', '%) : rembourser par anticipation est un rendement garanti.': '%): paying it off early is a guaranteed return.',
    '% coûte moins que le rendement visé (': '% costs less than the target return (', '%) : garder le crédit et investir est cohérent (rendement non garanti).': '%): keeping the loan and investing is consistent (return not guaranteed).', 'plus de 60 ans': 'over 60',
    'Sécuriser ton matelas': 'Secure your cushion', 'sur tes livrets. Pour le combler en 12 mois, mets': 'in savings accounts. To fill the gap in 12 months, set aside', "mois. Tant que ce n'est pas fait, ne prends pas de risque avec le reste.": 'per month. Until then, people usually avoid taking risk with the rest.',
    'Réalisable': 'Achievable', 'À ajuster': 'To adjust', 'Tes objectifs, chiffrés': 'Your goals, in figures', "Chaque objectif est calculé séparément, avec ton capital actuel et le rendement estimé du bilan. Estimations indicatives, avant frais et impôts.": 'Each goal is calculated separately, with your current capital and the check-up’s estimated return. Indicative estimates, before fees and taxes.',
    'Épargne financée': 'Savings funded', 'mais objectif difficile (voir plus haut)': 'but goal difficult (see above)', 'Financé': 'Funded', 'Pas de budget': 'No budget', 'Répartir ton budget entre tes objectifs': 'Split your budget between your goals', 'Échéance visée': 'Target date',
    'Avec ton budget': 'With your budget', 'Ajuster : tes objectifs dépassent ton budget': 'Adjust: your goals exceed your budget', 'Ton budget suffit': 'Your budget is enough', 'sont financés': 'are funded', 'est financé': 'is funded', "Ton plan d'action chiffré": 'Your action plan in figures',
    "Le budget est la mensualité recommandée du bilan. Le matelas de sécurité est financé en premier, puis les objectifs que ton budget permet de tenir entièrement (du plus proche au plus lointain), et le reliquat va sur le suivant. C'est une répartition par défaut : à toi de choisir tes priorités.": 'The budget is the check-up’s suggested monthly amount. The safety cushion is funded first, then the goals your budget can fully cover (nearest first), with the remainder going to the next one. This is a default split: you choose your priorities.',
    'Vérifie les plafonds, les taux et la fiscalité en vigueur avant toute décision : ils changent régulièrement.': 'Check current limits, rates and tax rules before any decision: they change regularly.', 'Analyse de tes objectifs': 'Analysis of your goals', 'Ton plan des 90 prochains jours': 'Your next 90 days',
    'Verifie les plafonds, les taux et la fiscalite en vigueur avant toute decision.': 'Check current limits, rates and tax rules before any decision.', 'Risques et erreurs a eviter': 'Risks and mistakes to avoid',
    'tu vendrais tout': 'you would sell everything', 'tu vendrais une partie': 'you would sell part', 'tu attendrais sans rien faire': 'you would wait and do nothing', 'tu resterais investi': 'you would stay invested', 'tu en profiterais pour renforcer': 'you would buy more',
    'Très prudent': 'Very cautious', 'moins de 3 ans': 'less than 3 years', '7 à 15 ans': '7 to 15 years', '15 ans et plus': '15 years and more', "— part d'actions recommandée": '— suggested share of stocks', 'Face à une baisse de 20 % en 1 mois,': 'Faced with a 20% drop in 1 month,',
    'Tu acceptes une perte maximale de': 'You accept a maximum loss of', 'Ton horizon :': 'Your horizon:', 'Tes deux réponses ne vont pas dans le même sens : on retient la plus prudente, par sécurité.': 'Your two answers point in different directions: we keep the more cautious one, to be safe.',
    'Avec un horizon aussi court, on limite le niveau de risque : les actions peuvent baisser longtemps.': 'With such a short horizon, risk is limited: stocks can fall for a long time.', "Part d'actions recommandée :": 'Suggested share of stocks:', 'Ton allocation cible': 'Your target allocation',
    'au-dessus de ce que ton profil supporte.': 'above what your profile can handle.', 'Si les marchés actions baissaient de 30 %, tu perdrais environ': 'If stock markets fell 30%, you would lose about', '% de ton patrimoine investi de': '% of your invested wealth of',
    'À surveiller :': 'To watch:', 'Objectifs chiffrés :': 'Goals in figures:', "Plan d'action chiffré (budget": 'Action plan in figures (budget', 'Plan des 90 jours :': '90-day plan:', 'Verdict par objectif :': 'Verdict by goal:',
    'A verifier dans tes reponses :': 'Check in your answers:', 'Allocation ajustee pour respecter ton profil :': 'Allocation adjusted to match your profile:', '). Si les marches actions baissaient de 30 %, perte estimee : environ': '). If stock markets fell 30%, estimated loss: about', '% de ton patrimoine investi).': '% of your invested wealth).',
    "Capacite d'emprunt (hypothese : 3,5 % sur 20 ans, sans apport)": 'Borrowing capacity (assumption: 3.5% over 20 years, no down payment)', '% des revenus, hors credits en cours) :': '% of income, excluding existing loans):', 'Interets sur 20 ans : environ': 'Interest over 20 years: about',
    "Les credits en cours depassent deja le taux d'endettement maximal habituel : un nouveau pret serait probablement refuse.": 'Existing loans already exceed the usual maximum debt-to-income ratio: a new loan would probably be refused.', 'Tes objectifs, chiffres': 'Your goals, in figures', "pour un budget d'epargne de": 'for a savings budget of',
    'ans (dans': 'years (in', 'ans), avec': 'years), with', ', soit une rente theorique d\'environ': ', i.e. a theoretical income of about',
    'Estimations indicatives calculees a partir de tes reponses, avant frais et impots. Elles ne constituent ni un conseil en investissement, ni une offre de credit.': 'Indicative estimates calculated from your answers, before fees and taxes. They are neither investment advice nor a credit offer.',
  });

  // ════════════ BULLE D'AIDE (help-bot.js ; questions/réponses dans faq-data-en.js) ════════════
  add({
    'Aide Kapitaro': 'Kapitaro help', 'Envoyer': 'Send',
    "Bonjour 👋 Pose-moi ta question sur l'utilisation de Kapitaro, ou choisis une question ci-dessous.": 'Hi 👋 Ask me anything about using Kapitaro, or pick a question below.',
    "Avec plaisir ! N'hésite pas si tu as une autre question 🙂": 'You’re welcome! Ask me if you have another question 🙂',
    "Je réponds uniquement aux questions sur l'utilisation de Kapitaro, et je n'ai pas trouvé de réponse à celle-ci. Essaie avec d'autres mots, choisis une question ci-dessous, ou écris-nous à": 'I only answer questions about using Kapitaro, and I couldn’t find an answer to this one. Try other words, pick a question below, or email us at',
    "Bonjour 👋 Je réponds à tes questions sur l'": 'Hi 👋 I answer your questions about ', 'utilisation de Kapitaro': 'using Kapitaro',
    ': compte, portefeuille, outils, Premium, application… Choisis une question ou écris la tienne.': '(account, portfolio, tools, Premium, app…). Pick a question or type your own.',
  });

  // ════════════ PRODUITS FRANÇAIS → ÉQUIVALENTS NEUTRES SELON LA RÉGION ════════════
  // (jamais de conseil fiscal : on nomme seulement le type de compte)
  add({
    'PEA': { _: 'investment account', US: 'brokerage account', UK: 'ISA', EU: 'investment account' },
    'Compte-titres': { _: 'investment account', US: 'taxable brokerage account', UK: 'general investment account' },
    'Assurance-vie': { _: 'long-term savings plan', US: 'retirement account (IRA / 401(k))', UK: 'pension / ISA' },
    'Livret A': { _: 'savings account', US: 'high-yield savings account', UK: 'easy-access savings account' },
    'livret': { _: 'savings account', US: 'savings account', UK: 'savings account' },
  });

  // ════════════ TEXTES AVEC NOMBRES (expressions régulières) ════════════
  K.patterns = [
    [/^Étape (\d+) ?\/ ?(\d+)$/, 'Step $1 / $2'],
    [/^Étape (\d+) sur (\d+)$/, 'Step $1 of $2'],
    [/^(\d+) ans$/, '$1 years'],
    [/^(\d+) an$/, '$1 year'],
    [/^(\d+) mois$/, '$1 months'],
    [/^Dans (\d+) ans$/, 'In $1 years'],
    [/^il y a (\d+) min$/, '$1 min ago'],
    [/^il y a (\d+) h$/, '$1 h ago'],
    [/^il y a (\d+) j$/, '$1 days ago'],
    [/^(\d+) analyses? IA restantes?$/, '$1 AI analyses left'],
    [/^(\d+) positions?$/, function (m, n) { return n + (n === '1' ? ' holding' : ' holdings'); }],
    [/^(.+) — Fonctionnalité Premium$/, '$1 — Premium feature'],
    [/^Passer à Premium — (.+)\/mois$/, 'Go Premium — $1/month'],
    [/^(([+−-][^)]*)). Je connais toutes tes positions, tes objectifs et ton profil. Que veux-tu faire ?$/, '($1). I know all your holdings, goals and profile. What would you like to do?'],
    [/^\(([+−-][^)]*)\)\. Je connais toutes tes positions, tes objectifs et ton profil\. Que veux-tu faire \?$/, '($1). I know all your holdings, goals and profile. What would you like to do?'],
    [/^Erreur : (.*)$/, 'Error: $1'],
    [/^Erreur: (.*)$/, 'Error: $1'],
    [/^IA indisponible : (.*)$/, 'AI unavailable: $1'],
    [/^IA indisponible \(HTTP (\d+)\)$/, 'AI unavailable (HTTP $1)'],
    [/^Bilan du (.+)$/, 'Check-up of $1'],
    [/^Dernière mise à jour : (.+)$/, 'Last updated: $1'],
    [/^Année (\d+)$/, 'Year $1'],
    [/^(-?[\d.,\s]+ ?€) de perte$/, '$1 loss'],
    [/^(\d+) commerçants?$/, function (m, n) { return n + (n === '1' ? ' merchant' : ' merchants'); }],
    [/^(\d+) commerçants? · (.*)$/, function (m, n, rest) { return n + (n === '1' ? ' merchant · ' : ' merchants · ') + tr(rest); }],
    [/^Ouvrir le graphique de (.+)$/, 'Open the chart for $1'],
    [/^Définition : (.+)$/, 'Definition: $1'],
    [/^([\d.,]+)\/10 santé$/, '$1/10 health'],
    [/^(\d+) plateformes? connectées?$/, '$1 platform(s) connected'],
    [/^(\d+) sélectionnées?$/, '$1 selected'],
    [/^Mis à jour (\d\d?:\d\d)$/, 'Updated $1'],
    [/^([\d\s.,]+)€\/mois · (\d+) ans$/, '€$1/month · $2 years'],
    [/^(\d+) positions — vise 8 ou plus pour bien diversifier\.$/, '$1 holdings — 8 or more usually gives better diversification.'],
    [/^Envisage de réduire l'exposition à (.+) \((\d+)%\) pour limiter le risque\.$/, 'A large position in $1 ($2%) increases concentration risk.'],
    [/^représente (\d+)% du portefeuille$/, 'is $1% of the portfolio'],
    [/^Impact d'une baisse brutale sur ton portefeuille actuel \((.+)\)$/, 'Impact of a sudden drop on your current portfolio ($1)'],
    [/^(.+)\/mois pendant (\d+) ans à (.+)$/, '$1/month for $2 years at $3'],
    [/^(.+)\/mois pendant (\d+) ans génère$/, '$1/month for $2 years generates'],
    [/^= (.+) de ta bankroll$/, '= $1 of your available capital'],
    [/^en intérêts composés \((.+)\)\.$/, 'in compound interest ($1) — hypothetical.'],
    [/^[−-](\d+) % · économise (.+)\/mois$/, '−$1% · save $2/month'],
    [/^d'après (\d+) opérations sur (\d+) mois · hors virements et épargne$/, 'based on $1 transactions over $2 month(s) · excluding transfers and savings'],
    [/^(\d+) dépenses lues dans ton relevé$/, '$1 expenses read from your statement'],
    [/^Atteins (\d+)\/10 pour passer (.+)$/, function (m, n, lvl) { return 'Reach ' + n + '/10 to move up to ' + tr(lvl); }],
    [/^✅ Ce qui est vital \((.+)\/mois\)$/, '✅ Essentials ($1/month)'],
    [/^Écart au bout de (\d+) ans$/, 'Difference after $1 years'],
    [/^(.+) placés, (\d+) ans$/, '$1 invested, $2 years'],
    [/^(.+) \+ (.+)\/mois, (\d+) ans$/, '$1 + $2/month, $3 years'],
    [/^(.+)\/mois, (\d+) ans$/, '$1/month, $2 years'],
    [/^\/mois · (.+)\/an$/, '/month · $1/year'],
    [/^([\d\s.,]+ ?€)\/mois$/, '$1/month'],
    [/^(.+) · ETF · (\d+) parts ·$/, '$1 · ETF · $2 shares ·'],
    [/^Premium : IA illimitée, bilan complet, analyse de tes dépenses\. Dès (.+)\/mois, sans engagement\.$/, 'Premium: unlimited AI, full check-up, spending analysis. From $1/month, no commitment.'],
    [/^(\d+) commerçant · (.+)$/, function (m, n, rest) { return n + ' merchant · ' + tr(rest); }],
    [/^en jeux d'argent \((.+) par an\)\..*$/, function (m, amt) {
      var help = { US: 'free, confidential help is available — call or text 1-800-GAMBLER', UK: 'free, confidential help is available from GamCare (0808 8020 133)', _: 'free and confidential support services exist in your country' };
      return 'on gambling (' + amt + ' per year). If it feels hard to control, ' + (help[REGION] || help._) + '.';
    }],
    [/^(⏳ |⚠️ )?Utilisation anormale détectée : plus de (\d+) analyses IA aujourd'hui\..*$/, '$1Unusual use detected: more than $2 AI analyses today. To protect the service, AI is paused until tomorrow morning. If this is a mistake, email contact@kapitaro.fr.'],
    [/^(⏳ |⚠️ )?Limite IA atteinte : tes (\d+) analyses offertes sont épuisées et tu as utilisé tes (\d+) analyses gratuites du jour\. Passe à Premium pour un accès illimité\.$/, '$1AI limit reached: your $2 free analyses are used up and you’ve used today’s $3 free analyses. Go Premium for unlimited access.'],
    [/^(⚠️ )?Trop de requêtes\. Patiente une minute\.$/, '$1Too many requests. Please wait a minute.'],
    [/^(⚠️ )?Session invalide ou expirée\. Reconnecte-toi\.$/, '$1Invalid or expired session. Please log in again.'],
  ];
  K.applyData = function () {
    try {
      if (typeof KP_GLOSSARY !== 'undefined' && !K._gloDone) {
        K._gloDone = true;
        for (var k in K.glossary) { var g = K.glossary[k]; KP_GLOSSARY[k] = { t: g.t, s: g.s, d: pick(g.d) }; }
        // Enveloppes fiscales françaises : retirées hors France, remplacées par les notions de la région
        delete KP_GLOSSARY.pea; delete KP_GLOSSARY.cto; delete KP_GLOSSARY.assurancevie;
        var extra = K.glossaryRegion[REGION] || {};
        for (var e in extra) KP_GLOSSARY[e] = extra[e];
      }
    } catch (e) {}
    try {
      if (typeof TAB_HINTS !== 'undefined' && !K._hintsDone) { K._hintsDone = true; for (var h in K.tabHints) if (TAB_HINTS[h]) Object.assign(TAB_HINTS[h], K.tabHints[h]); }
    } catch (e) {}
  };

  // ════════════ LEXIQUE (remplace glossary.js) ════════════
  K.glossary = {
    action: { t: 'Stock (share)', s: 'A small piece of a company.', d: 'Buying a share makes you a part-owner of a company (Apple, Microsoft…). Its value rises or falls with the company’s health and the market. Some pay a dividend.' },
    etf: { t: 'ETF (index fund)', s: 'A basket of hundreds of stocks in a single purchase.', d: 'An ETF tracks an index such as the S&P 500 or the MSCI World: in one purchase you are invested in hundreds or thousands of companies. It is simple, diversified and usually low-cost.' },
    obligation: { t: 'Bond', s: 'A loan to a government or company that pays you interest.', d: 'You lend money to a government or a company, which pays it back later with interest. Bonds are generally less risky and less rewarding than stocks. A bond ETF holds many of them.' },
    etc: { t: 'ETC', s: 'A security backed by a commodity (gold, oil…).', d: 'An ETC tracks the price of a commodity, for example physical gold, without you having to store it.' },
    indice: { t: 'Index', s: 'A group of companies used as a market thermometer.', d: 'The S&P 500 (500 large US companies) or the MSCI World are indexes. People follow them to see whether the market is rising or falling.' },
    msci: { t: 'MSCI World / All-World', s: 'An index of roughly 1,500 to 4,000 companies worldwide.', d: 'The MSCI World covers large companies in developed countries; the FTSE All-World adds emerging markets. An ETF tracking them is often used as the core of a portfolio.' },
    socle: { t: 'Core', s: 'The large, stable part of a portfolio, often a world ETF.', d: 'The core is the heart of a portfolio: a broad, diversified investment (such as a world or total-market ETF) that holds most of the savings.' },
    satellite: { t: 'Satellite', s: 'A small part used to diversify around the core.', d: 'Satellites complement the core: bonds, emerging markets, small companies… they usually get a small share.' },
    repartition: { t: 'Allocation', s: 'How your money is split between stocks, ETFs, etc.', d: 'For example 30% individual stocks and 70% ETFs. The more individual stocks, the more the portfolio can rise — and fall.' },
    diversification: { t: 'Diversification', s: 'Not putting all your eggs in one basket.', d: 'Spreading money across many companies, sectors and countries limits the impact of a bad surprise on any single holding.' },
    concentration: { t: 'Concentration', s: 'A single holding that weighs too much in the portfolio.', d: 'When one stock is a large share of the total (more than 25%, for example), its fall alone can pull the whole portfolio down sharply.' },
    pru: { t: 'Cost basis (average cost)', s: 'The average price you paid.', d: 'If you buy 1 share at 100 then 1 at 120, your average cost is 110. Compare it to the current price to see your gain or loss.' },
    plusvalue: { t: 'Capital gain', s: 'What you gain if you sell for more than you paid.', d: 'The difference between current value and what you paid. Until you sell, it is “unrealized”. The opposite is a capital loss.' },
    dividende: { t: 'Dividend', s: 'A share of profits paid to shareholders.', d: 'Some companies pay out part of their profits every year. The dividend yield is that amount compared with the share price.' },
    volatilite: { t: 'Volatility', s: 'How much the price swings.', d: 'The higher the volatility, the more the price moves, in both directions. A world ETF is around 12%, a single stock often 20 to 40%.' },
    baissemax: { t: 'Maximum drawdown', s: 'The biggest drop over the period.', d: 'For example “1-year max drawdown −20%”: at some point in the year the price was down up to 20% from its peak. It gives an idea of risk.' },
    rendement: { t: 'Return', s: 'What an investment earns, in % per year.', d: 'Kapitaro uses an assumed return for its projections (for example 7% per year). It is not a promise: markets go up and down.' },
    interets: { t: 'Compound interest', s: 'Your gains earn gains of their own.', d: 'If you reinvest what you earn, the amount at work grows each year: over the long run the effect becomes very strong.' },
    dca: { t: 'Dollar-cost averaging (DCA)', s: 'Investing the same amount every month, whatever happens.', d: 'Investing regularly smooths your purchase price: you buy more when prices are low and less when they are high, without trying to time the market.' },
    profil: { t: 'Risk profile', s: 'How much drop you can accept.', d: 'Cautious, balanced, dynamic or aggressive: the higher the profile, the larger the share of stocks, with more potential but more ups and downs.' },
    glide: { t: 'Becoming more cautious over time', s: 'Fewer stocks as the goal approaches.', d: 'As your goal date gets closer, Kapitaro shows a lower share of stocks in favor of calmer investments, to limit the risk of a big drop just before you need the money.' },
    horizon: { t: 'Time horizon', s: 'When you will need the money.', d: 'The longer the horizon, the more ups and downs you can usually tolerate, because time helps smooth them out.' },
    reequilibrage: { t: 'Rebalancing', s: 'Returning to the allocation you chose.', d: 'If stocks have risen a lot, they weigh more than planned. To get back to your allocation, Kapitaro shows how future contributions could go to what is under-weighted, without selling anything.' },
    capitalisation: { t: 'Market capitalization', s: 'A company’s total stock-market value.', d: 'Share price multiplied by the number of shares. Large caps are generally more stable than small caps.' },
    per: { t: 'P/E ratio', s: 'How many years of earnings a share costs.', d: 'A P/E of 20 means the price equals 20 years of current earnings. A high P/E signals the market expects a lot from the company.' },
    marge: { t: 'Net margin', s: 'The share of revenue left as profit.', d: 'A 25% net margin means that out of 100 in sales, the company keeps 25 in profit.' },
    courtier: { t: 'Broker', s: 'The platform where you buy and sell.', d: 'The broker holds your securities and executes your orders. Kapitaro never holds your money: it helps you track and understand.' },
    crypto: { t: 'Cryptocurrency', s: 'A highly volatile digital currency (Bitcoin…).', d: 'Crypto prices can move by tens of percent in a short time. Kapitaro only lets you follow their price, with no analysis or opinion.' },
    matiere: { t: 'Commodity', s: 'Gold, silver, oil, gas, copper…', d: 'Their price depends on global supply and demand. Gold is often used as a small hedge in a portfolio.' },
    fonds: { t: 'Actively managed fund', s: 'A fund picked and run by a manager, often with higher fees.', d: 'A basket of investments put together by a fund manager (mutual fund, UCITS fund, OEIC…). The manager picks securities for you, which costs money: annual fees are often around 1–2.5%, versus 0.03–0.5% for an ETF that simply tracks an index.' },
    frais: { t: 'Ongoing charges (expense ratio)', s: 'What an investment costs you each year, as a % of your money.', d: { _: 'They are taken automatically from your capital, even in down years, and reduce your return. In the EU you find them as “ongoing charges” in each fund’s Key Information Document (KID). Over 20 or 30 years, a 1% difference can add up to tens of thousands.', US: 'They are taken automatically from your money, even in down years, and reduce your return. In the US you find it as the “expense ratio” in the fund’s prospectus or fact sheet. Over 20 or 30 years, a 1% difference can add up to tens of thousands of dollars.' } },
    inflation: { t: 'Inflation', s: 'The general rise in prices, which reduces your purchasing power.', d: 'With 3% inflation, 100 today only buys the equivalent of 97 a year from now. Investing is one way people try to keep their purchasing power.' },
    precaution: { t: 'Emergency fund', s: 'Money set aside for the unexpected, always available.', d: { _: 'Before investing in the stock market, people generally keep 3 to 6 months of expenses in an easy-access savings account, so they never have to sell at a bad time.', US: 'Before investing, people generally keep 3 to 6 months of expenses in a high-yield savings account, so they never have to sell at a bad time.' } },
    liquidite: { t: 'Liquidity', s: 'How easily an investment can be sold quickly.', d: 'A large ETF sells in seconds on the exchange; a property can take months.' },
  };
  // Comptes et notions propres à chaque région (définitions purement pédagogiques, jamais un conseil fiscal)
  K.glossaryRegion = {
    US: {
      brokerage: { t: 'Brokerage account', s: 'A regular (taxable) account to buy stocks and ETFs.', d: 'No contribution limits and no special tax treatment: gains and dividends are generally taxable in the year they are realized or paid, and your broker sends a Form 1099. This is general information, not tax advice.' },
      ira: { t: 'IRA (Traditional / Roth)', s: 'An individual retirement account with tax advantages.', d: 'A Traditional IRA may give a tax deduction now with tax on withdrawals later; a Roth IRA uses after-tax money with qualified withdrawals generally tax-free. Annual limits and eligibility rules apply — check IRS guidance or a tax professional.' },
      k401: { t: '401(k)', s: 'An employer-sponsored retirement plan.', d: 'Contributions come straight from your paycheck, sometimes with an employer match. Investment options are chosen by the plan. Limits and rules are set by the IRS.' },
      hsa: { t: 'HSA', s: 'A health savings account linked to a high-deductible health plan.', d: 'It can be used for qualified medical expenses and has specific tax rules and limits. General information only.' },
      hysa: { t: 'High-yield savings account', s: 'A savings account paying a higher interest rate.', d: 'Often used for an emergency fund. Check whether deposits are FDIC-insured (or NCUA for credit unions).' },
      capgains: { t: 'Capital gains (short / long term)', s: 'Profit when you sell for more than you paid.', d: 'In the US, gains on assets held more than a year are usually taxed differently from short-term gains. Rules depend on your situation — this is not tax advice.' },
      sp500: { t: 'S&P 500 index fund', s: 'A fund tracking 500 large US companies.', d: 'A common example of a broad, low-cost index fund. Mentioned for education only, not as a recommendation.' },
    },
    EU: {
      ucits: { t: 'UCITS ETF', s: 'An ETF that follows the EU’s UCITS investor-protection rules.', d: 'Most ETFs sold to individual investors in Europe are UCITS funds, with rules on diversification, custody and information.' },
      kid: { t: 'KID (Key Information Document)', s: 'A short standard document describing a fund’s risks and costs.', d: 'Under EU rules, packaged investment products must provide a KID with a risk indicator, cost figures and performance scenarios. Read it before investing.' },
      pension: { t: 'Pension plan', s: 'A long-term savings plan for retirement.', d: 'Each EU country has its own pension products and tax rules. General information only — check local rules or a licensed professional.' },
    },
    UK: {
      isa: { t: 'ISA (Individual Savings Account)', s: 'A UK account where savings and investments grow tax-free.', d: 'Stocks & Shares ISAs and Cash ISAs have an annual allowance set by HMRC. General information only, not tax advice.' },
      sipp: { t: 'SIPP / workplace pension', s: 'UK pension wrappers for retirement savings.', d: 'Contributions may receive tax relief within limits; money is generally locked until minimum pension age. Rules change — check GOV.UK or a regulated adviser.' },
    },
  };

  // ════════════ PETITES FENÊTRES D'AIDE DES ONGLETS (remplace tab-hints.js) ════════════
  K.tabHints = {
    home: { title: 'Home', text: 'Your dashboard: your portfolio value, health score, goal and what deserves your attention, at a glance.' },
    portfolio: { title: 'Portfolio', text: 'All your holdings with live prices. Add stocks or ETFs, track your performance and set price alerts.' },
    sante: { title: 'Portfolio health', text: 'A score out of 10 measuring your diversification, concentration and share of ETFs, with what to look at first.' },
    objectif: { title: 'Goal', text: 'Set a goal (target amount, duration, monthly contribution), see whether it’s realistic and get an illustrative month-by-month plan.' },
    crise: { title: 'Crash scenario', text: 'Simulate a market drop on your portfolio to see what you could lose, before it happens.' },
    news: { title: 'News', text: 'News about your holdings and the companies you follow. It only loads when you open this page.' },
    decision: { title: 'Decision helper', text: 'Thinking about buying or selling? Describe your idea: the AI gives you a clear, figures-based educational view.' },
    dca: { title: 'Regular investing simulator', text: 'See what regular investing and compound interest can do to your savings over time (hypothetical returns).' },
    depenses: { title: 'My spending', text: 'Import your bank statement: Kapitaro finds your subscriptions, sorts your spending and shows what you could save.' },
    ai: { title: 'AI agent', text: 'Your finance copilot: ask questions about your portfolio, get an educational view, or ask it to add a holding or an alert.' },
    bilan: { title: 'My check-up', text: 'A complete financial check-up: your situation, goals, an illustrative action plan and a PDF to keep.' },
    calc: { title: 'Calculators', text: 'Two simple calculators: what fees cost you over time, and what inflation does to your savings’ purchasing power.' },
    settings: { title: 'Settings', text: 'Your account, subscription, notifications, language, country and the app’s appearance.' },
    agentSample: { title: 'AI agent example', note: 'Static preview: nothing is calculated on your data. With Premium, everything is based on your real portfolio.', text: 'Here’s what the AI agent gives you with Premium: score, alerts, figures and portfolio analysis. These are sample numbers.' },
  };

  // ═══════════════════════════ MOTEUR DE TRADUCTION ═══════════════════════════
  var dbg = false;
  try { dbg = !(window.kpI18n && kpI18n.prod) && /[?&]i18n_debug=1/.test(location.search); } catch (e) {}
  var missing = window._kpMissing = dbg ? {} : null;
  var FR_HINT = /[àâçéèêëîïôûùüÿœ]|\b(le|la|les|des|du|ton|ta|tes|une|pour|avec|dans|sur|est|pas)\b/i;

  function pick(v) {
    if (v && typeof v === 'object') return v[REGION] != null ? v[REGION] : v._;
    return v;
  }
  function interp(s) {
    return String(s).replace(/\{\{(\w+)\}\}/g, function (m, k) {
      var p = window.kpI18n;
      if (p && (k === 'monthly' || k === 'annual')) return p.price(k);
      if (p && k === 'half') { var c = p.currency(); return c === 'USD' ? '$5.00' : '€5.00'; }
      return m;
    });
  }
  function tr(s) {
    if (s == null) return s;
    var str = String(s);
    var n = str.replace(/\s+/g, ' ').trim();
    if (!n || !/[A-Za-zÀ-ÿ]/.test(n)) return str;
    var v = S[n];
    if (v == null) {
      for (var i = 0; i < K.patterns.length; i++) {
        var p = K.patterns[i];
        if (p[0].test(n)) { v = n.replace(p[0], p[1]); break; }
      }
    }
    if (v == null) v = stripped(n);   // textes sans accents (PDF)
    if (v == null) {
      // « Libellé : valeur » quand le libellé est connu (fréquent dans le bilan et le PDF)
      var m = /^(.{2,60}?) ?: (.+)$/.exec(n);
      if (m && (S[m[1]] != null || stripped(m[1]) != null)) v = pick(S[m[1]] != null ? S[m[1]] : stripped(m[1])) + ': ' + tr(m[2]);
    }
    if (v == null) { if (missing && FR_HINT.test(n)) missing[n] = (missing[n] || 0) + 1; return str; }
    v = interp(pick(v));
    if (v === n) return str;
    return str.match(/^\s*/)[0] + v + str.match(/\s*$/)[0];
  }
  var _plain = null;
  function deaccent(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’]/g, "'"); }
  function stripped(n) {
    if (!_plain) { _plain = {}; for (var k in S) { var d = deaccent(k); if (d !== k && _plain[d] == null) _plain[d] = S[k]; } }
    var d2 = deaccent(n);
    return _plain[d2] != null ? _plain[d2] : (d2 !== n && S[d2] != null ? S[d2] : null);
  }
  K.tr = tr;

  // PDF (jsPDF) : le texte n'est pas dans la page, on traduit au moment de l'écrire. Appelé par loadJsPDF() d'app.js.
  K.patchPDF = function () {
    var api = window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API;
    if (!api || api._kpEN) return;
    api._kpEN = true;
    var trAny = function (t) { return Array.isArray(t) ? t.map(trAny) : (typeof t === 'string' ? tr(t) : t); };
    var text = api.text, split = api.splitTextToSize;
    api.text = function (t) { var a = Array.prototype.slice.call(arguments); a[0] = trAny(t); return text.apply(this, a); };
    if (split) api.splitTextToSize = function (t) { var a = Array.prototype.slice.call(arguments); a[0] = trAny(t); return split.apply(this, a); };
  };
  if (window.kpI18n) window.kpI18n.tr = tr;

  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1, NOSCRIPT: 1 };
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt', 'data-tip'];
  function skipped(el) {
    for (; el && el.nodeType === 1; el = el.parentNode) {
      if (SKIP[el.tagName] || el.getAttribute('translate') === 'no' || (el.classList && el.classList.contains('notranslate')) || el.isContentEditable) return true;
    }
    return false;
  }
  function doText(node) { var v = node.nodeValue, r = tr(v); if (r !== v) node.nodeValue = r; }
  function doEl(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = el.getAttribute(ATTRS[i]);
      if (a) { var r = tr(a); if (r !== a) el.setAttribute(ATTRS[i], r); }
    }
    if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit') && el.value) { var rv = tr(el.value); if (rv !== el.value) el.value = rv; }
  }
  var FILTER = { acceptNode: function (n) {
    if (n.nodeType === 1 && (SKIP[n.tagName] || n.getAttribute('translate') === 'no' || n.classList.contains('notranslate') || n.isContentEditable)) return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  } };
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (!skipped(root.parentNode)) doText(root); return; }
    if (root.nodeType !== 1 || skipped(root)) return;
    doEl(root);
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, FILTER), n;
    while ((n = tw.nextNode())) { if (n.nodeType === 3) doText(n); else doEl(n); }
  }
  K.walk = walk;
  var mo = new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type === 'childList') { for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]); }
      else if (m.type === 'characterData') { if (!skipped(m.target.parentNode)) doText(m.target); }
      else if (m.type === 'attributes' && !skipped(m.target)) doEl(m.target);
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });

  // Fenêtres natives du navigateur (alert / confirm / prompt) appelées par app.js
  ['alert', 'confirm', 'prompt'].forEach(function (f) {
    var orig = window[f];
    if (typeof orig !== 'function') return;
    window[f] = function (msg) { var a = Array.prototype.slice.call(arguments); a[0] = tr(msg); return orig.apply(window, a); };
  });

  // Données de glossary.js et tab-hints.js : remplacées avant le démarrage d'app.js (ce gestionnaire est enregistré en premier)
  // (glossary.js et tab-hints.js appellent aussi KP_EN.applyData() dès leur chargement, avant calc.js / app.js)
  document.addEventListener('DOMContentLoaded', function () {
    K.applyData();
    walk(document.documentElement);
    injectEnglishUI();
  });

  // ── Éléments ajoutés seulement en anglais : consentement à l'inscription, pays/région, lien « Do Not Sell or Share » ──
  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstChild; }
  function regionOptions() {
    return ['US', 'EU', 'UK', 'OTHER'].map(function (r) {
      return '<option value="' + r + '"' + (r === REGION ? ' selected' : '') + '>' + K.keys['region.' + r] + '</option>';
    }).join('') + '<option value="FR">' + K.keys['region.FR'] + '</option>';
  }
  function bindLegalLinks(root) {
    root.addEventListener('click', function (e) {
      var a = e.target && e.target.closest && e.target.closest('[data-legal]');
      if (!a) return;
      e.preventDefault();
      if (typeof openLegalDoc === 'function') openLegalDoc(a.getAttribute('data-legal'));
    });
  }
  // Balises SEO de la page d'accueil servie sur kapitaro.com (index.html est commun aux deux domaines)
  function englishHead() {
    var DESC = 'Track your stocks and ETFs in real time, simulate your savings and ask an AI assistant your questions. Free plan, no credit card.';
    var set = function (sel, attr, val) { var e = document.head.querySelector(sel); if (e) e.setAttribute(attr, val); };
    if (location.pathname !== '/' && location.pathname !== '/index.html') return;
    set('link[rel="canonical"]', 'href', 'https://kapitaro.com/');
    set('meta[name="description"]', 'content', DESC);
    set('meta[property="og:locale"]', 'content', 'en_US');
    set('meta[property="og:url"]', 'content', 'https://kapitaro.com/');
    set('meta[property="og:title"]', 'content', 'Kapitaro — Portfolio tracker & AI assistant');
    set('meta[property="og:description"]', 'content', DESC);
    set('meta[name="twitter:title"]', 'content', 'Kapitaro — Portfolio tracker & AI assistant');
    set('meta[name="twitter:description"]', 'content', DESC);
    // Données structurées en français (FAQ, prix en €) : retirées de la version anglaise plutôt que laissées fausses
    var ld = document.head.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < ld.length; i++) if (/FAQPage|"price"/.test(ld[i].textContent)) ld[i].remove();
  }

  function injectEnglishUI() {
    var p = window.kpI18n;
    try { englishHead(); } catch (e) {}
    // 1. Inscription : pays + case de consentement (Conditions, Confidentialité, 18 ans et plus)
    var su = document.getElementById('auth-signup');
    var submit = su && su.querySelector('.kh-submit');
    if (submit && !document.getElementById('kp-signup-consent')) {
      submit.insertAdjacentHTML('beforebegin',
        '<label class="kh-label" for="kp-signup-region">' + K.keys['region.label'] + '</label>'
        + '<select class="kh-input" id="kp-signup-region">' + regionOptions() + '</select>'
        + '<label style="display:flex;gap:8px;align-items:flex-start;font-size:12.5px;line-height:1.45;color:#475467;margin:4px 0 14px;cursor:pointer">'
        + '<input type="checkbox" id="kp-signup-consent" style="margin-top:2px;flex-shrink:0">'
        + '<span>' + K.keys['auth.consent'] + '</span></label>');
      bindLegalLinks(su);
      document.getElementById('kp-signup-region').addEventListener('change', function () {
        var v = this.value;
        if (v === 'FR') { p.setRegion('FR'); return; }
        p.setRegion(v, true);   // sans rechargement : le formulaire déjà rempli est conservé
      });
    }
    // 2. Connexion Google : mention d'acceptation sous le bouton
    var g = document.querySelector('.kh-google-form');
    if (g && !document.getElementById('kp-google-consent')) {
      g.insertAdjacentHTML('afterend', '<div id="kp-google-consent" style="font-size:11px;color:#667085;line-height:1.4;margin:6px 0 2px;text-align:center">' + K.keys['auth.googleConsent'] + '</div>');
    }
    // 3. Lien « Do Not Sell or Share My Personal Information » (CCPA/CPRA) dans les pieds de page — affiché à tous les anglophones
    var dns = '<button type="button" class="kp-dns" onclick="window.kpAds && kpAds.optOut ? kpAds.optOut() : alert(kpT(\'dns.done\'))">' + K.keys['dns.link'] + '</button>';
    ['.lp-foot-links', '.kh-legal'].forEach(function (sel) {
      var f = document.querySelector(sel);
      if (f && !f.querySelector('.kp-dns')) f.insertAdjacentHTML('beforeend', dns);
    });
    // 4. Paramètres : pays / région
    var lang = document.getElementById('set-lang-row');
    if (lang && !document.getElementById('set-region-row')) {
      lang.insertAdjacentHTML('afterend',
        '<div class="set-row" id="set-region-row"><div class="set-row-main"><div class="set-row-title">' + K.keys['region.label'] + '</div>'
        + '<div class="set-row-sub">' + K.keys['region.sub'] + '</div></div>'
        + '<div class="set-row-ctrl"><select id="set-region" style="padding:6px 8px;border-radius:8px;border:1px solid var(--border,#d0d5dd);background:transparent;color:inherit;font:inherit">' + regionOptions() + '</select></div></div>');
      document.getElementById('set-region').addEventListener('change', function () { p.setRegion(this.value); });
    }
    var lb = document.querySelectorAll('[data-lang-opt]');
    for (var i = 0; i < lb.length; i++) lb[i].classList.toggle('on', lb[i].getAttribute('data-lang-opt') === 'en');
  }
})();
