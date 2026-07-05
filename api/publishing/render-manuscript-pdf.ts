import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      error: 'Method Not Allowed',
    });
  }

  const token = process.env.BROWSERLESS_TOKEN;
  if (!token || !token.trim()) {
    return res.status(503).json({
      error: 'Controlled PDF renderer is not configured',
    });
  }

  const { html, title } = req.body || {};
  if (typeof html !== 'string' || !html.trim()) {
    return res.status(400).json({
      error: 'Missing HTML content',
    });
  }

  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({
      error: 'Missing title',
    });
  }

  const endpoint = process.env.BROWSERLESS_ENDPOINT || 'https://chrome.browserless.io/pdf';

  try {
    const response = await fetch(`${endpoint}?token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html,
        options: {
          printBackground: true,
          format: 'A4',
          preferCSSPageSize: true,
          margin: {
            top: '20mm',
            bottom: '20mm',
            left: '15mm',
            right: '15mm',
          },
        },
      }),
    });

    if (!response.ok) {
      // Do not return raw upstream status or error message
      return res.status(502).json({
        error: 'Controlled PDF renderer returned invalid PDF',
      });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/pdf')) {
      return res.status(502).json({
        error: 'Controlled PDF renderer returned invalid PDF',
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return res.status(502).json({
        error: 'Controlled PDF renderer returned invalid PDF',
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length.toString());
    return res.status(200).send(buffer);
  } catch {
    // Keep errors generic and do not leak any HTML payload details
    return res.status(502).json({
      error: 'Controlled PDF renderer returned invalid PDF',
    });
  }
}
