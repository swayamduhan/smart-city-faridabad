import type { Metadata, Viewport } from "next";
import { Anek_Devanagari, Anek_Latin, Doto, Overpass } from "next/font/google";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MobileNav } from "@/components/mobile-nav";
import { currentUser } from "@/lib/auth";
import "./globals.css";

// Overpass is derived from Highway Gothic, the road sign lettering. Anek carries both scripts at display sizes.
const overpass = Overpass({ variable: "--font-overpass", subsets: ["latin"] });
const anekLatin = Anek_Latin({ variable: "--font-anek-latin", subsets: ["latin"], axes: ["wdth"] });
const anekDeva = Anek_Devanagari({ variable: "--font-anek-deva", subsets: ["devanagari"], axes: ["wdth"] });
const doto = Doto({ variable: "--font-doto", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Faridabad, in one place", template: "%s | Faridabad" },
  description: "Pay city bills, report local problems, find places, check buses and metro, browse jobs and see who represents your ward. A college demo with sample data.",
};

export const viewport: Viewport = {
  themeColor: "#00603f",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();
  return (
    <html lang="en" className={`${overpass.variable} ${anekLatin.variable} ${anekDeva.variable} ${doto.variable}`}>
      <body className="min-h-svh flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] btn btn-mark">
          Skip to content
        </a>
        <Header user={user ? { name: user.name, role: user.role } : null} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
        <MobileNav />
      </body>
    </html>
  );
}
