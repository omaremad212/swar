import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import heroOg from "../../الهيرو الاولي.webp";
import { SITE_URL } from "@/lib/site";
import { LocaleProvider } from "@/lib/i18n";
import { dir, pick } from "@/lib/i18n-core";
import { getServerLocale } from "@/lib/locale-server";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
});

export function generateMetadata(): Metadata {
  const locale = getServerLocale();
  const title = pick(locale, "سوار | رحلات بحرية فاخرة في ثول والبحر الأحمر", "Sewar | Luxury Sea Trips in Thoul and the Red Sea");
  const description = pick(
    locale,
    "عِش معنا متعة بحرية لا تُنسى وخُض تجربة بحرية لا مثيل لها مع سوار، رحلات اليخوت والمغامرات البحرية الفاخرة في ثول على ساحل البحر الأحمر.",
    "Enjoy an unforgettable sea adventure with Sewar Marine, offering luxury yacht trips and marine experiences in Thoul on the Red Sea coast.",
  );
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: pick(locale, "%s | سوار البحرية", "%s | Sewar Marine"),
    },
    description,
    keywords: pick(
      locale,
      ["رحلات بحرية", "ثول", "البحر الأحمر", "يخوت", "سياحة بحرية", "سوار"],
      ["sea trips", "Thoul", "Red Sea", "yachts", "marine tourism", "Sewar Marine"],
    ),
    openGraph: {
      title,
      description,
      type: "website",
      locale: pick(locale, "ar_SA", "en_US"),
      siteName: pick(locale, "سوار البحرية", "Sewar Marine"),
      images: [heroOg.src],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [heroOg.src],
    },
    alternates: { canonical: "/" },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
    icons: {
      icon: [{ url: "/icon.webp", type: "image/webp" }],
      apple: [{ url: "/icon.webp" }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0A1A2F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = getServerLocale();
  return (
    <html lang={locale} dir={dir(locale)} className={cairo.variable}>
      <body className="font-cairo antialiased">
        <LocaleProvider initial={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
