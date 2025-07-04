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

  // Get the path from query parameter (set by rewrite rule)
  const pathParam = req.query.path;
  if (!pathParam) {
    return res.status(200).json({ 
      message: 'Alpaca proxy is running',
      note: 'Add a path like /v2/stocks/bars or /v2/stocks/AAPL/snapshot'
    });
  }

  // Reconstruct the full path
  const alpacaPath = '/' + (Array.isArray(pathParam) ? pathParam.join('/') : pathParam);
  
  // Build query string excluding the path parameter
  const queryParams = { ...req.query };
  delete queryParams.path;
  const queryString = new URLSearchParams(queryParams).toString();
  
  const alpacaUrl = `https://data.alpaca.markets${alpacaPath}${queryString ? '?' + queryString : ''}`;
  
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
