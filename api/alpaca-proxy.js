export default async function handler(req, res) {
  // Enable CORS for GPT Actions
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract the combined credentials from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  // Try different formats
  let apiKey, secretKey;
  
  // Format 1: "Bearer KEY:SECRET"
  if (authHeader.startsWith('Bearer ')) {
    const credentials = authHeader.replace('Bearer ', '');
    [apiKey, secretKey] = credentials.split(':');
  }
  // Format 2: "APCA-API-KEY-ID=KEY,APCA-API-SECRET-KEY=SECRET"
  else if (authHeader.includes('APCA-API-KEY-ID=')) {
    const matches = authHeader.match(/APCA-API-KEY-ID=([^,]+),APCA-API-SECRET-KEY=(.+)/);
    if (matches) {
      apiKey = matches[1];
      secretKey = matches[2];
    }
  }
  // Format 3: Direct "KEY:SECRET"
  else {
    [apiKey, secretKey] = authHeader.split(':');
  }
  
  if (!apiKey || !secretKey) {
    return res.status(401).json({ error: 'Invalid authorization format' });
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
    res.status(500).json({ error: 'Proxy server error', details: error.message });
  }
}
