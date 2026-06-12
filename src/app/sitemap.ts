import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    "",
    "/fonctionnalites",
    "/tarifs",
    "/securite",
    "/cas-usage",
    "/contact",
  ];

  return routes.map((path) => ({
    url: `${SITE.url}${path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
