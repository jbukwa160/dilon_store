import type { Locale } from "@/i18n/config";
import { DICT } from "@/i18n/dict";
import { SITE } from "@/lib/site";

/** A plain kraft box with a courier label: what the customer actually receives. */
export function Parcel({ locale }: { locale: Locale }) {
  const t = DICT[locale].home;
  return (
    <svg viewBox="0 0 480 400" className="h-auto w-full" role="img" aria-label={t.parcelLabel}>
      <defs>
        <linearGradient id="kraft-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9b98f" />
          <stop offset="1" stopColor="#c9a476" />
        </linearGradient>
        <linearGradient id="kraft-left" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c39a69" />
          <stop offset="1" stopColor="#b0875a" />
        </linearGradient>
        <linearGradient id="kraft-right" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a87e51" />
          <stop offset="1" stopColor="#966d44" />
        </linearGradient>
      </defs>
      <ellipse cx="240" cy="352" rx="190" ry="22" fill="#1d1416" opacity=".12" />
      {/* box */}
      <path d="M60 140 240 70l180 70-180 70z" fill="url(#kraft-top)" />
      <path d="M60 140v150l180 70V210z" fill="url(#kraft-left)" />
      <path d="M420 140v150l-180 70V210z" fill="url(#kraft-right)" />
      {/* tape */}
      <path d="M150 105l180 70v18l-180-70z" fill="#e8d2b0" opacity=".85" />
      <path d="M330 175v150l-18 7V182z" fill="#d8bf98" opacity=".7" />
      {/* label on the left face */}
      <g transform="matrix(1 .389 0 1 82 178)">
        <rect width="132" height="92" rx="3" fill="#fbf8f4" />
        <rect x="10" y="10" width="54" height="7" rx="1" fill="#1d1416" opacity=".85" />
        <g fontFamily="ui-monospace, Menlo, monospace" fontSize="7.4" fill="#1d1416">
          <text x="10" y="31">
            {t.parcel.sender}: {SITE.parcelSender[locale].toUpperCase()}
          </text>
          <text x="10" y="44">{t.parcel.recipient}</text>
          <text x="10" y="55">{t.parcel.office}</text>
          <text x="10" y="68">{t.parcel.contents}</text>
        </g>
        <g fill="#1d1416">
          {[0, 3, 5, 9, 11, 14, 17, 19, 23, 26, 28, 31, 34, 37, 39, 43, 46, 48].map((x) => (
            <rect key={x} x={10 + x * 2.4} y="76" width={x % 3 === 0 ? 2.2 : 1.2} height="10" />
          ))}
        </g>
      </g>
    </svg>
  );
}
