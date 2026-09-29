// Pages « Solutions » par métier : une page SEO dédiée par cible, construite
// depuis ces données (une seule mise en page, contenu spécifique).

export interface Solution {
  slug: string;
  /** Nom court affiché dans la nav. */
  name: string;
  /** Balise <title> (≈ 60 caractères, requête principale en tête). */
  seoTitle: string;
  seoDescription: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string;
  imageAlt: string;
  pains: { title: string; text: string }[];
  /** Pièces types pré-remplies (reprises du produit, cf. src/lib/sectors.ts). */
  requestExamples: string[];
  outcomes: string[];
  faq: { question: string; answer: string }[];
}

export const SOLUTIONS: Solution[] = [
  {
    slug: "experts-comptables",
    name: "Experts-comptables",
    seoTitle: "Portail client expert-comptable : collecte des pièces sécurisée",
    seoDescription:
      "Récupérez relevés, factures et justificatifs sans relancer par e-mail. Portail client à vos couleurs, dépôt sans compte, validation des bilans, hébergé en Europe.",
    eyebrow: "Pour les cabinets d'expertise comptable",
    title: "Fini la chasse aux pièces en fin de mois.",
    subtitle:
      "Vos clients déposent relevés, factures et justificatifs dans leur portail, sans créer de compte. Vous savez en un coup d'œil ce qui manque, et qui relancer.",
    image: "/images/comptabilite.jpg",
    imageAlt: "Justificatifs comptables, calculatrice et formulaires fiscaux sur un bureau",
    pains: [
      { title: "Des pièces éparpillées", text: "E-mails, WhatsApp, clés USB, papier : chaque client a son canal et rien n'est centralisé." },
      { title: "Des relances à l'aveugle", text: "Impossible de savoir si le client a vu la demande, ouvert le bilan ou oublié le dossier." },
      { title: "Des pièces jointes à risque", text: "Données bancaires et fiscales envoyées en clair, sans traçabilité ni révocation." },
    ],
    requestExamples: ["Relevés bancaires du mois", "Factures d'achat", "Factures de vente", "Justificatifs de frais", "Bulletins de salaire"],
    outcomes: [
      "Une liste de pièces par client, prête en un clic",
      "Échéances visibles et retards signalés automatiquement",
      "Bilans et liasses validés en ligne, avec commentaire",
      "Historique complet : qui a déposé, ouvert, validé, et quand",
    ],
    faq: [
      { question: "Mes clients doivent-ils installer une application ?", answer: "Non. Ils reçoivent un lien sécurisé et déposent leurs pièces depuis leur navigateur, sur ordinateur comme sur mobile, sans créer de compte." },
      { question: "Où sont stockées les données de mes clients ?", answer: "Dans l'Union européenne (Francfort). Les fichiers sont dans un stockage privé, accessibles uniquement par des liens signés et temporaires." },
      { question: "Remplace-t-il mon logiciel de production ?", answer: "Non, Docalio se concentre sur l'échange avec le client : collecte, partage et validation. Vous gardez vos outils de production comptable." },
    ],
  },
  {
    slug: "avocats",
    name: "Avocats & notaires",
    seoTitle: "Portail client avocat & notaire : échange de pièces confidentiel",
    seoDescription:
      "Échangez pièces et actes avec vos clients dans un espace confidentiel : dépôt sans compte, liens expirables, consultation sans téléchargement, historique horodaté.",
    eyebrow: "Pour les avocats et les études notariales",
    title: "La confidentialité que vos dossiers exigent.",
    subtitle:
      "Un espace privé par dossier : vos clients transmettent les pièces demandées et consultent vos actes, sans pièce jointe qui circule et avec un historique précis.",
    image: "/images/avocats.jpg",
    imageAlt: "Statue de la justice tenant une balance",
    pains: [
      { title: "Le secret professionnel mis à l'épreuve", text: "Des pièces sensibles transitent par des messageries grand public, sans contrôle." },
      { title: "Des dossiers incomplets", text: "Pièce d'identité manquante, justificatif périmé : le dossier traîne et vous relancez." },
      { title: "Aucune preuve de consultation", text: "Difficile de savoir si le client a bien pris connaissance d'un projet d'acte." },
    ],
    requestExamples: ["Pièce d'identité", "Justificatif de domicile", "Contrat signé", "Pièces justificatives du dossier"],
    outcomes: [
      "Un espace confidentiel par dossier, isolé des autres",
      "Documents consultables sans pouvoir être téléchargés",
      "Liens expirables et révocables à tout moment",
      "Traces horodatées des ouvertures et des dépôts",
    ],
    faq: [
      { question: "Puis-je empêcher le téléchargement d'un projet d'acte ?", answer: "Oui. Chaque document peut être en consultation seule : votre client le lit dans son navigateur sans bouton de téléchargement." },
      { question: "Un client peut-il voir les dossiers d'un autre ?", answer: "Non. Chaque espace a son propre lien et l'isolation est appliquée au niveau de la base de données." },
      { question: "Est-ce conforme au RGPD ?", answer: "Hébergement dans l'UE, stockage privé, suivi d'activité sans adresse IP ni traçage publicitaire : Docalio est conçu pour la minimisation des données." },
    ],
  },
  {
    slug: "agences",
    name: "Agences & studios",
    seoTitle: "Portail client agence : validation des livrables et collecte",
    seoDescription:
      "Récupérez briefs, logos et contenus, faites valider maquettes et livrables en un clic. Portail client à la marque de votre agence, sans compte pour vos clients.",
    eyebrow: "Pour les agences, studios et créatifs",
    title: "Des validations client en heures, pas en semaines.",
    subtitle:
      "Vos clients déposent leurs contenus, consultent vos maquettes et valident, ou demandent une modification commentée. Le projet avance, sans fil d'e-mails.",
    image: "/images/agence.jpg",
    imageAlt: "Équipe d'agence réunie autour d'une présentation",
    pains: [
      { title: "Des contenus qui n'arrivent jamais", text: "Le site est prêt, mais les textes et photos du client se font attendre." },
      { title: "Des retours dispersés", text: "« OK pour moi » par SMS, corrections par e-mail : impossible de savoir quelle version est validée." },
      { title: "Une image moins premium", text: "Un lien WeTransfer ne reflète pas le soin que vous mettez dans votre travail." },
    ],
    requestExamples: ["Brief signé", "Logo et charte graphique", "Contenus textes", "Accès aux comptes", "Bon de commande signé"],
    outcomes: [
      "Un portail à vos couleurs et votre logo pour chaque client",
      "Validation, modification ou refus commentés sur chaque livrable",
      "Contenus du client collectés au même endroit",
      "Vous savez quand le client ouvre et consulte vos maquettes",
    ],
    faq: [
      { question: "Mes clients voient-ils la marque Docalio ?", answer: "À partir du forfait Essentiel, le portail s'affiche à vos couleurs et avec votre logo." },
      { question: "Quels formats peut-on partager ?", answer: "PDF, images, documents Office et archives ZIP, jusqu'à 1 Go par fichier selon votre forfait." },
      { question: "Combien de clients puis-je inviter ?", answer: "Autant que vous voulez : les clients invités ne sont jamais facturés." },
    ],
  },
  {
    slug: "immobilier",
    name: "Immobilier",
    seoTitle: "Dossier locataire et acquéreur en ligne : portail client immobilier",
    seoDescription:
      "Constituez les dossiers locataires et acquéreurs en ligne : liste de pièces, dépôt sans compte, relances simplifiées, données hébergées en Europe.",
    eyebrow: "Pour les agences immobilières et administrateurs de biens",
    title: "Des dossiers complets, du premier coup.",
    subtitle:
      "Envoyez la liste des pièces à fournir, vos candidats et acquéreurs les déposent depuis leur téléphone. Vous voyez immédiatement les dossiers prêts à être présentés.",
    image: "/images/immobilier.jpg",
    imageAlt: "Intérieur lumineux et moderne",
    pains: [
      { title: "Des dossiers à trous", text: "Il manque toujours un avis d'imposition ou un bulletin de salaire." },
      { title: "Des données personnelles exposées", text: "Pièces d'identité et revenus circulent par e-mail, sans protection." },
      { title: "Du temps perdu", text: "Relancer, recompter, renommer les fichiers : des heures chaque semaine." },
    ],
    requestExamples: ["Pièce d'identité", "Justificatif de domicile", "3 derniers bulletins de salaire", "Avis d'imposition", "Titre de propriété"],
    outcomes: [
      "Liste de pièces standard prête en un clic",
      "Dépôt depuis le mobile, sans compte",
      "Pièces refusées avec motif, redéposées par le candidat",
      "Suppression simple des dossiers après usage",
    ],
    faq: [
      { question: "Le candidat doit-il créer un compte ?", answer: "Non. Il reçoit un lien sécurisé et dépose ses pièces directement." },
      { question: "Puis-je supprimer un dossier une fois la location signée ?", answer: "Oui, la suppression d'un espace supprime aussi ses fichiers." },
      { question: "Où sont hébergées les pièces ?", answer: "Dans l'Union européenne, dans un stockage privé non public." },
    ],
  },
  {
    slug: "conseil",
    name: "Conseil & freelances",
    seoTitle: "Portail client consultant & freelance : missions et livrables",
    seoDescription:
      "Un espace client professionnel pour chaque mission : collecte des données d'entrée, partage des livrables, validation en ligne et suivi des consultations.",
    eyebrow: "Pour les consultants et indépendants",
    title: "L'expérience client d'un grand cabinet, seul ou à trois.",
    subtitle:
      "Chaque mission a son espace : vos clients y trouvent propositions et livrables, y déposent leurs données et valident vos rendus.",
    image: "/images/conseil.jpg",
    imageAlt: "Réunion de travail autour d'une présentation",
    pains: [
      { title: "Des échanges qui font amateur", text: "Pièces jointes, versions multiples, liens qui expirent : l'image en pâtit." },
      { title: "Des données d'entrée en retard", text: "La mission démarre tard parce que les documents du client n'arrivent pas." },
      { title: "Des validations floues", text: "Qui a validé quoi, et quand ? Difficile à prouver en fin de mission." },
    ],
    requestExamples: ["Bon de commande signé", "Données d'entrée de la mission", "Organigramme", "Documents de référence"],
    outcomes: [
      "Un portail premium par client, à votre image",
      "Collecte des données d'entrée avec échéances",
      "Validation horodatée de chaque livrable",
      "Gratuit pour démarrer, 29 € HT/mois ensuite",
    ],
    faq: [
      { question: "Est-ce adapté à un indépendant seul ?", answer: "Oui. Le forfait Découverte est gratuit, et Essentiel couvre jusqu'à 3 utilisateurs pour 29 € HT/mois." },
      { question: "Puis-je présenter une proposition commerciale ?", answer: "Oui, partagez-la dans l'espace du prospect et suivez quand il l'ouvre." },
      { question: "Mes clients doivent-ils payer ?", answer: "Jamais. Seul votre cabinet a un abonnement." },
    ],
  },
  {
    slug: "btp",
    name: "Bâtiment & artisans",
    seoTitle: "Portail client BTP & artisans : devis, plans et chantiers",
    seoDescription:
      "Partagez devis et plans, récupérez les documents du client et faites valider vos devis en ligne. Un espace par chantier, accessible sans compte.",
    eyebrow: "Pour les entreprises du bâtiment et artisans",
    title: "Un espace par chantier. Zéro papier perdu.",
    subtitle:
      "Devis, plans, photos et attestations au même endroit. Votre client valide le devis en ligne et dépose ce que vous lui demandez.",
    image: "/images/btp.jpg",
    imageAlt: "Bureau d'études dans un espace de travail ouvert",
    pains: [
      { title: "Des devis sans réponse", text: "Le client a-t-il seulement ouvert le devis ? Impossible à savoir." },
      { title: "Des documents introuvables", text: "Plans et attestations dispersés entre e-mails et téléphone." },
      { title: "Des acomptes qui tardent", text: "Sans justificatif de virement, le chantier ne peut pas démarrer." },
    ],
    requestExamples: ["Devis signé", "Plans du bien", "Attestation d'assurance", "Acompte (justificatif de virement)"],
    outcomes: [
      "Suivi d'ouverture de vos devis",
      "Validation du devis en ligne, commentée",
      "Toutes les pièces du chantier centralisées",
      "Accès mobile pour vos clients, sans compte",
    ],
    faq: [
      { question: "Le client peut-il valider un devis ?", answer: "Oui : il approuve, demande une modification ou refuse, avec un commentaire. Vous êtes notifié." },
      { question: "Est-ce une signature électronique ?", answer: "Non, c'est une validation tracée. Pour une signature à valeur probante, utilisez un service de signature qualifié." },
      { question: "Et sur mobile ?", answer: "Le portail est pensé pour le téléphone : consulter, déposer une photo, valider." },
    ],
  },
];

export function getSolution(slug: string): Solution | undefined {
  return SOLUTIONS.find((s) => s.slug === slug);
}
