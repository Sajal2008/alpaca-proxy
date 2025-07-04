// Save this as: api/alpaca-proxy.js in your Vercel project

export default async function handler(req, res) {
  // Enable CORS for GPT Actions
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract the API key from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  // Expected format: "Bearer PK9VOAP7D3CA18HGF7BH:gkJvuobvGkIiNNELWC9vtHemewGbrnhHntHFBKLG"
  const [apiKey, secretKey] = authHeader.replace('Bearer ', '').split(':');
  
  if (!apiKey || !secretKey) {
    return res.status(401).json({ error: 'Invalid API key format' });
  }

  // Build the Alpaca API URL
  const alpacaBaseUrl = 'https://data.alpaca.markets';
  const path = req.url.replace('/api/alpaca-proxy', '');
  const alpacaUrl = `${alpacaBaseUrl}${path}`;

  try {
    // Forward the request to Alpaca with proper headers
    const alpacaResponse = await fetch(alpacaUrl, {
      method: req.method,
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': secretKey,
        'Content-Type': 'application/json'
      }
    });

    const data = await alpacaResponse.json();
    
    // Forward the response
    res.status(alpacaResponse.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy server error' });
  }
}

// For local testing with Node.js (optional)
// Run with: node alpaca-proxy.js
if (typeof window === 'undefined' && process.env.NODE_ENV === 'test') {
  const http = require('http');
  const server = http.createServer((req, res) => {
    req.headers.authorization = req.headers.authorization || process.env.TEST_AUTH;
    handler(req, res);
  });
  server.listen(3000, () => {
    console.log('Proxy server running on http://localhost:3000');
  });
}
