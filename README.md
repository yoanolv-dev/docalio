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

## État du Sprint 1

Le Sprint 1 met en place le socle technique :

- ✅ Initialisation Next.js 16 + TypeScript + Tailwind v4
- ✅ Intégration Supabase (clients navigateur et serveur)
- ✅ Protection des routes via `proxy.ts`
- ✅ Pages et formulaires d'authentification (login / register)
- ✅ Layouts public et dashboard, composants UI de base
- ✅ Documentation (`README.md`, `.env.example`)

Les fonctionnalités produit (organizations, profiles, workspaces, documents,
IA, facturation Stripe) sont hors périmètre du Sprint 1 et seront traitées dans
les sprints suivants.
