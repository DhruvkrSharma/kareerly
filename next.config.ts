import type { NextConfig } from "next";

const apiOrigin = process.env.FASTAPI_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/api/feed", destination: `${apiOrigin}/jobs/feed` },
        { source: "/api/swipe", destination: `${apiOrigin}/jobs/swipe` },
        { source: "/api/saved", destination: `${apiOrigin}/jobs/bookmarks` },
        { source: "/api/pipeline-stage", destination: `${apiOrigin}/jobs/pipeline-stage` },
        { source: "/api/resume/tailor", destination: `${apiOrigin}/resume/tailor` },
        { source: "/api/resume/parse", destination: `${apiOrigin}/resume/parse` },
        { source: "/api/profile/update", destination: `${apiOrigin}/profile/update` },
        { source: "/api/matching/score", destination: `${apiOrigin}/matching/score` },
        { source: "/api/recommendations/generate", destination: `${apiOrigin}/recommendations/generate` },
        { source: "/api/interview/:path*", destination: `${apiOrigin}/interview/:path*` },
        { source: "/api/scraper/:path*", destination: `${apiOrigin}/scraper/:path*` },
        { source: "/api/analytics/:path*", destination: `${apiOrigin}/analytics/:path*` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
