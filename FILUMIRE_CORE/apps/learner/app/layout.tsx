import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FILUMIRE EduTutor",
  description: "Adaptive learning for every learner.",
};

export default function LearnerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}