/**
 * Color Contrast Pro - Health Check Endpoint
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.status(200).json({
    status: 'healthy',
    service: 'color-contrast-pro',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
};
