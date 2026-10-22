import { siteOrigin } from "@/lib/site-origin";
import { headers } from "next/headers";
import type { Metadata } from "next";
import "./fonts.css";
import "./globals.css";
import { LanguageState } from "@/components/LanguageState";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: "FILUMIRE | Personalised Learning for Africa",
  description:
    "Discover FILUMIRE’s EduTutor and adaptive learning approach for African children, with information for families, teachers, schools and potential partners.",
  keywords: [
    "FILUMIRE",
    "EduTutor",
    "Adaptive Learning Africa",
    "Ghana Curriculum",
    "NaCCA",
    "Primary Education",
    "African Learning Intelligence",
    "FILU",
  ],
  authors: [{ name: "FILUMIRE" }],
  icons: {
    icon: "/brand/filumire-logo-blue.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await headers()).get("x-filumire-locale") === "fr" ? "fr" : "en";
  return (
    <html lang={locale} className="font-sans font-hand">
      <head>
        <link rel="preload" href="/fonts/montserrat-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/kalam-latin-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/kalam-latin-700.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        <LanguageState />
        <Navbar />
        <main id="main-content" tabIndex={-1} style={{ flex: "1 0 auto" }}>{children}</main>
        <Footer locale={locale} />
      </body>
    </html>
  );
}
