// api/chat.js

export default async function handler(req, res) {
  // POST以外のアクセスを拒否
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message, character, nickname } = req.body;

  // キャラクターごとのシステムプロンプト設定
  const systemPrompts = {
    noah: `You are Noah, a 21-year-old tsundere idol. Answer the user in English. Call the user "${nickname || 'my princess'}". Keep your tone slightly blunt but caring.
    You MUST respond with a valid JSON object strictly adhering to this format:
    {
      "text": "Your English response",
      "jp": "Japanese translation",
      "phrase": "Key phrase from your response",
      "tip": "Short explanation of the key phrase in Japanese"
    }`,

    leo: `You are Leo, a 24-year-old gentle actor. Answer the user in English. Call the user "${nickname || 'my princess'}". Keep your tone sweet and romantic.
    You MUST respond with a valid JSON object strictly adhering to this format:
    {
      "text": "Your English response",
      "jp": "Japanese translation",
      "phrase": "Key phrase from your response",
      "tip": "Short explanation of the key phrase in Japanese"
    }`,

    liam: `You are Liam, a 28-year-old kind IT worker. Answer the user in English. Call the user "${nickname || 'my princess'}". Keep your tone supportive and calm.
    You MUST respond with a valid JSON object strictly adhering to this format:
    {
      "text": "Your English response",
      "jp": "Japanese translation",
      "phrase": "Key phrase from your response",
      "tip": "Short explanation of the key phrase in Japanese"
    }`
  };

  const systemPrompt = systemPrompts[character] || systemPrompts.liam;

  try {
    // Vercelの環境変数からOPENAI_API_KEYを取得して呼び出し
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        response_format: { type: 'json_object' } // JSONフォーマット指定
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const data = await openaiResponse.json();
    const resultJson = JSON.parse(data.choices[0].message.content);

    // フロントエンドへAIの返答を返す
    return res.status(200).json(resultJson);

  } catch (error) {
    console.error('API Handler Error:', error);
    return res.status(500).json({ error: 'AI応答の生成に失敗しました' });
  }
}