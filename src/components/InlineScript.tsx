"use client";

/**
 * An inline script that runs while the browser parses the server HTML. When React itself renders the element in the
 * browser (client navigation, or a 404 page rendered on the client), it becomes `text/plain`, so React does not warn
 * about scripts that would never run. Recommended in Next 16's "Preventing flash before hydration" guide.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
