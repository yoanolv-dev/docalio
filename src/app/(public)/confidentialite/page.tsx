import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Quelles données Docalio traite, pourquoi, où elles sont hébergées et comment exercer vos droits (RGPD).",
  alternates: { canonical: "/confidentialite" },
};

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité" updated="25 septembre 2026">
      <section>
        <p>
          Docalio est conçu selon un principe simple : ne collecter que ce qui
          est nécessaire au service, et le protéger par défaut. Cette page
          décrit précisément ce que nous traitons.
        </p>
      </section>
      <section>
        <h2>Rôles</h2>
        <ul>
          <li><strong>Pour les comptes utilisateurs</strong> (cabinets, agences…), Docalio est responsable du traitement.</li>
          <li><strong>Pour les documents et les données de vos clients</strong> que vous déposez ou recevez, vous êtes responsable du traitement et Docalio agit en tant que sous-traitant, uniquement sur vos instructions.</li>
        </ul>
      </section>
      <section>
        <h2>Données traitées</h2>
        <ul>
          <li><strong>Compte :</strong> adresse e-mail, nom, organisation, rôle.</li>
          <li><strong>Contenu :</strong> documents, dossiers, pièces déposées, décisions et commentaires.</li>
          <li><strong>Activité du portail :</strong> ouvertures, consultations, téléchargements et dépôts, horodatés. Un identifiant de visite aléatoire est conservé dans le navigateur du client pour distinguer les visites. <strong>Aucune adresse IP n&apos;est enregistrée</strong> dans ces journaux et aucun traceur publicitaire n&apos;est utilisé.</li>
        </ul>
      </section>
      <section>
        <h2>Finalités et bases légales</h2>
        <ul>
          <li>Fournir le service (exécution du contrat).</li>
          <li>Sécuriser les comptes et prévenir les abus (intérêt légitime).</li>
          <li>Vous informer de l&apos;activité de vos espaces (exécution du contrat).</li>
        </ul>
      </section>
      <section>
        <h2>Hébergement et sécurité</h2>
        <ul>
          <li>Base de données et fichiers hébergés dans l&apos;Union européenne (Francfort, Allemagne).</li>
          <li>Stockage des fichiers privé : aucun fichier n&apos;est public, l&apos;accès passe par des liens signés valables quelques secondes.</li>
          <li>Isolation stricte des organisations et des espaces au niveau de la base de données.</li>
        </ul>
      </section>
      <section>
        <h2>Cookies</h2>
        <p>
          Seuls des cookies strictement nécessaires sont utilisés (maintien de
          la session des utilisateurs connectés). Ils ne nécessitent pas de
          consentement. Aucun cookie de mesure d&apos;audience ou publicitaire.
        </p>
      </section>
      <section>
        <h2>Conservation</h2>
        <p>
          Les données sont conservées pendant la durée de l&apos;abonnement.
          La suppression d&apos;un document, d&apos;un espace ou d&apos;une
          pièce supprime les fichiers correspondants. À la clôture du compte,
          les données sont supprimées dans un délai raisonnable.
        </p>
      </section>
      <section>
        <h2>Vos droits</h2>
        <p>
          Vous disposez des droits d&apos;accès, de rectification,
          d&apos;effacement, de limitation, d&apos;opposition et de
          portabilité. Écrivez-nous à{" "}
          <a className="text-primary hover:underline" href={`mailto:${SITE.email}`}>{SITE.email}</a>.
          Vous pouvez également saisir la CNIL.
        </p>
      </section>
    </LegalPage>
  );
}
