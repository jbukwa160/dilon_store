import { Cormorant, Onest } from "next/font/google";

// Normal and italic Cormorant are two separate requests: asking for both styles in one call breaks
// `next build` (Turbopack, Next 16.4). globals.css sends italic display text to the italic instance.
export const cormorant = Cormorant({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

export const cormorantItalic = Cormorant({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600"],
  style: "italic",
  variable: "--font-cormorant-italic",
  display: "swap",
});

export const onest = Onest({
  subsets: ["latin", "cyrillic"],
  variable: "--font-onest",
  display: "swap",
});

export const fontVariables = `${cormorant.variable} ${cormorantItalic.variable} ${onest.variable}`;
