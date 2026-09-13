# L2 MIAGE — Plateforme de vote

Application de vote en ligne pour l'élection des représentants de classe L2 MIAGE (88 électeurs), construite avec React, Vite, TypeScript, Tailwind CSS et Supabase.

## Installation

```bash
npm install
npm run dev
```

L'application est accessible sur `http://localhost:5173`.

- `/` — page d'accueil
- `/vote` — espace étudiant (vote avec code)
- `/admin/login` — espace administrateur

## Configuration Supabase

L'application a besoin d'un projet Supabase pour fonctionner. Suivez ces étapes :

### 1. Créer un projet Supabase

Rendez-vous sur [supabase.com/dashboard](https://supabase.com/dashboard) et créez un nouveau projet.

### 2. Exécuter le schéma SQL

Ouvrez **SQL Editor** dans le dashboard, collez le contenu de [`supabase/schema.sql`](supabase/schema.sql) et exécutez-le. Ce script unique crée :

- les tables (`election_config`, `candidates`, `voter_codes`, `ballots`) ;
- les policies RLS ;
- les fonctions sécurisées `validate_vote_code`, `submit_vote` et `admin_generate_voter_codes` ;
- les buckets Storage (`candidates`, `branding`) et leurs policies ;
- l'activation du Realtime sur `election_config` et `candidates`.

Il est idempotent : vous pouvez le relancer sans risque.

### 3. Activer Authentication (Email/Mot de passe)

Dans **Authentication > Providers**, vérifiez que **Email** est activé (c'est le cas par défaut). Dans **Authentication > Settings**, vous pouvez désactiver "Confirm email" pour un compte admin unique créé manuellement (plus simple pour un MVP).

### 4. Créer le compte administrateur

Dans **Authentication > Users**, cliquez sur **Add user > Create new user**, renseignez un email et un mot de passe, et cochez **Auto Confirm User**. Il n'y a pas de page d'inscription dans l'application : seul un compte créé ici peut se connecter sur `/admin/login`. N'importe quel compte authentifié est considéré comme administrateur (voir les policies RLS dans `supabase/schema.sql`) — ne créez donc que ce seul compte.

### 5. Récupérer l'URL et la clé publique

Dans **Project Settings > API**, copiez :

- **Project URL** → `VITE_SUPABASE_URL`
- **anon public key** → `VITE_SUPABASE_ANON_KEY`

Ne récupérez et n'utilisez jamais la **service_role key** dans le frontend : elle contourne toutes les policies RLS.

### 6. Remplir le fichier `.env`

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Relancez `npm run dev` après avoir renseigné le fichier `.env`.

## Prise en main

1. Connectez-vous sur `/admin/login` avec le compte créé à l'étape 4.
2. Dans **Candidats**, ajoutez quelques candidats de test (vous pourrez les supprimer avant le vote réel et créer les vrais candidats).
3. Dans **Codes de vote**, cliquez sur **Générer les 88 codes**, puis **Exporter les codes** pour récupérer le fichier CSV à distribuer aux étudiants (chaque ligne contient un code unique).
4. Dans **Élection**, cliquez sur **Ouvrir le vote**.
5. Les étudiants peuvent maintenant voter sur `/vote` avec leur code.
6. Suivez la participation et les résultats en direct dans **Résultats**.
7. Cliquez sur **Fermer le vote** une fois l'élection terminée.

## Logo

Deux façons de définir le logo :

- Déposez un fichier `logo.png` dans `public/` (repris automatiquement par défaut).
- Ou envoyez une image depuis **Paramètres > Identité visuelle** dans le dashboard admin (stockée dans le bucket Supabase Storage `branding`).

## Comptes sous-admin (accès restreint)

En plus du compte administrateur (accès complet), vous pouvez créer des comptes **sous-admin** : ils se connectent sur `/admin/login` comme un admin, mais atterrissent uniquement sur une page **Suivi** (`/admin/suivi`) qui affiche le nom de chaque candidat avec une barre de progression en pourcentage — aucun autre accès (pas de candidats, pas de codes, pas d'ouverture/fermeture du vote, pas de nombre de votes ni de participation). Cette restriction est appliquée au niveau de la base de données (RLS), pas seulement dans l'interface : un sous-admin ne peut pas non plus récupérer les vrais chiffres en interrogeant l'API directement.

Pour créer un sous-admin :

1. **Authentication > Users > Add user** : créez le compte (email + mot de passe), comme pour l'admin principal.
2. Copiez son **User UID** (visible dans la liste des utilisateurs).
3. Dans **SQL Editor**, exécutez (en remplaçant l'UID) :

```sql
insert into public.admin_profiles (user_id, role)
values ('UID-DE-L-UTILISATEUR', 'sous_admin')
on conflict (user_id) do update set role = 'sous_admin';
```

Un compte sans ligne dans `admin_profiles` reste un admin complet par défaut — votre compte admin existant n'est donc pas affecté.

## Anonymat et sécurité

- Les codes de vote sont stockés en base avec un hash SHA-256 (`code_hash`, calculé côté serveur avec `pgcrypto`) ; le code en clair n'est lisible que par un admin authentifié (policy RLS), pour l'export CSV.
- Étudiants et navigateur anonyme n'ont **aucun accès direct** aux tables `voter_codes` et `ballots` : toute la logique de vote passe par deux fonctions Postgres `SECURITY DEFINER` (`validate_vote_code`, `submit_vote`), qui sont les seules autorisées à lire/écrire ces tables pour un utilisateur non authentifié.
- `submit_vote` verrouille la ligne du code (`SELECT ... FOR UPDATE`) à l'intérieur de sa propre transaction : deux tentatives simultanées avec le même code ne peuvent jamais aboutir toutes les deux, un seul bulletin est jamais créé par code.
- Chaque bulletin (`ballots`) ne contient que l'identifiant du candidat choisi — aucune référence au code ou à l'électeur n'est jamais stockée dans la même ligne.
- Les policies RLS (dans `supabase/schema.sql`) interdisent à un visiteur non authentifié de lire les codes, les bulletins, ou de modifier les candidats/l'élection — seul un compte administrateur authentifié le peut.

## Ce qu'il vous faut pour connecter le projet

| Élément | Où le trouver |
|---|---|
| `VITE_SUPABASE_URL` | Project Settings > API > Project URL |
| `VITE_SUPABASE_ANON_KEY` | Project Settings > API > anon public key |
| SQL à exécuter | [`supabase/schema.sql`](supabase/schema.sql) (SQL Editor, une seule fois) |
| Storage | créé automatiquement par le script SQL (buckets `candidates` et `branding`, publics en lecture) |
| Auth | activer Email/Password (activé par défaut) + créer 1 compte admin manuellement |
| Règles RLS | incluses dans [`supabase/schema.sql`](supabase/schema.sql) |

**Ne mettez jamais la `service_role key` dans le frontend** — seule la clé `anon` (publique par nature, protégée par les policies RLS) doit figurer dans `.env`.

## Déploiement

Supabase ne fournit pas d'hébergement pour le frontend. Après `npm run build`, déployez le contenu de `dist/` sur l'hébergeur statique de votre choix (Vercel, Netlify, Cloudflare Pages, etc.) et configurez-y les mêmes variables d'environnement `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

## Stack technique

- React + Vite + TypeScript
- Tailwind CSS v4
- Lucide React (icônes)
- Supabase (PostgreSQL, Auth, Storage, Realtime, fonctions SQL sécurisées)
