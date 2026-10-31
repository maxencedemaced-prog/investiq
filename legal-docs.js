// legal-docs.js — textes légaux de Kapitaro (mentions, CGU/CGV, confidentialité, risques).
// Source unique : utilisé par l'app (fenêtres « Informations légales ») et par les pages publiques
// /mentions-legales, /cgu, /confidentialite et /risques. Chargé avant app.js.
// Version anglaise (LEGAL_DOCS_EN, legalDocEN) en fin de fichier : pages /terms, /privacy, /cookies, /risks, /legal de kapitaro.com.

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

// ════════════════════════════════════════════════════════════════════════════════════════════
// VERSION ANGLAISE (kapitaro.com) — BROUILLONS À FAIRE RELIRE PAR UN AVOCAT AVANT TOUTE PUBLICATION.
// Chaque document = partie commune + sections propres à la région (US, EU = UE/EEE, UK, OTHER).
// • Dans l'app (openLegalDoc), seule la section de la région de l'utilisateur est affichée.
// • Sur les pages publiques (/terms, /privacy…), toutes les sections sont affichées avec des ancres (#us, #eu, #uk).
// Les mentions [TO CONFIRM] signalent des choix ou faits que seul le propriétaire / un avocat peut trancher.
// ════════════════════════════════════════════════════════════════════════════════════════════
const LEGAL_LAST_UPDATE_EN = '2026-10-29';
function legalDateEN() {
  try { return new Date(LEGAL_LAST_UPDATE_EN).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return LEGAL_LAST_UPDATE_EN; }
}
const LEGAL_DRAFT_NOTE_EN = '<!-- DRAFT – to be reviewed by a qualified lawyer before publication -->'
  + '<p class="legal-draft" style="background:#fff7ed;border:1px solid #fdba74;color:#9a3412;border-radius:10px;padding:10px 12px;font-weight:700">Draft – to be reviewed by a qualified lawyer before publication</p>';
const LEGAL_PUBLISHER_EN = 'Maxence De Macedo, a French sole proprietor (<em>entrepreneur individuel</em>) trading as Quorvia, SIREN 902 642 016, registered address 21 Le Routoir, 38240 Meylan, France. Contact: contact@kapitaro.fr';

