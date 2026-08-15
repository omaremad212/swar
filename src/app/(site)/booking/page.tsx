import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import BookingPackages from "@/components/booking/BookingPackages";
import { FISHING } from "@/components/home/images";
import { pick, tt } from "@/lib/i18n-core";
import { getServerLocale } from "@/lib/locale-server";
import { getPackagesMerged } from "@/lib/content-server";
import { pkgText } from "@/lib/packages";

export function generateMetadata(): Metadata {
  const locale = getServerLocale();
  return {
    alternates: { canonical: "/booking" },
    title: pick(locale, "الحجوزات وأسعار الرحلات", "Bookings and Trip Prices"),
    description: pick(
      locale,
      "احجز رحلتك البحرية الفاخرة في ثول مع سوار البحرية. باقات السباحة والصيد والدلافين والحفلات والرحلات الملكية VIP.",
      "Book your luxury sea trip in Thoul with Sewar Marine. Explore swimming, fishing, dolphin watching, private party and VIP royal fishing packages.",
    ),
  };
}

export default async function BookingPage() {
  const locale = getServerLocale();
  const packages = await getPackagesMerged();
  const offersLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: pick(locale, "باقات رحلات سوار البحرية", "Sewar Marine trip packages"),
    itemListElement: packages.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Service",
        name: pkgText(locale, p, "title"),
        description: pkgText(locale, p, "subtitle"),
        offers: { "@type": "Offer", price: p.price, priceCurrency: "SAR" },
      },
    })),
  };
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(offersLd) }} />
      <PageHero
        eyebrow={tt(locale, "booking.eyebrow")}
        title={tt(locale, "booking.title")}
        subtitle={tt(locale, "booking.subtitle")}
        image={FISHING}
      />
      <BookingPackages packages={packages} />
    </main>
  );
}
