# Version anglaise de Kapitaro (US / UE / Royaume-Uni) — plan et état d'avancement

> Document destiné au propriétaire (Maxence). Branche de travail : `i18n-en` (créée depuis `dev`), pull request en brouillon vers `dev`.
> **Rien n'est en production** : `main` et `dev` ne sont pas modifiées, aucun réglage Vercel / Supabase / Stripe / Google n'a été touché, aucun SQL n'a été lancé.
> **Mise à jour du 04/11/2026** : la branche a reçu toutes les nouveautés de `dev` (essai de l'objectif, quotas IA, calculateurs, Reels Duo…) et elles sont traduites — voir la section 0 juste en dessous.

---

## 0. Mise à jour du 04/11/2026 : fusion de `dev` et traduction des nouveautés

**Fusion** : `dev` (≈ 30 changements depuis le 31/10) fusionnée dans `i18n-en`. 9 conflits résolus en gardant tout ce qui vient de `dev` **et** la mécanique de traduction. La version française a été comparée à `dev` dans un navigateur headless (accueil, 12 onglets en mode démo, page Calculateurs et ses cadres, 5 nouveaux calculateurs, /outils, intérêts composés, épargne de précaution, CGU, confidentialité, mentions légales, FAQ) : **texte visible identique**. Les 3 seules différences existaient déjà avant (travail du 31/10) : réglage « Devise d'affichage » dans Paramètres, option « CHF » des simulateurs français déjà existants, et sélecteur de langue visible **uniquement sur les hôtes de test** (sur kapitaro.fr il reste masqué, vérifié en simulant le domaine). Prix « 9,99 € », formats « 1 234,50 », PEA… inchangés.

| Nouveauté de `dev` | Version anglaise |
|---|---|
| Essai gratuit de l'objectif (30 jours) : bandeau « jours restants », page Objectif en lecture seule après l'essai, `objectifGate`, ligne de Paramètres, offres | ✅ traduit (dictionnaire + formules avec nombres : « 🎁 Free trial: 5 days left », « Free plan · 🎁 goal trial: 12 days left ») |
| Quotas IA séparés, message de l'agent quand les 3 questions du jour sont utilisées, « Encore 2 questions gratuites aujourd'hui » | ✅ traduit, y compris les nouveaux messages du serveur (`api/claude.js` : essai terminé, questions du jour, trop de plans générés) |
| E-mails `trial_j7`, `trial_j1`, `trial_end` (`api/_email.js`) | ✅ version anglaise dans `EMAILS_EN`, choisie automatiquement pour les comptes anglais (`user_metadata.lang = 'en'`, mécanisme déjà en place) ; bouton vers `kapitaro.com/?plans=1` |
| Page Calculateurs de l'app (`calc.js`) : menu classé, cadre intégré, encart « Mes dépenses » | ✅ traduite ; en anglais le cadre charge la page anglaise (`KP_EN.enPath`, ex. `/en/50-30-20-budget-calculator` sur les hôtes de test, `/50-30-20-budget-calculator` sur kapitaro.com). En français, `calc.js` fait exactement la même chose qu'avant |
| 5 nouveaux calculateurs publics + page /outils | ✅ versions anglaises **adaptées** (pas traduites mot à mot) : `en/50-30-20-budget-calculator.html`, `en/small-expenses-calculator.html`, `en/subscription-cost-calculator.html`, `en/personal-loan-calculator.html`, `en/debt-payoff-calculator.html`, `en/tools.html`. $/€/£/CHF, hreflang croisés (2 balises ajoutées dans l'en-tête des 6 pages françaises), `sitemap-en.xml`, routage kapitaro.com (`vercel.json`, règles limitées à l'hôte kapitaro.com). Retirés : plafond français de la commission d'intervention (→ « overdraft fees vary by bank and country »), loi de juin 2023 sur la résiliation, Banque de France / Points conseil budget (→ aide gratuite au surendettement en général), TAEG (→ APR, avec la différence US / UE-UK expliquée). **Calculs vérifiés** : mêmes résultats que les pages françaises avec les mêmes valeurs (5 calculateurs) |
| Mode « embed » de `simcta.js` | ✅ actif aussi sur les 12 pages anglaises (sans en-tête, bas de page ni appel à l'inscription dans le cadre de l'app). Les pages anglaises gardent leur propre appel à l'inscription hors de l'app ; les pages françaises ne changent pas |
| Accueil : lien « Calculateurs gratuits », message sous l'inscription, tableau des offres, liens du pied de page | ✅ traduits ; liens vers les pages anglaises. Corrigé au passage (oubli du 31/10) : prix du tableau des offres affichés « 9.99 € » au lieu de « €9.99 » |
| FAQ (30 jours offerts, 3 questions par jour, Premium) | ✅ `faq-data-en.js` (bulle d'aide et page `/faq` anglaise) |
| Tutoriels (TUTOS_EN) : menu Calculateurs, 30 jours offerts, 3 questions par jour | ✅ textes anglais mis à jour ; la vidéo de présentation avait une phrase de moins que la française (elle aurait été refusée) : réalignée. **Aucune voix générée** |
| Studio, Reels Duo, `api/social.js` | Usage interne : non traduits (comme avant) |

**Textes juridiques anglais** : finalisés au plus prudent selon ta décision (pas d'avocat pour le moment) — voir section 5 et « Risques juridiques restants (sans avocat) ».

**Contrôles** : `node --check` sur tous les JS modifiés ; app anglaise parcourue onglet par onglet avec `?lang=en&i18n_debug=1` : 0 texte français relevé (hors nom « LVMH Moët Hennessy Louis Vuitton » de l'exemple de l'accueil, remplacé une fois la région connue) ; pages juridiques anglaises affichées sans erreur.

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

1. **Acheter kapitaro.com** et l'ajouter au projet Vercel (avec `www.kapitaro.com`, déjà redirigé vers `kapitaro.com` par `vercel.json`). Les nouvelles adresses anglaises (`/tools`, `/50-30-20-budget-calculator`, `/small-expenses-calculator`, `/subscription-cost-calculator`, `/personal-loan-calculator`, `/debt-payoff-calculator`) sont déjà routées.
2. **Supabase → Authentication → URL Configuration** : ajouter `https://kapitaro.com` et `https://kapitaro.com/**` aux « Redirect URLs ». Les e-mails Supabase (confirmation d'inscription, mot de passe oublié) n'existent qu'en français : prévoir un modèle bilingue ou un envoi via Resend selon `user_metadata.lang` (décision ci-dessous).
3. **Google Cloud (connexion Google)** : ajouter `https://kapitaro.com` aux « Authorized JavaScript origins » ; l'écran de consentement Google affiche le nom de l'app, à vérifier.
4. **Stripe** : créer les prix en USD (et éventuellement GBP) — proposition **9,99 $/mois et 79,99 $/an [À CONFIRMER]** — puis donner les identifiants de prix (`price_…`) pour les brancher dans `api/create-checkout.js` selon la devise ; activer la langue anglaise des reçus Stripe ; vérifier la fiscalité : **taxe de vente US** (Stripe Tax, seuils par État), **TVA UE** (guichet unique OSS), **TVA UK**. Les URL de retour après paiement sont déjà prévues pour kapitaro.com. Ensuite seulement : passer `usdReady: true` dans `i18n.js`.
5. **Variables Vercel** : rien d'obligatoire. `APP_URL` reste `https://kapitaro.fr` ; le retour sur kapitaro.com est déduit automatiquement de l'origine de la demande.
6. **Publicité** : si tu fais de la pub en anglais, déclarer kapitaro.com dans Google Ads / Meta (le bandeau cookies anglais respecte déjà le signal GPC et a le lien « Do Not Sell or Share »).
7. Passer `enDomainLive: true` dans `i18n.js` quand kapitaro.com est en ligne (le sélecteur de langue apparaîtra alors sur kapitaro.fr et renverra vers kapitaro.com).
8. Quand les marques restantes des textes juridiques sont traitées (section « Risques juridiques restants ») : retirer le bandeau « Draft » (`LEGAL_DRAFT_NOTE_EN` dans `legal-docs.js`), retirer `noindex` des pages `en/terms|privacy|cookies|risks|legal.html` et les ajouter à `sitemap-en.xml`.
9. Relecture par un avocat : **pas pour le moment** (ta décision du 04/11). Les textes ont été finalisés au plus prudent ; ce qui reste est listé plus bas.
10. **Voix anglaises des tutoriels** : à fabriquer depuis le Studio (mode d'emploi plus bas) ; coût ElevenLabs mis à jour ≈ 4 850 caractères.
11. **Avant un lancement aux US** : mettre en place l'e-mail de confirmation d'abonnement (conditions de renouvellement + comment résilier) et le rappel avant renouvellement annuel ; **avant un lancement au Royaume-Uni** : vérifier les règles d'abonnement du DMCC Act 2024.

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

## 5. Textes juridiques anglais

**04/11/2026 — finalisés au plus prudent, sans avocat (ta décision)** :
- Éditeur établi en France (faits repris exactement des textes français : Maxence De Macedo, entrepreneur individuel, nom commercial Quorvia, SIREN 902 642 016, 21 Le Routoir, 38240 Meylan, contact@kapitaro.fr).
- **Droit français** pour toutes les régions, sans priver l'utilisateur des protections impératives de son pays / État ; **pas d'arbitrage, pas de renonciation aux actions collectives** ; tentative amiable d'abord ; tribunaux français ou ceux du domicile quand la loi le permet.
- Outil pédagogique, pas de conseil : US « **not a registered investment adviser or broker-dealer** » (mentions légales, conditions, risques) ; UE/UK « **not investment advice, capital at risk, past performance is not a reliable indicator of future results** ».
- Rétractation UE **au prorata** (et remboursement total si l'utilisateur n'a pas demandé expressément le démarrage immédiat) ; même logique pour l'annulation UK.
- Données : **RGPD pour tous** les utilisateurs (éditeur en France) + droits **CCPA/CPRA** pour les Californiens (et autres États), UK GDPR pour le Royaume-Uni.
- Essai gratuit de 30 jours décrit dans les conditions (pas de carte, pas de passage automatique au payant).
- Le bandeau « Draft » et le `noindex` restent tant que les marques ci-dessous existent.

Tableau d'origine (brouillons du 29/10), pour mémoire :

| Document | Fichier | Points à faire valider ([TO CONFIRM] dans le texte) |
|---|---|---|
| Terms of Service | `legal-docs.js` → `LEGAL_DOCS_EN.cgu`, page `/terms` | **US** : exclusion « éditeur » de l'Investment Advisers Act (arrêt *Lowe v. SEC*) — les fonctions personnalisées (score, IA sur le portefeuille, aide à la décision) peuvent poser problème ; loi applicable, arbitrage ou non, plafond de responsabilité ; règles de renouvellement automatique (Californie, « click-to-cancel ») : e-mail récapitulatif et rappel avant renouvellement annuel à mettre en place. **UE** : droit de rétractation 14 jours — l'app n'enregistre pas aujourd'hui la renonciation expresse (art. 16 m) : choisir entre paiement au prorata (rédigé ainsi) ou ajouter une case au paiement ; médiateur de la consommation à nommer ; plateforme ODR supprimée en 2025 à vérifier. **UK** : nouvelles règles d'abonnement (DMCC Act 2024). |
| Privacy Policy | `LEGAL_DOCS_EN.privacy`, `/privacy` | Mécanisme de transfert par prestataire (DPF ou clauses types) ; seuils CCPA ; liste des États US ; représentant UK (art. 27 UK GDPR) ; besoin d'un DPO. |
| Cookie notice | `LEGAL_DOCS_EN.cookies`, `/cookies` | Durées et liste exacte des cookies Meta/Google. |
| Risk disclosure | `LEGAL_DOCS_EN.risk`, `/risks` | Formulations réglementaires UE/UK (« past performance… », « capital at risk »). |
| Legal notice | `LEGAL_DOCS_EN.mentions`, `/legal` | Agent DMCA (US) ; « financial promotions » UK (FCA, section 21 FSMA). |

## Risques juridiques restants (sans avocat)

Marques encore présentes dans `legal-docs.js` (visibles sur les pages anglaises, qui ne sont pas en ligne) — elles demandent une décision de ta part ou un professionnel :

| Marque | Région | Ce qu'il faut | Risque si on lance sans |
|---|---|---|---|
| `[TO CONFIRM by US counsel: …investment-adviser registration]` | US | Avis d'un avocat US : le score de santé, les réponses de l'IA sur le portefeuille et le plan du mois peuvent être vus comme du conseil personnalisé (exclusion « éditeur », arrêt *Lowe v. SEC*). | Enregistrement comme conseiller exigé par la SEC ou un État. Option prudente sans avocat : ne pas lancer aux US, ou y désactiver les fonctions personnalisées. |
| `[TO CONFIRM — registration with the U.S. Copyright Office…]` | US | Désigner un agent DMCA et l'enregistrer (formulaire en ligne, payant). | Pas de protection « safe harbor » si un utilisateur publie un contenu protégé (risque faible : peu de contenu publié par les utilisateurs). |
| `[TO IMPLEMENT before any US launch: …]` | US | Coder l'e-mail de confirmation d'abonnement (renouvellement automatique + résiliation) et le rappel avant renouvellement annuel. | Lois d'État sur le renouvellement automatique (Californie…). |
| `[TO CONFIRM: CCPA thresholds…]` et `[TO CONFIRM list and thresholds by US counsel.]` | US | Vérifier si les seuils (chiffre d'affaires, nombre de résidents) s'appliquent ; on applique déjà les droits par prudence. | Faible : les droits sont déjà offerts. |
| `[TO CONFIRM by UK counsel: … "financial promotion" … section 21 FSMA]` | UK | Avis d'un avocat UK : certains textes (accueil, pubs, simulateurs) pourraient être des « financial promotions » à faire approuver par une entreprise agréée FCA. | Infraction pénale au Royaume-Uni. Option prudente : pas de publicité ciblant le Royaume-Uni avant avis. |
| `[TO CONFIRM — likely required if we target UK users]` | UK | Nommer un représentant UK (art. 27 UK GDPR), prestataire payant. | Sanction ICO si on cible le Royaume-Uni sans représentant. |
| `[TO CHECK before any UK launch: … DMCC Act 2024 …]` | UK | Vérifier la date d'entrée en vigueur et les obligations (rappels, délai de réflexion au renouvellement). | Non-conformité des abonnements UK. |
| `[TO CONFIRM — name and website of the consumer mediator…]` | UE | Adhérer à un médiateur de la consommation (obligation française, déjà valable pour kapitaro.fr) et donner son nom. | Amende administrative (DGCCRF) ; concerne aussi la version française. |

Autres points sans marque, à garder en tête : la version française des CGU ne mentionne pas encore l'essai de 30 jours (je n'y ai pas touché : la version française doit rester identique à `dev`) ; le démarrage immédiat de Premium n'est pas demandé expressément au paiement, donc en cas de rétractation UE le remboursement doit être **total** (c'est ce que dit le texte) ; vérifier que chaque prestataire (Vercel, Anthropic, Stripe, Resend) a bien des clauses types ou la certification DPF dans ses conditions.

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

## Devise d'affichage

Ajouté le 31/10/2026 (fichier `currency.js`, chargé juste après `i18n.js`). Fonctionne en français comme en anglais.

**Pour l'utilisateur** : Paramètres → Apparence → « Devise d'affichage » (EUR €, CHF, GBP £, USD $, CAD, AUD, JPY). Tous les montants de l'app sont convertis au cours du jour ; la ligne indique le cours utilisé (« 1 € = 0,9300 CHF · cours du … »). Le choix est mémorisé sur l'appareil (`kp_currency`) et dans le profil (`user_metadata.currency`, retrouvé à la connexion sur un autre appareil).

**Par défaut** : euro sur kapitaro.fr (rien ne change pour les utilisateurs actuels, même en Suisse romande : ils choisissent CHF eux-mêmes). En anglais : USD (région US), GBP (UK), CHF (fuseau Europe/Zurich ou navigateur -CH), CAD / AUD / JPY selon le fuseau, sinon EUR. Pas de nouvelle « région » Suisse : la région (textes juridiques, vocabulaire) et la devise sont deux réglages séparés.

**Principe** : toutes les données restent en euros (calculs, base Supabase, IA, API, cours des actifs déjà convertis en euros par `/api/prices`). On convertit seulement à l'affichage :
- **Textes** : un observateur convertit chaque montant écrit par l'app (« 1 234,50 € », « 4,6 k€ », « €1,234.50 », « 100k€ ») et remplace le « € » seul des libellés (« Capital (€) » → « Capital (CHF) »). En anglais, il passe après la traduction. Format selon la langue : « 1 234,50 CHF », « 4,3 k CHF » en français ; « CHF 1,234.50 », « $4.3k », « £4.3k » en anglais.
- **Champs de saisie de montants** (PRU, prix, alerte, capital / versement / cible de l'objectif, bilan, calculateurs, capital disponible…) : l'utilisateur voit et tape dans sa devise, l'app enregistre des euros (100 CHF tapés → 107,53 € enregistrés → réaffichés 100 CHF).
- **Graphiques** (Chart.js), **PDF** du bilan, **notifications locales** : convertis aussi. **IA** : on lui indique la devise et le cours ; elle répond en euros et l'app convertit sa réponse à l'affichage.
- **Cours** : `/api/prices?symbols=CUR-CHF,CUR-GBP,…` (aucune nouvelle fonction Vercel), gardés en cache 6 h (`kp_fx`), réutilisables jusqu'à 10 jours si l'API ne répond pas. Sans cours disponible : montants laissés en euros + message « Taux de change indisponible ».

**Jamais convertis (volontairement)** : prix de l'abonnement Premium (payé en euros : 9,99 € reste 9,99 €), écran d'accueil / inscription, graphique détaillé d'un actif (affiché dans sa devise de cotation), exemples chiffrés du lexique.

**Reste en euros** : e-mails automatiques et notifications push envoyées par le serveur (alertes de prix, relances : textes construits côté serveur, ils ne connaissent pas encore la devise choisie — à faire si besoin en lisant `user_metadata.currency` dans `api/_push.js` / `api/_email.js`), données des pages publiques (FAQ, articles). Les montants ronds en euros des exemples (préréglages « 200 €/mois ») deviennent des montants convertis non ronds (« 186 CHF/mois ») : c'est voulu, ils restent exacts.

**Simulateurs publics** : pages françaises → petit sélecteur « € / CHF » (euro par défaut, simple changement de symbole, mémorisé dans `kp_sim_cur_fr`, fichier `sim-cur.js`) ; pages anglaises → CHF ajouté à $ / € / £.

**Tester** (aperçu de la branche ou local) : ajouter `?cur=CHF` (ou USD, GBP…) à l'adresse sur un hôte de test, ou choisir dans Paramètres. En local, `/api/prices` n'existe pas : simuler un cours dans la console avec `localStorage.setItem('kp_fx', JSON.stringify({t: Date.now(), r: {CHF: 0.93, GBP: 0.86, USD: 1.08, CAD: 1.5, AUD: 1.65, JPY: 165}}))`, puis recharger.

Corrigé au passage : en anglais, « 1,234.50 € » s'affichait « 1.234.50 € » (la virgule des milliers était prise pour une virgule décimale).

## Mode démo et vidéos tutoriels en anglais

Ajouté le 31/10/2026.

### Mode démo anglais (selon la région)
Données **fictives** dans `i18n-en.js` (`KP_EN.demo()`), lues par `app.js` (démo, « Charger un exemple », transactions, aperçu Premium de l'Agent), `depenses.js` (relevé d'exemple) et `tuto/record.mjs`. En français, `KP_EN` n'existe pas : la démo française reste identique (vérifié).

| Région | Portefeuille d'exemple | Comptes | Relevé bancaire fictif |
|---|---|---|---|
| US | VOO, VTI, Apple (AAPL), Microsoft (MSFT), BND (obligations) | Brokerage account, Roth IRA | loyer, Netflix, Disney+, Planet Fitness, Spotify, Verizon, Con Edison, GEICO, Whole Foods, Trader Joe's, DraftKings, DoorDash, Starbucks, prêt étudiant, Shell… |
| UK | VWRA.L (Vanguard FTSE All-World), AstraZeneca, Shell, HSBC | Stocks & Shares ISA, General investment account | loyer, Netflix, PureGym, Vodafone, Octopus Energy, council tax, Tesco, Sainsbury's, Bet365, Deliveroo, Costa, pub, TfL… |
| EU / autre | VWCE.DE, IWDA.L, ASML, SAP, Microsoft | Investment account | loyer, Netflix, Basic-Fit, Vodafone, E.ON, Allianz, Lidl, Aldi, Bet365, Uber Eats, trattoria, Shell… |

- Cours : comme la démo française, des valeurs de départ plausibles puis les cours du jour au chargement (`/api/prices`). ⚠️ Limite déjà présente dans l'app (pas créée ici) : `/api/prices` renvoie les actions et ETF **dans leur devise de cotation** (dollars pour AAPL, VOO, IWDA.L…) et l'app les traite comme des euros. J'ai évité les titres cotés en pence (ex. AZN.L, ULVR.L) qui seraient affichés 100 fois trop chers ; au Royaume-Uni, AstraZeneca/Shell/HSBC sont les cotations américaines (AZN, SHEL, HSBC).
- Montants du relevé enregistrés en euros, convertis à l'affichage (`currency.js`).
- Mes dépenses : nouvelles règles de reconnaissance des libellés anglais (RENT, GROCERY, DOORDASH, DRAFTKINGS, VERIZON, COUNCIL TAX…) et nettoyage de CARD / ACH / DEBIT / PURCHASE / DD, **uniquement en anglais** (en français, les règles et le nettoyage sont inchangés).
- Accueil : la 2e ligne du « portefeuille exemple » (LVMH en français) devient Apple (US), AstraZeneca (UK) ou ASML (UE/autre).
- Aucune crypto dans les données d'exemple (les vidéos ajoutent une ligne bitcoin, cours seulement, comme en français).
- Traductions ajoutées au passage : tableau de bord de l'Agent (aperçu Premium) et Mes dépenses (catégories, « Keep / Cut it »…), lignes « Stock · 10 shares » et « +0.00 % today » du portefeuille.

### Vidéos tutoriels anglaises (préparées, pas fabriquées)
- **Textes** : `api/_tuto.js` → `TUTOS_EN` (9 vidéos de l'appli : presentation, accueil, portefeuille, objectif, assistant, bilan, sante, depenses, actualites ; pas les pubs). Mêmes gestes que les vidéos françaises ; seule la présentation (bouton « Skip ») et Mes dépenses (relevé `tuto/assets/sample-statement-en.csv`) ont des gestes adaptés.
- **Fichiers** dans le stockage `social` : voix `tuto/<id>__en/timing.json`, vidéos `tuto/<id>__en.mp4` et `tuto/<id>__en__desktop.mp4`, entrées du manifest `<id>__en` et `<id>__en__desktop`. Les vidéos françaises ne sont pas touchées.
- **Enregistreur** `tuto/record.mjs` : variable `TUTO_LANG=en` → appli ouverte avec `?lang=en`, démo anglaise **région US, montants en dollars** (modifiable avec `TUTO_REGION` = US/UK/EU/OTHER et `TUTO_CURRENCY`), textes d'exemple anglais (plan du mois, réponse de l'assistant, carte de fin « kapitaro.com »).
- **Workflow** `.github/workflows/tuto.yml` : entrée facultative `lang` (fr par défaut) ; sans elle, rien ne change. Le Studio n'envoie `lang` qu'en anglais.
- **API** `api/social.js` (`tuto-create`, `tuto-render`, `tuto-list`, écoute d'essai, arrêt, archives) : paramètre `lang` ('fr' par défaut).
- **Appli** : en anglais, le lecteur n'utilise que les vidéos `__en` ; tant qu'une vidéo anglaise n'existe pas, son bouton (« ▶ What is it? », vidéo de présentation de l'accueil et des Paramètres, vidéo de la fenêtre Premium, proposition dans l'aide d'onglet) est masqué. Jamais de vidéo française en anglais.

### Ce que tu dois faire pour fabriquer les vidéos anglaises (après fusion et mise en ligne)
1. Fusionner la branche puis attendre le déploiement Vercel (le Studio lance le workflow sur la branche déployée : il faut que `tuto.yml` avec l'entrée `lang` y soit).
2. **Studio → Tutoriels de l'app → 🇬🇧 English.**
3. Dans « Voix », choisir une **voix ElevenLabs anglophone** (accent américain conseillé, puisque la démo filmée est américaine) et cliquer **▶ Écouter** (phrase d'essai en anglais, ≈ 100 caractères). Si aucune voix anglaise n'est dans la liste, en ajouter une à « Mes voix » sur ElevenLabs (ou son identifiant dans `TUTO_EXTRA_VOICES` en haut de `api/social.js`).
4. « Version à fabriquer » : **📱 + 🖥 Les deux**.
5. Pour chaque vidéo : **🎬 Fabriquer la vidéo** (≈ 30 s de voix, puis ≈ 4 min de tournage sur GitHub par version). Fabriquer une vidéo à la fois est plus sûr.
6. Regarder le résultat dans le Studio ; si un geste rate, « ▶ Relancer le tournage (même voix) » ne coûte aucun caractère.
7. Les vidéos apparaissent ensuite automatiquement dans la version anglaise de l'appli (manifest mis à jour, ≈ 1 min).

**Coût ElevenLabs estimé** (mis à jour le 04/11 avec les nouvelles phrases) : **≈ 4 850 caractères** pour les 9 vidéos (somme des textes anglais : 4 824), la voix étant fabriquée une seule fois par vidéo puis réutilisée pour les versions téléphone et ordinateur ; + ≈ 100 caractères par écoute d'essai. Détail : présentation 1 107, accueil 454, portefeuille 535, objectif 1 250, assistant 390, bilan 299, santé 221, dépenses 357, actualités 211. Les vidéos françaises de présentation, objectif et assistant ont aussi changé de texte sur `dev` : à refaire en français si ce n'est pas déjà fait. Le Studio affiche ce total en mode English. Refaire une vidéo (« ↻ Refaire la vidéo ») recompte ses caractères ; « Relancer le tournage » non.

## 7. Ce qui reste (non fait) et textes non traduits

Diagnostic : ajouter `?lang=en&i18n_debug=1` à l'adresse, puis `Object.keys(_kpMissing)` dans la console du navigateur.

- **Textes affichés rarement que je n'ai pas pu déclencher** (comptes Premium réels, erreurs serveur rares) : ils sont presque tous dans le dictionnaire grâce à l'extraction du code, mais certains fragments construits avec des nombres peuvent rester en français. L'outil de diagnostic les liste.
- **Formats de nombres** : `fmt`, `fmtI`, `fmtK` suivent l'anglais ; les autres `toLocaleString('fr-FR')` d'`app.js` (environ 80, souvent dans des textes destinés à l'IA ou des petits libellés) restent au format français. Les montants sont enregistrés en euros et convertis à l'affichage dans la devise choisie (voir « Devise d'affichage » ci-dessous).
- **Fonctions propres à la France** encore visibles : listes de plateformes (Boursorama, Fortuneo…), aide à l'import pour Trade Republic et XTB, détection des libellés bancaires français dans « Mes dépenses », capacité d'emprunt « règles habituelles des banques » (raisonnement français : 35 %, frais de notaire → traduits « closing costs »).
- **Blog et lettre du dimanche** : français uniquement (voir plus haut).
- **Vidéos du tutoriel** : tout est prêt pour la version anglaise (voir « Mode démo et vidéos tutoriels en anglais ») mais **aucune voix ni vidéo anglaise n'a été fabriquée** ; tant qu'elles n'existent pas, les boutons vidéo sont masqués en anglais. Vidéos animées (`video/`), pubs et images avec du texte : françaises.
- **Page 404** : Vercel affiche sa page par défaut (en anglais) sur les deux domaines ; je n'ai pas ajouté de page 404 pour ne rien changer côté français.
- **Données structurées FAQ** de l'accueil anglais : retirées en anglais ; la page `/faq` anglaise a ses propres données structurées.
- Exclus volontairement : Studio, Reels Duo et tableau de bord admin (usage interne).
- **Simulateurs français ajoutés sur `dev`** (5 nouveaux et /outils) : pas de sélecteur « € / CHF » (`sim-cur.js`), pour ne rien changer à la version française de `dev` ; à ajouter si tu veux le même comportement que les 7 autres.
- **E-mails de fin d'essai** : montants et liens corrects, mais la devise d'affichage choisie n'est pas utilisée (les e-mails ne citent pas de prix).

## 8. Décisions qui restent à prendre

1. **Pays de lancement** : US, UE, Royaume-Uni, tous à la fois ? (le Royaume-Uni et les US demandent le plus de travail juridique).
2. **Prix** : en dollars et en livres ? Montants ? Taxe de vente US et TVA à gérer via Stripe Tax ?
3. **US** : faire valider par un avocat que les fonctions personnalisées restent dans l'exclusion « éditeur », ou les limiter pour les utilisateurs américains ; loi applicable / arbitrage.
4. **Représentants** : représentant UE non nécessaire (éditeur établi en France) ; représentant UK probablement nécessaire si tu vises le Royaume-Uni ; agent DMCA aux US.
5. **Rétractation UE** : paiement au prorata (rédigé) ou case de renonciation expresse au moment du paiement ?
6. **E-mails Supabase** : coller les modèles bilingues de `docs/supabase-email-templates/` (ou garder le français pour tous).
7. ~~Démo en anglais~~ : fait (portefeuille et relevé d'exemple selon la région, voir plus haut).
8. **Blog anglais** : en créer un (articles écrits en anglais) ou rester sans blog sur kapitaro.com ?
9. **Détection automatique** sur les hôtes de test : un navigateur non francophone voit l'anglais par défaut ; sur kapitaro.fr c'est toujours le français.
