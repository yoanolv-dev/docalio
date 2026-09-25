import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { LEGAL, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales du service Docalio : éditeur, hébergement, contact.",
  alternates: { canonical: "/mentions-legales" },
};

export default function MentionsLegalesPage() {
  return (
    <LegalPage title="Mentions légales" updated="25 septembre 2026">
      <section>
        <h2>Éditeur du service</h2>
        <ul>
          <li><strong>Éditeur :</strong> {LEGAL.publisher}</li>
          <li><strong>Forme juridique :</strong> {LEGAL.legalForm}</li>
          <li><strong>Adresse :</strong> {LEGAL.address}</li>
          {LEGAL.siren && <li><strong>SIREN :</strong> {LEGAL.siren}</li>}
          {LEGAL.director && <li><strong>Directeur de la publication :</strong> {LEGAL.director}</li>}
          <li><strong>Contact :</strong> <a className="text-primary hover:underline" href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
        </ul>
      </section>
      <section>
        <h2>Hébergement</h2>
        <ul>
          {LEGAL.appHost && <li><strong>Application :</strong> {LEGAL.appHost}</li>}
          <li><strong>Données :</strong> {LEGAL.dataHost}</li>
        </ul>
      </section>
      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          L&apos;ensemble des éléments du site et du service Docalio (textes,
          interfaces, logo, code) est protégé. Toute reproduction non autorisée
          est interdite. Les photographies d&apos;illustration proviennent
          d&apos;Unsplash et sont utilisées conformément à la licence Unsplash.
        </p>
      </section>
      <section>
        <h2>Données personnelles</h2>
        <p>
          Le traitement des données est décrit dans notre{" "}
          <a className="text-primary hover:underline" href="/confidentialite">politique de confidentialité</a>.
        </p>
      </section>
    </LegalPage>
  );
}
