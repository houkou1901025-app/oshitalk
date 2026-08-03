import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // CORS設定
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
    const { character, message, step, history, isPremium } = req.body;

    // キャラクターのプロンプト詳細設定（提供資料に基づき更新）
    const charProfiles = {
      leo: "王道王子様×溺愛系（24歳/若手俳優）。誰にでも優しいがユーザーには特別扱い。甘く品のあるネイティブ英語でユーザーの全肯定をしつつ寄り添う（一人称: I, 二人称: sweetheart / my dear）。",
      noah: "クール×ツンデレ×実は寂しがり屋（21歳/アイドル）。最初は少し素っ気ないが親しくなるとデレる。スラングやリアルな表現も使う短文・即レス傾向（一人称: I, 二人称: you）。",
      liam: "明るくフレンドリーで元気いっぱいな弟系キャラクター（別名Ethan等、包容力・親しみやすさ重視）。ポジティブでテンポよく親しみやすい英語を使う。"
    };

    const profile = charProfiles[character] || charProfiles.leo;

    const recentHistoryText = (history || [])
      .slice(-4)
      .map(h => `${h.sender === 'user' ? 'User' : 'Character'}: ${h.text}`)
      .join('\n');

    const systemPrompt = `
あなたは英会話アプリの推しキャラクター「${character.toUpperCase()}」（プロファイル: ${profile}）です。

直近の会話履歴:
${recentHistoryText}

【役割】
ユーザーの会話相手として英語で返答しつつ、自然な英文法・語彙の学びを提供してください。

【感情判定（emotion）の指定】
返答時のキャラクターの感情・表情を必ず以下の5つの中から1つ選んで出力してください:
- "normal" (通常/通常笑顔)
- "happy" (笑顔/大喜び)
- "blush" (照れ/赤面)
- "sad" (心配/哀しみ)
- "angry" (怒り/すねる/ツン)

【厳格命令：返答ヒント(hints)および解説(tip)生成ルール】
1. reply: キャラクターになりきった英文返答。
2. translation: 自然な日本語訳。
3. tip: ユーザーの発言に対する文法や語彙のワンポイントレッスン（「もっと自然な言い方」「使われている文法要素の簡単な解説」など）。
4. hints: ユーザーが次に応答するための「文脈に100%合致した具体的ヒント」を3つ生成。
   ❌ 「That's cool!」等の文脈に関係ない相槌は厳禁。
   ⭕ 相手の発言（お風呂、仕事、食事など）に直結した自然なフレーズ。
   - Step ${step} のレベル調整:
     - Step 1: 3〜5語程度のシンプルな応答
     - Step 2: 1〜2文の自然な会話文
     - Step 3: 理由や感情を含めた丁寧な文章

出力フォーマット（必ず以下のJSON形式のみ）:
{
  "emotion": "normal | happy | blush | sad | angry",
  "reply": "キャラの英語返答文",
  "translation": "日本語訳",
  "tip": "文法や語彙のワンポイント解説",
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
      temperature: 0.7
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.status(200).json(result);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      emotion: "normal",
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
