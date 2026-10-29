# Version anglaise de Kapitaro (US / UE / Royaume-Uni) — plan et état d'avancement

> Document destiné au propriétaire (Maxence). Branche de travail : `i18n-en` (créée depuis `dev`), pull request en brouillon vers `dev`.
> **Rien n'est en production** : `main` et `dev` ne sont pas modifiées, aucun réglage Vercel / Supabase / Stripe / Google n'a été touché, aucun SQL n'a été lancé.

---

## 1. Décisions déjà prises

| Sujet | Décision |
|---|---|
| Domaine | **kapitaro.com = anglais**, **kapitaro.fr = français** (inchangé). Un seul projet Vercel, routage selon le domaine (`vercel.json`, règles `has: host`). |
| Langue | Fixée par le domaine. Sur les hôtes de test (localhost, aperçus Vercel) : `?lang=en` ou `?lang=fr`, puis le choix mémorisé, puis la langue du navigateur. |
| Site français | **Aucun changement pour les utilisateurs de kapitaro.fr** : en français, aucun dictionnaire n'est chargé, aucune traduction n'est appliquée, les formats de nombres et les prix restent identiques (vérifié dans le navigateur). Le sélecteur de langue reste **masqué sur kapitaro.fr** tant que `enDomainLive` vaut `false` dans `i18n.js`. |
| Région | 5 régions : **FR** (site français), **EU** (UE/EEE hors France), **UK**, **US**, **OTHER**. Choix explicite à l'inscription et dans Paramètres (enregistré dans le profil : `user_metadata.region`) ; sinon déduite du fuseau horaire et de la langue du navigateur. |
| Prix | Affichés **en euros** tant que les prix en dollars n'existent pas dans Stripe (`usdReady: false` dans `i18n.js`). Afficher « $ » en facturant « € » serait trompeur (FTC / droit de la consommation). Aperçu des prix en dollars sur un hôte de test : `?lang=en&currency=usd`. |

## 2. Comment ça marche (en bref)

- **`i18n.js`** (petit fichier chargé en premier sur chaque page) : détecte la langue et la région, expose `kpI18n` (textes `kpT()`, formats de nombres/dates/monnaie via `Intl`, prix affichés, liens juridiques, avertissement par région).
- **`i18n-en.js`** (chargé **uniquement en anglais**) : dictionnaire français → anglais avec variantes par région, appliqué automatiquement à tous les textes de la page, y compris ceux créés par `app.js` (notifications, fenêtres, alertes du navigateur), plus le lexique et les aides des onglets. Avantage : les 15 000 lignes d'`app.js` ne sont pas réécrites, donc aucun risque pour la version française. `app.js` ne reçoit que 10 petits « crochets » qui ne font rien en français.
- **Textes juridiques anglais** : `legal-docs.js` (`LEGAL_DOCS_EN`, fonction `legalDocEN`) + pages publiques dans le dossier `en/`, servies à la racine de kapitaro.com (`/terms`, `/privacy`, `/cookies`, `/risks`, `/legal`). Dans l'app, seule la partie de la région de l'utilisateur s'affiche ; sur les pages publiques, toutes les régions sont affichées.
- **Assistant IA** (`api/claude.js`) : l'app envoie `lang` et `region` ; le serveur ajoute un cadre « réponds en anglais, vocabulaire de la région, mêmes règles (pas de conseil personnalisé, jamais acheter/vendre, pas de promesse, cryptos = cours seulement) » + la phrase d'avertissement de la région.
- **E-mails** (`api/_email.js`) : bienvenue et relances en anglais pour les comptes créés en anglais.

### Tester la version anglaise (sur l'aperçu Vercel de la branche, ou en local)
1. Ouvrir l'adresse de l'aperçu avec `?lang=en` (ex. `https://…vercel.app/?lang=en`). Revenir au français : `?lang=fr`.
2. Changer de région : Paramètres → « Country / region », ou à l'inscription.
3. Pages juridiques : `/en/terms`, `/en/privacy`, `/en/cookies`, `/en/risks`, `/en/legal`. Simulateur : `/en/compound-interest-calculator`.
4. Liste des textes encore en français sur une page : ajouter `&i18n_debug=1` à l'adresse, puis dans la console du navigateur taper `Object.keys(_kpMissing)`.

