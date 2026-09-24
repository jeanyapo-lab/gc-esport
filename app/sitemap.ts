import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const baseUrl = "https://gcesportci.netlify.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/competitions",
    "/classements",
    "/equipes",
    "/notre-equipe",
    "/joueurs",
    "/entreprises",
    "/draft",
    "/actualites",
    "/fan-zone",
    "/partenaires",
    "/calendrier",
    "/faq",
    "/a-propos",
    "/contact",
    "/cgu",
    "/confidentialite",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));

  const { data: joueurs } = await supabase.from("player_profiles").select("id").eq("profil_public", true);

  const joueurRoutes = (joueurs ?? []).map((j) => ({
    url: `${baseUrl}/joueurs/${j.id}`,
    lastModified: new Date(),
  }));

  return [...staticRoutes, ...joueurRoutes];
}
