import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import OpenAI from 'openai'
import { router, publicProcedure } from '../trpc'

const generateInput = z.object({
  storeId: z.number(),
  menuIds: z.array(z.number()),
  storeName: z.string(),
  storeArea: z.string(),
  menuNames: z.array(z.string()),
  purpose: z.string(),
  satisfaction: z.string(),
  staffImpression: z.array(z.string()),
  staffImpressionText: z.string().optional(),
  atmosphere: z.array(z.string()),
  atmosphereText: z.string().optional(),
  visitFrequency: z.string(),
})

type GenerateInput = z.infer<typeof generateInput>

// OpenAI互換クライアント（遅延初期化）
let _client: OpenAI | null = null
function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'AIサービスが設定されていません（OPENAI_API_KEY 未設定）',
      })
    }
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    })
  }
  return _client
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

// 肯定的／否定的、それぞれ3つのトーン指示
const POSITIVE_TONES = [
  '明るく前向きなトーンで、施術による体の変化や効果を中心に書いてください。',
  '丁寧で落ち着いたトーンで、スタッフの対応や院内の雰囲気を中心に書いてください。',
  '具体的な体験談として、施術前後の変化がイメージできるように書いてください。',
]

const NEGATIVE_TONES = [
  '冷静に事実を述べるトーンで、期待していたことと実際の結果とのギャップを中心に、感情的にならず建設的に書いてください。',
  '丁寧なトーンで、スタッフの対応や院内の雰囲気について気になった点を、相手を尊重しながら建設的に書いてください。',
  '具体的な体験談として、期待していた内容と実際に受けた施術との違いを、事実ベースで建設的に書いてください。',
]

function buildSystemPrompt(isNegative: boolean): string {
  return [
    'あなたは、実際に施術を受けたお客様がGoogleマップに投稿する口コミ文章の作成を手伝うアシスタントです。',
    'お客様が入力した実体験の情報だけを元に、日本語で自然な口コミ文を作成してください。',
    '',
    '【ルール】',
    '- 200〜400文字程度にする',
    '- 自然で親しみやすい言葉遣いにする',
    '- 太字（**）などの装飾記号は使わない',
    '- 過度な誇張、断定的な効果効能（「必ず治る」「絶対痩せる」など）は書かない',
    '- 「No.1」「日本一」など最上級・比較表現は使わない',
    '- 同業他店の批判や、スタッフ個人が特定できる氏名などは書かない',
    '- 入力にない事実を創作しない',
    isNegative
      ? '- 否定的な評価であっても、正直で建設的なフィードバックとして誠実に書く'
      : '- お客様の満足した気持ちが伝わるように書く',
    '',
    '出力は口コミ本文のみ。前置きや説明、引用符は付けないでください。',
  ].join('\n')
}

function buildUserPrompt(input: GenerateInput, toneInstruction: string): string {
  const lines: string[] = []
  lines.push(`店舗名: ${input.storeName}`)
  // MEO対策として地域名を自然に含めるよう指示
  lines.push(`地域（MEO対策として本文に自然に一度含める）: ${input.storeArea}`)
  lines.push(`受けた施術メニュー: ${input.menuNames.join('、') || '未指定'}`)
  if (input.purpose) lines.push(`来店した目的・お悩み: ${input.purpose}`)
  if (input.satisfaction) lines.push(`満足度: ${input.satisfaction}`)

  const staff = [...input.staffImpression]
  if (input.staffImpressionText) staff.push(input.staffImpressionText)
  if (staff.length) lines.push(`施術者の印象: ${staff.join('、')}`)

  const atmos = [...input.atmosphere]
  if (input.atmosphereText) atmos.push(input.atmosphereText)
  if (atmos.length) lines.push(`店内の雰囲気: ${atmos.join('、')}`)

  if (input.visitFrequency) lines.push(`通院頻度: ${input.visitFrequency}`)

  lines.push('')
  lines.push(`【この口コミのトーン】${toneInstruction}`)
  lines.push('')
  lines.push('上記の情報を元に、口コミ本文を1つ作成してください。')
  return lines.join('\n')
}

async function generateOne(
  client: OpenAI,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.9,
    max_tokens: 700,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })
  return (completion.choices[0]?.message?.content ?? '').trim()
}

// IPごとの簡易レートリミット（1分3回・1時間20回）。
// 認証なしの公開エンドポイントなので、連打やスクリプトによるLLM課金の暴走を防ぐ。
const RATE_LIMITS = [
  { windowMs: 60_000, max: 3, message: '生成リクエストが多すぎます。1分ほど待ってからお試しください。' },
  { windowMs: 3_600_000, max: 20, message: '1時間あたりの生成回数の上限に達しました。時間をおいてお試しください。' },
]
const hitLog = new Map<string, number[]>()

function assertRateLimit(key: string) {
  const now = Date.now()
  const maxWindow = Math.max(...RATE_LIMITS.map((r) => r.windowMs))
  const hits = (hitLog.get(key) ?? []).filter((t) => now - t < maxWindow)
  for (const { windowMs, max, message } of RATE_LIMITS) {
    if (hits.filter((t) => now - t < windowMs).length >= max) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message })
    }
  }
  hits.push(now)
  hitLog.set(key, hits)
  // 溜まりすぎ防止の掃除
  if (hitLog.size > 10_000) {
    for (const [k, v] of hitLog) {
      if (v.every((t) => now - t >= maxWindow)) hitLog.delete(k)
    }
  }
}

export const reviewRouter = router({
  generate: publicProcedure.input(generateInput).mutation(async ({ input, ctx }) => {
    assertRateLimit(ctx.ip)
    const client = getClient()
    const isNegative = input.satisfaction === '不満' || input.satisfaction === 'とても不満'
    const tones = isNegative ? NEGATIVE_TONES : POSITIVE_TONES
    const systemPrompt = buildSystemPrompt(isNegative)

    try {
      // 3つのバリエーションを並列で生成
      const variations = await Promise.all(
        tones.map((tone) => generateOne(client, systemPrompt, buildUserPrompt(input, tone))),
      )
      const cleaned = variations.map((v) => v || '口コミの生成に失敗しました。もう一度お試しください。')
      return { variations: cleaned }
    } catch (err) {
      console.error('[review.generate] LLM error', err)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: '口コミの生成に失敗しました。しばらくしてからもう一度お試しください。',
      })
    }
  }),
})
