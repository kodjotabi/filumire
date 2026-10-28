import { siteOrigin } from "@/lib/site-origin";
import { headers } from "next/headers";
import type { Metadata } from "next";
import "./fonts.css";
import "./globals.css";
import "./site.css";
import { LanguageState } from "@/components/LanguageState";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteFrame } from "@/components/layout/SiteFrame";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: "FILUMIRE | Personal learning for every child",
  description:
    "FILUMIRE is a personal tutor for children in Africa that follows the national curriculum, adapts to every answer and is guided by FILU.",
  keywords: [
    "FILUMIRE",
    "EduTutor",
    "Adaptive Learning Africa",
    "Ghana Curriculum",
    "NaCCA",
    "Basic 4–9",
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
        <SiteFrame header={<SiteHeader />} footer={<SiteFooter />}>{children}</SiteFrame>
      </body>
    </html>
  );
}
