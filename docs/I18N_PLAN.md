# Version anglaise de Kapitaro (US / UE / Royaume-Uni) — plan et état d'avancement

> Document destiné au propriétaire (Maxence). Branche de travail : `i18n-en` (créée depuis `dev`).
> Rien n'est en production : `main` et `dev` ne sont pas modifiées, aucun réglage Vercel / Supabase / Stripe n'a été touché.

## 1. Décisions déjà prises

| Sujet | Décision |
|---|---|
| Domaine | **kapitaro.com = anglais**, **kapitaro.fr = français** (inchangé). Même projet Vercel, routage selon le domaine (`vercel.json`, règles `has: host`). |
| Langue par défaut | Fixée par le domaine. Sur les hôtes de test (localhost, aperçus Vercel) : `?lang=en`, puis le choix mémorisé, puis la langue du navigateur. |
| Site français | Aucun changement visible pour les utilisateurs de kapitaro.fr : en français, aucun dictionnaire n'est chargé, aucune traduction n'est appliquée. Le sélecteur de langue reste **masqué sur kapitaro.fr** tant que `enDomainLive` vaut `false` dans `i18n.js`. |
| Régions | FR (France), EU (UE/EEE hors France), UK, US, OTHER. Choix explicite à l'inscription et dans Paramètres (enregistré dans le profil, `user_metadata.region`) ; sinon déduit de la langue, du fuseau horaire et de la langue du navigateur. |
| Prix | Affichés en euros tant que les prix en dollars n'existent pas dans Stripe (`usdReady: false` dans `i18n.js`). Afficher « $ » en facturant en « € » serait trompeur (règles FTC / protection du consommateur). |

## 2. Comment ça marche (technique, en bref)

- `i18n.js` (petit, chargé en premier sur chaque page) : détecte la langue et la région, expose `kpI18n` (`t()`, formats de nombres/dates/monnaie via `Intl`, prix affichés, liens légaux, avertissements par région).
- `i18n-en.js` (chargé **uniquement en anglais**) : dictionnaire français → anglais, avec variantes par région (US / EU / UK), appliqué automatiquement à tous les textes de la page, y compris ceux créés par `app.js` (notifications, fenêtres, alertes). Avantage : on n'a pas eu à réécrire les 15 000 lignes d'`app.js`, donc aucun risque pour la version française.
- Les textes juridiques anglais sont dans `legal-docs.js` (clé `LEGAL_DOCS_EN`) et dans des pages publiques servies à la racine de kapitaro.com (`/terms`, `/privacy`, `/cookies`, `/risks`, `/legal`), stockées dans le dossier `en/` du dépôt.
- L'assistant IA reçoit la langue et la région : il répond en anglais avec les avertissements adaptés (US : « not investment, tax or legal advice » ; UE/UK : « past performance is not a reliable indicator of future results »).

## 3. Ce que tu devras faire toi-même (aucune de ces actions n'a été faite)

1. **Acheter kapitaro.com** (et `www.kapitaro.com` → redirection vers `kapitaro.com`), puis l'ajouter au projet Vercel.
2. **Supabase → Authentication → URL Configuration** : ajouter `https://kapitaro.com` et `https://kapitaro.com/**` aux Redirect URLs.
3. **Google Cloud (connexion Google)** : ajouter `https://kapitaro.com` aux « Authorized JavaScript origins » et l'URL de retour Supabase si besoin.
4. **Stripe** : créer des prix en USD (ex. 9,99 $/mois et 79,99 $/an — [À CONFIRMER]) ; ajouter les URL de succès/annulation sur kapitaro.com ; vérifier la fiscalité (taxe de vente US, TVA UE OSS). Puis passer `usdReady: true` dans `i18n.js`.
5. **Cookies / publicité** : déclarer kapitaro.com dans Meta et Google Ads si tu fais de la pub en anglais.
6. Passer `enDomainLive: true` dans `i18n.js` quand kapitaro.com est en ligne (le sélecteur de langue apparaîtra alors sur kapitaro.fr).
7. **Faire relire tous les textes juridiques anglais par un avocat** (voir section 5).

## 4. État d'avancement

_Mis à jour à chaque étape — voir la fin du document._

## 5. Textes juridiques à faire relire (brouillons)

_À compléter._

## 6. Décisions qui restent à prendre

- Pays de lancement : US, UE, Royaume-Uni, tous à la fois ?
- Représentant UE (art. 27 RGPD) : pas nécessaire tant que l'éditeur est établi en France ; représentant au Royaume-Uni (UK GDPR art. 27) si tu vises le Royaume-Uni — [À CONFIRMER].
- Loi applicable et tribunaux pour les utilisateurs américains, clause d'arbitrage ou non — [À CONFIRMER par un avocat US].
- Prix en dollars et en livres.
