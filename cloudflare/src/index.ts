export interface Env {
  NEXTJS_ORIGIN: string;
  AUTH_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = env.NEXTJS_ORIGIN || "http://localhost:3000";
    const proxyUrl = new URL(url.pathname + url.search, origin);

    const proxyRequest = new Request(proxyUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: "follow",
    });

    if (url.pathname.startsWith("/api/webhooks/scrape")) {
      const authHeader = request.headers.get("Authorization");
      if (env.AUTH_SECRET && authHeader !== `Bearer ${env.AUTH_SECRET}`) {
        return new Response(JSON.stringify({ error: "Unauthorized Edge Gateway Access" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Never cache personalized /api/feed responses — pass through to origin.
    return fetch(proxyRequest);
  },
};
