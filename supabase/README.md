# Supabase — Docalio

Migrations SQL du socle organisationnel (Sprint 2).

## Migrations

| Fichier | Contenu |
| --- | --- |
| `migrations/20260610120000_init_organizations.sql` | Tables `profiles`, `organizations`, `organization_members`, contraintes, index, triggers `updated_at` et création auto du profil à l'inscription. |
| `migrations/20260610120100_rls_and_functions.sql` | Activation RLS, fonctions `SECURITY DEFINER`, policies d'isolation multi-tenant, RPC `create_organization`. |
| `migrations/20260610130000_workspaces.sql` | Table `workspaces` (espaces clients), contraintes, index, trigger `updated_at`, RLS multi-tenant (select/insert/update/delete réservés aux membres de l'organisation). |

## Application des migrations

### Option A — Supabase CLI (recommandé)

```bash
supabase link --project-ref <votre-ref-projet>
supabase db push
```

### Option B — SQL Editor (manuel)

Dans le dashboard Supabase → **SQL Editor**, exécutez les deux fichiers
**dans l'ordre** (`...120000` puis `...120100`).

## Étapes manuelles importantes

1. **Variables d'environnement** : renseignez `NEXT_PUBLIC_SUPABASE_URL` et
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans `.env.local` (voir `.env.example`).
2. **Confirmation d'email** : par défaut, Supabase exige une confirmation
   d'email à l'inscription. Pour tester l'onboarding immédiatement, désactivez
   « Confirm email » dans **Authentication → Providers → Email**, ou confirmez
   l'utilisateur manuellement.
3. **Le trigger `on_auth_user_created`** crée le profil automatiquement. Les
   utilisateurs créés *avant* l'application de la migration n'ont pas de profil :
   l'action d'onboarding le recrée à la volée (upsert) en filet de sécurité.
