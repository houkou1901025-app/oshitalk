import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // CORS設定（ブラウザからの通信許可）
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { character, message, step, history } = req.body;

    const charProfiles = {
      leo: "王族のような気品を持ち、ユーザーを甘やかして肯定してくれる王子様キャラクター（二人称: sweetheart）",
      noah: "クールで少しツンデレだが、根は優しく知識豊富なキャラクター",
      liam: "明るくフレンドリーで元気いっぱい、リアクションが大きい弟系キャラクター"
    };

    const profile = charProfiles[character] || charProfiles.leo;

    const recentHistoryText = (history || [])
      .slice(-4)
      .map(h => `${h.sender === 'user' ? 'User' : 'Character'}: ${h.text}`)
      .join('\n');

    const systemPrompt = `
あなたは英会話アプリの「推し」キャラクター（${profile}）です。

直近の会話履歴:
${recentHistoryText}

【厳格命令：返答ヒント(hints)生成ルール】
ユーザーの最新発言「${message}」およびあなたの返答文を踏まえ、ユーザーが次に応答するための「文脈に100%合致した具体的ヒント」を3つ生成してください。

❌ 絶対禁止ルール:
- 「That's so cool!」「I agree with you.」「Tell me more about it!」などの【文脈に関係ない相槌や汎用フレーズ】は例外なく禁止です。
- ユーザーが「お風呂に入る」「ご飯を食べる」「寝る」などの日常動作を言っているときに「かっこいい！」「同感だよ」などの噛み合わない返答を絶対に出さないでください。

⭕ 必須ルール:
- 相手の発言（お風呂、仕事、料理、睡眠、趣味等）の具体的な内容に直接リンクした返答を作成してください。
  （例: 「お風呂に入る」に対する正しいヒント例: "See you later!", "I'm going to relax too.", "Talk to you after my bath."）
- Step ${step} のレベル調整を行ってください。
  - Step 1: 3〜5語程度の具体的で自然なやり取り
  - Step 2: 1〜2文の会話フレーズ
  - Step 3: 理由や感情を含めた丁寧な文章

出力フォーマット（必ず以下のJSON形式のみ）:
{
  "reply": "キャラの英語返答文",
  "translation": "日本語訳",
  "tip": "ワンポイント解説",
  "hints": [
    { "en": "文脈に合った英語1", "jp": "日本語訳1" },
    { "en": "文脈に合った英語2", "jp": "日本語訳2" },
    { "en": "文脈に合った英語3", "jp": "日本語訳3" }
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `ユーザーの発言: "${message}"` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.6
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.status(200).json(result);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      reply: "Enjoy your time!",
      translation: "良い時間を過ごしてね！",
      tip: "相手の行動を送り出す時の定番表現です。",
      hints: [
        { en: "See you in a bit!", jp: "また後でね！" },
        { en: "Talk to you later!", jp: "また後で話そうね！" },
        { en: "Have a good rest!", jp: "ゆっくり休んでね！" }
      ]
    });
  }
}
