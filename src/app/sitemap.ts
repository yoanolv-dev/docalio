import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { SOLUTIONS } from "@/lib/marketing/solutions";
import { COMPARISONS } from "@/lib/marketing/comparisons";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entry = (
    path: string,
    priority: number,
    changeFrequency: "weekly" | "monthly" | "yearly" = "monthly"
  ) => ({ url: `${SITE.url}${path}`, lastModified: now, changeFrequency, priority });

  return [
    entry("", 1, "weekly"),
    entry("/fonctionnalites", 0.9),
    entry("/tarifs", 0.9),
    ...SOLUTIONS.map((s) => entry(`/solutions/${s.slug}`, 0.85)),
    ...COMPARISONS.map((c) => entry(`/comparatif/${c.slug}`, 0.8)),
    entry("/securite", 0.7),
    entry("/cas-usage", 0.6),
    entry("/contact", 0.6),
    entry("/mentions-legales", 0.2, "yearly"),
    entry("/confidentialite", 0.3, "yearly"),
    entry("/conditions", 0.2, "yearly"),
  ];
}
