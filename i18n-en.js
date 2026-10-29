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
    if (v == null) { if (missing && FR_HINT.test(n)) missing[n] = (missing[n] || 0) + 1; return str; }
    v = interp(pick(v));
    if (v === n) return str;
    return str.match(/^\s*/)[0] + v + str.match(/\s*$/)[0];
  }
  K.tr = tr;
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
  function injectEnglishUI() {
    var p = window.kpI18n;
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
