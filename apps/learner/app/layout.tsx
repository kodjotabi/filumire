import type { Metadata, Viewport } from "next";
import { Montserrat, Kalam } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "./ServiceWorkerRegister";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const kalam = Kalam({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-hand",
});

export const metadata: Metadata = {
  title: "FILUMIRE EduTutor",
  description: "Adaptive learning for every learner.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "FILUMIRE",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B3573",
};

export default function LearnerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${montserrat.className} ${kalam.variable}`}>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}