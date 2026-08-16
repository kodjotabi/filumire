import type { Metadata } from "next";
import { StoreProvider } from "@/components/providers/StoreProvider";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "FILUMIRE — Trust & Verification Network",
  description:
    "Persistent digital identities and verifiable claims. Phase 0 clickable prototype.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
