// Simple backend server for ChatMLE
// Serves static files and proxies API requests to avoid CORS issues

const ANYSCALE_BASE_URL = 'https://api.endpoints.anyscale.com/v1';

const server = Bun.serve({
  port: process.env.PORT || 3000,

  async fetch(req) {
    const url = new URL(req.url);

    // Proxy Anyscale API requests
    if (url.pathname.startsWith('/api/anyscale/')) {
      const anyscalePath = url.pathname.replace('/api/anyscale', '');
      const anyscaleUrl = `${ANYSCALE_BASE_URL}${anyscalePath}`;

      // Get the API key from the request header
      const apiKey = req.headers.get('X-Anyscale-Key');
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'Missing Anyscale API key' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Forward the request to Anyscale
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${apiKey}`,
      };

      // Copy content-type if present
      const contentType = req.headers.get('Content-Type');
      if (contentType) {
        headers['Content-Type'] = contentType;
      }

      try {
        const response = await fetch(anyscaleUrl, {
          method: req.method,
          headers,
          body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.blob() : undefined,
        });

        const data = await response.text();

        return new Response(data, {
          status: response.status,
          headers: {
            'Content-Type': response.headers.get('Content-Type') || 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (error) {
        console.error('Anyscale proxy error:', error);
        return new Response(JSON.stringify({ error: 'Failed to connect to Anyscale API' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Anyscale-Key',
        },
      });
    }

    // Serve static files from dist/
    let path = url.pathname;
    if (path === '/') path = '/index.html';

    const filePath = `./dist${path}`;
    const file = Bun.file(filePath);

    if (await file.exists()) {
      return new Response(file);
    }

    // SPA fallback - serve index.html for client-side routing
    const indexFile = Bun.file('./dist/index.html');
    if (await indexFile.exists()) {
      return new Response(indexFile);
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.log(`Server running at http://localhost:${server.port}`);
