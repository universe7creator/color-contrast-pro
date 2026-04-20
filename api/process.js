/**
 * Color Contrast Pro - API Process Endpoint
 * WCAG 2.1 Color Contrast Calculator
 */

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function calculateContrast(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return null;

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  const ratio = (brightest + 0.05) / (darkest + 0.05);

  return {
    ratio: ratio,
    ratioFormatted: ratio.toFixed(2) + ':1',
    aaLarge: ratio >= 3,
    aaNormal: ratio >= 4.5,
    aaaLarge: ratio >= 4.5,
    aaaNormal: ratio >= 7,
    hex1,
    hex2
  };
}

function findClosestPassingColor(fgHex, bgHex, targetLevel = 'aa') {
  const rgb = hexToRgb(fgHex);
  if (!rgb) return null;

  const targetRatio = targetLevel === 'aaa' ? 7 : (targetLevel === 'aalarge' ? 3 : 4.5);
  let bestColor = fgHex;
  let bestDiff = Infinity;

  // Try adjusting lightness
  for (let i = 0; i <= 255; i += 5) {
    const testRgb = { ...rgb, r: Math.min(255, rgb.r + i), g: Math.min(255, rgb.g + i), b: Math.min(255, rgb.b + i) };
    const testHex = `#${testRgb.r.toString(16).padStart(2, '0')}${testRgb.g.toString(16).padStart(2, '0')}${testRgb.b.toString(16).padStart(2, '0')}`;
    const result = calculateContrast(testHex, bgHex);

    if (result.ratio >= targetRatio) {
      const diff = Math.abs(i);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestColor = testHex;
      }
    }
  }

  return bestColor !== fgHex ? bestColor : null;
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, foreground, background, targetLevel } = req.body || {};

    if (action === 'check') {
      if (!foreground || !background) {
        return res.status(400).json({ error: 'Foreground and background colors required' });
      }

      const result = calculateContrast(foreground, background);
      if (!result) {
        return res.status(400).json({ error: 'Invalid color format' });
      }

      return res.json({
        success: true,
        data: result
      });
    }

    if (action === 'suggest') {
      if (!foreground || !background) {
        return res.status(400).json({ error: 'Foreground and background colors required' });
      }

      const suggestion = findClosestPassingColor(foreground, background, targetLevel || 'aa');
      return res.json({
        success: true,
        data: {
          original: foreground,
          suggested: suggestion,
          found: suggestion !== null
        }
      });
    }

    if (action === 'bulk') {
      const { pairs } = req.body;
      if (!Array.isArray(pairs)) {
        return res.status(400).json({ error: 'Pairs array required' });
      }

      const results = pairs.map(pair => ({
        ...pair,
        ...calculateContrast(pair.foreground, pair.background)
      }));

      return res.json({
        success: true,
        data: results
      });
    }

    return res.status(400).json({ error: 'Invalid action. Use: check, suggest, bulk' });

  } catch (error) {
    console.error('Process error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
