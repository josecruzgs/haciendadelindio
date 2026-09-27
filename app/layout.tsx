import type { Metadata, Viewport } from "next";
import { Kaushan_Script, Montserrat, Oswald, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { site } from "@/data/site";
import { breakfastPrice, petsAllowed, rooms } from "@/data/rooms";
import { amenities } from "@/components/AmenityList";

const oswald = Oswald({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-oswald" });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["700", "800", "900"], variable: "--font-montserrat" });
const kaushan = Kaushan_Script({ subsets: ["latin"], weight: "400", variable: "--font-kaushan" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["300", "400", "600", "700", "800"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "Hotel | Hacienda del Indio | Mexicali", template: "%s | Hacienda del Indio" },
  description: site.description,
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: site.name,
    title: "Hotel | Hacienda del Indio | Mexicali",
    description: site.description,
  },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = { themeColor: "#22635f" };

const prices = rooms.map((r) => r.price);
const jsonLd = {
  "@context": "https://schema.org",
  "@type": ["Hotel", "LodgingBusiness"],
  name: site.name,
  description: site.description,
  url: site.url,
  image: `${site.url}/images/zona-fachada-palmeras.jpg`,
  logo: `${site.url}/images/logo-color.png`,
  telephone: site.phone.e164,
  email: site.complaintsEmail,
  priceRange: `$${Math.min(...prices)}–$${Math.max(...prices)} MXN`,
  currenciesAccepted: "MXN",
  petsAllowed,
  address: {
    "@type": "PostalAddress",
    streetAddress: `${site.address.street}, ${site.address.neighborhood}`,
    addressLocality: site.address.city,
    addressRegion: site.address.regionFull,
    postalCode: site.address.postalCode,
    addressCountry: site.address.country,
  },
  amenityFeature: amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a.label, value: true })),
  makesOffer: [
    ...rooms.map((r) => ({
      "@type": "Offer",
      name: r.name,
      price: r.price,
      priceCurrency: "MXN",
      url: `${site.url}/habitaciones/${r.slug}`,
    })),
    { "@type": "Offer", name: "Desayuno por persona", price: breakfastPrice, priceCurrency: "MXN" },
  ],
  sameAs: [site.facebook.url],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={`${oswald.variable} ${montserrat.variable} ${kaushan.variable} ${jakarta.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
