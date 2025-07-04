export default async function handler(req, res) {
  console.log('=== INCOMING REQUEST ===');
  console.log('URL:', req.url);
  console.log('Method:', req.method);
  console.log('Query:', req.query);

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
    console.error('No authorization header found');
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  // Parse credentials
  let apiKey, secretKey;
  const credentials = authHeader.replace('Bearer ', '');
  [apiKey, secretKey] = credentials.split(':');
  
  if (!apiKey || !secretKey) {
    console.error('Invalid credential format');
    return res.status(401).json({ error: 'Invalid authorization format' });
  }

  // Extract the actual path from the URL
  // The URL will be something like /api/alpaca-proxy/v2/stocks/bars
  // We need to get everything after /api/
  let alpacaPath = req.url.split('?')[0]; // Remove query string
  alpacaPath = alpacaPath.replace('/api', ''); // Remove /api prefix
  
  // If the path contains 'alpaca-proxy', remove it
  if (alpacaPath.includes('/alpaca-proxy')) {
    alpacaPath = alpacaPath.replace('/alpaca-proxy', '');
  }
  
  // Ensure path starts with /
  if (!alpacaPath.startsWith('/')) {
    alpacaPath = '/' + alpacaPath;
  }

  // Build query string from req.query
  const queryParams = new URLSearchParams();
  Object.keys(req.query).forEach(key => {
    if (key !== 'path') { // Exclude the path parameter if it exists
      queryParams.append(key, req.query[key]);
    }
  });
  
  const queryString = queryParams.toString();
  const alpacaUrl = `https://data.alpaca.markets${alpacaPath}${queryString ? '?' + queryString : ''}`;
  
  console.log('Forwarding to Alpaca:', alpacaUrl);
  console.log('With credentials:', { apiKey: apiKey.substring(0, 5) + '...', secretKey: secretKey.substring(0, 5) + '...' });

  try {
    const alpacaResponse = await fetch(alpacaUrl, {
      method: req.method,
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': secretKey,
        'Content-Type': 'application/json'
      }
    });

    const responseText = await alpacaResponse.text();
    console.log('Alpaca response status:', alpacaResponse.status);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response:', responseText);
      data = { error: 'Invalid response from Alpaca', details: responseText };
    }
    
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
