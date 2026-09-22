import type { Metadata } from "next";
import { Orbitron, Poppins } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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

export const metadata: Metadata = {
  title: "GC ESPORT — Draft & compétitions e-sport en Côte d'Ivoire",
  description:
    "GC ESPORT détecte, évalue et fait jouer les talents gaming ivoiriens au sein d'équipes d'entreprises, à travers le GC ESPORT DRAFT.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${orbitron.variable} ${poppins.variable}`}>
      <body className="font-body">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
