import Image from "next/image";

/**
 * Supplier photo on the sand tile. The tile keeps a square, the photo is contained inside it.
 * `eager` for photos above the fold, `highPriority` for the single most important one (the product page photo).
 */
export function ProductImage({
  src,
  alt,
  sizes,
  eager = false,
  highPriority = false,
  className = "",
  pad = "p-[9%]",
}: {
  src: string;
  alt: string;
  sizes: string;
  eager?: boolean;
  highPriority?: boolean;
  className?: string;
  pad?: string;
}) {
  return (
    <div className={`tile aspect-square ${className}`}>
      <div className={`absolute inset-0 ${pad}`}>
        <div className="relative size-full">
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            quality={75}
            loading={eager || highPriority ? "eager" : undefined}
            fetchPriority={highPriority ? "high" : undefined}
          />
        </div>
      </div>
    </div>
  );
}
