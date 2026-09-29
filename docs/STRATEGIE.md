# Docalio — Stratégie produit & go-to-market

> Septembre 2026. Objectif : un produit vendable seul, et **1 000 € de MRR** le
> plus vite possible.

## 1. Positionnement

**Promesse :** « Vos clients déposent leurs pièces. Sans que vous ayez à relancer. »

Docalio n'est **pas** un Drive, ni une GED. C'est le **portail client** des
métiers qui vivent de documents clients (experts-comptables, avocats, agences,
immobilier, conseil, BTP) : ce que le client doit **déposer**, ce qu'il doit
**valider**, et **où en est** chaque dossier.

Le Drive interne / groupes d'accès reste disponible, mais en **argument
secondaire** (forfait Cabinet) : il ne doit pas diluer le message.

## 2. Benchmark

| Solution | Ce qu'elle fait bien | Limite pour la relation client | Prix public |
|---|---|---|---|
| **J-Doc** | Échange de fichiers sécurisé, éditeur français, RGPD | Pas de liste de pièces avec échéances, pas de validation client, pas d'essai gratuit | à partir de 490 €/an ([source](https://lebonlogiciel.com/collaboration-et-communication-ged-messagerie/j-doc/prix/1493)) |
| **SharePoint** | Intranet, coédition, M365 | Comptes invités, héritage de permissions, sur-partage, non « brandable » par client ([source](https://www.clinked.com/blog/sharepoint-client-portal-setup-limitations-alternatives)) | au siège, licence M365 |
| **Google Drive** | Coédition, stockage | Dossier partagé ≠ parcours client, dépôt souvent avec compte | au siège |
| **E-mail / WeTransfer** | Universel | Aucune traçabilité, versions éparpillées | gratuit / faible |
| **Suralink** (US) | Listes de pièces pour audit | Anglophone, orienté audit, cher | ≈ 17 $/user/mois ([source](https://www.capterra.com/p/148032/Suralink/)) |
| **Content Snare** (AU) | Collecte de documents et d'infos | Anglophone, pas de partage/validation de livrables | ≈ 29 $/mois ([source](https://getuku.com/articles/best-client-portal-software-for-accountants/)) |

**Enseignement clé :** le marché paie pour la **collecte de pièces**
(Suralink, Content Snare, FileInvite), mais aucune offre française simple ne
combine *collecte + partage + validation + suivi* dans un portail à la marque
du cabinet. C'est la place de Docalio.

## 3. Ce qui a été construit dans ce sprint

1. **Collecte de pièces** (différenciateur n°1) — demandes avec échéance,
   dépôt client sans compte, validation / refus motivé, notification, timeline,
   pièces types par métier en un clic.
2. **Tarification par cabinet** (et non au siège) — plus lisible, plus haut
   panier moyen, n'effraie pas à l'embauche.
3. **Site refondu** — hero orienté bénéfice, vraies captures produit, 6 pages
   métiers (SEO longue traîne), 4 pages comparatives (« alternative à… »),
   calculateur de gain, pages légales, données structurées, image OG.

## 4. Tarifs

| Forfait | Mensuel | Annuel (équiv./mois) | Cible |
|---|---|---|---|
| Découverte | 0 € | 0 € | 1 utilisateur, 3 espaces actifs — acquisition |
| Essentiel | 29 € HT | 24 € HT | indépendant / petit cabinet (≤ 3) |
| Cabinet | 79 € HT | 66 € HT | équipe (≤ 10), groupes, Drive interne |
| Entreprise | sur devis | — | > 10 utilisateurs, conformité |

Les clients invités ne sont **jamais** facturés.

## 5. Chemin vers 1 000 € de MRR

Panier moyen visé ≈ 45 € (mix 60 % Essentiel / 40 % Cabinet, en annuel)
→ **≈ 22 clients payants**. Avec 10 % de conversion gratuit → payant, il faut
≈ **220 inscriptions qualifiées**, soit ~ 55/mois sur 4 mois.

**Canal 1 — Experts-comptables (priorité absolue).** Des milliers de cabinets en
France, douleur quotidienne (pièces de fin de mois), budget logiciel habituel.
- Prospection LinkedIn ciblée (associés de cabinets de 2 à 15 personnes) avec
  une démo de 20 min centrée sur « 3 clics pour demander les pièces du mois ».
- Offre de lancement : -50 % pendant 3 mois + import des premiers dossiers.
- Objectif : 10 cabinets en 6 semaines = ~ 500 € MRR.

**Canal 2 — SEO.** Pages `/solutions/*` et `/comparatif/*` déjà en ligne ;
publier ensuite 2 articles/mois sur les requêtes « liste pièces bilan »,
« dossier locataire en ligne », « alternative J-Doc ».

**Canal 3 — Boucle virale produit.** Chaque portail client affiche
« Propulsé par Docalio » en forfait gratuit : chaque client final voit la
marque. (Retrait = argument d'upgrade Essentiel.)

**Canal 4 — Partenariats.** Éditeurs de logiciels comptables, réseaux
d'agences, CCI : programme de recommandation (1 mois offert par filleul).

## 6. Prochaines étapes produit (par ordre de ROI)

1. **Stripe** : checkout + portail client + webhook qui met à jour
   `organizations.plan` (l'architecture est prête).
2. **Relances automatiques par e-mail** des pièces en retard (le « sans
   relance » devient littéral) — c'est la fonctionnalité qui justifiera le
   passage au payant.
3. **Application des limites par forfait** (branding, espaces internes,
   groupes) — aujourd'hui affichées, pas toutes bloquées.
4. **Modèles de demandes enregistrés** par le cabinet (au-delà des pièces types).
5. **Aperçu inline** des PDF/images dans le portail.
6. **Import/export** d'un dossier complet (ZIP) pour la fin de mission.

## 7. À faire avant la mise en ligne publique

- Appliquer les migrations `20260623120000_portal_view_only.sql` et
  `20260925100000_document_requests.sql` sur Supabase.
- Renseigner les mentions légales (`NEXT_PUBLIC_LEGAL_*`) et
  `NEXT_PUBLIC_SITE_URL`.
- Faire relire les pages légales par un professionnel du droit.
- Valider l'offre de lancement affichée (-50 % pendant 3 mois).
