import type { Metadata } from "next";
import { LanguageProvider } from "@/lib/language";
import "./globals.css";

export const metadata: Metadata = {
  title: "Earth Pulse — See how Earth is changing",
  description:
    "Explore real NASA Earth data in simple words. See how the climate is changing where you live.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
