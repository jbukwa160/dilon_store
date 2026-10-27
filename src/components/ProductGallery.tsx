"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/LocaleProvider";
import { ProductImage } from "./ProductImage";

const SIZES = "(min-width: 1320px) 660px, (min-width: 1024px) 50vw, 100vw";

/**
 * Product photos: a swipeable strip (native scroll snapping) with thumbnails underneath.
 * Only the first photo loads with the page; the others load as soon as the visitor shows interest in the gallery.
 */
export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const t = useT();
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [primed, setPrimed] = useState(false);
  const prime = () => setPrimed(true);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setActive(Math.round(el.scrollLeft / el.clientWidth)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const show = useCallback(
    (i: number) => {
      const el = track.current;
      if (!el) return;
      const index = Math.max(0, Math.min(images.length - 1, i));
      setPrimed(true);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({ left: index * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
    },
    [images.length],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (step) {
      e.preventDefault();
      show(active + step);
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      show(e.key === "Home" ? 0 : images.length - 1);
    }
  };

  return (
    <div onPointerEnter={prime} onTouchStart={prime} onFocus={prime}>
      <div className="relative">
        <div
          ref={track}
          className="gallery-track flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-lg"
          role="region"
          aria-roledescription="carousel"
          aria-label={t.product.photos}
          tabIndex={0}
          onKeyDown={onKeyDown}
        >
          {images.map((src, i) => (
            <div
              key={src}
              className="w-full shrink-0 snap-center snap-always"
              role="group"
              aria-roledescription="slide"
              aria-label={t.product.photo(i + 1, images.length)}
              aria-hidden={i !== active || undefined}
            >
              <ProductImage
                src={src}
                alt={i === 0 ? alt : `${alt} — ${t.product.photo(i + 1, images.length)}`}
                sizes={SIZES}
                highPriority={i === 0}
                eager={i > 0 && primed}
                pad="p-[8%]"
              />
            </div>
          ))}
        </div>
        <p
          className="tabular pointer-events-none absolute right-3 bottom-3 rounded-full bg-bone/85 px-2.5 py-1 text-xs text-ink-2 backdrop-blur-sm sm:hidden"
          aria-hidden="true"
        >
          {active + 1} / {images.length}
        </p>
      </div>

      <div className="gallery-track mt-3 flex gap-2 overflow-x-auto pb-1">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => show(i)}
            aria-label={t.product.showPhoto(i + 1)}
            aria-current={i === active || undefined}
            className="gallery-thumb tile size-[4.5rem] shrink-0 sm:size-20"
          >
            <span className="absolute inset-[10%]">
              <Image src={src} alt="" fill sizes="80px" quality={75} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
