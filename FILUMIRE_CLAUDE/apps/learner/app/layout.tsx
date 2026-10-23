import type { Metadata, Viewport } from "next";
import "./local-fonts.css";
import "./globals.css";
import "./learner-interface.css";
import ServiceWorkerRegister from "./ServiceWorkerRegister";
import { PrivatePresentationNotice } from '../components/filumire/PrivatePresentationNotice';

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
  // A private review is never indexed. Read at build time; Vercel builds with the runtime environment.
  ...(process.env.FILUMIRE_ACCESS_MODE === "reviewers" ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = {
  themeColor: "#0B3573",
  // White-dominant by design: browsers that force dark mode on websites
  // (Samsung Internet, Chrome's auto-dark) must leave FILUMIRE as it is.
  colorScheme: "only light",
};

export default function LearnerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-montserrat font-hand">
        {/* Presentation availability is a server runtime setting, read after load so pages stay static. */}
        <PrivatePresentationNotice />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
