"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useId, useRef, useState } from "react";
import { useLocale, useT } from "@/i18n/LocaleProvider";
import { paths } from "@/i18n/paths";
import { price } from "@/lib/format";
import { SHIPPING, shippingPrice, type ShippingMethodId } from "@/lib/site";
import { QtyStepper } from "../cart/AddToCart";
import { FreeShippingMeter } from "../cart/CartDrawer";
import { MAX_PER_LINE, useCart } from "../cart/CartProvider";
import { IconCash, IconLock, IconTrash } from "../Icons";

export const LAST_ORDER_KEY = "kd_last_order";

type Errors = Record<string, string>;

/** Lets a field drop its own error as soon as the customer edits it. */
const ClearErrorCtx = createContext<(name: string) => void>(() => {});

export function CheckoutForm() {
  const { lines, ready, subtotal, setQty, remove, clear } = useCart();
  const router = useRouter();
  const locale = useLocale();
  const t = useT().checkout;
  const cartT = useT().cart;
  const P = paths(locale);
  const [method, setMethod] = useState<ShippingMethodId>("speedy-office");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const clearError = (name: string) =>
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      if (!Object.keys(next).length) setFormError("");
      return next;
    });
  const [sending, setSending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const shipping = shippingPrice(method, subtotal);
  const needs = SHIPPING.methods.find((m) => m.id === method)!.needs;

  if (!ready) return <div className="h-96" aria-busy="true" />;

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="font-display text-[2rem] font-semibold">{t.empty}</p>
        <p className="mt-2 text-ink-2">{t.emptyText}</p>
        <Link href={P.home()} className="btn btn-wine mt-7">
          {t.toShop}
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    const fd = new FormData(e.currentTarget);
    const value = (k: string) => String(fd.get(k) ?? "");
    const payload = {
      locale,
      name: value("name"),
      phone: value("phone"),
      email: value("email"),
      method,
      city: value("city"),
      postcode: value("postcode"),
      office: value("office"),
      address: value("address"),
      note: value("note"),
      terms: fd.get("terms") === "on",
      adult: fd.get("adult") === "on",
      website: value("website"),
      items: lines.map((l) => ({ sku: l.sku, qty: l.qty })),
    };
    setSending(true);
    setFormError("");
    try {
      const res = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(data.fields ?? {});
        setFormError(data.error ?? t.errorGeneric);
        requestAnimationFrame(() => {
          const first = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
          (first ?? document.getElementById("form-error"))?.focus();
        });
        return;
      }
      try {
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(data));
      } catch {
        // Not important: the thank-you page also works with the number from the URL.
      }
      clear();
      router.replace(P.thanks(data.number));
    } catch {
      setFormError(t.errorNetwork);
    } finally {
      setSending(false);
    }
  }

  return (
    <ClearErrorCtx.Provider value={clearError}>
    <form ref={formRef} onSubmit={submit} noValidate className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-16">
      <div className="min-w-0 space-y-12">
        <Step n={1} title={t.stepDetails}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.name} name="name" autoComplete="name" errors={errors} className="sm:col-span-2" />
            <Field label={t.phone} name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="0888 123 456" errors={errors} hint={t.phoneHint} />
            <Field label={t.email} name="email" type="email" autoComplete="email" inputMode="email" errors={errors} hint={t.emailHint} />
          </div>
        </Step>

        <Step n={2} title={t.stepDelivery}>
          <fieldset>
            <legend className="sr-only">{t.deliveryMethod}</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {SHIPPING.methods.map((m) => {
                const checked = method === m.id;
                const cost = shippingPrice(m.id, subtotal);
                return (
                  <label
                    key={m.id}
                    className={`relative flex cursor-pointer flex-col rounded-lg border p-4 transition-[border-color,box-shadow] duration-150 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-wine ${
                      checked ? "border-wine shadow-[inset_0_0_0_1px_var(--color-wine)]" : "border-line bg-paper hover:border-ink/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="method"
                      value={m.id}
                      checked={checked}
                      onChange={() => {
                        setMethod(m.id);
                        ["office", "address", "postcode"].forEach(clearError);
                      }}
                      className="sr-only"
                    />
                    <span className="text-sm font-semibold">{m.short[locale]}</span>
                    <span className="mt-1 text-xs leading-snug text-muted">{m.label[locale]}</span>
                    <span className="tabular mt-3 text-sm font-semibold">{cost ? price(cost, locale) : <span className="text-moss">{t.free}</span>}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_9rem]">
            <Field label={t.city} name="city" autoComplete="address-level2" errors={errors} className={needs === "address" ? "" : "sm:col-span-2"} />
            {needs === "address" && <Field label={t.postcode} name="postcode" autoComplete="postal-code" inputMode="numeric" maxLength={4} errors={errors} />}
            {needs === "office" ? (
              <Field
                key="office"
                label={method === "speedy-office" ? t.officeSpeedy : t.officeEcont}
                name="office"
                errors={errors}
                className="sm:col-span-2"
                hint={t.officeHint}
              />
            ) : (
              <Field key="address" label={t.address} name="address" autoComplete="street-address" errors={errors} className="sm:col-span-2" hint={t.addressHint} />
            )}
          </div>
        </Step>

        <Step n={3} title={t.stepPayment}>
          <div className="flex gap-4 rounded-lg border border-wine bg-paper p-4 shadow-[inset_0_0_0_1px_var(--color-wine)]">
            <IconCash size={24} className="mt-0.5 shrink-0 text-wine" />
            <div>
              <p className="text-sm font-semibold">{t.cod}</p>
              <p className="mt-0.5 text-sm text-ink-2">{t.codText}</p>
            </div>
          </div>
          <div className="mt-5">
            <label htmlFor="note" className="mb-1.5 block text-sm font-medium">
              {t.note} <span className="font-normal text-muted">{t.optional}</span>
            </label>
            <textarea
              id="note"
              name="note"
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-line bg-paper px-4 py-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow] duration-150 focus:border-ink/40 focus:shadow-[0_0_0_4px_rgb(109_26_42/0.08)]"
            />
          </div>
        </Step>

        {/* Honeypot: invisible to people and screen readers. */}
        <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
          <label>
            {t.website} <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
      </div>

      <aside className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
        <div className="rounded-xl bg-paper p-5 shadow-[0_1px_0_var(--color-line),0_24px_50px_-40px_rgb(23_15_18/0.5)] sm:p-6">
          <h2 className="font-display text-2xl font-semibold">{t.summary}</h2>
          <ul className="mt-4 divide-y divide-line">
            {lines.map((l) => (
              <li key={l.sku} className="flex gap-3 py-3">
                <span className="tile relative size-16 shrink-0">
                  <Image src={l.image} alt="" fill sizes="64px" className="p-1.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm leading-snug">{l.name[locale]}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <QtyStepper size="sm" value={l.qty} max={Math.min(MAX_PER_LINE, l.stock)} onChange={(v) => setQty(l.sku, v)} label={l.name[locale]} />
                    <span className="tabular text-sm font-semibold">{price(l.price * l.qty, locale)}</span>
                  </div>
                </div>
                <button type="button" onClick={() => remove(l.sku)} className="icon-btn -mr-2 size-8 self-start text-muted hover:text-wine" aria-label={cartT.remove(l.name[locale])}>
                  <IconTrash size={16} />
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-line pt-4">
            <FreeShippingMeter subtotal={subtotal} />
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-2">{t.items}</dt>
              <dd className="tabular">{price(subtotal, locale)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-2">{t.shipping}</dt>
              <dd className="tabular">{shipping ? price(shipping, locale) : t.freeShipping}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt className="font-semibold">{t.total}</dt>
              <dd className="tabular text-xl font-semibold">{price(subtotal + shipping, locale)}</dd>
            </div>
          </dl>
          <p className="mt-1 text-right text-xs text-muted">{t.inclVat}</p>

          <div className="mt-5 space-y-3 text-sm">
            <Check name="terms" errors={errors}>
              {t.acceptA}
              <Link href={P.info("terms")} target="_blank" className="link-underline text-wine">
                {t.terms}
              </Link>
              {t.and}
              <Link href={P.info("privacy")} target="_blank" className="link-underline text-wine">
                {t.privacy}
              </Link>
              .
            </Check>
            <Check name="adult" errors={errors}>
              {t.adult}
            </Check>
          </div>

          {formError && (
            <p id="form-error" tabIndex={-1} role="alert" className="mt-4 rounded-lg bg-wine/8 px-4 py-3 text-sm text-wine outline-none">
              {formError}
            </p>
          )}

          <button type="submit" className="btn btn-wine mt-5 w-full" disabled={sending} aria-busy={sending}>
            {sending ? t.sending : t.submit(price(subtotal + shipping, locale))}
          </button>
          <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted">
            <IconLock size={14} /> {t.plainBox}
          </p>
        </div>
      </aside>
    </form>
    </ClearErrorCtx.Provider>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="mb-5 flex items-baseline gap-3 font-display text-[1.75rem] leading-none font-semibold">
        <span className="tabular font-sans text-sm font-semibold text-wine">0{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  name,
  errors,
  hint,
  className = "",
  ...input
}: { label: string; name: string; errors: Errors; hint?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const clear = useContext(ClearErrorCtx);
  const error = errors[name];
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error || hint ? `${id}-d` : undefined}
        onInput={() => clear(name)}
        className={`h-12 w-full rounded-lg border bg-paper px-4 text-[0.9375rem] outline-none transition-[border-color,box-shadow] duration-150 focus:shadow-[0_0_0_4px_rgb(109_26_42/0.08)] ${
          error ? "border-wine" : "border-line focus:border-ink/40"
        }`}
        {...input}
      />
      {(error || hint) && (
        <p id={`${id}-d`} className={`mt-1.5 text-xs ${error ? "font-medium text-wine" : "text-muted"}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

function Check({ name, errors, children }: { name: string; errors: Errors; children: React.ReactNode }) {
  const id = useId();
  const clear = useContext(ClearErrorCtx);
  const error = errors[name];
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer gap-3">
        <input
          id={id}
          name={name}
          type="checkbox"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-e` : undefined}
          onChange={() => clear(name)}
          className="mt-0.5 size-[1.125rem] shrink-0 accent-wine"
        />
        <span className="text-ink-2">{children}</span>
      </label>
      {error && (
        <p id={`${id}-e`} className="mt-1 pl-7.5 text-xs font-medium text-wine">
          {error}
        </p>
      )}
    </div>
  );
}
