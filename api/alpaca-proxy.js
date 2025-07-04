export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract authorization
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  // Parse credentials
  const credentials = authHeader.replace('Bearer ', '');
  const [apiKey, secretKey] = credentials.split(':');
  
  if (!apiKey || !secretKey) {
    return res.status(401).json({ error: 'Invalid authorization format' });
  }

  // Get the path and query from the original URL
  // The GPT is sending: /api/alpaca-proxy/v2/stocks/bars?symbols=AAPL&limit=5
  // We need: /v2/stocks/bars?symbols=AAPL&limit=5
  
  const fullUrl = req.url;
  const pathMatch = fullUrl.match(/\/api\/alpaca-proxy(.+)/);
  
  if (!pathMatch) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  
  const alpacaPath = pathMatch[1]; // This gets everything after /api/alpaca-proxy
  const alpacaUrl = `https://data.alpaca.markets${alpacaPath}`;
  
  console.log('Proxying to:', alpacaUrl);

  try {
    const alpacaResponse = await fetch(alpacaUrl, {
      method: req.method,
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': secretKey,
        'Content-Type': 'application/json'
      }
    });

    const data = await alpacaResponse.json();
    res.status(alpacaResponse.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy server error', 
      details: error.message 
    });
  }
}
