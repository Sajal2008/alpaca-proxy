export default async function handler(req, res) {
  console.log('Full request:', {
    url: req.url,
    method: req.method
  });
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Extract authorization
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  
  // Parse credentials from Bearer token
  const credentials = authHeader.replace('Bearer ', '');
  const [apiKey, secretKey] = credentials.split(':');
  
  if (!apiKey || !secretKey) {
    return res.status(401).json({ error: 'Invalid authorization format' });
  }
  
  // Extract the path from the URL
  let fullPath = req.url;
  
  // Remove the /api/alpaca-proxy prefix
  let alpacaPath = fullPath.replace('/api/alpaca-proxy', '');
  
  // Remove any query parameters that include 'path='
  const pathParts = alpacaPath.split('?');
  const pathOnly = pathParts[0];
  let queryString = pathParts[1] || '';
  
  // Remove the 'path' parameter if it exists
  if (queryString) {
    const params = new URLSearchParams(queryString);
    params.delete('path'); // Remove the problematic 'path' parameter
    queryString = params.toString();
  }
  
  // If no path, show help
  if (!pathOnly || pathOnly === '' || pathOnly === '/') {
    return res.status(200).json({ 
      message: 'Alpaca proxy is running',
      note: 'Add a path like /v2/account or /v2/stocks/AAPL/quotes/latest'
    });
  }
  
  // Determine which Alpaca domain to use based on the endpoint
  let alpacaDomain = 'https://paper-api.alpaca.markets';
  
  // Check if this is a market data endpoint
  if (pathOnly.includes('/v2/stocks/') || 
      pathOnly.includes('/v2/options/') ||
      pathOnly.includes('/v2/forex/') || 
      pathOnly.includes('/v2/crypto/')) {
    alpacaDomain = 'https://data.alpaca.markets';
  }
  
  // Build the full Alpaca URL with query parameters
  const alpacaUrl = `${alpacaDomain}${pathOnly}${queryString ? '?' + queryString : ''}`;
  
  console.log('Proxying to:', alpacaUrl);
  console.log('With credentials:', {
    'APCA-API-KEY-ID': apiKey.substring(0, 5) + '...',
    'APCA-API-SECRET-KEY': secretKey.substring(0, 5) + '...'
  });
  
  try {
    // Prepare request options
    const fetchOptions = {
      method: req.method,
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': secretKey,
        'Content-Type': 'application/json'
      }
    };
    
    // Add body for POST/PUT requests
    if (req.method === 'POST' || req.method === 'PUT') {
      fetchOptions.body = JSON.stringify(req.body);
    }
    
    const alpacaResponse = await fetch(alpacaUrl, fetchOptions);
    const data = await alpacaResponse.json();
    
    console.log('Alpaca response:', {
      status: alpacaResponse.status,
      data: JSON.stringify(data).substring(0, 100) + '...'
    });
    
    res.status(alpacaResponse.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy server error', 
      details: error.message 
    });
  }
}
