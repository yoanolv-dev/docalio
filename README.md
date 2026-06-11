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
- **Sprint 5** — Module Documents : table `documents`, bucket Storage privé,
  upload sécurisé via Server Actions, téléchargement par URLs signées,
  gestion (statut, visibilité client, catégorie), statistiques dashboard.
- **Sprint 5.5** — Design System & refonte UI : direction artistique
  « Calm Precision » (neutres slate + indigo), tokens Tailwind v4, dark mode
  auto, primitives homogènes, shell SaaS, confirmations par dialog.
- **Sprint 6** — Portail client : table `share_links`, liens de partage
  sécurisés, page publique `/p/[token]` sans compte, accès aux documents
  visibles, téléchargement contrôlé par URLs signées.
- **Sprint 7** — Tracking client v1 & UX : table `activity_events`, suivi des
  ouvertures de portail et des téléchargements, section « Activité client »
  (stats d'engagement + timeline) dans le workspace, refonte UX (édition en
  modale, recherche/tri des documents, portail enrichi).
- **Sprint 8** — Décisions client : table `document_decisions`, le client
  approuve / demande une modification / refuse chaque document avec commentaire
  depuis le portail ; aperçu inline des documents ; synthèse et badges de
  décision côté dashboard.

Les fonctionnalités produit (signature électronique, IA, facturation Stripe)
sont hors périmètre actuel et seront traitées plus tard.

## Décisions client (Sprint 8)

Le portail devient un **outil de décision** : pour chaque document visible, le
client peut **Approuver**, **Demander une modification** ou **Refuser**, avec un
**commentaire** optionnel. Il peut aussi **prévisualiser** les documents
téléchargeables (ouverture inline via URL signée 60 s ; émet l'évènement
`document_opened`).

**Architecture (table `document_decisions`, migration
`supabase/migrations/20260611300000_document_decisions.sql`)** :
- Une décision **courante par document** (modifiable), rattachée à l'org + au
  workspace (FK composite).
- Écriture publique **uniquement** via la RPC `SECURITY DEFINER`
  `submit_document_decision(token, document_id, decision, comment, visitor_id)`
  (`search_path` fixé) qui revalide le token + la visibilité du document.
