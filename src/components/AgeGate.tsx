"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dict } from "@/i18n/dict";
import { useLocale, useT } from "@/i18n/LocaleProvider";
import { AGE_COOKIE, SITE } from "@/lib/site";
import { ExternalLink, PARENTAL_LINKS, ParentalControlsGuide } from "./ParentalControls";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

/**
 * Runs in <head> before the first paint: "kd_age=1" (adult) hides the gate, "kd_age=0" (said they are under 18)
 * shows the "access denied" screen straight away. Everyone else gets the question. No flash either way.
 */
export const AGE_SCRIPT = `try{var m=document.cookie.match(/(?:^|;\\s*)${AGE_COOKIE}=([01])/),a=m?(m[1]==="1"?"ok":"denied"):null;if(!a){try{if(localStorage.getItem("${AGE_COOKIE}")==="1")a="ok"}catch(e){}}if(a)document.documentElement.dataset.age=a}catch(e){}`;
/** Placed right after the page shell: makes everything behind the gate unreachable by keyboard before hydration. */
export const SHELL_INERT_SCRIPT = `if(document.documentElement.dataset.age!=="ok"){var s=document.getElementById("shell");if(s)s.inert=true}`;

type Answer = "ok" | "denied" | null;
type Phase = "pending" | "open" | "leaving" | "closed";
type View = "question" | "denied" | "help";

