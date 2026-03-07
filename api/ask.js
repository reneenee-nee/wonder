// Serverless function for Wonder's questions.
// Receives { question, systemPrompt } from the browser and
// forwards the request to Anthropic using a secret API key.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY on server' });
  }

  try {
    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : (req.body || {});

    const { question, systemPrompt } = body;

    if (!question || !systemPrompt) {
      return res.status(400).json({ error: 'question and systemPrompt are required' });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        // Newer Claude models, including 4.5, use this beta flag.
        'anthropic-beta': 'messages-2025-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }],
      }),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      const status = anthropicRes.status || 500;
      return res.status(status).json({
        error: data?.error || { message: 'Anthropic API error' },
      });
    }

    // Pass Anthropic's response straight back to the browser
    // so your existing front-end parsing still works.
    return res.status(200).json(data);
  } catch (err) {
    console.error('Error in /api/ask:', err);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
}

