import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Gemini APIの初期化（環境変数 GEMINI_API_KEY を使用）
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/chat', async (req, res) => {
  try {
    const { character, message, step, history } = req.body;

    const charProfiles = {
      leo: "王族のような気品を持ち、ユーザーを甘やかして肯定してくれる王子様キャラクター（二人称: sweetheart）",
      noah: "クールで少しツンデレだが、根は優しく知識豊富なキャラクター",
      liam: "明るくフレンドリーで元気いっぱい、リアクションが大きい弟系キャラクター"
    };

    const profile = charProfiles[character] || charProfiles.leo;

    // 最新の会話履歴をテキスト化（文脈理解用）
    const recentHistoryText = (history || [])
      .slice(-4)
      .map(h => `${h.sender === 'user' ? 'User' : 'Character'}: ${h.text}`)
      .join('\n');

    // ★ 厳格化したシステムプロンプト
    const systemInstruction = `
あなたは英会話アプリの「推し」キャラクターです。
名前/性格設定: ${profile}

これまでの会話履歴:
${recentHistoryText}

【最重要命令】
ユーザーの最新の発言「${message}」およびあなたの返答文を踏まえ、ユーザーが次に返答するための「会話の文脈に100%合致したヒント選択肢(hints)」を3つ生成してください。

【ヒント(hints)生成の絶対ルール】
1. 「That's cool!」「I agree.」「Tell me more.」などの【汎用的で抽象的な定型句】は例外なく生成禁止です。
2. ユーザーの発言に含まれる固有名詞（映画名、作品名、料理名、場所等）や具体的内容に**直接言及するフレーズ**にしてください。
   (例: Jurassic Parkの話なら、恐竜や特定のシーン、映画全般について言及する英文)
3. Step ${step} のレベル調整を行ってください。
   - Step 1: 5語以内の具体表現（例: "The T-Rex was terrifying!"）
   - Step 2: 1〜2文の会話フレーズ（例: "I loved the raptor scene! How about you?"）
   - Step 3: 感想や理由を含めた長めの文章

必ず指定のJSONフォーマットのみを出力してください。
`;

    // Gemini 2.5 Flash モデルによる出力生成
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `ユーザーメッセージ: "${message}"` }] }
      ],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING, description: "推しキャラクターの英語返答文" },
            translation: { type: Type.STRING, description: "返答文の日本語訳" },
            tip: { type: Type.STRING, description: "ワンポイント英語解説" },
            hints: {
              type: Type.ARRAY,
              description: "文脈に直結した具体性のある返答ヒント3つ",
              items: {
                type: Type.OBJECT,
                properties: {
                  en: { type: Type.STRING, description: "英語フレーズ" },
                  jp: { type: Type.STRING, description: "日本語訳" }
                },
                required: ["en", "jp"]
              }
            }
          },
          required: ["reply", "translation", "tip", "hints"]
        }
      }
    });

    const result = JSON.parse(response.text);
    res.json(result);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      reply: "I love talking with you so much!",
      translation: "あなたとお話しするの、本当に楽しいよ！",
      tip: "「so much」をつけると感情がより強調されます。",
      hints: [
        { en: "I love talking with you too!", jp: "私もあなたとお話しできて嬉しい！" },
        { en: "What should we talk about next?", jp: "次はなんの話をしようか？" },
        { en: "Tell me more about your favorite thing!", jp: "あなたの好きなことについてもっと教えて！" }
      ]
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