/** The visitor's earlier answer. The cookie wins; localStorage is a fallback for browsers that block cookies. */
function storedAnswer(): Answer {
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${AGE_COOKIE}=([01])`));
  if (m) return m[1] === "1" ? "ok" : "denied";
  try {
    if (localStorage.getItem(AGE_COOKIE) === "1") return "ok";
  } catch {
    // Storage blocked: treat as no answer.
  }
  return null;
}

function setShellInert(inert: boolean) {
  const shell = document.getElementById("shell");
  if (shell) shell.inert = inert;
}

export function AgeGate() {
  const t = useT().age;
  const locale = useLocale();
  const [phase, setPhase] = useState<Phase>("pending");
  const [view, setView] = useState<View>("question");
  const [helpFrom, setHelpFrom] = useState<View>("question");
  const gateRef = useRef<HTMLDivElement>(null);
  const yesRef = useRef<HTMLButtonElement>(null);
  const deniedRef = useRef<HTMLHeadingElement>(null);
  const helpRef = useRef<HTMLHeadingElement>(null);

  // Re-read the answer before paint. The inline script already did this on normal page loads; this also covers the
  // development remount (which clears attributes on <html>) and 404 pages that React renders in the browser.
  useLayoutEffect(() => {
    const answer = storedAnswer();
    const root = document.documentElement;
    if (answer) root.dataset.age = answer;
    else delete root.dataset.age;
    setShellInert(answer !== "ok");
    /* eslint-disable react-hooks/set-state-in-effect -- syncing React with the stored answer is the point here */
    if (answer === "ok") {
      setPhase("closed");
      return;
    }
    setView(answer === "denied" ? "denied" : "question");
    setPhase("open");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Move focus to the start of whichever screen is showing.
  useEffect(() => {
    if (phase !== "open") return;
    gateRef.current?.scrollTo({ top: 0 });
    const target = view === "question" ? yesRef.current : view === "denied" ? deniedRef.current : helpRef.current;
    target?.focus({ preventScroll: true });
  }, [view, phase]);

  const secure = () => (location.protocol === "https:" ? "; Secure" : "");

  function accept() {
    document.cookie = `${AGE_COOKIE}=1; Max-Age=${THIRTY_DAYS}; Path=/; SameSite=Lax${secure()}`;
    try {
      localStorage.setItem(AGE_COOKIE, "1");
    } catch {
      // Private mode: the cookie is enough.
    }
    const finish = () => {
      document.documentElement.dataset.age = "ok";
      setShellInert(false);
      setPhase("closed");
    };
    setPhase("leaving");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.setTimeout(finish, 260);
      return;
    }
    const el = gateRef.current;
    const done = (e: TransitionEvent) => {
      if (e.target !== el || e.propertyName !== "transform") return;
      el?.removeEventListener("transitionend", done);
      finish();
    };
    el?.addEventListener("transitionend", done);
    // Safety net in case transitionend never fires (tab in background).
    window.setTimeout(finish, 1100);
  }

  function deny() {
    // A session cookie: the shop stays closed for this visitor until the browser is closed.
    document.cookie = `${AGE_COOKIE}=0; Path=/; SameSite=Lax${secure()}`;
    try {
      localStorage.removeItem(AGE_COOKIE);
    } catch {
      // Nothing stored.
    }
    document.documentElement.dataset.age = "denied";
    setView("denied");
  }

  function leave() {
    // Browsers only let a page close a tab that a script opened, so the usual result is the redirect.
    // location.replace also removes this site from the tab's history.
    window.close();
    window.location.replace("https://www.google.com/");
  }

  function openGuide() {
    setHelpFrom(view === "help" ? helpFrom : view);
    setView("help");
  }

  if (phase === "closed") return null;

  const labelledBy = view === "question" ? "age-title" : view === "denied" ? "age-denied-title" : "age-help-title";

  return (
    <div
      ref={gateRef}
      className="age-gate grain on-night"
      data-state={phase}
      data-view={view}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      {/* ── Are you 18? ── */}
      <div className="age-view age-view-question age-inner m-auto w-full max-w-xl flex-col items-center px-6 py-14 text-center">
        <Wordmark />
        <Seal text={t.seal} />
        <h2 id="age-title" className="age-in font-display text-[2.4rem] leading-[1.05] font-semibold sm:text-5xl" style={{ animationDelay: "220ms" }}>
          {t.title}
        </h2>
        <p className="age-in mt-4 max-w-md text-[0.975rem] text-bone/75" style={{ animationDelay: "300ms" }}>
          {t.text}
        </p>
        <div className="age-in mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row" style={{ animationDelay: "380ms" }}>
          <button ref={yesRef} type="button" className="btn btn-blush min-w-56" onClick={accept}>
            {t.yes}
          </button>
          <button type="button" className="btn btn-ghost-night min-w-56" onClick={deny}>
            {t.no}
          </button>
        </div>
        <noscript>
          <p className="mt-6 text-sm text-blush">{t.noscript}</p>
        </noscript>
        <p className="age-in mt-8 max-w-sm text-xs leading-relaxed text-bone/50" style={{ animationDelay: "460ms" }}>
          {t.fine}
        </p>
        <ParentalBlock t={t} locale={locale} onGuide={openGuide} />
      </div>

      {/* ── Access denied ── */}
      <div className="age-view age-view-denied age-inner m-auto w-full max-w-xl flex-col items-center px-6 py-14 text-center">
        <Wordmark />
        <Seal text={t.deniedSeal} denied />
        <h2
          ref={deniedRef}
          id="age-denied-title"
          tabIndex={-1}
          className="age-in font-display text-[2.4rem] leading-[1.05] font-semibold outline-none sm:text-5xl"
          style={{ animationDelay: "220ms" }}
        >
          {t.deniedTitle}
        </h2>
        <p className="age-in mt-4 max-w-md text-[0.975rem] text-bone/75" style={{ animationDelay: "300ms" }}>
          {t.deniedText}
        </p>
        <div className="age-in mt-9" style={{ animationDelay: "380ms" }}>
          <button type="button" className="btn btn-ghost-night min-w-56" onClick={leave}>
            {t.leave}
          </button>
        </div>
        <ParentalBlock t={t} locale={locale} onGuide={openGuide} />
      </div>

      {/* ── How to block adult websites ── */}
      <div className="age-view age-view-help age-inner m-auto w-full max-w-2xl flex-col px-6 py-14">
        <button type="button" className="age-in inline-flex items-center gap-2 self-start text-sm text-bone/70 hover:text-blush" onClick={() => setView(helpFrom)}>
          <span aria-hidden="true">←</span> {t.back}
        </button>
        <h2
          ref={helpRef}
          id="age-help-title"
          tabIndex={-1}
          className="age-in font-display mt-6 text-[2.2rem] leading-[1.05] font-semibold outline-none sm:text-[2.75rem]"
          style={{ animationDelay: "80ms" }}
        >
          {t.helpTitle}
        </h2>
        <p className="age-in mt-3 max-w-xl text-[0.975rem] text-bone/75" style={{ animationDelay: "140ms" }}>
          {t.helpLede}
        </p>
        <div className="age-in mt-9" style={{ animationDelay: "200ms" }}>
          <ParentalControlsGuide locale={locale} tone="night" />
        </div>
        <button type="button" className="btn btn-ghost-night mt-10 self-start" onClick={() => setView(helpFrom)}>
          <span aria-hidden="true">←</span> {t.back}
        </button>
      </div>
    </div>
  );
}

/** "Parental controls" note under the question and the access-denied screen, like the big adult sites have. */
function ParentalBlock({ t, locale, onGuide }: { t: Dict["age"]; locale: Locale; onGuide: () => void }) {
  const link = "text-blush underline decoration-blush/40 underline-offset-3 transition-colors duration-150 hover:decoration-blush";
  return (
    <div className="age-in mt-10 w-full max-w-lg border-t border-bone/15 pt-7 text-sm leading-relaxed text-bone/70" style={{ animationDelay: "540ms" }}>
      <p className="font-semibold text-bone">{t.parentalTitle}</p>
      <p className="mt-2">
        {t.parentalSetUp}{" "}
        <ExternalLink href={PARENTAL_LINKS.familySafety[locale]} className={link}>
          {t.familySafety}
        </ExternalLink>
        ,{" "}
        <ExternalLink href={PARENTAL_LINKS.cloudflare[locale]} className={link}>
          {t.blockSites}
        </ExternalLink>{" "}
        {t.andTurnOn}{" "}
        <ExternalLink href={PARENTAL_LINKS.safeSearch[locale]} className={link}>
          {t.safeSearch}
        </ExternalLink>{" "}
        {t.inSearch}
      </p>
      <p className="mt-2">
        {t.guideA}{" "}
        <button type="button" className={link} onClick={onGuide}>
          {t.guideLink}
        </button>{" "}
        {t.guideB}
      </p>
    </div>
  );
}

function Wordmark() {
  return (
    <p lang="bg" className="age-in font-display text-[2rem] leading-none italic text-blush" style={{ animationDelay: "60ms" }}>
      {SITE.wordmark}
    </p>
  );
}

function Seal({ text, denied = false }: { text: string; denied?: boolean }) {
  const ring = denied ? "seal-ring-denied" : "seal-ring";
  return (
    <div className="age-seal relative my-9 size-40 sm:size-44" style={{ animationDelay: "120ms" }} aria-hidden="true">
      <svg viewBox="0 0 200 200" className="absolute inset-0 size-full text-blush">
        <defs>
          <path id={ring} d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeOpacity=".35" />
        <circle cx="100" cy="100" r="62" fill="none" stroke="currentColor" strokeOpacity={denied ? ".85" : ".35"} strokeWidth={denied ? 2 : 1} />
        <text fill="currentColor" fontSize="12.5" style={{ fontFamily: "var(--font-onest)", fontWeight: 600 }}>
          <textPath href={`#${ring}`} textLength="480" lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
      </svg>
      <span className={`absolute inset-0 grid place-items-center font-display text-[4.25rem] leading-none font-semibold ${denied ? "text-bone/40" : "text-bone"}`}>
        <span>
          18<sup className="relative -top-6 ml-0.5 text-3xl text-blush">+</sup>
        </span>
      </span>
      {denied && (
        // Drawn over the "18+" like a "no entry" sign.
        <svg viewBox="0 0 200 200" className="absolute inset-0 size-full text-blush">
          <line x1="56" y1="56" x2="144" y2="144" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
}
