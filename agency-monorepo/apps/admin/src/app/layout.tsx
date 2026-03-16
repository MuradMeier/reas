import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers"; // <-- добавить импорт
import { Toaster } from "react-hot-toast";
import Header from "@/components/Header";
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRM Агентство",
  description: "Панель управления агентством недвижимости",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
  <AuthProvider>
    <SettingsProvider>   {/* ← добавить эту строку */}
      <Header />
      <main className="min-h-screen bg-gray-50">
        {children}
      </main>
      <Toaster position="top-center" />
    </SettingsProvider>   {/* ← и закрывающий тег */}
  </AuthProvider>
</Providers>
      </body>
    </html>
  );
}