## 3. Ce que tu devras faire toi-même (rien de cela n'a été fait)

1. **Acheter kapitaro.com** et l'ajouter au projet Vercel (avec `www.kapitaro.com`, déjà redirigé vers `kapitaro.com` par `vercel.json`).
2. **Supabase → Authentication → URL Configuration** : ajouter `https://kapitaro.com` et `https://kapitaro.com/**` aux « Redirect URLs ». Les e-mails Supabase (confirmation d'inscription, mot de passe oublié) n'existent qu'en français : prévoir un modèle bilingue ou un envoi via Resend selon `user_metadata.lang` (décision ci-dessous).
3. **Google Cloud (connexion Google)** : ajouter `https://kapitaro.com` aux « Authorized JavaScript origins » ; l'écran de consentement Google affiche le nom de l'app, à vérifier.
4. **Stripe** : créer les prix en USD (et éventuellement GBP) — proposition **9,99 $/mois et 79,99 $/an [À CONFIRMER]** — puis donner les identifiants de prix (`price_…`) pour les brancher dans `api/create-checkout.js` selon la devise ; activer la langue anglaise des reçus Stripe ; vérifier la fiscalité : **taxe de vente US** (Stripe Tax, seuils par État), **TVA UE** (guichet unique OSS), **TVA UK**. Les URL de retour après paiement sont déjà prévues pour kapitaro.com. Ensuite seulement : passer `usdReady: true` dans `i18n.js`.
5. **Variables Vercel** : rien d'obligatoire. `APP_URL` reste `https://kapitaro.fr` ; le retour sur kapitaro.com est déduit automatiquement de l'origine de la demande.
6. **Publicité** : si tu fais de la pub en anglais, déclarer kapitaro.com dans Google Ads / Meta (le bandeau cookies anglais respecte déjà le signal GPC et a le lien « Do Not Sell or Share »).
7. Passer `enDomainLive: true` dans `i18n.js` quand kapitaro.com est en ligne (le sélecteur de langue apparaîtra alors sur kapitaro.fr et renverra vers kapitaro.com).
8. Après relecture juridique : retirer `noindex` des pages `en/*.html` et les ajouter à `sitemap-en.xml`.
9. **Faire relire tous les textes juridiques anglais par un avocat** (section 5).

## 4. Ce qui est fait (branche `i18n-en`)

| Étape | État |
|---|---|
| Infrastructure i18n (langue par domaine, région, formats, prix affichés, sélecteur) | ✅ |
| Page d'accueil, connexion/inscription, pieds de page, tarifs, FAQ de l'accueil | ✅ traduits |
| Menu, paramètres, portefeuille, ajout de position, alertes, objectifs, simulateur DCA, scénario de crise, santé, calculateurs, dépenses (aperçu), agent IA, notifications (toasts), messages d'erreur de connexion et de quota IA | ✅ largement traduits (dictionnaire, ~840 entrées + ~60 formules avec nombres) |
| Lexique (glossary.js) et aides des onglets (tab-hints.js) | ✅ traduits ; PEA / compte-titres / assurance-vie retirés hors France ; ajout de notions **US** (brokerage account, IRA, 401(k), HSA, high-yield savings, plus-values), **UE** (ETF UCITS, KID, plan de retraite), **UK** (ISA, SIPP) — purement pédagogiques, jamais un conseil fiscal |
| Inscription en anglais : choix du pays + case « J'accepte les conditions et la confidentialité, 18 ans ou plus » ; mention équivalente sous « Continue with Google » | ✅ (en français : rien ne change) |
| Assistant IA : réponse en anglais, vocabulaire et avertissement selon la région | ✅ (`api/claude.js`) |
| Brouillons juridiques anglais US / UE / UK | ✅ (section 5) |
| Bandeau cookies anglais, signal **Global Privacy Control** respecté, lien **« Do Not Sell or Share My Personal Information »** | ✅ (anglais uniquement) |
| Paiement : retour sur kapitaro.com et page Stripe en anglais quand le paiement part de kapitaro.com | ✅ (`api/create-checkout.js`, `api/create-portal.js`) ; kapitaro.com ajouté aux origines autorisées des API |
| E-mails bienvenue / relances en anglais | ✅ ; la lettre du dimanche n'est pas envoyée aux comptes anglais (elle est en français) |
| SEO : simulateur d'intérêts composés en anglais (`/compound-interest-calculator`, $/€/£), hreflang/canonical dans les deux sens (accueil, simulateur, pages juridiques), `sitemap-en.xml`, `robots.txt` | ✅ ; adresses françaises inchangées |
| Contrôles : syntaxe de tous les fichiers JS modifiés, chargement de la page en anglais et en français sans erreur, français identique (titre, textes, prix « 9,99 € », nombres « 1 234,50 », lexique) | ✅ |

## 5. Textes juridiques à faire relire (brouillons)

Chaque page porte en haut : « **Draft – to be reviewed by a qualified lawyer before publication** » (et un commentaire HTML). Les pages sont en `noindex`.

| Document | Fichier | Points à faire valider ([TO CONFIRM] dans le texte) |
|---|---|---|
| Terms of Service | `legal-docs.js` → `LEGAL_DOCS_EN.cgu`, page `/terms` | **US** : exclusion « éditeur » de l'Investment Advisers Act (arrêt *Lowe v. SEC*) — les fonctions personnalisées (score, IA sur le portefeuille, aide à la décision) peuvent poser problème ; loi applicable, arbitrage ou non, plafond de responsabilité ; règles de renouvellement automatique (Californie, « click-to-cancel ») : e-mail récapitulatif et rappel avant renouvellement annuel à mettre en place. **UE** : droit de rétractation 14 jours — l'app n'enregistre pas aujourd'hui la renonciation expresse (art. 16 m) : choisir entre paiement au prorata (rédigé ainsi) ou ajouter une case au paiement ; médiateur de la consommation à nommer ; plateforme ODR supprimée en 2025 à vérifier. **UK** : nouvelles règles d'abonnement (DMCC Act 2024). |
| Privacy Policy | `LEGAL_DOCS_EN.privacy`, `/privacy` | Mécanisme de transfert par prestataire (DPF ou clauses types) ; seuils CCPA ; liste des États US ; représentant UK (art. 27 UK GDPR) ; besoin d'un DPO. |
| Cookie notice | `LEGAL_DOCS_EN.cookies`, `/cookies` | Durées et liste exacte des cookies Meta/Google. |
| Risk disclosure | `LEGAL_DOCS_EN.risk`, `/risks` | Formulations réglementaires UE/UK (« past performance… », « capital at risk »). |
| Legal notice | `LEGAL_DOCS_EN.mentions`, `/legal` | Agent DMCA (US) ; « financial promotions » UK (FCA, section 21 FSMA). |

## 6. Où le contenu change selon la région (liste complète)

| Endroit | FR | US | EU | UK | OTHER |
|---|---|---|---|---|---|
| Textes juridiques (app et pages) | textes français actuels | section « United States » | section « EU/EEA » | section « United Kingdom » | section « other countries » |
| Pied de page de l'accueil (avertissement) | ORIAS/AMF | pas RIA ni broker-dealer, ni conseil fiscal/juridique | MiFID II + performances passées + capital à risque | FCA + performances passées | générique |
| Mention « outil éducatif » du formulaire | inchangée | « not a registered investment adviser or broker-dealer » | générique | générique | générique |
| Lexique | complet (PEA, assurance-vie…) | + brokerage, IRA, 401(k), HSA, HYSA, capital gains, S&P 500 ; définition des frais avec « expense ratio » | + UCITS, KID, pension plan | + ISA, SIPP | sans enveloppes françaises |
| Vocabulaire de l'accueil et de l'app (PEA, Livret A, assurance-vie, compte-titres, « ETF Monde · PEA ») | inchangé | brokerage account / IRA / HYSA | investment account / UCITS | ISA / pension | investment account |
| Assistant IA | inchangé | vocabulaire US, avertissement « not investment, tax or legal advice » | vocabulaire UE, « past performance… » | vocabulaire UK | neutre |
| Aide jeu d'argent (dépenses) | Joueurs Info Service | 1-800-GAMBLER | services locaux | GamCare | services locaux |
| Bandeau cookies | inchangé | anglais + GPC + Do Not Sell | anglais + GPC | anglais + GPC | anglais + GPC |
| Simulateur public anglais | — | $ + avertissement US | € + avertissement UE | £ + avertissement UE/UK | € |

## 7. Ce qui reste à traduire / adapter (non fait)

L'outil de diagnostic (`&i18n_debug=1`) liste ce qui reste sur chaque page. Zones connues :

- **app.js — fenêtres moins fréquentes** : tutoriel détaillé (étapes avancées), fenêtre des offres Premium, bilan patrimonial (questionnaire et PDF), plan mensuel, import de relevé (messages détaillés), historique IA, matières premières, parrainage, verrouillage de l'app (`applock.js`), notes de version (« Nouveautés »). Le dictionnaire couvre les textes déjà rencontrés ; les autres apparaissent en français jusqu'à la prochaine passe.
- **Consignes envoyées à l'IA par l'app** (écrites en français dans `app.js`) : la réponse est bien en anglais grâce au cadre serveur, mais certaines consignes citent des produits français (PEA, Livret A) ; à neutraliser par région dans une 2e passe.
- **Formats** : les montants de l'app restent en euros (les portefeuilles sont en euros) ; le séparateur décimal suit l'anglais (`1,234.50 €`) seulement dans `fmt`/`fmtI`/`fmtK`. Les ~80 autres `toLocaleString('fr-FR')` d'`app.js` restent au format français. Conversion du portefeuille en dollars : non faite (nécessite un taux de change).
- **Fonctions propres à la France à masquer hors FR** : mention « Créé en France » (gardée, c'est un fait), plateformes françaises dans les listes (Boursorama, Fortuneo…), import de relevés de courtiers français, fiscalité dans le bilan, médiateur — à revoir écran par écran.
- **depenses.js / bilan-extra.js** : catégories traduites en partie ; règles de détection des libellés bancaires françaises (PRLV, CB…) inchangées.
- **Bulle d'aide** (`help-bot.js` + `faq-data.js`) et page **/faq** : en français uniquement ; à traduire (base de questions anglaise + mots-clés anglais).
- **Notifications push** (`push.js`, `api/push-send.js`, `api/_push.js`) : briefing et alertes en français ; à générer selon `user_metadata.lang`.
- **Blog** (`api/blog.js`) et **lettre du dimanche** : français uniquement ; décision éditoriale (blog anglais séparé ?).
- **Autres simulateurs publics** : objectif d'épargne, ETF MSCI World, épargne de précaution, investissement programmé, frais, inflation ; page `/commencer` et `/faq` — seul le simulateur d'intérêts composés est fait.
- **Page de désinscription** (`api/unsubscribe.js`) et **e-mails Supabase** (confirmation, mot de passe) : français.
- **Vidéos du tutoriel** (`tuto/`, `video/`) et images : françaises.
- **Données structurées** (FAQ JSON-LD) de l'accueil anglais : retirées en anglais plutôt que laissées fausses ; à recréer en anglais.
- Exclus volontairement : Studio et tableau de bord admin (usage interne).

## 8. Décisions qui restent à prendre

1. **Pays de lancement** : US, UE, Royaume-Uni, tous à la fois ? (le Royaume-Uni et les US demandent le plus de travail juridique).
2. **Prix** : en dollars et en livres ? Montants ? Taxe de vente US et TVA à gérer via Stripe Tax ?
3. **US** : faire valider par un avocat que les fonctions personnalisées restent dans l'exclusion « éditeur », ou les limiter pour les utilisateurs américains ; loi applicable / arbitrage.
4. **Représentants** : représentant UE non nécessaire (éditeur établi en France) ; représentant UK probablement nécessaire si tu vises le Royaume-Uni ; agent DMCA aux US.
5. **Rétractation UE** : paiement au prorata (rédigé) ou case de renonciation expresse au moment du paiement ?
6. **E-mails Supabase** en anglais : modèle bilingue ou envoi personnalisé via Resend ?
7. **Détection automatique** sur les hôtes de test : un navigateur non francophone voit l'anglais par défaut ; sur kapitaro.fr c'est toujours le français.
