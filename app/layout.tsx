import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export const metadata: Metadata = {
  title: "FOAM | فوم - منصة إدارة وحجوزات مغاسل السيارات الذكية",
  description: "منظومة سحابية متطورة لإدارة حجوزات ومحطات مغاسل السيارات عبر رموز الـ QR مباشرة بدون انتظار.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-500 selection:text-white">
        <LanguageProvider>
          {children}
          {/* Universal floating language switcher button accessible on every page */}
          <LanguageSwitcher variant="floating" />
        </LanguageProvider>
      </body>
    </html>
  );
}
