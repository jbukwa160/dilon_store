import type { Locale } from "@/i18n/config";

// Step-by-step guidance for blocking adult websites (this one included). Used inside the age gate and on
// /info/parental-controls. Every link was checked on 2026-10-26.

export const RTA_LABEL = "RTA-5042-1996-1400-1577-RTA";

export const PARENTAL_LINKS = {
  familySafety: { bg: "https://www.microsoft.com/bg-bg/microsoft-365/family-safety", en: "https://www.microsoft.com/en-us/microsoft-365/family-safety" },
  apple: { bg: "https://support.apple.com/bg-bg/105121", en: "https://support.apple.com/en-us/105121" },
  familyLink: { bg: "https://families.google/intl/bg/familylink/", en: "https://families.google/familylink/" },
  safeSearch: { bg: "https://support.google.com/websearch/answer/510?hl=bg", en: "https://support.google.com/websearch/answer/510?hl=en" },
  cloudflare: { bg: "https://one.one.one.one/family/", en: "https://one.one.one.one/family/" },
  openDns: { bg: "https://www.opendns.com/home-internet-security/", en: "https://www.opendns.com/home-internet-security/" },
  rta: { bg: "https://www.rtalabel.org/", en: "https://www.rtalabel.org/" },
  safenet: { bg: "https://safenet.bg/", en: "https://safenet.bg/" },
} satisfies Record<string, Record<Locale, string>>;

export function ExternalLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

type Section = { title: string; text: React.ReactNode };

function sections(locale: Locale, linkClass: string): Section[] {
  const L = (key: keyof typeof PARENTAL_LINKS, label: string) => (
    <ExternalLink href={PARENTAL_LINKS[key][locale]} className={linkClass}>
      {label}
    </ExternalLink>
  );
  if (locale === "en") {
    return [
      {
        title: "Windows and Xbox",
        text: (
          <>
            Create a family group in {L("familySafety", "Microsoft Family Safety")}, add your child&apos;s account and turn on the content filters. Microsoft
            Edge then blocks adult websites and keeps SafeSearch on.
          </>
        ),
      },
      {
        title: "iPhone, iPad and Mac",
        text: (
          <>
            In Screen Time, turn on Content &amp; Privacy Restrictions and set Web Content to “Limit Adult Websites”. Apple&apos;s step-by-step guide:{" "}
            {L("apple", "set up parental controls")}.
          </>
        ),
      },
      {
        title: "Android phones and Chromebooks",
        text: (
          <>
            Link your child&apos;s account with {L("familyLink", "Google Family Link")} and, under the Google Chrome settings, choose to block explicit
            sites.
          </>
        ),
      },
      {
        title: "Search engines",
        text: <>Turn on {L("safeSearch", "SafeSearch in Google")} so explicit images, videos and websites are filtered out of search results.</>,
      },
      {
        title: "Every device at home",
        text: (
          <>
            Change the DNS servers on your home router to 1.1.1.3 and 1.0.0.3 ({L("cloudflare", "Cloudflare 1.1.1.1 for Families")}). Adult websites are
            then blocked on every phone, tablet and computer on your Wi-Fi. {L("openDns", "OpenDNS")} offers a similar free service.
          </>
        ),
      },
      {
        title: "This website is labelled",
        text: (
          <>
            Every page of this shop carries the {L("rta", "RTA label")} (“Restricted To Adults”). Most parental control software recognises it and blocks
            the site automatically.
          </>
        ),
      },
      {
        title: "Help and advice",
        text: (
          <>
            The Bulgarian Safer Internet Centre advises parents and children free of charge: helpline 124 123 and {L("safenet", "safenet.bg")}.
          </>
        ),
      },
    ];
  }
  return [
    {
      title: "Windows и Xbox",
      text: (
        <>
          Създайте семейна група в {L("familySafety", "Microsoft Family Safety")}, добавете профила на детето и включете филтрите за съдържание. Тогава
          Microsoft Edge блокира сайтовете за възрастни и държи безопасното търсене включено.
        </>
      ),
    },
    {
      title: "iPhone, iPad и Mac",
      text: (
        <>
          В „Време пред екрана“ включете ограниченията за съдържание и поверителност и за уеб съдържание изберете да се ограничат сайтовете за
          възрастни. Подробни стъпки от Apple: {L("apple", "родителски контрол на iPhone и iPad")}.
        </>
      ),
    },
    {
      title: "Android телефони и Chromebook",
      text: (
        <>
          Свържете профила на детето с {L("familyLink", "Google Family Link")} и в настройките за Google Chrome изберете сайтовете с явно съдържание да се
          блокират.
        </>
      ),
    },
    {
      title: "Търсачки",
      text: <>Включете {L("safeSearch", "„Безопасно търсене“ в Google")}, за да не се показват изображения, видеа и сайтове с явно съдържание.</>,
    },
    {
      title: "Всички устройства у дома",
      text: (
        <>
          Сменете DNS сървърите на домашния рутер с 1.1.1.3 и 1.0.0.3 ({L("cloudflare", "Cloudflare 1.1.1.1 за семейства")}). Така сайтовете за
          възрастни се блокират на всеки телефон, таблет и компютър във вашата Wi-Fi мрежа. Подобна безплатна услуга предлага и {L("openDns", "OpenDNS")}.
        </>
      ),
    },
    {
      title: "Този сайт е маркиран",
      text: (
        <>
          Всяка страница на магазина носи етикета {L("rta", "RTA")} („Restricted To Adults“ — само за възрастни). Повечето програми за родителски контрол
          го разпознават и блокират сайта автоматично.
        </>
      ),
    },
    {
      title: "Помощ и съвет",
      text: (
        <>
          Националният център за безопасен интернет консултира безплатно родители и деца: телефон 124 123 и {L("safenet", "safenet.bg")}.
        </>
      ),
    },
  ];
}

/** Numbered guide. `tone` switches colours between the dark age gate and the light info page. */
export function ParentalControlsGuide({ locale, tone }: { locale: Locale; tone: "night" | "day" }) {
  const night = tone === "night";
  const linkClass = night ? "text-blush underline underline-offset-3 hover:text-blush-2" : "text-wine underline underline-offset-3";
  return (
    <ol className="space-y-6">
      {sections(locale, linkClass).map((s, i) => (
        <li key={s.title} className="grid grid-cols-[2rem_1fr] gap-3">
          <span className={`font-display text-[1.5rem] leading-none ${night ? "text-blush" : "text-wine"}`}>{i + 1}</span>
          <div>
            <p className={`font-semibold ${night ? "text-bone" : "text-ink"}`}>{s.title}</p>
            <p className={`mt-1 text-sm leading-relaxed ${night ? "text-bone/75" : "text-ink-2"}`}>{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
