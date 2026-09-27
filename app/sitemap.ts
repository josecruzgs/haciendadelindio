import type { MetadataRoute } from "next";
import { rooms } from "@/data/rooms";
import { site } from "@/data/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", "/habitaciones", ...rooms.map((r) => `/habitaciones/${r.slug}`), "/menu", "/reservar"];
  return paths.map((p) => ({ url: `${site.url}${p}`, changeFrequency: "monthly", priority: p === "" ? 1 : 0.8 }));
}
