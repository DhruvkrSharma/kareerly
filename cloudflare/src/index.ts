export interface Env {
  NEXTJS_ORIGIN: string;
  AUTH_SECRET: string; // Secret to validate inbound scraping webhooks
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Default to the provided env var, or fallback to localhost if not set (for testing)
    const origin = env.NEXTJS_ORIGIN || "http://localhost:3000";

    // Reconstruct the URL for the origin server
    const proxyUrl = new URL(url.pathname + url.search, origin);
    
    // Clone request to forward
    const proxyRequest = new Request(proxyUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow',
    });

    // Handle Scraper/Apify Incoming Webhooks validation
    // E.g., intercept calls to /api/webhooks/scrape to ensure they come from Apify/Pipedream
    if (url.pathname.startsWith('/api/webhooks/scrape')) {
      const authHeader = request.headers.get('Authorization');
      if (env.AUTH_SECRET && authHeader !== `Bearer ${env.AUTH_SECRET}`) {
        return new Response(JSON.stringify({ error: "Unauthorized Edge Gateway Access" }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Cache responses for feed requests (API Gateway caching layer)
    // Caches the job feed for anonymous/unauthenticated requests or specific edge scenarios
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;

    if (request.method === 'GET' && url.pathname.startsWith('/api/feed')) {
      let response = await cache.match(cacheKey);
      if (response) {
        // Return cached response with custom header to trace it
        const newResponse = new Response(response.body, response);
        newResponse.headers.set('X-Edge-Cache', 'HIT');
        return newResponse;
      }
      
      // Fetch from origin
      response = await fetch(proxyRequest);
      
      // If OK, clone and put in cache for 60 seconds (rate limiting + speed)
      if (response.ok) {
        response = new Response(response.body, response);
        response.headers.set('Cache-Control', 'public, max-age=60');
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
        response.headers.set('X-Edge-Cache', 'MISS');
      }
      return response;
    }

    // Pass-through for everything else
    return fetch(proxyRequest);
  },
};
