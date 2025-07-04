export default async function handler(req, res) {
  console.log('Incoming request:', {
    method: req.method,
    url: req.url,
    headers: req.headers
  });

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
    console.error('Missing authorization header');
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  // Extract API key and secret
  let apiKey, secretKey;
  const credentials = authHeader.replace('Bearer ', '');
  [apiKey, secretKey] = credentials.split(':');
  
  if (!apiKey || !secretKey) {
    console.error('Invalid credentials format');
    return res.status(401).json({ error: 'Invalid authorization format. Expected: Bearer API_KEY:SECRET_KEY' });
  }

  // Extract the path after /api/alpaca-proxy
  let alpacaPath = req.url.replace('/api/alpaca-proxy', '');
  
  // If no path provided, add a default
  if (!alpacaPath || alpacaPath === '/') {
    alpacaPath = '/v2/stocks/bars';
  }

  // Build the full Alpaca URL with query parameters
  const alpacaUrl = `https://data.alpaca.markets${alpacaPath}`;
  
  console.log('Forwarding to Alpaca:', {
    url: alpacaUrl,
    apiKey: apiKey.substring(0, 5) + '...',
    secretKey: secretKey.substring(0, 5) + '...'
  });

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

    const responseText = await alpacaResponse.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Alpaca response:', responseText);
      data = { error: 'Invalid response from Alpaca', details: responseText };
    }

    console.log('Alpaca response status:', alpacaResponse.status);
    
    // Forward the response
    res.status(alpacaResponse.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy server error', 
      details: error.message,
      stack: error.stack 
    });
  }
}
