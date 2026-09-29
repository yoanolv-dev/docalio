// Pages comparatives (SEO « alternative à … »). Les affirmations sur les
// concurrents restent factuelles et prudentes, fondées sur leurs informations
// publiques ; elles décrivent l'usage « portail client », pas l'outil entier.

export type Verdict = "yes" | "no" | "partial";

export interface ComparisonRow {
  criterion: string;
  docalio: Verdict;
  other: Verdict;
  note?: string;
}

export interface Comparison {
  slug: string;
  competitor: string;
  seoTitle: string;
  seoDescription: string;
  title: string;
  intro: string;
  /** Ce que le concurrent fait bien (honnêteté = crédibilité). */
  strengths: string[];
  whyDocalio: { title: string; text: string }[];
  rows: ComparisonRow[];
  verdict: string;
}

const CORE_ROWS: Record<string, Omit<ComparisonRow, "other">> = {
  noAccount: { criterion: "Accès client sans compte ni mot de passe", docalio: "yes" },
  requests: { criterion: "Liste de pièces à fournir, dépôt par le client", docalio: "yes" },
  decisions: { criterion: "Validation / modification / refus par document", docalio: "yes" },
  tracking: { criterion: "Suivi des ouvertures et téléchargements", docalio: "yes" },
  viewOnly: { criterion: "Consultation sans téléchargement", docalio: "yes" },
  branding: { criterion: "Portail à vos couleurs, par client", docalio: "yes" },
  setup: { criterion: "Opérationnel en 5 minutes, sans informaticien", docalio: "yes" },
  eu: { criterion: "Données hébergées dans l'UE", docalio: "yes" },
  freeClients: { criterion: "Clients invités gratuits et illimités", docalio: "yes" },
};

function row(key: keyof typeof CORE_ROWS, other: Verdict, note?: string): ComparisonRow {
  return { ...CORE_ROWS[key], other, note };
}

