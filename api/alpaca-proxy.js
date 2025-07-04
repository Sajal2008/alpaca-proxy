export default async function handler(req, res) {
  console.log('Full request:', {
    url: req.url,
    method: req.method
  });
  
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

  // Parse credentials from Bearer token
  const credentials = authHeader.replace('Bearer ', '');
  const [apiKey, secretKey] = credentials.split(':');
  
  if (!apiKey || !secretKey) {
    return res.status(401).json({ error: 'Invalid authorization format' });
  }

  // Extract the path from the URL
  // req.url will be something like: /api/alpaca-proxy/v2/account?path=%24path
  let fullPath = req.url;
  
  // Remove the /api/alpaca-proxy prefix
  let alpacaPath = fullPath.replace('/api/alpaca-proxy', '');
  
  // Remove any query parameters that include 'path='
  alpacaPath = alpacaPath.split('?')[0];
  
  // If no path, show help
  if (!alpacaPath || alpacaPath === '' || alpacaPath === '/') {
    return res.status(200).json({ 
      message: 'Alpaca proxy is running',
      note: 'Add a path like /v2/account'
    });
  }

  // Build the Alpaca URL
  const alpacaUrl = `https://paper-api.alpaca.markets${alpacaPath}`;
  
  console.log('Proxying to:', alpacaUrl);
  console.log('With credentials:', {
    'APCA-API-KEY-ID': apiKey.substring(0, 5) + '...',
    'APCA-API-SECRET-KEY': secretKey.substring(0, 5) + '...'
  });

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
