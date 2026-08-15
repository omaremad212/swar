"use client";

import { useState } from "react";
import Image, { type StaticImageData } from "next/image";
import { motion } from "framer-motion";
import { Reveal } from "@/components/home/ui";
import {
  BANK,
  PACKAGES as DEFAULT_PACKAGES,
  pkgAddonText,
  pkgIncludeText,
  pkgNoteText,
  pkgRowText,
  pkgText,
  pkgTierItemText,
  pkgTierText,
  pkgYachtText,
  type Pkg,
} from "@/lib/packages";
import { ALL_PHOTOS, FISHING, HERO_SUNSET, MARINA_BOAT, CABIN } from "@/components/home/images";
import BookingModal from "./BookingModal";
import { useI18n, pick } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";

const PKG_IMAGE: Record<string, StaticImageData> = {
  swim: ALL_PHOTOS[1],
  fish: FISHING,
  hour: ALL_PHOTOS[6],
  party: ALL_PHOTOS[9],
  dolphin: MARINA_BOAT,
  vip: HERO_SUNSET,
};

export default function BookingPackages({ packages }: { packages?: Pkg[] }) {
  const [active, setActive] = useState<{ pkg: Pkg; image: StaticImageData } | null>(null);
  const { t, locale } = useI18n();
  const { discountAr, discountEn, bankName, accName, iban } = useSettings();
  const PACKAGES = packages && packages.length ? packages : DEFAULT_PACKAGES;
  const bankDisplay = locale === "en" && bankName === BANK.bank ? "Al Rajhi Bank" : bankName;
  const accountDisplay = locale === "en" && accName === BANK.name ? "Sewar Al-Bahr Trading Establishment" : accName;

  return (
    <section className="relative bg-navy-50/40 py-20 sm:py-28">
      <div className="container-px">
        {(discountAr || discountEn) && (
          <Reveal>
            <div className="mx-auto mb-14 flex max-w-2xl flex-col items-center gap-1 rounded-3xl border border-gold-400/40 bg-white px-6 py-5 text-center shadow-luxe">
              <span className="text-lg font-extrabold text-navy-900 sm:text-xl">{pick(locale, discountAr, discountEn)}</span>
              <span className="text-sm font-semibold text-navy-900/55">{t("booking.discountSub")}</span>
            </div>
          </Reveal>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {PACKAGES.map((pkg, i) => {
            const image = PKG_IMAGE[pkg.id] ?? CABIN;
            return (
              <Reveal key={pkg.id} delay={(i % 2) * 0.08} className="h-full">
                <PackageCard pkg={pkg} image={image} onBook={() => setActive({ pkg, image })} />
              </Reveal>
            );
          })}
        </div>

        <BookingModal pkg={active?.pkg ?? null} image={active?.image} onClose={() => setActive(null)} />

        {/* Bank details */}
        <Reveal>
          <div className="mt-16 overflow-hidden rounded-[28px] border border-ocean-500/15 bg-white p-8 shadow-luxe sm:p-10">
            <h3 className="text-2xl font-extrabold text-navy-900">{t("booking.bankTitle")}</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <BankRow label={t("booking.bank")} value={bankDisplay} copyValue={bankName} />
              <BankRow label={t("booking.accName")} value={accountDisplay} copyValue={accName} />
              <BankRow label={t("booking.iban")} value={iban} mono />
            </div>
            <p className="mt-6 rounded-2xl bg-navy-50/70 px-5 py-4 text-sm leading-relaxed text-navy-900/70">
              {t("booking.cancelPolicy")}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function BankRow({ label, value, copyValue, mono }: { label: string; value: string; copyValue?: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(copyValue ?? value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex flex-col items-start gap-1 rounded-2xl bg-navy-50/60 px-5 py-4 text-start transition-colors hover:bg-navy-50"
    >
      <span className="text-xs text-navy-900/50">{label}</span>
      <span className={`font-bold text-navy-900 ${mono ? "font-mono tracking-wide" : ""}`}>{value}</span>
      <span className="text-xs text-turquoise-600">{copied ? t("booking.copied") : t("booking.copy")}</span>
    </button>
  );
}

function PackageCard({ pkg, image, onBook }: { pkg: Pkg; image: StaticImageData; onBook: () => void }) {
  const { t, locale } = useI18n();
  const { discountPct } = useSettings();
  const sar = pick(locale, "ريال", "SAR");
  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className={`flex h-full flex-col overflow-hidden rounded-[28px] bg-white shadow-luxe ${
        pkg.featured ? "ring-2 ring-gold-400" : "border border-navy-50"
      }`}
    >
      {/* photo header */}
      <div className="card-shine relative h-56 overflow-hidden">
        <Image src={image} alt={pkgText(locale, pkg, "title")} fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/35 to-transparent" />
        {discountPct > 0 && (
          <span className="absolute right-5 top-5 rounded-full bg-gold-400 px-3 py-1 text-xs font-extrabold text-navy-950">
            {pick(locale, "خصم", "Save")} {discountPct}%
          </span>
        )}
        {pkg.featured && (
          <span className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-navy-950">
            {t("booking.mostPopular")}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-6">
          <h3 className="text-2xl font-extrabold text-white drop-shadow">{pkgText(locale, pkg, "title")}</h3>
          <p className="mt-1 text-sm text-white/85">{pkgText(locale, pkg, "subtitle")}</p>
        </div>
      </div>

      {/* price strip */}
      <div className="flex items-end justify-between gap-2 border-b border-navy-50 px-6 py-4">
        <div className="flex items-end gap-2">
          <span className="text-xs text-navy-900/45">{t("pricing.from")}</span>
          {pkg.oldPrice !== pkg.price && <span className="text-sm text-navy-900/40 line-through">{pkg.oldPrice.toLocaleString()}</span>}
          <span className="text-3xl font-extrabold text-navy-900">{pkg.price.toLocaleString()}</span>
          <span className="text-sm font-semibold text-navy-900/60">{pkgText(locale, pkg, "unit")}</span>
        </div>
        <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-ocean-600">{pkgText(locale, pkg, "capacity")}</span>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col p-6">
        <p className="mb-3 rounded-2xl border border-gold-400/40 bg-gold-400/10 px-4 py-2.5 text-center text-xs font-bold text-navy-900">
          🥤🥨 {pick(locale, "مشروبات غازية وعصيرات مشكلة وسناكات — متاحة طوال الرحلة", "Soft drinks, mixed juices & snacks — available throughout the trip")}
        </p>
        <p className="rounded-2xl bg-navy-50/70 px-4 py-3 text-sm leading-relaxed text-navy-900/70">{pkgYachtText(locale, pkg)}</p>

        {pkg.rows && (
          <ul className="mt-5 flex flex-col gap-2">
            {pkg.rows.map((r, rowIndex) => (
              <li key={r.label} className="flex items-center justify-between gap-3 rounded-xl bg-navy-50/50 px-4 py-3">
                <span className="text-sm text-navy-900/70">{pkgRowText(locale, pkg, rowIndex)}</span>
                <span className="shrink-0 font-bold text-navy-900">
                  {r.oldPrice && r.oldPrice !== r.price && <span className="me-2 text-xs text-navy-900/40 line-through">{r.oldPrice.toLocaleString()}</span>}
                  <span className="text-turquoise-600">{r.price.toLocaleString()}</span>
                  <span className="ms-1 text-xs font-normal text-navy-900/50">{sar}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {pkg.tiers && (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {pkg.tiers.map((tier, tierIndex) => (
              <div key={tier.name} className="rounded-2xl border border-navy-50 bg-navy-50/40 p-4 text-center">
                <div className="text-base font-extrabold text-navy-900">{pkgTierText(locale, pkg, tierIndex, "name")}</div>
                <div className="mt-1">
                  {tier.oldPrice !== tier.price && <><span className="text-xs text-navy-900/40 line-through">{tier.oldPrice.toLocaleString()}</span>{" "}</>}
                  <span className="text-xl font-extrabold text-turquoise-600">{tier.price.toLocaleString()}</span>
                  <span className="text-xs text-navy-900/50"> {sar}</span>
                </div>
                <div className="mt-1 text-[11px] text-navy-900/45">{pkgTierText(locale, pkg, tierIndex, "note")}</div>
                <ul className="mt-3 space-y-1 text-start text-xs text-navy-900/65">
                  {tier.items.map((item, itemIndex) => (
                    <li key={item}>{pkgTierItemText(locale, pkg, tierIndex, itemIndex)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {pkg.addons && (
          <>
            <p className="mt-5 text-sm font-bold text-navy-900">{pick(locale, "إضافات اختيارية", "Optional add-ons")}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {pkg.addons.map((ad) => (
                <li key={ad.label} className="rounded-full bg-navy-50/70 px-3 py-1.5 text-xs font-semibold text-navy-900/70">
                  {pkgAddonText(locale, pkg, ad)} <span className="text-turquoise-600">+{ad.price} {sar}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {pkg.includes && (
          <>
            <p className="mt-5 text-sm font-bold text-navy-900">{pick(locale, "يشمل الباقة", "Package includes")}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {pkg.includes.map((inc, includeIndex) => (
                <span key={inc} className="rounded-xl bg-navy-50/50 px-3 py-2 text-xs font-medium text-navy-900/70">{pkgIncludeText(locale, pkg, includeIndex)}</span>
              ))}
            </div>
          </>
        )}

        {pkg.note && (
          <p className="mt-5 rounded-2xl bg-navy-50/70 px-4 py-3 text-xs leading-relaxed text-navy-900/65">{pkgNoteText(locale, pkg)}</p>
        )}

        <button type="button" onClick={onBook} className="mt-auto pt-6">
          <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-navy-950 via-navy-900 to-ocean-600 py-4 font-bold text-white shadow-lg ring-1 ring-turquoise-500/30 transition-transform hover:scale-[1.02]">
            {t("booking.customizeBook")}
          </span>
        </button>
      </div>
    </motion.article>
  );
}
