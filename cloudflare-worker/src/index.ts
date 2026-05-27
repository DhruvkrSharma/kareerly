export interface Env {
  // If you set these in Cloudflare secrets
  NEXT_PUBLIC_APP_URL: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Only proxy /api/feed requests
    if (url.pathname !== '/api/feed' || request.method !== 'GET') {
      return new Response('Not Found', { status: 404 });
    }

    // Try to get from Cache API first
    const cache = caches.default;
    let response = await cache.match(request);

    if (!response) {
      // If not in cache, fetch from origin (Vercel deployment)
      const originUrl = `${env.NEXT_PUBLIC_APP_URL || 'https://kareerly.vercel.app'}${url.pathname}${url.search}`;
      
      response = await fetch(originUrl, {
        headers: request.headers, // forward auth cookies/headers
      });

      // Cache successful responses for 10 seconds (stale-while-revalidate style)
      if (response.ok) {
        response = new Response(response.body, response);
        response.headers.set('Cache-Control', 's-maxage=10');
        ctx.waitUntil(cache.put(request, response.clone()));
      }
    }

    return response;
  },
};
