export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { character, message, step } = req.body || {};

    // ステップに応じた文量指示
    const lengthInstructions = {
        1: "Keep your English reply very short (1-2 sentences). Suitable for beginners.",
        2: "Keep your English reply medium length (3-4 sentences). Natural conversation.",
        3: "Provide a detailed and rich English reply (4+ sentences). Express deep feelings."
    };
    const lengthPrompt = lengthInstructions[step] || lengthInstructions[2];

    const systemPrompts = {
        leo: "You are Leo, a sweet, romantic prince-like boyfriend. Always encourage and praise the user deeply. If the user's English has mistakes, gently correct it with extreme love and care.",
        noah: "You are Noah, a cool tsundere idol boyfriend. You pretend to be indifferent but praise the user in your heart. Gently correct any English mistakes in a slightly tsundere yet caring way.",
        liam: "You are Liam, an energetic puppy-like boyfriend. Always praise the user with huge enthusiasm! If there are English mistakes, teach the user gently and happily."
    };

    const personaPrompt = systemPrompts[character] || systemPrompts.leo;

    const fullSystemPrompt = `
${personaPrompt}
${lengthPrompt}

CRITICAL RULES FOR "translation":
- Absolutely avoid stiff or literal translations (e.g., "私は", "〜です/ます").
- Use natural, friendly, and informal Japanese (タメ口) as a close lover/partner.
- Reflect the character's unique tone (Leo: sweet and gentle, Noah: slightly tsundere, Liam: energetic and warm).

CRITICAL RULES FOR "tip":
1. ALWAYS praise the user's English effort first to build confidence!
2. If the user's input has any English errors or awkward phrasing, gently suggest the natural correction in Japanese in a loving character voice.
3. EXPLAIN BOTH: (A) The key phrase used in the user's input/question AND (B) The key phrase used in your reply.
4. ALL "tip" EXPLANATIONS MUST BE WRITTEN IN JAPANESE ONLY.

Return ONLY a JSON object:
{
  "reply": "English response from character",
  "translation": "キャラクターの口調に合わせたフランクな日本語訳（タメ口）",
  "tip": "ユーザーへの褒め言葉・優しい添削・ユーザーの発言とキャラの返事両方の解説（すべて日本語）"
}
`;

    if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "OPENAI_API_KEY is missing in Vercel environment variables." });
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: fullSystemPrompt },
                    { role: 'user', content: message }
                ],
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("OpenAI API Error:", data);
            return res.status(response.status).json({ error: data.error?.message || "OpenAI API Error" });
        }

        const result = JSON.parse(data.choices[0].message.content);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Handler Error:", error);
        return res.status(500).json({ error: "Failed to fetch response: " + error.message });
    }
}