export const COMPARISONS: Comparison[] = [
  {
    slug: "sharepoint",
    competitor: "SharePoint",
    seoTitle: "Alternative à SharePoint pour le partage avec vos clients",
    seoDescription:
      "SharePoint est taillé pour l'intranet. Pour vos clients, Docalio offre un portail sans compte invité, la collecte de pièces et la validation en ligne, prêt en 5 minutes.",
    title: "SharePoint gère votre intranet. Docalio gère vos clients.",
    intro:
      "SharePoint est un excellent outil de collaboration interne. Mais ouvrir SharePoint à des clients, c'est gérer des comptes invités, des héritages de permissions et une interface pensée pour vos équipes, pas pour eux.",
    strengths: [
      "Intégration profonde à Microsoft 365, Teams et Office",
      "Coédition de documents en temps réel",
      "Adapté aux intranets et à la gestion documentaire interne",
    ],
    whyDocalio: [
      { title: "Pas de compte invité", text: "Vos clients ouvrent un lien sécurisé. Pas de compte Microsoft, pas de code à retrouver dans leurs e-mails." },
      { title: "Pas de sur-partage accidentel", text: "Un espace = un client. Pas d'héritage de permissions à auditer dossier par dossier." },
      { title: "Un vrai parcours client", text: "Pièces à fournir, documents à valider, progression : le client sait quoi faire." },
    ],
    rows: [
      row("noAccount", "partial", "Selon la politique de partage : comptes invités ou codes à usage unique"),
      row("requests", "no", "Pas de liste de pièces à fournir native"),
      row("decisions", "partial", "Possible via Power Automate, à configurer"),
      row("tracking", "partial", "Journaux d'audit orientés administrateur"),
      row("viewOnly", "yes"),
      row("branding", "partial", "Personnalisation par site, pas par client"),
      row("setup", "no", "Paramétrage de sites, bibliothèques et droits"),
      row("eu", "yes"),
      row("freeClients", "partial", "Selon la licence et la configuration des invités"),
    ],
    verdict:
      "Gardez SharePoint pour vos équipes, et offrez à vos clients un portail pensé pour eux. Les deux cohabitent très bien.",
  },
  {
    slug: "j-doc",
    competitor: "J-Doc",
    seoTitle: "Alternative à J-Doc : portail client avec collecte de pièces",
    seoDescription:
      "Vous cherchez une alternative à J-Doc ? Docalio ajoute la collecte de pièces, la validation client et le suivi en temps réel, avec un essai gratuit et sans engagement.",
    title: "Au-delà de l'échange de fichiers : un portail qui fait avancer vos dossiers.",
    intro:
      "J-Doc est une solution française reconnue d'échange et de partage de fichiers sécurisé. Docalio part du même besoin de confidentialité, mais va plus loin sur l'expérience client : ce que le client doit déposer, ce qu'il doit valider, et où en est chaque dossier.",
    strengths: [
      "Éditeur français, orienté sécurité et RGPD",
      "Échange de fichiers entre collaborateurs et contacts externes",
      "Forfait annuel avec utilisateurs illimités",
    ],
    whyDocalio: [
      { title: "Collecte de pièces intégrée", text: "Listez les pièces attendues, avec échéance. Le client dépose, vous validez ou refusez avec un motif." },
      { title: "Décisions client", text: "Approuver, demander une modification, refuser : chaque document devient une étape claire." },
      { title: "Essai gratuit, sans engagement", text: "Forfait gratuit pour démarrer, puis 29 € HT/mois, mensuel ou annuel." },
    ],
    rows: [
      row("noAccount", "yes"),
      row("requests", "partial", "Dépôt possible, sans liste de pièces avec échéances"),
      row("decisions", "no"),
      row("tracking", "partial"),
      row("viewOnly", "partial"),
      row("branding", "partial"),
      row("setup", "yes"),
      row("eu", "yes"),
      row("freeClients", "yes"),
    ],
    verdict:
      "Si votre besoin est uniquement d'envoyer des fichiers en sécurité, les deux conviennent. Si vous voulez que vos clients déposent, valident et avancent sans relance, Docalio est fait pour vous.",
  },
  {
    slug: "email-wetransfer",
    competitor: "l'e-mail et WeTransfer",
    seoTitle: "Remplacer e-mail et WeTransfer pour échanger avec vos clients",
    seoDescription:
      "Pièces jointes perdues, liens expirés, aucune traçabilité : passez à un portail client sécurisé avec collecte de pièces, validation et suivi des ouvertures.",
    title: "Vos dossiers méritent mieux qu'une pièce jointe.",
    intro:
      "L'e-mail et les services de transfert sont pratiques pour un envoi ponctuel. Mais pour suivre un dossier client dans la durée, ils éparpillent les versions, n'offrent aucune traçabilité et exposent des données sensibles.",
    strengths: ["Universels et immédiats", "Aucun outil à adopter pour le client"],
    whyDocalio: [
      { title: "Tout le dossier au même endroit", text: "Documents partagés, pièces reçues, décisions : une seule page par client." },
      { title: "Vous savez ce qui se passe", text: "Ouvertures, téléchargements, dépôts : fini le « avez-vous bien reçu ? »." },
      { title: "Des données protégées", text: "Stockage privé, liens temporaires et révocables, hébergement dans l'UE." },
    ],
    rows: [
      row("noAccount", "yes"),
      row("requests", "no"),
      row("decisions", "no"),
      row("tracking", "partial", "Accusé de téléchargement au mieux"),
      row("viewOnly", "no"),
      row("branding", "partial"),
      row("setup", "yes"),
      row("eu", "partial", "Selon le fournisseur"),
      row("freeClients", "yes"),
    ],
    verdict: "Gardez l'e-mail pour discuter. Pour les documents, donnez à chaque client son portail.",
  },
  {
    slug: "google-drive",
    competitor: "Google Drive",
    seoTitle: "Alternative à Google Drive pour partager avec vos clients",
    seoDescription:
      "Un dossier Google Drive partagé n'est pas un portail client. Docalio ajoute la collecte de pièces sans compte Google, la validation et le suivi d'activité.",
    title: "Un dossier partagé n'est pas un portail client.",
    intro:
      "Google Drive est idéal pour travailler en équipe. Côté client, un dossier partagé laisse le client seul face à une liste de fichiers, sans savoir quoi faire, ni vous ce qu'il a fait.",
    strengths: ["Coédition en temps réel", "Intégration à Google Workspace", "Grand espace de stockage"],
    whyDocalio: [
      { title: "Dépôt sans compte Google", text: "Vos clients déposent leurs pièces sans se connecter à quoi que ce soit." },
      { title: "Un parcours guidé", text: "À fournir, à consulter, à valider : chaque élément a un statut clair." },
      { title: "Une image professionnelle", text: "Un portail à votre marque plutôt qu'un dossier générique." },
    ],
    rows: [
      row("noAccount", "partial", "Lecture par lien, dépôt généralement avec un compte"),
      row("requests", "no"),
      row("decisions", "no"),
      row("tracking", "partial", "Activité visible selon l'offre Workspace"),
      row("viewOnly", "partial", "Blocage du téléchargement possible pour certains formats"),
      row("branding", "no"),
      row("setup", "yes"),
      row("eu", "partial", "Selon l'offre et la configuration"),
      row("freeClients", "yes"),
    ],
    verdict: "Drive pour produire en équipe, Docalio pour la relation documentaire avec vos clients.",
  },
];

export function getComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
