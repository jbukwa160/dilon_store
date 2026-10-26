import { readFileSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// Product pictures are hot-linked from the suppliers listed by the last `npm run import`.
const imageHosts: string[] = JSON.parse(readFileSync(path.join(process.cwd(), "src/data/image-hosts.json"), "utf8"));

const nextConfig: NextConfig = {
  images: {
    remotePatterns: imageHosts.map((hostname) => ({ protocol: "https", hostname })),
    qualities: [75],
    formats: ["image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // RTA "Restricted To Adults" label (rtalabel.org): parental-control filters block the whole site, images included.
          { key: "Rating", value: "RTA-5042-1996-1400-1577-RTA" },
        ],
      },
    ];
  },
};

export default nextConfig;
