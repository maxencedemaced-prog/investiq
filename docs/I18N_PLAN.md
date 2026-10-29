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
8. Après relecture juridique : retirer `noindex` des pages juridiques `en/terms|privacy|cookies|risks|legal.html` et les ajouter à `sitemap-en.xml`.
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
| Bulle d’aide en anglais (`faq-data-en.js`, mots-clés anglais, refus de conseil) | ✅ |
| E-mails bienvenue / relances en anglais | ✅ ; la lettre du dimanche n'est pas envoyée aux comptes anglais (elle est en français) |
| SEO : les 7 simulateurs publics en anglais à la racine de kapitaro.com (`/compound-interest-calculator`, `/savings-goal-calculator`, `/investment-fee-calculator`, `/inflation-calculator`, `/emergency-fund-calculator`, `/dollar-cost-averaging-calculator`, `/msci-world-etf-returns`), avec choix $/€/£ et avertissement selon la devise ; hreflang/canonical dans les deux sens ; `sitemap-en.xml` ; `robots.txt` | ✅ ; adresses françaises inchangées (seules 2 balises hreflang ajoutées dans l'en-tête des pages françaises) |
| 2e session — fenêtres moins fréquentes : offres Premium, compteur IA, bilan patrimonial (questionnaire, résultats, **PDF** traduit au moment de l'écriture), plan du mois, import de relevé, verrouillage (`applock.js`), installation et notifications (`push.js`), dépenses (`depenses.js`), calculateurs (`calc.js`), nouveautés, messages d'erreur des API | ✅ (environ 1 300 textes et 70 formules au total) |
| Notifications push (briefing, alertes de prix, gros mouvements, annonces économiques, notification de test) en anglais pour les comptes anglais | ✅ (`api/push-send.js`, `api/push-subscribe.js`) ; heures indiquées « Paris time » |
| Page FAQ publique anglaise (`/faq` sur kapitaro.com) ; bulle d'aide et bandeau cookies anglais sur toutes les pages anglaises | ✅ |
| Page de désinscription des e-mails en anglais | ✅ (`api/unsubscribe.js`, lien `l=en` dans les e-mails anglais) |
| Consignes IA : produits français (PEA, Livret A, assurance vie, PER, CTO) traités comme comptes génériques et nommés selon la région ; jamais de règle fiscale française ni de conseil fiscal | ✅ (`api/claude.js`) ; champs de patrimoine du bilan renommés selon la région |
| E-mails Supabase (inscription, mot de passe, lien magique, changement d'adresse) | ✅ modèles **bilingues** prêts à coller dans `docs/supabase-email-templates/` (mode d'emploi : `LISEZMOI.md`) — rien n'a été changé dans Supabase |
| Blog | Laissé en français : lien masqué sur la version anglaise ; `kapitaro.com/blog` renvoie vers `kapitaro.fr/blog`. Je n'ai pas traduit automatiquement les articles (exactitude non garantie) |
| Contrôles finaux : syntaxe des 28 fichiers JS modifiés ; page anglaise parcourue onglet par onglet en mode démo (il ne reste que les données d'exemple françaises : libellés bancaires du relevé fictif) ; pages françaises identiques (titre, textes, « 9,99 € », « 1 234,50 », « 47,3 k€ », lexique avec PEA, CGU françaises) ; pages françaises modifiées uniquement par 2 balises hreflang | ✅ |

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

| Champs de patrimoine du bilan (Livret A, PEA, assurance vie, CTO) | inchangés | Savings / IRA-401(k) / annuities / taxable brokerage | savings / tax-advantaged account / pension savings / taxable account | Cash ISA / Stocks & Shares ISA / pension / GIA | génériques |
| Bilan : estimation de retraite | info-retraite.fr | Social Security (ssa.gov) | relevé national de retraite | State Pension (GOV.UK) | relevé national |
| Notifications push et e-mails | français | anglais | anglais | anglais | anglais |

## 7. Ce qui reste (non fait) et textes non traduits

Diagnostic : ajouter `?lang=en&i18n_debug=1` à l'adresse, puis `Object.keys(_kpMissing)` dans la console du navigateur.

- **Données d'exemple du mode démo** : le relevé bancaire fictif (libellés « CARTE … RESTAURANT LE COMPTOIR », « PRLV SEPA … ») et le portefeuille d'exemple (LVMH, Air Liquide) restent français — ce sont des données, pas des textes d'interface. À remplacer par un jeu d'exemple américain/européen si tu veux.
- **Textes affichés rarement que je n'ai pas pu déclencher** (comptes Premium réels, erreurs serveur rares) : ils sont presque tous dans le dictionnaire grâce à l'extraction du code, mais certains fragments construits avec des nombres peuvent rester en français. L'outil de diagnostic les liste.
- **Formats de nombres** : `fmt`, `fmtI`, `fmtK` suivent l'anglais ; les autres `toLocaleString('fr-FR')` d'`app.js` (environ 80, souvent dans des textes destinés à l'IA ou des petits libellés) restent au format français. Les montants restent en euros (devise de référence de l'app) ; pas de conversion du portefeuille en dollars.
- **Fonctions propres à la France** encore visibles : listes de plateformes (Boursorama, Fortuneo…), aide à l'import pour Trade Republic et XTB, détection des libellés bancaires français dans « Mes dépenses », capacité d'emprunt « règles habituelles des banques » (raisonnement français : 35 %, frais de notaire → traduits « closing costs »).
- **Blog et lettre du dimanche** : français uniquement (voir plus haut).
- **Vidéos du tutoriel** (`tuto/`, `video/`) et images avec du texte : françaises.
- **Page 404** : Vercel affiche sa page par défaut (en anglais) sur les deux domaines ; je n'ai pas ajouté de page 404 pour ne rien changer côté français.
- **Données structurées FAQ** de l'accueil anglais : retirées en anglais ; la page `/faq` anglaise a ses propres données structurées.
- Exclus volontairement : Studio et tableau de bord admin (usage interne).

## 8. Décisions qui restent à prendre

1. **Pays de lancement** : US, UE, Royaume-Uni, tous à la fois ? (le Royaume-Uni et les US demandent le plus de travail juridique).
2. **Prix** : en dollars et en livres ? Montants ? Taxe de vente US et TVA à gérer via Stripe Tax ?
3. **US** : faire valider par un avocat que les fonctions personnalisées restent dans l'exclusion « éditeur », ou les limiter pour les utilisateurs américains ; loi applicable / arbitrage.
4. **Représentants** : représentant UE non nécessaire (éditeur établi en France) ; représentant UK probablement nécessaire si tu vises le Royaume-Uni ; agent DMCA aux US.
5. **Rétractation UE** : paiement au prorata (rédigé) ou case de renonciation expresse au moment du paiement ?
6. **E-mails Supabase** : coller les modèles bilingues de `docs/supabase-email-templates/` (ou garder le français pour tous).
8. **Démo en anglais** : faut-il un portefeuille et un relevé d’exemple anglais/américain ?
9. **Blog anglais** : en créer un (articles écrits en anglais) ou rester sans blog sur kapitaro.com ?
7. **Détection automatique** sur les hôtes de test : un navigateur non francophone voit l'anglais par défaut ; sur kapitaro.fr c'est toujours le français.
