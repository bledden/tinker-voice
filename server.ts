// Simple backend server for ChatMLE
// Serves static files and proxies API requests to avoid CORS issues

// Fine-tuning provider base URLs
const PROVIDER_URLS: Record<string, string> = {
  togetherai: 'https://api.together.xyz/v1',
  fireworks: 'https://api.fireworks.ai/inference/v1',
};

// Tinker service URL (deployed separately - Python sidecar)
const TINKER_SERVICE_URL = process.env.TINKER_SERVICE_URL || 'http://localhost:8000';

const server = Bun.serve({
  port: process.env.PORT || 3000,

  async fetch(req) {
    const url = new URL(req.url);

    // Health check endpoint (for Render/Railway deployments)
    if (url.pathname === '/health' || url.pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Proxy fine-tuning API requests
    // Format: /api/finetune/{provider}/{path}
    // e.g., /api/finetune/togetherai/fine-tunes or /api/finetune/fireworks/fine-tuning/jobs
    if (url.pathname.startsWith('/api/finetune/')) {
      const pathParts = url.pathname.replace('/api/finetune/', '').split('/');
      const provider = pathParts[0];
      const apiPath = '/' + pathParts.slice(1).join('/');

      const baseUrl = PROVIDER_URLS[provider];
      if (!baseUrl) {
        return new Response(JSON.stringify({ error: `Unknown provider: ${provider}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const targetUrl = `${baseUrl}${apiPath}`;

      // Get the API key from the request header
      const apiKey = req.headers.get('X-Finetune-Key');
      if (!apiKey) {
        return new Response(JSON.stringify({ error: `Missing ${provider} API key` }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Forward the request
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${apiKey}`,
      };

      // Copy content-type if present
      const contentType = req.headers.get('Content-Type');
      if (contentType) {
        headers['Content-Type'] = contentType;
      }

      try {
        const response = await fetch(targetUrl, {
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
        console.error(`${provider} proxy error:`, error);
        return new Response(JSON.stringify({ error: `Failed to connect to ${provider} API` }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Proxy Tinker API requests to Python sidecar service
    // Format: /api/tinker/{path}
    if (url.pathname.startsWith('/api/tinker/')) {
      const apiPath = url.pathname.replace('/api/tinker', '');
      const targetUrl = `${TINKER_SERVICE_URL}${apiPath}`;

      // Get the API key from the request header
      const apiKey = req.headers.get('X-Tinker-Key');
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'Missing Tinker API key' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const headers: Record<string, string> = {
        'X-Tinker-Key': apiKey,
      };

      const contentType = req.headers.get('Content-Type');
      if (contentType) {
        headers['Content-Type'] = contentType;
      }

      try {
        const response = await fetch(targetUrl, {
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
        console.error('Tinker proxy error:', error);
        return new Response(JSON.stringify({ error: 'Failed to connect to Tinker service. Is tinker-service running?' }), {
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
          'Access-Control-Allow-Headers': 'Content-Type, X-Finetune-Key, X-Tinker-Key',
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
