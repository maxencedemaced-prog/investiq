# E-mails Supabase (inscription, mot de passe…) en anglais — à faire toi-même

Je n'ai rien modifié dans Supabase. Ces fichiers sont des modèles **bilingues** : Supabase choisit automatiquement
l'anglais pour les comptes créés sur kapitaro.com (l'app enregistre `lang: "en"` dans le profil à l'inscription),
et le français pour tous les autres comptes.

## Comment les installer (5 minutes)

1. Supabase → projet **soyyznyceqzimhoaffaw** → **Authentication** → **Emails** (ou « Email Templates »).
2. Pour chaque modèle, copie ton **modèle français actuel** quelque part (sauvegarde).
3. Ouvre le fichier correspondant ici et :
   - colle le **sujet** indiqué en haut du fichier (ligne « Sujet à coller dans Supabase ») ;
   - colle le **contenu** du fichier.
   - Pour que le français reste **exactement** comme aujourd'hui, remplace le bloc entre `{{ else }}` et `{{ end }}` par ton modèle français actuel.

| Modèle Supabase | Fichier |
|---|---|
| Confirm signup | `confirm-signup.html` |
| Reset password | `reset-password.html` |
| Magic Link | `magic-link.html` |
| Change Email Address | `change-email.html` |

4. Envoie-toi un test : crée un compte de test sur l'aperçu avec `?lang=en` (e-mail en anglais), puis un autre en français.

## À savoir
- `{{ .Data.lang }}` lit les métadonnées du compte (`user_metadata`). Un compte sans `lang` reçoit le français.
- Les comptes créés avec Google n'ont la langue enregistrée qu'à leur première ouverture de l'app (pas d'e-mail de confirmation dans ce cas).
- Quand kapitaro.com sera en ligne : ajoute `https://kapitaro.com/**` dans Authentication → URL Configuration → Redirect URLs, puis passe `enDomainLive: true` dans `i18n.js` (le lien « mot de passe oublié » renverra alors sur kapitaro.com pour les comptes anglais).
- L'expéditeur reste celui configuré dans Supabase (SMTP via Resend).
