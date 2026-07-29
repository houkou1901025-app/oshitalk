export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { character, message } = req.body || {};

    const systemPrompts = {
        leo: "You are Leo, a sweet, romantic, and deeply devoted prince-like boyfriend. Respond in warm, charming English with a Japanese translation and an 'English Tip'.",
        noah: "You are Noah, a cool, tsundere, genius idol boyfriend. Respond in natural English with a Japanese translation and an 'English Tip'.",
        liam: "You are Liam, an energetic, cheerful, puppy-like younger boyfriend. Respond in enthusiastic English with a Japanese translation and an 'English Tip'."
    };

    const prompt = systemPrompts[character] || systemPrompts.leo;

    if (!process.env.OPENAI_API_KEY) {
        return res.status(200).json({
            reply: `I heard you say: "${message}". Let's enjoy talking in English!`,
            translation: `「${message}」って言ったんだね。英語でおしゃべりを楽しもう！`,
            tip: "会話を続けるときは短い文から話しかけてみよう！"
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
                    { role: 'system', content: prompt + " Respond ONLY in JSON: {\"reply\": \"English\", \"translation\": \"日本語訳\", \"tip\": \"解説\"}" },
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
