import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Conditions générales d'utilisation du service Docalio.",
  alternates: { canonical: "/conditions" },
};

export default function ConditionsPage() {
  return (
    <LegalPage title="Conditions générales d'utilisation" updated="25 septembre 2026">
      <section>
        <h2>1. Objet</h2>
        <p>
          Les présentes conditions encadrent l&apos;utilisation du service
          Docalio, portail documentaire permettant à un professionnel de
          partager des documents avec ses clients, de collecter des pièces et
          de recueillir des validations.
        </p>
      </section>
      <section>
        <h2>2. Compte et accès</h2>
        <p>
          L&apos;utilisateur est responsable de la confidentialité de ses
          identifiants et des liens de portail qu&apos;il partage. Un lien de
          portail peut être expiré, régénéré ou désactivé à tout moment.
        </p>
      </section>
      <section>
        <h2>3. Contenus</h2>
        <p>
          L&apos;utilisateur reste propriétaire des contenus déposés et
          garantit disposer des droits nécessaires. Il s&apos;engage à ne pas
          déposer de contenu illicite.
        </p>
      </section>
      <section>
        <h2>4. Forfaits et facturation</h2>
        <p>
          Les forfaits, leurs limites et leurs prix sont décrits sur la page{" "}
          <a className="text-primary hover:underline" href="/tarifs">Tarifs</a>.
          Les abonnements sont sans engagement ; en facturation annuelle, la
          période payée reste due.
        </p>
      </section>
      <section>
        <h2>5. Validations et signature</h2>
        <p>
          Les décisions recueillies dans le portail (approuvé, à modifier,
          refusé) sont des validations tracées et horodatées. Elles ne
          constituent pas une signature électronique au sens du règlement
          eIDAS.
        </p>
      </section>
      <section>
        <h2>6. Disponibilité et responsabilité</h2>
        <p>
          Docalio met en œuvre les moyens raisonnables pour assurer la
          disponibilité et la sécurité du service. Il est recommandé de
          conserver une copie de vos documents originaux.
        </p>
      </section>
      <section>
        <h2>7. Contact</h2>
        <p>
          Pour toute question :{" "}
          <a className="text-primary hover:underline" href={`mailto:${SITE.email}`}>{SITE.email}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
