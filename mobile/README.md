# Docalio mobile (Android et iOS)

Application native du drive Docalio, construite avec Expo (React Native, SDK 57).
Elle se connecte au **même projet Supabase** que le site : mêmes comptes, mêmes
espaces, mêmes fichiers, et surtout **les mêmes règles d'accès**. RLS, invités en
lecture seule, 2FA exigée par l'organisation, quotas et journal d'activité sont tous
appliqués par la base, quel que soit l'appareil.

## Ce que fait l'application

- Connexion e-mail et mot de passe, puis code de double authentification si le compte en a une.
- Activation et désactivation de la 2FA dans l'application (ajout direct à l'app d'authentification).
- Organisations multiples (membre ou invité), avec changement d'organisation.
- Accueil : les espaces, avec leur nombre de fichiers et leur taille.
- Création d'un espace d'équipe ou privé.
- Explorateur : dossiers, fichiers, miniatures des photos, tirer pour actualiser.
- Ajout depuis l'appareil photo, la galerie (photos et vidéos) ou les fichiers du téléphone.
  - Le fichier est lu sur le disque par le système, sans passer en mémoire.
  - La progression s'affiche, avec trois envois en parallèle.
- Nouveau dossier, renommer, déplacer, mettre à la corbeille.
- Aperçu plein écran :
  - images, avec zoom ;
  - vidéos et audio, avec le lecteur natif ;
  - PDF, avec la visionneuse native sur iOS ;
  - texte.
- « Ouvrir avec… » : téléchargement puis feuille de partage du système (AirDrop, e-mail, autres applications).
- Liens de partage sécurisés : consultation, téléchargement ou dépôt, avec mot de passe et expiration, et révocation possible.
- Fichiers récents, recherche, corbeille (restaurer, supprimer définitivement, vider).

Ce qui reste sur le web, comme pour les administrateurs : équipe et invités, journal
complet et export CSV, abonnement, portail client, personnalisation.

## Architecture

```
mobile/
  app.json            identité de l'app, permissions (textes en français), icônes
  eas.json            profils de build (development, preview, production)
  metro.config.js     inclut ../src/lib : règles partagées avec le site
  src/app/            écrans (Expo Router : un fichier = un écran)
  src/components/     composants d'interface
  src/lib/
    supabase.ts       client Supabase (session dans le trousseau du système)
    secure-storage.ts Keychain iOS / Keystore Android, valeur découpée en morceaux
    api.ts            lectures et écritures du Drive (mêmes requêtes que le site)
    uploads.tsx       file d'envoi (dépôt direct dans le bucket privé)
    shared.ts         règles importées du site : noms, tailles, forfaits, arborescence
```

Les règles pures du site (`src/lib/files.ts`, `plans.ts`, `folder-tree.ts`, types)
sont **importées telles quelles**. Ainsi, une modification de forfait ou de règle de
nommage s'applique aux deux applications.

Sécurité :

- Aucune clé de service n'est embarquée : la clé « anon / publishable » est publique par nature, et tout passe par la RLS.
- Le bucket reste privé : chaque affichage ou téléchargement utilise une URL signée de courte durée.
- La session est stockée dans le trousseau chiffré du système, jamais en clair.

## Développer

```bash
cd mobile
npm install
cp .env.example .env.local   # puis renseigner l'URL et la clé anon Supabase
npx expo start               # QR code : Expo Go ou build de développement
```

- `npm run typecheck`
- `npm run lint`
- `npm run doctor` : contrôle des dépendances par expo-doctor.
- `npx expo export --platform android --platform ios` : vérifie que les bundles natifs compilent.

## Publier sur les stores

Prérequis :

- un compte Apple Developer (99 $ par an) ;
- un compte Google Play Console (25 $, une seule fois) ;
- un compte Expo (gratuit) pour EAS.

1. `npx eas-cli@latest login`, puis `npx eas-cli@latest init` (lie le projet et ajoute `extra.eas.projectId`).
2. Variables du build (non versionnées), pour l'environnement production :
   ```bash
   npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://….supabase.co --visibility plaintext
   npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value … --visibility plaintext
   npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SITE_URL --value https://docalio.app --visibility plaintext
   ```
3. Test interne (APK Android et build iOS ad hoc) : `npx eas-cli@latest build --profile preview --platform all`.
4. Production : `npx eas-cli@latest build --profile production --platform all`.
5. Envoi aux stores : `npx eas-cli@latest submit --platform ios` et `--platform android`.
   EAS gère les certificats et les clés de signature.
6. Mises à jour sans repasser par les stores (JavaScript uniquement) : `npx eas-cli@latest update`.

Identifiants : `fr.docalio.app` pour l'iOS bundle identifier et le package Android.

### À faire avant la première soumission

- **Suppression de compte** : Apple exige qu'une app permettant d'accéder à un compte offre sa suppression (règle 5.1.1(v)). Il faut ajouter un parcours « Supprimer mon compte », sur le web avec un lien depuis l'app, ou directement dans l'app.
- Fiches des stores : description, captures (iPhone 6,9", iPad, Android), URL de la politique de confidentialité (`/confidentialite`).
- Déclarations de confidentialité (App Privacy chez Apple, Data safety chez Google) :
  - données collectées : e-mail, nom, fichiers déposés par l'utilisateur ;
  - pas de suivi publicitaire ;
  - données chiffrées en transit, suppression possible.
- Compte de démonstration pour les équipes de validation Apple et Google.