const LEGAL_DOCS_EN = {
  mentions: {
    title: 'Legal notice', icon: '📋',
    common: `
<p class="legal-date">Last updated: {{LEGAL_DATE}}</p>
<h3>1. Publisher</h3>
<p>Kapitaro (kapitaro.com and kapitaro.fr) is published by ${LEGAL_PUBLISHER_EN}.</p>
<p>Publication director: Maxence De Macedo.</p>
<h3>2. Hosting</h3>
<p>The website is hosted by Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA. User data is stored by Supabase Inc. on servers located in the European Union.</p>
<h3>3. Intellectual property</h3>
<p>All elements of Kapitaro (brand, interface, text, code) are protected by intellectual property law and remain the exclusive property of the publisher. Any unauthorized reproduction or use is prohibited.</p>
<h3>4. Credits and licenses</h3>
<p>Price charts use the open-source <a href="https://www.tradingview.com/" target="_blank" rel="noopener">TradingView Lightweight Charts™</a> library (© TradingView, Inc., Apache 2.0 license). Crypto logos come from CoinGecko and flags from FlagCDN. Prices and history are provided by Yahoo Finance and Finnhub for information only, sometimes with a delay imposed by exchanges.</p>
<h3>5. Regulatory status</h3>
<p><strong>Kapitaro is not an investment firm, broker or financial adviser.</strong> It provides general, impersonal educational information and tools. It does not hold client money, does not execute orders and does not provide personalized investment, tax or legal advice.</p>`,
    US: `
<h3 id="us">6. United States</h3>
<p>Kapitaro is not registered as an investment adviser with the U.S. Securities and Exchange Commission or any state, and is not a broker-dealer or a member of FINRA/SIPC. [TO CONFIRM by US counsel: reliance on the "publisher's exclusion" — see the Terms of Service, section on regulatory status.]</p>
<p>Designated agent for DMCA copyright notices: [TO CONFIRM — registration with the U.S. Copyright Office required before relying on the DMCA safe harbor].</p>`,
    EU: `
<h3 id="eu">6. European Union / EEA</h3>
<p>Kapitaro does not provide investment services or investment advice within the meaning of Directive 2014/65/EU (MiFID II) and is not authorized by any national competent authority (in France: AMF/ORIAS).</p>
<p>Digital Services Act single point of contact (Articles 11–12 DSA): contact@kapitaro.fr (English or French).</p>`,
    UK: `
<h3 id="uk">6. United Kingdom</h3>
<p>Kapitaro is not authorised or regulated by the Financial Conduct Authority (FCA) and does not give regulated financial advice. [TO CONFIRM by UK counsel: whether any content could constitute a "financial promotion" under section 21 FSMA 2000 and needs approval by an authorised person.]</p>`,
    OTHER: '',
  },

  cgu: {
    title: 'Terms of Service', icon: '📜',
    common: `
<p class="legal-date">Last updated: {{LEGAL_DATE}}</p>
<h3>1. Who we are and scope</h3>
<p>These Terms govern your access to and use of Kapitaro, a portfolio-tracking and financial-education application published by ${LEGAL_PUBLISHER_EN} ("we", "us"). By creating an account you accept these Terms. Region-specific terms below apply depending on where you live; if they conflict with the general terms, the region-specific terms prevail.</p>
<h3>2. Nature of the service — no investment advice</h3>
<p><strong>Kapitaro does not provide personalized investment, tax, legal or accounting advice and does not recommend buying or selling any security.</strong> Scores, simulations, AI-generated content and other outputs are general, impersonal educational information based on assumptions and data you provide.</p>
<ul>
<li>Every investment decision is yours alone.</li>
<li>AI outputs may contain errors, omissions or outdated information.</li>
<li>Past performance is not a reliable indicator of future results; projections are hypothetical illustrations, not promises.</li>
<li>All investing involves risk, including the partial or total loss of your capital.</li>
<li>Crypto-assets are shown for price tracking only; Kapitaro provides no analysis or opinion on them.</li>
<li>Consider consulting a licensed professional before making significant financial decisions.</li>
</ul>
<h3>3. Eligibility and account</h3>
<p>You must be <strong>at least 18 years old</strong> and legally able to enter into a contract. The service is not directed to children. You are responsible for keeping your login details confidential and for activity on your account.</p>
<h3>4. Free plan and Premium subscription</h3>
<p>The free plan has no time limit. Premium is offered as a monthly or annual subscription at the price shown before you pay (currently {{PRICE_MONTHLY}} per month or {{PRICE_ANNUAL}} per year, taxes included where applicable [TO CONFIRM pricing and tax treatment per country]). Payments are processed by Stripe; we never store your card details.</p>
<p><strong>Automatic renewal.</strong> Your subscription renews automatically at the end of each billing period (monthly or yearly) at the then-current price until you cancel. We will tell you about any price change in advance and you may cancel before it applies.</p>
<p><strong>Cancel any time, online.</strong> You can cancel in a few clicks in Settings → Subscription (Stripe customer portal), as easily as you subscribed. Cancellation takes effect at the end of the current billing period; you keep Premium until then.</p>
<p><strong>Fair use.</strong> Premium includes unlimited AI use for normal personal use. To protect the service from abuse and automation, abnormal use (more than 300 AI analyses in one day) pauses AI access until the next day, without other consequences.</p>
<p><strong>Referrals.</strong> A referred new user may get 50% off their first monthly Premium payment; the referrer then gets one month free (credit or 30 days of Premium). Self-referral is prohibited; rewards are limited to twelve per year, have no cash value and are non-transferable. We may cancel rewards obtained abusively.</p>
<h3>5. Acceptable use</h3>
<p>You agree not to misuse the service, including by scraping, automated access, reverse engineering, attempting to bypass usage limits, or using it for unlawful purposes.</p>
<h3>6. Market data</h3>
<p>Prices come from third-party providers, may be delayed and are provided for information only. We do not guarantee their accuracy, completeness or continuous availability.</p>
<h3>7. Limitation of liability</h3>
<p>The service is provided "as is" and "as available". To the fullest extent permitted by applicable law, we are not liable for financial losses, lost profits or indirect damages resulting from use of the service or from decisions made based on its content. Nothing in these Terms limits liability that cannot be limited by law (including your statutory consumer rights).</p>
<h3>8. Termination</h3>
<p>You can delete your account at any time in Settings. We may suspend an account that breaches these Terms, after notice where required by law.</p>
<h3>9. Changes</h3>
<p>We may update these Terms. We will notify you of material changes in advance; if you do not agree, you may cancel and delete your account.</p>
<h3>10. Contact</h3>
<p>contact@kapitaro.fr</p>`,
    US: `
<h3 id="us">Additional terms for users in the United States</h3>
<p><strong>Regulatory status.</strong> Kapitaro is not a broker-dealer and is not registered as an investment adviser under the Investment Advisers Act of 1940 or any state law. We intend to rely on the exclusion for publishers of bona fide publications of general and regular circulation, which applies to content that is impersonal (not tailored to the individual needs of a specific person), disinterested and of general circulation (<em>Lowe v. SEC</em>, 472 U.S. 181 (1985)). [TO CONFIRM by US counsel: interactive, portfolio-based features (health score, AI answers referencing your holdings, decision helper) may be viewed as personalized; counsel should confirm whether the exclusion applies, whether features must be restricted for US users, or whether registration/state notice filings are needed.]</p>
<p><strong>No advice.</strong> Nothing on Kapitaro is investment, tax or legal advice or an offer or solicitation to buy or sell any security.</p>
<p><strong>Automatic renewal disclosure (California Bus. &amp; Prof. Code §17600 et seq. and similar state laws).</strong> Before you subscribe we show clearly: that the subscription renews automatically until cancelled, the billing frequency, the amount charged, and how to cancel. We send an acknowledgment email with these terms and cancellation instructions after purchase [TO CONFIRM that the Stripe receipt / welcome email contains all required elements]. You can cancel online at any time via Settings → Subscription. For annual plans we will send a reminder before renewal where required by law [TO CONFIRM implementation].</p>
<p><strong>Endorsements and testimonials.</strong> Any testimonials or examples reflect individual experiences or hypothetical figures and are not typical or guaranteed results. Material connections (e.g. referral rewards) are disclosed, consistent with FTC Endorsement Guides.</p>
<p><strong>Governing law and disputes.</strong> [TO CONFIRM by US counsel — options: (a) French law with mandatory protections of your state of residence preserved; (b) the law of a US state; (c) binding individual arbitration with a class-action waiver and small-claims carve-out and a 30-day opt-out window. No option has been chosen yet; until confirmed, no arbitration clause applies.]</p>
<p><strong>Warranty disclaimer and cap.</strong> TO THE EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED WITHOUT WARRANTIES OF ANY KIND, AND OUR TOTAL LIABILITY IS LIMITED TO THE AMOUNTS YOU PAID US IN THE 12 MONTHS BEFORE THE CLAIM. [TO CONFIRM wording and enforceability by state.]</p>`,
    EU: `
<h3 id="eu">Additional terms for consumers in the European Union / EEA</h3>
<p><strong>Not investment advice (MiFID II).</strong> Kapitaro does not provide investment advice or any investment service within the meaning of Directive 2014/65/EU. Content is general information; it is not a personal recommendation.</p>
<p><strong>14-day right of withdrawal.</strong> As a consumer you have the right to withdraw from your Premium subscription within 14 days of purchase without giving a reason (Directive 2011/83/EU, art. 9; in France art. L. 221-18 Code de la consommation). To exercise it, email contact@kapitaro.fr or use the model withdrawal form below. We will refund you within 14 days using the same payment method.</p>
<p><strong>Immediate access.</strong> If you ask for Premium to start immediately, you expressly request performance during the withdrawal period. Under art. 14(3) of Directive 2011/83/EU you then pay a proportionate amount for the service supplied until you withdraw. [TO CONFIRM by EU counsel: whether to instead use the art. 16(m) waiver for digital content, which requires prior express consent and acknowledgment of loss of the right, recorded on a durable medium — the checkout currently does not collect this; see docs/I18N_PLAN.md.]</p>
<p><em>Model withdrawal form:</em> "To Maxence De Macedo (Quorvia), 21 Le Routoir, 38240 Meylan, France, contact@kapitaro.fr — I hereby give notice that I withdraw from my contract for the Kapitaro Premium subscription ordered on [date], account email [email]. Date, name."</p>
<p><strong>Legal guarantee of conformity.</strong> You benefit from the legal guarantee of conformity for digital services (Directive (EU) 2019/770).</p>
<p><strong>Disputes.</strong> These Terms are governed by French law, without depriving you of the protection of mandatory provisions of the law of your country of residence. You may bring proceedings in the courts of your country of residence. You may also use a consumer mediator free of charge: [TO CONFIRM — name and website of the consumer mediator once appointed]. [TO CONFIRM: the EU Online Dispute Resolution platform was discontinued in July 2025; check current requirements.]</p>
<p><strong>Digital Services Act.</strong> Contact point for users and authorities: contact@kapitaro.fr. You can report illegal content to that address.</p>`,
    UK: `
<h3 id="uk">Additional terms for consumers in the United Kingdom</h3>
<p><strong>Not financial advice.</strong> Kapitaro is not authorised by the FCA and does not provide regulated financial advice. Content is general information. Capital at risk.</p>
<p><strong>Cancellation.</strong> Under the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013 you may cancel within 14 days of purchase. If you ask Premium to start immediately, you pay for the service supplied until you cancel. [TO CONFIRM by UK counsel, including the Digital Markets, Competition and Consumers Act 2024 subscription-contract rules (reminders, cooling-off periods) when in force.]</p>
<p><strong>Disputes.</strong> French law applies without depriving you of the mandatory protections of UK law; you may bring claims in the courts of the part of the UK where you live. [TO CONFIRM.]</p>`,
    OTHER: `
<h3 id="other">Users in other countries</h3>
<p>You are responsible for complying with local laws. Kapitaro may not be available or appropriate in every country. French law applies, subject to any mandatory consumer protections of your country of residence. [TO CONFIRM.]</p>`,
  },

  privacy: {
    title: 'Privacy Policy', icon: '🔒',
    common: `
<p class="legal-date">Last updated: {{LEGAL_DATE}}</p>
<h3>1. Controller</h3>
<p>${LEGAL_PUBLISHER_EN}. No Data Protection Officer has been appointed [TO CONFIRM whether one is required]; for any privacy request, write to contact@kapitaro.fr.</p>
<h3>2. Data we collect</h3>
<ul>
<li><strong>Account:</strong> email address, encrypted password (or Google sign-in identifier), language and country/region.</li>
<li><strong>Investor profile:</strong> available capital, time horizon, risk tolerance, goals, level of experience.</li>
<li><strong>Portfolio:</strong> holdings, quantities, purchase prices, platforms; statements you import (processed to extract holdings).</li>
<li><strong>Usage:</strong> AI conversations and generated content, feature usage statistics, technical error reports (no data you typed; deleted after 90 days).</li>
<li><strong>Payments:</strong> handled entirely by Stripe — we never store card numbers. We receive subscription status and invoices.</li>
<li><strong>Acquisition source:</strong> campaign or referring site of your first visit, kept internally.</li>
<li><strong>Advertising cookies:</strong> only if you accept them (see Cookie notice).</li>
</ul>
<h3>3. How we use data</h3>
<p>To provide and personalize the service; manage subscriptions and billing; send service emails and, if you agree, tips and newsletters; send push notifications you enable; secure and improve the service; measure our advertising (with consent); and comply with legal obligations.</p>
<h3>4. Service providers (processors) and international transfers</h3>
<ul>
<li><strong>Supabase</strong> (database and authentication, EU servers)</li>
<li><strong>Vercel</strong> (application hosting, USA)</li>
<li><strong>Anthropic</strong> (AI processing of your questions and the portfolio context needed to answer, USA)</li>
<li><strong>Stripe</strong> (payments, USA/Ireland)</li>
<li><strong>Resend</strong> (email delivery, USA)</li>
<li><strong>Finnhub, Yahoo Finance</strong> (market data — tickers only, no personal data)</li>
<li><strong>Meta and Google</strong> (advertising measurement, only with your consent; they act as independent controllers for their own purposes)</li>
</ul>
<p>We do not sell your personal information and never send your portfolio data to advertising partners.</p>
<h3>5. Retention</h3>
<p>Data is kept while your account exists and deleted within 30 days after you close it, except invoices (kept 10 years for accounting obligations) and error logs (90 days).</p>
<h3>6. Security</h3>
<p>Data is encrypted in transit; access is restricted; row-level security protects each account’s data. No system is 100% secure.</p>
<h3>7. Children</h3>
<p>Kapitaro is for adults (18+). We do not knowingly collect data from children under 13 (or under 16 in the EU/UK). If you believe a child has given us data, contact us and we will delete it.</p>
<h3>8. Your controls</h3>
<p>Export or delete your data at any time in Settings → My data, or email contact@kapitaro.fr. Manage emails and notifications in Settings → Notifications.</p>`,
    US: `
<h3 id="us">Notice for California and other US residents</h3>
<p><strong>Notice at collection (CCPA/CPRA).</strong> In the last 12 months we collected these categories of personal information: identifiers (email, account ID, IP address); commercial information (subscription records); internet activity (usage of the app); inferences (investor profile you provide); sensitive personal information limited to account login credentials. Sources: you, your device, and our service providers. Purposes: as described in section 3. Retention: section 5.</p>
<p><strong>Sale and sharing.</strong> We do not sell personal information for money. If you accept advertising cookies, Meta and Google may receive identifiers and browsing events from our site, which may be considered "sharing" for cross-context behavioral advertising under California law. You can opt out at any time with the <a href="#" onclick="window.kpAds&&kpAds.optOut&&kpAds.optOut();return false">Do Not Sell or Share My Personal Information</a> link in our footer. We honor <strong>Global Privacy Control</strong> (GPC) signals as an opt-out. We do not knowingly sell or share data of consumers under 16.</p>
<p><strong>Your rights.</strong> Right to know/access, delete, correct, opt out of sale/sharing, limit use of sensitive personal information (we only use it to provide the service), and not be discriminated against for exercising your rights. Submit requests in Settings → My data or at contact@kapitaro.fr; we will verify your identity by email. You may use an authorized agent. [TO CONFIRM: CCPA thresholds — the law may not yet apply to us, but we follow it as best practice.]</p>
<p><strong>Other states.</strong> Residents of states with comprehensive privacy laws (including Colorado, Connecticut, Virginia, Utah, Texas, Oregon and others) have similar rights to access, correct, delete, port and opt out of targeted advertising; you can appeal a refused request by replying to our decision email. [TO CONFIRM list and thresholds by US counsel.]</p>
<p><strong>COPPA.</strong> The service is not directed to children under 13 and we do not knowingly collect their personal information.</p>`,
    EU: `
<h3 id="eu">Information for users in the EU/EEA (GDPR)</h3>
<p><strong>Legal bases (art. 6 GDPR):</strong> performance of the contract (account, portfolio tracking, AI answers, subscription); consent (advertising cookies, push notifications, marketing emails — withdrawable at any time); legitimate interests (security, fraud prevention, service improvement, internal measurement of acquisition sources); legal obligation (invoicing, accounting).</p>
<p><strong>Your rights:</strong> access, rectification, erasure, restriction, objection, data portability and withdrawal of consent, plus the right not to be subject to solely automated decisions with legal or similarly significant effects (Kapitaro’s scores have no such effect). Exercise them in Settings or at contact@kapitaro.fr; we answer within one month.</p>
<p><strong>International transfers:</strong> some providers (Vercel, Anthropic, Stripe, Resend, Meta, Google) may process data in the USA. Transfers rely on the EU–US Data Privacy Framework where the provider is certified, or on the European Commission’s Standard Contractual Clauses. [TO CONFIRM provider by provider.]</p>
<p><strong>Complaints:</strong> you may lodge a complaint with your local supervisory authority; our lead authority is the CNIL (France, www.cnil.fr).</p>
<p><strong>EU representative:</strong> not required as the controller is established in the EU (France).</p>`,
    UK: `
<h3 id="uk">Information for users in the United Kingdom (UK GDPR)</h3>
<p>The legal bases and rights described for EU users apply under the UK GDPR and the Data Protection Act 2018. Transfers to the USA rely on the UK Extension to the EU–US Data Privacy Framework or the UK International Data Transfer Addendum. You may complain to the Information Commissioner’s Office (ico.org.uk). UK representative (art. 27 UK GDPR): [TO CONFIRM — likely required if we target UK users].</p>`,
    OTHER: '',
  },

  cookies: {
    title: 'Cookie notice', icon: '🍪',
    common: `
<p class="legal-date">Last updated: {{LEGAL_DATE}}</p>
<h3>1. Strictly necessary storage</h3>
<p>We use browser storage that is strictly necessary for the service (login session, display preferences such as theme and language, cache). It does not require consent.</p>
<h3>2. Audience measurement without cookies</h3>
<p>Site traffic is measured with Vercel Web Analytics, anonymously and in aggregate, <strong>without cookies</strong> or identifying visitors.</p>
<h3>3. Advertising cookies — only with your consent</h3>
<p>When we run ads, the <strong>Meta pixel</strong> and the <strong>Google Ads tag</strong> may be used to measure campaign effectiveness (for example, knowing a sign-up came from an ad). They are only loaded after you click "Accept" in the banner; refusing is as easy as accepting and has no effect on how Kapitaro works. Your choice is kept for 6 months and can be changed at any time via the "Cookies" link at the bottom of the home page. Your portfolio data is never sent to these services.</p>
<h3>4. Acquisition source</h3>
<p>The campaign or referring site of your first visit is stored on your device (30 days) and linked to your account at sign-up, for internal use only.</p>`,
    US: `
<h3 id="us">US residents</h3>
<p>We use the same opt-in model for all visitors. Use the "Do Not Sell or Share My Personal Information" link to switch advertising cookies off at any time; Global Privacy Control signals are honored automatically.</p>`,
    EU: `
<h3 id="eu">EU/EEA residents</h3>
<p>Consent is collected under the ePrivacy Directive (art. 5(3)) and, in France, the CNIL guidelines: no non-essential tracker before consent, "Refuse" as prominent as "Accept", withdrawal as easy as consent.</p>`,
    UK: `
<h3 id="uk">UK residents</h3>
<p>Consent is collected under the Privacy and Electronic Communications Regulations (PECR) and ICO guidance.</p>`,
    OTHER: '',
  },

  risk: {
    title: 'Risk disclosure', icon: '⚠️',
    common: `
<p class="legal-date">Last updated: {{LEGAL_DATE}}</p>
<div class="legal-warning"><p><strong>All investments involve risk, including the possible loss of all the capital invested.</strong> This is not boilerplate: please make sure you understand these risks before investing money.</p></div>
<h3>1. Key risks</h3>
<ul>
<li><strong>Your capital is not guaranteed.</strong> The value of investments can go down as well as up; you may get back less than you invested.</li>
<li><strong>Past performance is not a reliable indicator of future results.</strong> Historical returns and projections in the app are educational illustrations, not commitments.</li>
<li><strong>Projections use simplified assumptions.</strong> Simulators apply a constant rate of return, whereas real markets move irregularly.</li>
<li><strong>Automated analyses can be wrong.</strong> AI outputs rely on data that may be incomplete, delayed or incorrect and do not replace your judgment or a licensed professional.</li>
<li><strong>Concentration increases risk.</strong> A poorly diversified portfolio swings much more.</li>
<li><strong>Currency risk.</strong> Investments in another currency can gain or lose value because of exchange-rate moves.</li>
<li><strong>Crypto-assets</strong> are highly volatile and largely unregulated; Kapitaro only shows their price and gives no analysis.</li>
<li><strong>Only invest money you can leave invested.</strong> People generally keep an emergency fund before investing.</li>
</ul>
<h3>2. Get personal advice if you need it</h3>
<p>Kapitaro is a tool to understand and organize. For a recommendation that takes your personal, financial and tax situation into account, consult a licensed professional.</p>`,
    US: `
<h3 id="us">United States</h3>
<p>Investments are not FDIC-insured, not bank-guaranteed and may lose value. For personal advice, consider a registered investment adviser or a fiduciary financial planner; you can check professionals on <a href="https://adviserinfo.sec.gov/" target="_blank" rel="noopener">adviserinfo.sec.gov</a> and <a href="https://brokercheck.finra.org/" target="_blank" rel="noopener">BrokerCheck</a>. Nothing here is tax advice.</p>`,
    EU: `
<h3 id="eu">European Union / EEA</h3>
<p>Before investing in a fund or ETF, read its Key Information Document (KID). For personal advice, consult an adviser authorized in your country under MiFID II.</p>`,
    UK: `
<h3 id="uk">United Kingdom</h3>
<p>Before investing, read the product’s Key Information Document. For personal advice, use an FCA-authorised adviser (check the <a href="https://register.fca.org.uk/" target="_blank" rel="noopener">FCA register</a>). Capital at risk.</p>`,
    OTHER: '',
  },
};

// Document anglais pour l'app : partie commune + section de la région de l'utilisateur
// (all = true : toutes les régions, pour les pages publiques). Renvoie { title, content, en: true }.
function legalDocEN(key, all) {
  const d = LEGAL_DOCS_EN[key];
  if (!d) return null;
  const region = (window.kpI18n && kpI18n.region) || 'OTHER';
  const parts = all ? ['US', 'EU', 'UK', 'OTHER'].map(r => d[r] || '') : [d[region] || ''];
  const price = p => (window.kpI18n ? kpI18n.price(p) : (p === 'monthly' ? '€9.99' : '€79.99'));
  const content = (LEGAL_DRAFT_NOTE_EN + d.common + parts.join(''))
    .replace(/\{\{PRICE_MONTHLY\}\}/g, price('monthly')).replace(/\{\{PRICE_ANNUAL\}\}/g, price('annual'));
  return { title: d.title, icon: d.icon, content, en: true };
}
