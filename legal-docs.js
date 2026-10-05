// legal-docs.js — textes légaux de Kapitaro (mentions, CGU/CGV, confidentialité, risques).
// Source unique : utilisé par l'app (fenêtres « Informations légales ») et par les pages publiques
// /mentions-legales, /cgu, /confidentialite et /risques. Chargé avant app.js.

// Date de dernière révision des documents contractuels.
// À METTRE À JOUR à chaque modification substantielle des textes.
const LEGAL_LAST_UPDATE = '2026-09-29';

function legalDateFR() {
  try {
    return new Date(LEGAL_LAST_UPDATE).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return LEGAL_LAST_UPDATE; }
}

// Identité de l'éditeur : obligation LCEN art. 6-III, à tenir à jour (adresse, contact).
const LEGAL_DOCS = {
  mentions: {
    title: 'Mentions légales',
    icon: '📋',
    content: `
<p class="legal-date">Dernière mise à jour : {{LEGAL_DATE}}</p>

<h3>Article 1 — Éditeur du service</h3>
<p>Le service Kapitaro est édité par Maxence De Macedo, entrepreneur individuel (EI) exerçant sous le nom commercial Quorvia, immatriculé sous le numéro SIREN 902 642 016, dont le siège est situé 21 Le Routoir, 38240 Meylan, France.</p>
<p>Directeur de la publication : Maxence De Macedo<br>Contact : contact@kapitaro.fr</p>

<h3>Article 2 — Hébergement</h3>
<p>Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.</p>
<p>Les données des utilisateurs sont stockées par Supabase Inc. sur des serveurs situés dans l'Union européenne.</p>

<h3>Article 3 — Propriété intellectuelle</h3>
<p>L'ensemble des éléments composant Kapitaro (marque, interface, textes, code) est protégé par le droit de la propriété intellectuelle et demeure la propriété exclusive de l'éditeur. Toute reproduction ou exploitation non autorisée est interdite.</p>

<h3>Article 3 bis — Crédits et licences</h3>
<p>Les graphiques de cours utilisent la bibliothèque libre <a href="https://www.tradingview.com/" target="_blank" rel="noopener">TradingView Lightweight Charts™</a> (© TradingView, Inc., licence Apache 2.0). Les logos de cryptomonnaies proviennent de CoinGecko et les drapeaux de FlagCDN. Les cours et historiques sont fournis par Yahoo Finance et Finnhub, à titre indicatif et parfois avec un retard de cotation imposé par les places de marché.</p>

<h3>Article 4 — Statut réglementaire</h3>
<p><strong>Kapitaro n'est pas un prestataire de services d'investissement.</strong> Le service ne dispose pas du statut de Conseiller en Investissements Financiers (CIF) et n'est enregistré ni auprès de l'ORIAS, ni agréé par l'Autorité des Marchés Financiers (AMF).</p>
<p>Kapitaro est un <strong>outil pédagogique d'aide à la décision</strong>. Les analyses, scores et suggestions générés — y compris par intelligence artificielle — constituent des informations à caractère général et non des recommandations personnalisées au sens de l'article D. 321-1 du Code monétaire et financier.</p>
`
  },

  cgu: {
    title: "Conditions Générales d'Utilisation et de Vente",
    icon: '📜',
    content: `
<p class="legal-date">Dernière mise à jour : {{LEGAL_DATE}}</p>

<h3>Article 1 — Objet</h3>
<p>Les présentes conditions régissent l'accès et l'utilisation de Kapitaro, application de suivi de portefeuille et d'aide à la décision d'investissement. La création d'un compte vaut acceptation pleine et entière des présentes conditions.</p>

<h3>Article 2 — Nature du service et avertissement</h3>
<p><strong>Kapitaro ne fournit aucun conseil en investissement personnalisé.</strong> L'application propose des analyses automatisées et des contenus générés par intelligence artificielle à visée informative et pédagogique.</p>
<p>L'utilisateur reconnaît expressément ce qui suit :</p>
<ul>
<li>toute décision d'investissement relève de sa seule responsabilité ;</li>
<li>les analyses de l'IA peuvent comporter des erreurs, des omissions ou des informations obsolètes ;</li>
<li>les performances passées ne préjugent en rien des performances futures ;</li>
<li>tout investissement en instruments financiers comporte un <strong>risque de perte partielle ou totale du capital</strong> ;</li>
<li>il lui appartient de consulter un professionnel agréé avant toute décision engageante.</li>
</ul>

<h3>Article 3 — Accès au service</h3>
<p>L'accès nécessite la création d'un compte avec une adresse email valide. L'utilisateur doit être majeur et juridiquement capable. Il est responsable de la confidentialité de ses identifiants.</p>

<h3>Article 4 — Offre Premium et abonnement</h3>
<p>L'offre Premium est proposée selon deux formules au choix : 9,99 € TTC par mois, ou 79,99 € TTC par an, sans engagement de durée. Le paiement s'effectue par carte bancaire via notre prestataire Stripe. L'utilisateur peut changer de formule à tout moment depuis les paramètres du compte.</p>
<p><strong>Analyses IA illimitées :</strong> l'offre Premium donne un accès illimité à l'assistant IA pour un usage personnel normal. Afin de protéger le service contre les abus et les usages automatisés, une utilisation anormale (au-delà de 300 analyses IA sur une même journée) suspend l'accès à l'IA jusqu'au lendemain, sans autre conséquence sur l'abonnement.</p>
<p><strong>Reconduction :</strong> l'abonnement est reconduit tacitement à l'identique (mensuellement ou annuellement selon la formule choisie) jusqu'à résiliation. Celle-ci peut intervenir à tout moment depuis les paramètres du compte et prend effet à la fin de la période en cours.</p>
<p><strong>Droit de rétractation :</strong> conformément aux articles L. 221-18 et suivants du Code de la consommation, l'utilisateur dispose d'un délai de quatorze (14) jours pour se rétracter. En demandant l'accès immédiat au service, il accepte de commencer à en bénéficier avant la fin de ce délai ; il reste redevable du montant correspondant à la période consommée.</p>

<p><strong>Parrainage :</strong> chaque utilisateur dispose d'un lien de parrainage personnel. La personne qui crée son compte avec ce lien (filleul) bénéficie de 50 % de réduction sur la première mensualité de l'abonnement Premium mensuel, si elle n'a jamais été abonnée. Lorsque le filleul a réglé cette première mensualité, le parrain reçoit un mois offert : un avoir de 9,99 € sur sa prochaine facture s'il est abonné, ou 30 jours d'accès Premium sinon. Le parrainage de soi-même est interdit ; les récompenses sont limitées à douze par an et par parrain, n'ont pas de valeur monétaire et ne sont ni remboursables ni cessibles. Kapitaro peut annuler une récompense obtenue de manière abusive.</p>

<h3>Article 5 — Données de marché</h3>
<p>Les cours affichés proviennent de fournisseurs tiers, peuvent être différés et sont communiqués à titre indicatif. L'éditeur ne garantit ni leur exactitude, ni leur exhaustivité, ni leur disponibilité continue.</p>

<h3>Article 6 — Limitation de responsabilité</h3>
<p>Le service est fourni « en l'état ». L'éditeur ne saurait être tenu responsable des pertes financières, manques à gagner ou dommages indirects résultant de l'utilisation du service ou d'une décision prise sur la base des informations qu'il délivre.</p>
<p>L'éditeur ne garantit pas une disponibilité ininterrompue et pourra suspendre le service pour maintenance.</p>

<h3>Article 7 — Résiliation</h3>
<p>L'utilisateur peut supprimer son compte à tout moment depuis ses paramètres. L'éditeur se réserve le droit de suspendre un compte en cas de manquement aux présentes conditions.</p>

<h3>Article 8 — Droit applicable et litiges</h3>
<p>Les présentes sont soumises au droit français. En cas de litige, une solution amiable sera recherchée en priorité. À défaut, les tribunaux français seront compétents. L'utilisateur peut recourir gratuitement à un médiateur de la consommation.</p>
`
  },

  privacy: {
    title: 'Politique de confidentialité',
    icon: '🔒',
    content: `
<p class="legal-date">Dernière mise à jour : {{LEGAL_DATE}}</p>

<h3>Article 1 — Responsable du traitement</h3>
<p>Maxence De Macedo, entrepreneur individuel (nom commercial Quorvia), 21 Le Routoir, 38240 Meylan, France. Contact : contact@kapitaro.fr</p>

<h3>Article 2 — Données collectées</h3>
<ul>
<li><strong>Compte :</strong> adresse email, mot de passe chiffré.</li>
<li><strong>Profil d'investisseur :</strong> capital disponible, horizon, tolérance au risque, objectifs.</li>
<li><strong>Portefeuille :</strong> actifs détenus, quantités, prix d'achat, plateformes.</li>
<li><strong>Usage :</strong> conversations avec l'assistant IA, recommandations générées et leur suivi, statistiques d'utilisation du service (pages consultées, fonctionnalités utilisées, temps passé dans l'application).</li>
<li><strong>Paiement :</strong> traité exclusivement par Stripe — aucune donnée bancaire n'est stockée par Kapitaro.</li>
</ul>

<h3>Article 3 — Finalités et bases légales</h3>
<ul>
<li>Fourniture du service et personnalisation des analyses — <em>exécution du contrat</em>.</li>
<li>Gestion de l'abonnement et facturation — <em>exécution du contrat</em>.</li>
<li>Envoi de notifications (briefing, alertes) — <em>consentement</em>, révocable à tout moment.</li>
<li>Amélioration du service et sécurité — <em>intérêt légitime</em>.</li>
</ul>

<h3>Article 4 — Destinataires et sous-traitants</h3>
<p>Supabase (hébergement des données, Union européenne) · Vercel (hébergement applicatif) · Anthropic (traitement des requêtes IA) · Stripe (paiements) · Finnhub (données de marché) · Resend (envoi des e-mails).</p>
<p><strong>E-mails :</strong> nous t'envoyons un e-mail de bienvenue et, de temps en temps, un rappel utile (par exemple si ton portefeuille est resté vide ou si tu ne t'es pas connecté depuis un moment). Aucune publicité, aucune transmission de ton adresse à des tiers. Tu peux refuser ces e-mails à tout moment via le lien présent dans chacun d'eux ou dans Paramètres → Notifications.</p>
<p>Certains transferts hors Union européenne sont encadrés par les clauses contractuelles types de la Commission européenne.</p>

<h3>Article 5 — Durée de conservation</h3>
<p>Les données sont conservées pendant la durée de vie du compte, puis supprimées sous trente (30) jours après sa fermeture. Les factures sont conservées dix (10) ans conformément aux obligations comptables.</p>

<h3>Article 6 — Droits des personnes concernées</h3>
<p>Conformément au RGPD, vous disposez des droits d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité. L'export et la suppression de vos données sont accessibles directement depuis vos paramètres, ou sur demande à contact@kapitaro.fr.</p>
<p>Vous pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr).</p>

<h3>Article 7 — Cookies et traceurs</h3>
<p>Le stockage local strictement nécessaire au fonctionnement (session, préférences d'affichage, cache) ne requiert pas de consentement préalable.</p>
<p><strong>Cookies publicitaires, uniquement avec ton accord.</strong> Lorsque Kapitaro diffuse des publicités, des traceurs de <strong>Meta</strong> (pixel Meta) et de <strong>Google</strong> (balise Google Ads) peuvent être utilisés pour mesurer l'efficacité de ces campagnes (par exemple : savoir qu'une inscription provient d'une publicité). Ils ne sont déposés qu'après un clic sur « Accepter » dans le bandeau prévu à cet effet ; refuser est aussi simple qu'accepter et n'a aucune conséquence sur l'utilisation de Kapitaro. Ton choix est conservé 6 mois et peut être modifié à tout moment via le lien « Cookies » en bas de la page d'accueil ou dans Paramètres → Informations légales. Meta et Google traitent ces données selon leurs propres politiques de confidentialité. Aucune donnée de ton portefeuille n'est jamais transmise à ces services.</p>
<p><strong>Provenance des inscriptions.</strong> Pour savoir quels canaux font connaître Kapitaro, la provenance de ta première visite (lien de campagne ou site d'origine) est conservée sur ton appareil et associée à ton compte lors de l'inscription. Cette information reste interne à Kapitaro et n'est partagée avec personne.</p>
<p>La fréquentation du site est mesurée par Vercel Web Analytics, de manière anonyme et agrégée, <strong>sans cookie</strong> ni identification des visiteurs. Les statistiques d'utilisation des comptes connectés servent uniquement à améliorer le service et ne sont ni vendues ni partagées. En cas de bug, un rapport technique est enregistré (message d'erreur, page concernée, navigateur utilisé, et compte s'il est connecté) afin de corriger le problème ; il ne contient aucune donnée que tu as saisie et est effacé après 90 jours.</p>
`
  },

  risk: {
    title: 'Avertissement sur les risques',
    icon: '⚠️',
    content: `
<p class="legal-date">Dernière mise à jour : {{LEGAL_DATE}}</p>

<div class="legal-warning">
<p><strong>Tout investissement en instruments financiers comporte un risque de perte en capital.</strong> Le présent avertissement n'est pas une clause de style : il expose des risques matériels que l'utilisateur est tenu d'avoir compris avant d'engager des fonds.</p>
</div>

<h3>Article 1 — Nature des risques</h3>
<ul>
<li><strong>Le capital investi n'est pas garanti.</strong> La valeur d'un instrument financier peut varier à la hausse comme à la baisse. L'utilisateur est susceptible de récupérer un montant inférieur à sa mise initiale, voire de perdre la totalité des sommes engagées.</li>
<li><strong>Les performances passées ne préjugent pas des performances futures.</strong> Les rendements historiques et projections figurant dans l'application constituent des illustrations à caractère pédagogique et ne sauraient être interprétés comme un engagement de résultat.</li>
<li><strong>Les projections reposent sur des hypothèses simplificatrices.</strong> Le simulateur applique un taux de rendement constant, alors que les marchés financiers connaissent des variations irrégulières.</li>
<li><strong>Les analyses automatisées sont faillibles.</strong> Elles sont produites par intelligence artificielle à partir de données pouvant être incomplètes, différées ou erronées. Elles ne se substituent ni au jugement de l'utilisateur, ni à l'avis d'un professionnel agréé.</li>
<li><strong>La concentration accroît l'exposition au risque.</strong> Un portefeuille insuffisamment diversifié subit des variations d'une amplitude nettement supérieure.</li>
<li><strong>N'investir que des sommes pouvant être immobilisées.</strong> Il est recommandé de constituer une épargne de précaution disponible avant toute opération d'investissement.</li>
</ul>

<h3>Article 2 — Recommandation préalable</h3>
<p>Pour toute recommandation tenant compte de sa situation personnelle, patrimoniale et fiscale, l'utilisateur est invité à consulter un Conseiller en Investissements Financiers enregistré auprès de l'ORIAS. Kapitaro constitue un outil de compréhension et d'organisation ; la décision d'investissement demeure celle de l'utilisateur.</p>
`
  },
};
