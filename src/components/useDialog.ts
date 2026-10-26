"use client";

import { type RefObject, useEffect, useRef } from "react";

/**
 * Behaviour shared by the drawers: Escape closes, focus moves into the panel when it opens and back to the
 * element that opened it when it closes, Tab stays inside, and the page behind does not scroll.
 */
export function useDialog(open: boolean, onClose: () => void, panel: RefObject<HTMLElement | null>) {
  // Kept in a ref so a new onClose on every render does not re-run the effect (that would steal focus).
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    const scrollbar = window.innerWidth - root.clientWidth;
    root.style.overflow = "hidden";
    if (scrollbar > 0) root.style.paddingRight = `${scrollbar}px`;

    const focusables = () =>
      [...(panel.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])].filter(
        (el) => el.offsetParent !== null,
      );
    // Wait a frame so the panel is visible (visibility transitions) before focusing.
    const raf = requestAnimationFrame(() => {
      const first = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0];
      first?.focus({ preventScroll: true });
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      root.style.overflow = "";
      root.style.paddingRight = "";
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [open, panel]);
}
