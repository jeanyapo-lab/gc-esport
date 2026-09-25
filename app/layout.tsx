import type { Metadata } from "next";
import { Orbitron, Poppins } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-orbitron",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

const title = "GC ESPORT — Draft & compétitions e-sport en Côte d'Ivoire";
const description =
  "GC ESPORT détecte, évalue et fait jouer les talents gaming ivoiriens au sein d'équipes d'entreprises, à travers le GC ESPORT DRAFT.";

export const metadata: Metadata = {
  metadataBase: new URL("https://gcesportci.netlify.app"),
  title,
  description,
  openGraph: {
    title,
    description,
    locale: "fr_CI",
    type: "website",
    siteName: "GC ESPORT",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${orbitron.variable} ${poppins.variable}`}>
      <body className="font-body">
        <Header />
        <main>
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer />
      </body>
    </html>
  );
}
