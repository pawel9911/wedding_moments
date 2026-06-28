import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Natalia & Pawel - Wesele 2026",
  description:
    "Witamy na naszej stronie weselnej! To tutaj zbieramy wszystkie wspomnienia z naszego wyjątkowego dnia. Cieszymy się, że byliście z nami i zachęcamy do dodawania Waszych zdjęć z ceremonii oraz przyjęcia – stwórzmy razem tę piękną pamiątkę!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
