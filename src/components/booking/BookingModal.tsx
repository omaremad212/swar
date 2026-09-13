"use client";

import { useEffect, useMemo, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  BANK,
  pkgAddonText,
  pkgRowText,
  pkgText,
  pkgTierText,
  pkgYachtText,
  type Pkg,
} from "@/lib/packages";
import { useI18n, pick } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n-core";
import { useSettings } from "@/lib/settings";
import { getPromoPercentage, normalizePromoCode } from "@/lib/promotions";

// Packages that can depart any hour of the day
const ALLDAY_PKG_IDS = new Set(["fish", "hour", "party", "vip"]);
// Dolphin: fixed morning only
const DOLPHIN_TIME = "09:00";

const DEPART_TIMES_24H = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
const DEPART_TIMES_DAY = ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

function getDepartTimes(pkgId?: string) {
  if (!pkgId) return DEPART_TIMES_DAY;
  if (pkgId === "dolphin") return [DOLPHIN_TIME];
  if (ALLDAY_PKG_IDS.has(pkgId)) return DEPART_TIMES_24H;
  return DEPART_TIMES_DAY;
}

function timeLabel(t: string, locale: Locale) {
  const h = parseInt(t.slice(0, 2), 10);
  const am = h < 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${locale === "en" ? (am ? "AM" : "PM") : (am ? "ص" : "م")}`;
}

function availabilityLabel(label: string, locale: Locale) {
  return locale === "en" ? label.replace("(اليوم التالي)", "(next day)") : label;
}

// Thu=4, Fri=5, Sat=6
function isWeekend(dateStr: string) {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T12:00:00").getDay();
  return d === 4 || d === 5 || d === 6;
}

const CANCEL_POLICY = {
  ar: "في حال إلغاء الرحلة من قِبَل العميل لأي سبب، لا يُرد المبلغ المحوَّل ولا يُستبدل. في حال وجود مشكلة من طرفنا، يُرد المبلغ كاملاً.",
  en: "If the client cancels for any reason, the transferred amount is non-refundable and non-exchangeable. If the issue is on our end, a full refund is provided.",
};

export default function BookingModal({ pkg, image, onClose }: { pkg: Pkg | null; image?: StaticImageData; onClose: () => void }) {
  const { locale } = useI18n();
  const { discountPct } = useSettings();
  const sar = pick(locale, "ريال", "SAR");
  const [rowIdx, setRowIdx] = useState(0);
  const [tierIdx, setTierIdx] = useState(0);
  const [persons, setPersons] = useState(2);
  const [qty, setQty] = useState<Record<string, number>>({}); // stepper add-ons
  const [toggles, setToggles] = useState<Record<string, boolean>>({}); // toggle add-ons
  const [weekend, setWeekend] = useState(false);
  const [date, setDate] = useState("");
  const [departTime, setDepartTime] = useState("09:00");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoPct, setPromoPct] = useState(0);
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [payMethod, setPayMethod] = useState<"bank" | "cash" | "online">("bank");
  const [payType, setPayType] = useState<"full" | "deposit">("full");
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [doneId, setDoneId] = useState<string | null>(null);
  // Availability: blocked time ranges per date
  const [availRanges, setAvailRanges] = useState<Record<string, { startH: number; endH: number; label: string }[]>>({});

  useEffect(() => {
    if (pkg) {
      setRowIdx(0); setTierIdx(0); setPersons(Math.min(2, pkg.maxBase));
      setQty({}); setToggles({}); setWeekend(false); setDate("");
      setDepartTime(pkg.id === "dolphin" ? DOLPHIN_TIME : "09:00");
      setName(""); setPhone(""); setNotes(""); setPromoCode(""); setPromoPct(0); setPromoMsg(null);
      setPayMethod("bank"); setPayType("full"); setError(""); setDoneId(null); setSubmitting(false); setAcknowledged(false);
      fetch("/api/availability").then((r) => r.json()).then((d) => setAvailRanges(d.ranges ?? {})).catch(() => {});
    }
  }, [pkg]);

  // Auto-detect weekend (Thu/Fri/Sat) from selected date
  useEffect(() => {
    if (pkg?.dayType) setWeekend(isWeekend(date));
  }, [date, pkg?.dayType]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (pkg) document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [pkg, onClose]);

  // ── price model (mirrors the original: discount applies to the whole subtotal) ──
  const baseOriginal = useMemo(() => {
    if (!pkg) return 0;
    if (pkg.tiers?.length) return pkg.tiers[tierIdx]?.oldPrice ?? pkg.oldPrice;
    if (pkg.rows?.length) return pkg.rows[rowIdx]?.oldPrice ?? pkg.oldPrice;
    return pkg.oldPrice;
  }, [pkg, rowIdx, tierIdx]);

  const addonsTotal = useMemo(() => {
    if (!pkg?.addons) return 0;
    return pkg.addons.reduce((sum, a) => {
      if (a.stepper) return sum + (qty[a.id] || 0) * a.price;
      return sum + (toggles[a.id] ? a.price : 0);
    }, 0);
  }, [pkg, qty, toggles]);

  const extraPersons = pkg ? Math.max(0, persons - pkg.maxBase) : 0;
  const extraCost = pkg ? extraPersons * pkg.extraPerPerson : 0;
  const dayTypeExtra = pkg?.dayType && weekend ? pkg.dayType : 0;

  const subtotal = baseOriginal + addonsTotal + extraCost + dayTypeExtra;
  const seasonDiscount = Math.round((subtotal * discountPct) / 100);
  const afterSeason = subtotal - seasonDiscount;
  const promoDiscount = promoPct ? Math.round((afterSeason * promoPct) / 100) : 0;
  const total = afterSeason - promoDiscount;
  const deposit = Math.ceil(total / 2);
  const amountDue = payType === "deposit" ? deposit : total;

  // Duration of the currently selected option (hours)
  const selectedDuration = useMemo(() => {
    if (!pkg) return 4;
    if (pkg.tiers?.length) return pkg.tiers[tierIdx]?.durationHours ?? pkg.durationHours;
    if (pkg.rows?.length) return pkg.rows[rowIdx]?.durationHours ?? pkg.durationHours;
    return pkg.durationHours;
  }, [pkg, rowIdx, tierIdx]);

  // Extra hours from swim addon
  const extraHours = pkg?.id === "swim" ? (qty["extra_hour"] || 0) : 0;
  const effectiveDuration = selectedDuration + extraHours;

  // Range-based conflict check: does [newStart, newStart+dur+1) overlap any blocked range?
  function toH(t: string) { const [h, m] = t.split(":").map(Number); return h + (m || 0) / 60; }
  const BUFFER = 1;
  const dateRanges = date ? (availRanges[date] ?? []) : [];
  const conflictRange = useMemo(() => {
    if (!date || !departTime) return null;
    const newStart = toH(departTime);
    const newEnd = newStart + effectiveDuration + BUFFER;
    return dateRanges.find((r) => newStart < r.endH && r.startH < newEnd) ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, departTime, effectiveDuration, dateRanges]);

  // Is a given time slot blocked by any existing range?
  function isTimeBlocked(t: string) {
    const tH = toH(t);
    // The new trip at time t lasts effectiveDuration hours; check overlap
    const tEnd = tH + effectiveDuration + BUFFER;
    return dateRanges.some((r) => tH < r.endH && r.startH < tEnd);
  }

  const selectedOption = useMemo(() => {
    if (!pkg) return "";
    if (pkg.tiers?.length) return pkg.tiers[tierIdx]?.name ?? "";
    if (pkg.rows?.length) return pkg.rows[rowIdx]?.label ?? "";
    return pkg.baseDuration;
  }, [pkg, rowIdx, tierIdx]);

  const selectedOptionText = useMemo(() => {
    if (!pkg) return "";
    if (pkg.tiers?.length) return pkgTierText(locale, pkg, tierIdx, "name");
    if (pkg.rows?.length) return pkgRowText(locale, pkg, rowIdx);
    return pkgText(locale, pkg, "baseDuration");
  }, [locale, pkg, rowIdx, tierIdx]);

  const addonSummary = useMemo(() => {
    if (!pkg?.addons) return [] as string[];
    const out: string[] = [];
    pkg.addons.forEach((a) => {
      if (a.stepper && (qty[a.id] || 0) > 0) out.push(`${a.label} ×${qty[a.id]}`);
      else if (!a.stepper && toggles[a.id]) out.push(a.label);
    });
    if (dayTypeExtra) out.push("نهاية الأسبوع");
    return out;
  }, [pkg, qty, toggles, dayTypeExtra]);

  function applyPromo() {
    const code = normalizePromoCode(promoCode);
    const percentage = getPromoPercentage(code);
    if (percentage > 0) {
      setPromoCode(code);
      setPromoPct(percentage);
      setPromoMsg({ ok: true, text: pick(locale, `تم تطبيق الخصم! خصم ${percentage}% إضافي`, `Discount applied! You received an extra ${percentage}% off.`) });
    } else {
      setPromoPct(0);
      setPromoMsg({ ok: false, text: pick(locale, "كود الخصم غير صحيح", "Invalid promo code") });
    }
  }

  async function submit() {
    if (!pkg) return;
    setError("");
    if (!name.trim()) return setError(pick(locale, "يرجى إدخال الاسم الكامل", "Please enter your full name"));
    if (!/^05\d{8}$/.test(phone.trim())) return setError(pick(locale, "رقم الجوال غير صحيح — يبدأ بـ 05 ويتكوّن من 10 أرقام", "Invalid mobile number — it must start with 05 and contain 10 digits"));
    if (!date) return setError(pick(locale, "يرجى اختيار تاريخ الرحلة", "Please select a trip date"));
    if (conflictRange) return setError(pick(locale, `هذا الوقت يتعارض مع رحلة أخرى (${conflictRange.label} + ساعة تنظيف). يُرجى اختيار وقت آخر.`, `This time overlaps another trip (${availabilityLabel(conflictRange.label, locale)} + 1 cleaning hour). Please choose another time.`));
    if (!acknowledged) return setError(pick(locale, "يرجى الضغط على الإقرار بصلاحية هويات الركاب قبل تأكيد الحجز", "Please accept the passenger ID eligibility declaration before confirming your booking"));
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: pkg.id, packageTitle: pkg.title, option: selectedOption,
          persons, addons: addonSummary, date, departTime, durationHours: effectiveDuration,
          name: name.trim(), phone: phone.trim(), notes: notes.trim(),
          payMethod, payType: payMethod === "bank" ? payType : "full",
          deposit: payMethod === "bank" && payType === "deposit" ? deposit : 0,
          total, amountDue,
          promoCode: promoPct ? normalizePromoCode(promoCode) : "",
          priceBeforePromo: afterSeason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(locale === "en" ? "Unable to complete the booking" : data.error || "تعذّر إتمام الحجز");
      const verifiedAmountDue = Number(data.amountDue) || amountDue;

      // online payment → create Moyasar invoice and redirect to hosted payment page
      if (payMethod === "online") {
        const payRes = await fetch("/api/payment/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: data.id,
            amount: verifiedAmountDue,
            description: pick(locale, `حجز سوار البحرية — ${pkg.title}`, `Sewar Marine booking — ${pkgText(locale, pkg, "title")}`),
          }),
        });
        const payData = await payRes.json();
        if (payData.paymentUrl) {
          window.location.href = payData.paymentUrl;
          return;
        }
        throw new Error(locale === "en" ? "Unable to create the payment link" : payData.error || "تعذّر إنشاء رابط الدفع");
      }

      // bank/cash → show success screen
      setDoneId(data.id);
      if (payMethod === "bank" && BANK.payUrl) {
        window.open(BANK.payUrl, "_blank", "noopener");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : pick(locale, "حدث خطأ، حاول مرة أخرى", "Something went wrong. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {pkg && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-navy-950/80 p-3 backdrop-blur-md sm:p-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative my-4 w-full max-w-xl overflow-hidden rounded-[26px] bg-white shadow-2xl"
          >
            <div className="relative h-40 overflow-hidden">
              {image && <Image src={image} alt={pkgText(locale, pkg, "title")} fill sizes="600px" className="object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950 to-navy-950/30" />
              <button type="button" onClick={onClose} aria-label={pick(locale, "إغلاق", "Close")} className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-colors hover:bg-white/30">✕</button>
              <div className="absolute inset-x-0 bottom-0 p-5">
                {discountPct > 0 && <span className="rounded-full bg-gold-400 px-3 py-1 text-xs font-extrabold text-navy-950">{pick(locale, "خصم", "Save")} {discountPct}%</span>}
                <h3 className="mt-2 text-2xl font-extrabold text-white drop-shadow">{pkgText(locale, pkg, "title")}</h3>
              </div>
            </div>

            {doneId ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-turquoise-500/15 text-3xl text-turquoise-600">✓</div>
                <h4 className="mt-4 text-2xl font-extrabold text-navy-900">{pick(locale, "تم استلام حجزك بنجاح!", "Your booking has been received!")}</h4>
                <p className="mt-2 text-navy-900/60">{pick(locale, "رقم الحجز:", "Booking number:")} <span className="font-mono font-bold text-navy-900">{doneId}</span></p>
                <div className="mt-5 rounded-2xl bg-navy-50/70 p-5 text-start text-sm leading-loose text-navy-900/75">
                  <p>👥 {pick(locale, "عدد الأشخاص:", "Number of people:")} {persons}</p>
                  <p>⏱️ {pick(locale, "الباقة:", "Package:")} {selectedOptionText}</p>
                  <p>💳 {pick(locale, "طريقة الدفع:", "Payment method:")} {payMethod === "cash" ? pick(locale, "كاش عند الوصول", "Cash on arrival") : pick(locale, `تحويل بنكي${payType === "deposit" ? " — دفعة مقدمة 50%" : ""}`, `Bank transfer${payType === "deposit" ? " — 50% deposit" : ""}`)}</p>
                  <p className="font-bold text-navy-900">{pick(locale, "المبلغ المطلوب:", "Amount due:")} {amountDue.toLocaleString()} {sar} {payType === "deposit" && payMethod === "bank" ? pick(locale, `(من إجمالي ${total.toLocaleString()})`, `(of ${total.toLocaleString()} total)`) : ""}</p>
                </div>
                {payMethod === "bank" && <BankBox copied={copied} setCopied={setCopied} />}
                <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700">⚠️ {pick(locale, "المبلغ المدفوع (العربون أو كامل المبلغ) غير مسترد في حال الإلغاء", "The amount paid, whether a deposit or full payment, is non-refundable upon cancellation")}</p>
                <p className="mt-3 text-sm text-navy-900/55">{pick(locale, "سيتواصل معك فريقنا قريباً لتأكيد الحجز 🌊", "Our team will contact you shortly to confirm your booking 🌊")}</p>
                <button onClick={onClose} className="btn-ocean mt-6 w-full">{pick(locale, "تم", "Done")}</button>
              </div>
            ) : (
              <div className="max-h-[calc(100vh-13rem)] overflow-y-auto p-6 sm:p-7">
                {/* base info */}
                <div className="grid grid-cols-2 gap-3">
                  <BaseInfo label={pick(locale, "عدد الأشخاص الأساسيين", "People included in base price")} value={pick(locale, `${pkg.maxBase} أشخاص`, `${pkg.maxBase} people`)} />
                  <BaseInfo label={pick(locale, "مدة الرحلة", "Trip duration")} value={pkgText(locale, pkg, "baseDuration")} />
                </div>
                <p className="mt-3 rounded-2xl bg-navy-50/70 px-4 py-3 text-sm leading-relaxed text-navy-900/70">{pkgYachtText(locale, pkg)}</p>

                {/* duration / tier */}
                {pkg.tiers?.length ? (
                  <Field label={pick(locale, "اختر الباقة", "Choose a package")}>
                    <select value={tierIdx} onChange={(e) => setTierIdx(+e.target.value)} className="sw-in">
                      {pkg.tiers.map((tier, i) => (<option key={tier.name} value={i}>{pkgTierText(locale, pkg, i, "name")} — {tier.price.toLocaleString()} {sar}</option>))}
                    </select>
                  </Field>
                ) : pkg.rows && pkg.rows.length > 1 ? (
                  <Field label={pick(locale, "اختر المدة / الوقت", "Choose duration / time")}>
                    <select value={rowIdx} onChange={(e) => setRowIdx(+e.target.value)} className="sw-in">
                      {pkg.rows.map((row, i) => (<option key={row.label} value={i}>{pkgRowText(locale, pkg, i)} — {row.price.toLocaleString()} {sar}</option>))}
                    </select>
                  </Field>
                ) : null}

                {/* weekend auto-notice */}
                {pkg.dayType && weekend && date ? (
                  <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                    🌙 <strong>{pick(locale, "نهاية الأسبوع", "Weekend")}</strong> — {pick(locale, `تمت إضافة رسوم +${pkg.dayType.toLocaleString()} ريال تلقائياً (الخميس / الجمعة / السبت)`, `A ${pkg.dayType.toLocaleString()} SAR surcharge was added automatically (Thursday / Friday / Saturday)`) }
                  </div>
                ) : null}

                {/* persons */}
                <Field label={pick(locale, `عدد الأشخاص (السعر الأساسي حتى ${pkg.maxBase})`, `Number of people (base price includes up to ${pkg.maxBase})`)}>
                  <div className="flex items-center gap-4">
                    <Stepper value={persons} min={1} max={pkg.maxPersons} onChange={setPersons} />
                    {extraPersons > 0 && (
                      <span className="text-sm font-semibold text-gold-600">{pick(locale, `${extraPersons} إضافي × ${pkg.extraPerPerson} = +${extraCost.toLocaleString()} ريال`, `${extraPersons} extra × ${pkg.extraPerPerson} = +${extraCost.toLocaleString()} SAR`)}</span>
                    )}
                  </div>
                </Field>

                {/* add-ons */}
                {pkg.addons?.length ? (
                  <div className="mt-5">
                    <p className="text-sm font-bold text-navy-900">✨ {pick(locale, "إضافات اختيارية — اختر ما يناسبك", "Optional add-ons — choose what suits you")}</p>
                    <div className="mt-2 grid gap-2">
                      {pkg.addons.map((a) =>
                        a.stepper ? (
                          <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-navy-50 bg-navy-50/40 px-4 py-3">
                            <span className="text-sm text-navy-900/80">{pkgAddonText(locale, pkg, a)} <span className="text-turquoise-600">(+{a.price} {pick(locale, "ريال/وحدة", "SAR/unit")})</span></span>
                            <Stepper value={qty[a.id] || 0} min={0} max={a.max ?? 4} small onChange={(v) => setQty((p) => ({ ...p, [a.id]: v }))} />
                          </div>
                        ) : (
                          <label key={a.id} className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${toggles[a.id] ? "border-turquoise-500 bg-turquoise-500/5" : "border-navy-50 bg-navy-50/40"}`}>
                            <span className="flex items-center gap-3 text-sm text-navy-900/80">
                              <input type="checkbox" checked={!!toggles[a.id]} onChange={(e) => setToggles((p) => ({ ...p, [a.id]: e.target.checked }))} className="h-4 w-4 accent-turquoise-500" />
                              {pkgAddonText(locale, pkg, a)}
                            </span>
                            <span className="shrink-0 text-sm font-bold text-turquoise-600">+{a.price} {sar}</span>
                          </label>
                        )
                      )}
                    </div>
                  </div>
                ) : null}

                {/* details */}
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label={pick(locale, "تاريخ الرحلة", "Trip date")}>
                    <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className="sw-in" />
                    {dateRanges.length > 0 && (
                      <p className="mt-1 text-xs text-navy-900/50">{pick(locale, "محجوز:", "Booked:")} {dateRanges.map((r) => availabilityLabel(r.label, locale)).join(", ")}</p>
                    )}
                  </Field>
                  <Field label={pick(locale, "وقت الانطلاق", "Departure time")}>
                    <select value={departTime} onChange={(e) => setDepartTime(e.target.value)} className={`sw-in ${conflictRange ? "border-red-400 ring-1 ring-red-400" : ""}`} disabled={pkg.id === "dolphin"}>
                      {getDepartTimes(pkg.id).map((t) => {
                        const blocked = isTimeBlocked(t);
                        return <option key={t} value={t} disabled={blocked}>{timeLabel(t, locale)}{blocked ? pick(locale, " — محجوز", " — Booked") : ""}</option>;
                      })}
                    </select>
                    {conflictRange && <p className="mt-1 text-xs font-semibold text-red-600">🚫 {pick(locale, `يتعارض مع رحلة (${conflictRange.label} + ساعة تنظيف)`, `Overlaps another trip (${availabilityLabel(conflictRange.label, locale)} + 1 cleaning hour)`)}</p>}
                  </Field>
                  <Field label={pick(locale, "الاسم الكامل", "Full name")}><input value={name} onChange={(e) => setName(e.target.value)} placeholder={pick(locale, "أدخل اسمك", "Enter your name")} className="sw-in" /></Field>
                  <Field label={pick(locale, "رقم الجوال", "Mobile number")}><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05XXXXXXXX" className="sw-in" /></Field>
                  <Field label={pick(locale, "ملاحظات إضافية", "Additional notes")} full><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={pick(locale, "أي طلبات خاصة...", "Any special requests...")} className="sw-in resize-none" /></Field>
                </div>

                {/* discount code */}
                <Field label={pick(locale, "كود الخصم (اختياري)", "Promo code (optional)")}>
                  <div className="flex gap-2">
                    <input value={promoCode} onChange={(e) => { setPromoCode(e.target.value); setPromoPct(0); setPromoMsg(null); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyPromo(); } }} placeholder={pick(locale, "أدخل الكود", "Enter code")} className="sw-in flex-1 text-center font-bold uppercase tracking-widest" style={{ direction: "ltr" }} />
                    <button type="button" onClick={applyPromo} className="rounded-xl bg-navy-900 px-5 font-bold text-white">{pick(locale, "تطبيق", "Apply")}</button>
                  </div>
                </Field>
                {promoMsg && <p className={`-mt-2 text-sm font-semibold ${promoMsg.ok ? "text-emerald-600" : "text-red-600"}`}>{promoMsg.text}</p>}

                {/* price breakdown */}
                <div className="mt-5 space-y-2 rounded-2xl bg-navy-50/60 p-5 text-sm">
                  <Line label={pick(locale, "المجموع", "Subtotal")} value={`${subtotal.toLocaleString()} ${sar}`} />
                  {seasonDiscount > 0 && <Line label={pick(locale, `خصم موسم الصيف (${discountPct}%)`, `Summer season discount (${discountPct}%)`)} value={`− ${seasonDiscount.toLocaleString()} ${sar}`} green />}
                  {promoDiscount > 0 && <Line label={pick(locale, `كود خصم (${promoPct}%)`, `Promo code (${promoPct}%)`)} value={`− ${promoDiscount.toLocaleString()} ${sar}`} green />}
                </div>

                {/* step 1: deposit or full */}
                <div className="mt-5">
                  <p className="text-xs font-bold text-navy-900/50 mb-2">1️⃣ {pick(locale, "كم تريد أن تدفع الآن؟", "How much would you like to pay now?")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {([["full", pick(locale, "المبلغ كاملاً", "Full amount"), `${total.toLocaleString()} ${sar}`], ["deposit", pick(locale, "عربون 50%", "50% deposit"), pick(locale, `${deposit.toLocaleString()} ريال الآن`, `${deposit.toLocaleString()} SAR now`)]] as const).map(([val, t, sub]) => (
                      <button key={val} type="button" onClick={() => setPayType(val)} className={`rounded-2xl border-2 p-3 text-center transition-all ${payType === val ? "border-gold-400 bg-gold-400/5" : "border-navy-50 bg-navy-50/40"}`}>
                        <div className="text-sm font-bold text-navy-900">{t}</div>
                        <div className="mt-1 text-xs text-navy-900/55">{sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* step 2: payment method */}
                <div className="mt-4">
                  <p className="text-xs font-bold text-navy-900/50 mb-2">2️⃣ {pick(locale, "اختر طريقة الدفع", "Choose a payment method")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      ["bank",   "💳", pick(locale, "تحويل بنكي", "Bank transfer"), pick(locale, "حوّل على الآيبان", "Transfer to the IBAN")],
                      ["online", "🌐", pick(locale, "دفع إلكتروني", "Online payment"), pick(locale, "بطاقة / مدى / STC", "Card / mada / STC")],
                    ] as const).map(([val, icon, t, sub]) => (
                      <button key={val} type="button" onClick={() => setPayMethod(val)} className={`rounded-2xl border-2 p-3 text-center transition-all ${payMethod === val ? "border-turquoise-500 bg-turquoise-500/5" : "border-navy-50 bg-navy-50/40"}`}>
                        <div className="text-xl mb-0.5">{icon}</div>
                        <div className="text-xs font-bold text-navy-900">{t}</div>
                        <div className="mt-0.5 text-[10px] text-navy-900/55">{sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {payMethod === "bank" && <BankBox copied={copied} setCopied={setCopied} />}
                {payMethod === "online" && (
                  <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm text-blue-700 font-semibold">
                    🌐 {pick(locale, "ستُحوَّل لصفحة الدفع الآمنة (بطاقة / مدى / STC Pay)", "You will be redirected to the secure payment page (card / mada / STC Pay)")}
                  </div>
                )}

                {/* total */}
                <div className="mt-5 flex items-center justify-between rounded-2xl bg-navy-900 px-5 py-4 text-white">
                  <div>
                    <span className="block text-sm text-white/70">{payType === "deposit" ? pick(locale, "المطلوب الآن (50%)", "Due now (50%)") : pick(locale, "الإجمالي", "Total")}</span>
                    {payType === "deposit" && <span className="text-xs text-white/45">{pick(locale, `من إجمالي ${total.toLocaleString()} ريال`, `of ${total.toLocaleString()} SAR total`)}</span>}
                  </div>
                  <span className="text-2xl font-extrabold text-gold-400">{amountDue.toLocaleString()} <span className="text-sm font-normal text-white/70">{sar}</span></span>
                </div>

                {/* cancellation policy */}
                <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-700"><strong className="block">⚠️ {pick(locale, "سياسة الإلغاء", "Cancellation policy")}</strong>{pick(locale, CANCEL_POLICY.ar, CANCEL_POLICY.en)}</p>

                {/* passengers eligibility acknowledgement — must be accepted before booking */}
                <button
                  type="button"
                  onClick={() => setAcknowledged((v) => !v)}
                  aria-pressed={acknowledged}
                  className={`mt-4 flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3.5 text-start transition-all ${acknowledged ? "border-turquoise-500 bg-turquoise-500/5" : "border-amber-300 bg-amber-50"}`}
                >
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-xs font-bold transition-colors ${acknowledged ? "border-turquoise-500 bg-turquoise-500 text-white" : "border-amber-400 bg-white text-transparent"}`}>✓</span>
                  <span className="text-xs leading-relaxed text-navy-900/80">
                    <strong className="block text-navy-900">📋 {pick(locale, "إقرار صلاحية هويات الركاب", "Passenger ID eligibility declaration")}</strong>
                    {pick(locale, "أقر بأن هويات جميع الركاب سارية المفعول، وأنه لا يوجد على أيٍ منهم إيقاف خدمات أو منع من السفر أو أي مانع نظامي يمنع المشاركة في الرحلة، وأتحمل كامل المسؤولية عن صحة هذا الإقرار.", "I confirm that every passenger has valid identification and that none is subject to a service suspension, travel ban or any legal restriction preventing participation in the trip. I accept full responsibility for the accuracy of this declaration.")}
                  </span>
                </button>

                {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p>}

                <button onClick={submit} disabled={submitting || !!conflictRange || !acknowledged} className="btn-ocean mt-4 w-full disabled:opacity-60">
                  {submitting
                    ? (payMethod === "online" ? pick(locale, "جاري الانتقال للدفع...", "Redirecting to payment...") : pick(locale, "جاري الإرسال...", "Submitting..."))
                    : conflictRange
                      ? pick(locale, "🚫 الوقت المختار متعارض — اختر وقتاً آخر", "🚫 The selected time is unavailable — choose another time")
                      : !acknowledged
                        ? pick(locale, "📋 اضغط على الإقرار أعلاه أولاً", "📋 Accept the declaration above first")
                        : payMethod === "online"
                          ? pick(locale, "🌐 تأكيد والانتقال للدفع", "🌐 Confirm and continue to payment")
                          : pick(locale, "تأكيد الحجز", "Confirm booking")}
                </button>
              </div>
            )}
            <style>{`.sw-in{width:100%;padding:11px 13px;background:#f0f8fb;border:1px solid rgba(11,92,140,.18);border-radius:12px;color:#0a1a2f;font-family:inherit;font-size:.92rem;outline:none;transition:border-color .2s,background .2s}.sw-in:focus{border-color:#21c0c0;background:#e8f6f8}`}</style>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BaseInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-turquoise-500/8 border border-turquoise-500/20 px-4 py-3 text-center">
      <div className="text-xs text-navy-900/55">{label}</div>
      <div className="mt-0.5 font-extrabold text-turquoise-600">{value}</div>
    </div>
  );
}

function Line({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-navy-900/65">{label}</span>
      <span className={`font-bold ${green ? "text-emerald-600" : "text-navy-900"}`}>{value}</span>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`mt-4 flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-sm font-semibold text-navy-900/70">{label}</span>
      {children}
    </label>
  );
}

function Stepper({ value, min, max, onChange, small }: { value: number; min: number; max: number; onChange: (v: number) => void; small?: boolean }) {
  const sz = small ? "h-8 w-8 text-base" : "h-9 w-9 text-lg";
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className={`flex ${sz} items-center justify-center rounded-full border border-ocean-500/40 font-bold text-ocean-600 disabled:opacity-30`}>−</button>
      <span className="w-6 text-center text-lg font-extrabold text-navy-900">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className={`flex ${sz} items-center justify-center rounded-full border border-ocean-500/40 font-bold text-ocean-600 disabled:opacity-30`}>+</button>
    </div>
  );
}

function BankBox({ copied, setCopied }: { copied: boolean; setCopied: (v: boolean) => void }) {
  const { locale } = useI18n();
  const { bankName, accName, iban } = useSettings();
  const bankDisplay = locale === "en" && bankName === BANK.bank ? "Al Rajhi Bank" : bankName;
  const accountDisplay = locale === "en" && accName === BANK.name ? "Sewar Al-Bahr Trading Establishment" : accName;
  return (
    <div className="mt-4 rounded-2xl border border-ocean-500/20 bg-navy-50/50 p-5">
      {BANK.payUrl && (
        <a
          href={BANK.payUrl}
          target="_blank"
          rel="noopener"
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-navy-950 via-navy-900 to-ocean-600 py-3.5 font-bold text-white shadow-lg ring-1 ring-turquoise-500/30 transition-transform hover:scale-[1.01]"
        >
          {pick(locale, "ادفع الآن عبر البنك", "Pay through the bank now")}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>
      )}
      <p className="text-sm font-bold text-navy-900">{BANK.payUrl ? pick(locale, "أو حوّل يدوياً", "Or transfer manually") : pick(locale, "بيانات التحويل البنكي", "Bank transfer details")}</p>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-navy-900/55">{pick(locale, "البنك", "Bank")}</span><span className="font-bold text-navy-900">{bankDisplay}</span></div>
        <div className="flex justify-between"><span className="text-navy-900/55">{pick(locale, "اسم الحساب", "Account name")}</span><span className="font-bold text-navy-900">{accountDisplay}</span></div>
      </div>
      <button
        type="button"
        onClick={() => { navigator.clipboard?.writeText(iban); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="mt-3 w-full rounded-xl border border-dashed border-ocean-500/40 bg-white px-4 py-3 text-center font-mono text-sm font-bold tracking-wide text-navy-900 transition-colors hover:bg-navy-50"
      >
        {iban}
      </button>
      <p className="mt-1 text-center text-xs text-turquoise-600">{copied ? pick(locale, "تم نسخ الآيبان ✓", "IBAN copied ✓") : pick(locale, "اضغط لنسخ الآيبان", "Tap to copy the IBAN")}</p>
    </div>
  );
}
