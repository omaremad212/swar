"use client";

import Image from "next/image";
import Link from "next/link";
import { Reveal } from "./ui";
import { LOGO } from "./images";
import { NAV } from "@/lib/site";
import SocialIcon from "@/components/SocialIcon";
import { useI18n } from "@/lib/i18n";
import { useSettings, phoneHref } from "@/lib/settings";

const SOCIAL_LABELS_EN: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  snapchat: "Snapchat",
  tiktok: "TikTok",
  telegram: "Telegram",
  facebook: "Facebook",
  youtube: "YouTube",
};

export default function Footer() {
  const { t, locale } = useI18n();
  const { socials: SOCIALS, phone, email, brand, brandEn } = useSettings();
  return (
    <footer
      id="contact"
      className="relative overflow-hidden border-t border-navy-100 bg-white pt-20 text-navy-900"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gold-line" />

      <div className="container-px relative">
        <Reveal>
          <div className="sea-panel mb-16 flex flex-col items-center gap-6 rounded-[32px] px-8 py-12 text-center text-white shadow-luxe ring-1 ring-gold-400/25 sm:flex-row sm:justify-between sm:text-start">
            <div>
              <h3 className="text-2xl font-extrabold sm:text-3xl">{t("footer.ctaTitle")}</h3>
              <p className="mt-2 text-white/85">{t("footer.ctaDesc")}</p>
            </div>
            <Link href="/booking" className="btn-gold shrink-0 text-base">
              {t("cta.book")}
            </Link>
          </div>
        </Reveal>

        <div className="grid gap-12 pb-14 md:grid-cols-2 lg:grid-cols-3">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Image src={LOGO} alt={locale === "en" ? "Sewar Marine logo" : "شعار سوار البحرية"} className="h-20 w-auto sm:h-24" />
            <p className="mt-5 leading-relaxed text-navy-900/60">{t("footer.brandDesc")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {SOCIALS.map((soc) => (
                <a
                  key={soc.key}
                  href={soc.href}
                  aria-label={locale === "en" ? SOCIAL_LABELS_EN[soc.key] ?? soc.label : soc.label}
                  title={locale === "en" ? SOCIAL_LABELS_EN[soc.key] ?? soc.label : soc.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-navy-200 bg-navy-50 text-navy-700 transition-all hover:-translate-y-1 hover:border-gold-400 hover:text-gold-600"
                >
                  <SocialIcon name={soc.key} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-lg font-bold">{t("footer.quickLinks")}</h4>
            <ul className="mt-5 flex flex-col gap-3">
              {NAV.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-navy-900/65 transition-colors hover:text-gold-600">
                    {t(l.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-bold">{t("footer.contactUs")}</h4>
            <ul className="mt-5 flex flex-col gap-4 text-navy-900/65">
              <li className="flex items-start gap-3">
                <PinIcon />
                <span>{t("footer.location")}</span>
              </li>
              <li className="flex items-center gap-3">
                <PhoneIcon />
                <a dir="ltr" href={phoneHref(phone)} className="hover:text-gold-600">
                  {phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <MailIcon />
                <a href={`mailto:${email}`} className="hover:text-gold-600">
                  {email}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-navy-100">
        <div className="container-px flex flex-col items-center justify-between gap-3 py-6 text-sm text-navy-900/55 sm:flex-row">
          <p>© 2026 {locale === "en" ? brandEn : `${brand} · ${brandEn}`}. {t("footer.rights")}</p>
        </div>
      </div>
    </footer>
  );
}

/* ---------- contact icons ---------- */
function PinIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D7B36B" strokeWidth="2" className="mt-0.5 shrink-0">
      <path d="M12 21s-7-5.5-7-11a7 7 0 0114 0c0 5.5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D7B36B" strokeWidth="2" className="shrink-0">
      <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3-8.6A2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.7a2 2 0 01-.4 2.1L8.1 9.9a16 16 0 006 6l1.4-1.2a2 2 0 012.1-.4c.9.3 1.8.5 2.7.6a2 2 0 011.7 2z" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D7B36B" strokeWidth="2" className="shrink-0">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 6l-10 7L2 6" />
    </svg>
  );
}
