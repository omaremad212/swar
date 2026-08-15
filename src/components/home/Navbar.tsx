"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LOGO } from "./images";
import { NAV } from "@/lib/site";
import { useI18n } from "@/lib/i18n";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { t, locale, toggle } = useI18n();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);


  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 border-b border-navy-50 bg-white transition-all duration-500 ${
        scrolled ? "py-2.5 shadow-luxe" : "py-4 shadow-sm"
      }`}
    >
      <nav className="container-px flex items-center justify-between gap-4">
        {/* Logo — natural aspect ratio, never cropped, on the white header */}
        <Link href="/" aria-label={locale === "en" ? "Sewar Marine" : "سوار البحرية"} className="shrink-0">
          <Image
            src={LOGO}
            alt={locale === "en" ? "Sewar Marine logo" : "شعار سوار البحرية"}
            priority
            className="h-12 w-auto sm:h-16"
          />
        </Link>

        {/* Desktop menu */}
        <ul className="hidden items-center gap-6 lg:flex xl:gap-7">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group relative text-[15px] font-semibold transition-colors ${
                    active ? "text-gold-600" : "text-navy-900/80 hover:text-navy-900"
                  }`}
                >
                  {t(item.key)}
                  <span
                    className={`absolute -bottom-1.5 right-0 h-0.5 bg-gold-500 transition-all duration-300 ${
                      active ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                  />
                </Link>
              </li>
            );
          })}
        </ul>

        {/* CTA + language + mobile toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-label="Switch language"
            className="rounded-full border border-navy-900/15 px-3 py-1.5 text-sm font-bold text-navy-900 transition-colors hover:border-gold-500 hover:text-gold-600"
          >
            {locale === "ar" ? "EN" : "ar"}
          </button>
          <Link href="/booking" className="btn-gold hidden text-sm sm:inline-flex">
            {t("cta.book")}
          </Link>
          <button
            type="button"
            aria-label={locale === "en" ? "Menu" : "القائمة"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-navy-100 text-navy-900 lg:hidden"
          >
            <span className="relative block h-4 w-5">
              <span className={`absolute right-0 block h-0.5 w-5 bg-navy-900 transition-all ${open ? "top-1.5 rotate-45" : "top-0"}`} />
              <span className={`absolute right-0 top-1.5 block h-0.5 w-5 bg-navy-900 transition-all ${open ? "opacity-0" : "opacity-100"}`} />
              <span className={`absolute right-0 block h-0.5 w-5 bg-navy-900 transition-all ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35 }}
            className="overflow-hidden lg:hidden"
          >
            <ul className="container-px mt-3 flex flex-col gap-1 rounded-3xl border border-navy-50 bg-white p-4 shadow-luxe">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-2xl px-4 py-3 font-semibold transition-colors hover:bg-navy-50 ${
                      pathname === item.href ? "text-gold-600" : "text-navy-900/85"
                    }`}
                  >
                    {t(item.key)}
                  </Link>
                </li>
              ))}
              <li className="mt-2">
                <Link href="/booking" onClick={() => setOpen(false)} className="btn-gold w-full">
                  {t("cta.book")}
                </Link>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
