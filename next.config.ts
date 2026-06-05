import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/feed',
          destination: 'http://127.0.0.1:8000/jobs/feed',
        },
        {
          source: '/api/swipe',
          destination: 'http://127.0.0.1:8000/jobs/swipe',
        },
        {
          source: '/api/saved',
          destination: 'http://127.0.0.1:8000/jobs/bookmarks',
        },
        {
          source: '/api/resume/tailor',
          destination: 'http://127.0.0.1:8000/resume/tailor',
        },
        {
          source: '/api/matching/score',
          destination: 'http://127.0.0.1:8000/matching/score',
        },
        {
          source: '/api/recommendations/generate',
          destination: 'http://127.0.0.1:8000/recommendations/generate',
        },
        {
          source: '/api/interview/:path*',
          destination: 'http://127.0.0.1:8000/interview/:path*',
        },
        {
          source: '/api/scraper/:path*',
          destination: 'http://127.0.0.1:8000/scraper/:path*',
        },
        {
          source: '/api/analytics/:path*',
          destination: 'http://127.0.0.1:8000/analytics/:path*',
        }
      ],
      afterFiles: [],
      fallback: [],
    }
  },
};

export default nextConfig;