- Lecture portail via `get_portal_decisions(token)` (l'état se reflète dans le
  portail) ; lecture dashboard via RLS (membres de l'org uniquement).
- Bucket toujours **privé**, aucun service_role, aucun secret. La prévisualisation
  réutilise le chemin sécurisé existant (documents téléchargeables uniquement).

Côté dashboard : badges de décision + commentaire par document, et **synthèse**
(approuvés / modifs demandées / refusés / en attente) en tête de la liste.

### Test manuel — Décisions (Sprint 8)

1. Workspace avec ≥ 1 document visible client → générer un lien de portail.
2. Ouvrir `/p/{token}` (fenêtre privée) → **Aperçu** d'un document téléchargeable.
3. Choisir **Approuver / Demander une modification / Refuser**, ajouter un
   commentaire → **Envoyer ma décision** → l'état « Vous avez … » s'affiche.
4. Côté dashboard, rouvrir le workspace → badge de décision + commentaire sur le
   document, et synthèse mise à jour.
5. Modifier la décision depuis le portail → le dashboard reflète le changement.

## Tracking & activité client (Sprint 7)

Docalio enregistre une **activité minimale et anonyme** pour permettre au
commercial de savoir si son client a consulté le dossier.

**Événements suivis** (table `activity_events`, migration
`supabase/migrations/20260611200000_activity_events.sql`) :
- `portal_opened` — le portail a été ouvert (une fois par chargement) ;
- `document_downloaded` — un document a été téléchargé (après signature réussie).
- `document_opened` — réservé pour un usage futur (non émis en v1).

> Nommage volontairement **honnête** : on ne marque jamais un document comme
> « lu/vu » alors qu'on sait seulement qu'il a été *ouvert* ou *téléchargé*.

**Architecture** : les évènements publics sont créés **uniquement** par la RPC
`record_portal_event(token, event_type, document_id, visitor_id)`
(`SECURITY DEFINER`, `search_path` fixé) qui revalide le token (actif + non
expiré) et que le document appartient au workspace + est visible. Aucune
insertion directe possible. Côté dashboard, RLS : un membre ne lit que les
évènements de son organisation. Aucun accès inter-organisation.

**Confidentialité / RGPD** :
- ❌ aucune adresse IP stockée ; ❌ aucun fingerprint ; ❌ aucune donnée personnelle ;
- ✅ `visitor_id` = identifiant **aléatoire** (localStorage), non sensible, pour
  distinguer des sessions ;
- ✅ aucune metadata libre venant du client n'est persistée (anti-injection) ;
- ✅ les analytics restent **internes** : jamais affichées au client dans le portail.

### Test manuel — Tracking (Sprint 7)

1. Générer un lien de portail, ouvrir `/p/{token}` (fenêtre privée).
2. Côté dashboard, ouvrir le workspace → section **Activité client** :
   « Ouvertures » doit s'incrémenter, « Portail ouvert — il y a … » dans la timeline.
3. Depuis le portail, télécharger un document autorisé → l'activité affiche
   « Document téléchargé : … » et « Téléchargements » s'incrémente.
4. Vérifier qu'un document **non visible** ne génère jamais d'évènement.
5. Le portail public ne montre **aucune** statistique au client.

## Portail client (Sprint 6)

Depuis un workspace, l'utilisateur génère un **lien de partage unique**
(`/p/{token}`) qu'il envoie à son client. Le client accède à un portail
**sans créer de compte** et consulte uniquement les documents marqués
« visibles ».

**Architecture sécurité (sans nouveau secret, bucket jamais public)** :
- Table `share_links` (migration `supabase/migrations/20260611100000_share_links.sql`),
  rattachée à l'org + au workspace par **FK composite** ; au plus **un lien
  actif par workspace** (index unique partiel).
- L'accès public passe par des fonctions **`SECURITY DEFINER`** :
  `get_portal(token)` (renvoie org + workspace + documents visibles, ou `null`
  si lien inactif/expiré) et `get_portal_document_path(token, doc_id)` (résout
  le chemin **seulement** si visible + téléchargeable + lien actif).
- Les téléchargements utilisent des **URLs signées (60 s)** ; une policy
  Storage `anon` autorise la signature **uniquement** pour les fichiers
  visibles + téléchargeables d'un lien actif. Aucun accès inter-organisation.
- Un document « visible mais non téléchargeable » (`allow_download = false`)
  est listé en **lecture seule** : son fichier n'est jamais signable.

Côté dashboard : section **Portail client** sur `/dashboard/workspaces/[id]`
(créer / copier / régénérer / désactiver le lien, expiration optionnelle).

### Test manuel — Portail (Sprint 6)

1. Ouvrir un workspace avec au moins un document **visible client**.
2. Section **Portail client** → **Générer le lien** (expiration au choix).
3. **Copier** le lien → l'ouvrir dans une **fenêtre privée** (non connectée).
4. Vérifier : branding org, nom du workspace, liste des documents visibles.
5. Document téléchargeable → bouton **Télécharger** (URL signée, nom d'origine).
6. Document `allow_download = false` → affiché en **lecture seule**, pas de téléchargement.
7. Un document **non visible** ne doit **jamais** apparaître.
8. **Désactiver** le lien → recharger le portail → écran « Lien indisponible ».

## Module Documents (Sprint 5)

Chaque workspace dispose d'une section **Documents** permettant d'uploader,
gérer et télécharger des fichiers. Table `documents` (migration
`supabase/migrations/20260610140000_documents.sql`) rattachée à
`organization_id` **et** `workspace_id` (FK composite : un document ne peut
jamais référencer un workspace d'une autre organisation).

**Stockage** : bucket Supabase Storage **privé** `documents` — jamais public.
Chemins : `organizations/{org_id}/workspaces/{ws_id}/{doc_id}-{nom-assaini}`.
Les téléchargements passent exclusivement par des **URLs signées temporaires**
(60 s) générées côté serveur. Les policies Storage restreignent chaque
opération aux membres de l'organisation du chemin.

**Formats acceptés (V1)** : PDF, DOCX, XLSX, PPTX, PNG, JPG, JPEG, ZIP —
**20 Mo maximum** par fichier (validé côté client, serveur et Storage).

**Statuts** : brouillon, envoyé, consulté, téléchargé, approuvé, refusé,
archivé. Les statuts « consulté / téléchargé » seront automatisés par le futur
portail client ; en V1 ils sont modifiables manuellement. Les options
« visible client » et « téléchargement autorisé » sont stockées dès maintenant
et seront appliquées par le portail client.

### Configuration Supabase (Sprint 5)

1. Appliquer la migration `20260610140000_documents.sql` (SQL Editor ou CLI).
   Elle crée la table, la RLS, le bucket privé `documents` et les policies
   Storage. Si la création des policies Storage échoue en SQL
   (« must be owner of table objects »), créez les 3 policies équivalentes via
   **Dashboard → Storage → documents → Policies** (select / insert / delete
   pour `authenticated`, scopées sur l'organisation du chemin).
2. Vérifier dans **Storage** que le bucket `documents` est bien **privé**.

### Test manuel — Documents

1. Ouvrir un workspace → section **Documents** → **Ajouter un document**.
2. Sélectionner un fichier accepté (< 20 Mo) → titre pré-rempli → **Envoyer**.
3. Vérifier la ligne créée : icône selon le type, taille formatée, statut
   « Brouillon », badges visibilité/téléchargement, date.
4. Tester un fichier refusé (mauvais format ou > 20 Mo) → message d'erreur clair.
5. **Télécharger** → le fichier arrive avec son nom d'origine.
6. **Modifier** → changer titre/catégorie/statut/visibilité → enregistrer.
7. **Supprimer** (confirmation) → la ligne et le fichier Storage disparaissent.
8. Vérifier les stats documents sur `/dashboard`.
9. Supprimer un workspace avec documents → fichiers Storage nettoyés.

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
