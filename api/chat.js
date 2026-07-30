export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { character, message } = req.body || {};

    // 💡 Tipの解説を確実に【日本語】で返させるプロンプト設定
    const systemPrompts = {
        leo: "You are Leo, a sweet, romantic prince-like boyfriend. Respond in warm, charming English. Provide a natural Japanese translation and an 'English Tip'. CRITICAL: ALL 'English Tip' EXPLANATIONS MUST BE WRITTEN IN JAPANESE ONLY.",
        noah: "You are Noah, a cool tsundere idol boyfriend. Respond in natural English. Provide a natural Japanese translation and an 'English Tip'. CRITICAL: ALL 'English Tip' EXPLANATIONS MUST BE WRITTEN IN JAPANESE ONLY.",
        liam: "You are Liam, an energetic puppy-like younger boyfriend. Respond in enthusiastic English. Provide a natural Japanese translation and an 'English Tip'. CRITICAL: ALL 'English Tip' EXPLANATIONS MUST BE WRITTEN IN JAPANESE ONLY."
    };

    const prompt = systemPrompts[character] || systemPrompts.leo;

    if (!process.env.OPENAI_API_KEY) {
        return res.status(200).json({
            reply: `I heard you say: "${message}". I love talking with you!`,
            translation: `「${message}」って言ったんだね。君とお話しできてすごく嬉しいよ！`,
            tip: "「love doing ~」で「〜するのが大好き」という意味になるよ！"
        });
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
                    { role: 'system', content: prompt + " Respond ONLY in JSON: {\"reply\": \"English response\", \"translation\": \"日本語訳\", \"tip\": \"日本語での英語ポイント解説\"}" },
                    { role: 'user', content: message }
                ],
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch response" });
    }
}
