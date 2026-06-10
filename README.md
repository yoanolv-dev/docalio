# Docalio

Plateforme de gestion documentaire collaborative. Ce dépôt contient le socle
technique de l'application web (Next.js + Supabase), construit lors du Sprint 1.

## Stack technique

- **Next.js 16** (App Router, React 19)
- **TypeScript**
- **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`) — authentification
- **Tailwind CSS v4**
- **shadcn/ui** + **Radix UI** + **lucide-react** (composants d'interface)
- **ESLint** (`eslint-config-next`)

## Prérequis

- Node.js 20+
- npm
- Un projet Supabase (URL + clé `anon`)

## Installation

```bash
git clone <url-du-repo>
cd docalio
npm install
```

## Configuration

Copiez le fichier d'exemple et renseignez vos identifiants Supabase :

```bash
cp .env.example .env.local
```

`.env.local` doit contenir :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon-publique
```

> `.env.local` est ignoré par Git : aucune clé réelle n'est versionnée.

## Commandes disponibles

| Commande        | Description                              |
| --------------- | ---------------------------------------- |
| `npm run dev`   | Démarre le serveur de développement      |
| `npm run build` | Génère le build de production            |
| `npm run start` | Lance l'application en mode production    |
| `npm run lint`  | Analyse le code avec ESLint              |

## Structure du projet

```
src/
├── proxy.ts                 # Protection des routes (auth Supabase)
├── app/
│   ├── (auth)/              # /login, /register
│   ├── (dashboard)/         # /dashboard (espace protégé)
│   └── (public)/            # Pages publiques
├── components/
│   ├── auth/                # Formulaires de connexion / inscription
│   ├── layout/              # Navbar, sidebar, header dashboard
│   ├── shared/              # Composants transverses (empty-state, stat-card)
│   └── ui/                  # Primitives shadcn/ui
└── lib/
    ├── supabase/            # Clients Supabase (navigateur / serveur)
    └── utils.ts             # Utilitaires
```

## Routes d'authentification

| Route | Rôle |
| --- | --- |
| `/login` | Connexion email/password |
| `/register` | Inscription |
| `/forgot-password` | Demande de lien de réinitialisation |
| `/reset-password` | Définition d'un nouveau mot de passe (après lien email) |
| `/auth/callback` | Route handler : échange le code email contre une session |
| `/onboarding` | Création de l'organisation (post-inscription) |

## Configuration Supabase (auth)

1. **Provider Email** : activer Email/Password dans **Authentication → Sign In / Providers**.
2. **Confirm email** (**Authentication → Settings**) :
   - **Activé** (par défaut) : après inscription, l'utilisateur reçoit un email
     et n'a pas de session tant qu'il n'a pas cliqué le lien. `/register`
     affiche alors un message « Vérifiez votre boîte mail ».
   - **Désactivé** : session immédiate, redirection directe vers `/onboarding`
     (pratique pour le développement local).
3. **URL Configuration** (**Authentication → URL Configuration**) :
   - **Site URL** : `http://localhost:3000` en local.
   - **Redirect URLs** : ajouter `http://localhost:3000/auth/callback`
     (indispensable pour la réinitialisation de mot de passe et la confirmation
     d'email). En production, ajouter l'équivalent avec le domaine réel.

## Checklist de test manuel

Prérequis : `.env.local` rempli, migrations Supabase appliquées, `npm run dev`.

1. **Register** : `/register` → créer un compte.
   - Confirm email *désactivé* → redirection vers `/onboarding`.
   - Confirm email *activé* → message de confirmation ; cliquer le lien reçu.
2. **Onboarding** : créer une organisation (nom → slug auto, couleur).
   Tester un slug déjà pris → message d'erreur clair. Succès → `/dashboard`.
3. **Dashboard** : vérifier nom d'organisation, rôle « Propriétaire »,
   badge « Sprint 2 prêt ».
4. **Settings** : `/dashboard/settings` → modifier nom/slug/logo/couleur →
   message de succès. Vérifier le rechargement des valeurs.
5. **Logout** : bouton « Déconnexion » (sidebar) → redirection `/login`.
6. **Login** : se reconnecter → retour direct au `/dashboard`.
7. **Forgot password** : `/forgot-password` → saisir l'email → message d'envoi.
   Ouvrir le lien reçu → `/reset-password` → définir un nouveau mot de passe →
   redirection `/dashboard`.
8. **Redirections** : visiter `/login` en étant connecté → renvoi automatique
   vers `/dashboard` (ou `/onboarding` si pas encore d'organisation).

## Historique des sprints

- **Sprint 1** — Socle technique : Next.js 16, TypeScript, Tailwind v4, clients
  Supabase, protection des routes (`proxy.ts`), layouts et UI de base.
- **Sprint 2** — Socle organisationnel : tables `profiles`, `organizations`,
  `organization_members`, RLS multi-tenant, RPC `create_organization`,
  onboarding et paramètres d'organisation. Migrations dans `supabase/migrations/`.
- **Sprint 3** — Parcours d'authentification : flux register/login robustes,
  déconnexion, mot de passe oublié / réinitialisation, redirections d'auth.
- **Sprint 4** — Module Workspaces (espaces clients) : table `workspaces`,
  RLS multi-tenant, CRUD (créer / modifier / archiver / supprimer), pages
  liste / création / détail, statistiques sur le dashboard.

Les fonctionnalités produit (documents, portail client, validations, IA,
facturation Stripe) sont hors périmètre actuel et seront traitées plus tard.

## Module Workspaces (Sprint 4)

Un **workspace** est un espace documentaire privé lié à un client, un prospect
ou un projet. Table `workspaces` (migration
`supabase/migrations/20260610130000_workspaces.sql`) :
`name`, `client_company`, `client_email`, `client_phone`,
`status` (`prospect` | `active` | `archived`), `internal_note`, `logo_url`,
`primary_color`, `created_by`, rattachée à `organization_id`.
RLS : un membre n'accède qu'aux workspaces de son organisation (aucun accès
inter-organisation).

Routes : `/dashboard/workspaces` (liste + recherche + filtre statut),
`/dashboard/workspaces/new` (création), `/dashboard/workspaces/[id]` (détail,
édition, archivage, suppression).

### Test manuel — Workspaces

1. `/dashboard/workspaces` → **Créer un espace** → remplir le formulaire → succès → page détail.
2. Vérifier le statut (badge) et les informations affichées.
3. Modifier l'espace → message de succès.
4. **Archiver** → le statut passe à « Archivé ».
5. Rechercher / filtrer par statut dans la liste.
6. Vérifier les statistiques mises à jour sur `/dashboard`.
7. **Supprimer** (zone de danger) → retour à la liste.
