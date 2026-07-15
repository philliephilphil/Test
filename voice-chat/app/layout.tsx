import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sprach-Chat mit Claude",
  description: "Sprich natürlich mit Claude – auf Deutsch, mit Sprachausgabe.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
