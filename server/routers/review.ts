import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import OpenAI from 'openai'
import { and, eq, inArray } from 'drizzle-orm'
import { router, activeProcedure } from '../trpc'
import { db } from '../db'
import { menus, stores } from '../db/schema'
import { NEGATIVE_SATISFACTIONS, type TenantConfig } from '../../shared/tenantConfig'
import { addGeneration, currentMonthJst, getGenerationCount } from '../generationCount'
import { AVOID_WORDS, findAvoidWords, softenAvoidWords } from '../../shared/contentValidator'

// 店名・地域・メニュー名は画面から受け取らず、IDからこのお店のDBの値を引く
// （別のお店の店名で文章を作らせない）
const generateInput = z.object({
  storeId: z.number(),
  menuIds: z.array(z.number()),
  purpose: z.string(),
  satisfaction: z.string(),
  staffImpression: z.array(z.string()),
  staffImpressionText: z.string().optional(),
  atmosphere: z.array(z.string()),
  atmosphereText: z.string().optional(),
  visitFrequency: z.string(),
})

type PromptInput = z.infer<typeof generateInput> & {
  storeName: string
  storeArea: string
  menuNames: string[]
}

// Google Gemini を OpenAI 互換エンドポイント経由で利用する（遅延初期化）
const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/'

let _client: OpenAI | null = null
function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'AIサービスが設定されていません（GEMINI_API_KEY 未設定）',
      })
    }
    _client = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: GEMINI_BASE_URL,
    })
  }
  return _client
}

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const DEMO_MARK = '【デモ版のサンプルです・投稿には使えません】'

// 肯定的／否定的、それぞれ3つのトーン指示。〇〇の言葉はお店ごとの設定（words）で変わる
function positiveTones(w: TenantConfig['words']) {
  // 体の変化を書かせるのは施術のお店だけ（物販などで「効果」を書かせない）
  if (w.service !== '施術') {
    return [
      `明るく前向きなトーンで、${w.service}の良かったところや満足した点を中心に書いてください。`,
      `丁寧で落ち着いたトーンで、スタッフの対応や${w.place}の雰囲気を中心に書いてください。`,
      `具体的な体験談として、来店してから${w.service}を受け取るまでの流れがイメージできるように書いてください。`,
    ]
  }
  return [
    `明るく前向きなトーンで、${w.service}による体の変化や効果を中心に書いてください。`,
    `丁寧で落ち着いたトーンで、スタッフの対応や${w.place}の雰囲気を中心に書いてください。`,
    `具体的な体験談として、${w.service}前後の変化がイメージできるように書いてください。`,
  ]
}

function negativeTones(w: TenantConfig['words']) {
  return [
    '冷静に事実を述べるトーンで、期待していたことと実際の結果とのギャップを中心に、感情的にならず建設的に書いてください。',
    `丁寧なトーンで、スタッフの対応や${w.place}の雰囲気について気になった点を、相手を尊重しながら建設的に書いてください。`,
    `具体的な体験談として、期待していた内容と実際に受けた${w.service}との違いを、事実ベースで建設的に書いてください。`,
  ]
}

function buildSystemPrompt(isNegative: boolean, config: TenantConfig): string {
  return [
    `あなたは、${config.industry}で実際に${config.words.service}を受けたお客様がGoogleマップに投稿する口コミ文章の作成を手伝うアシスタントです。`,
    'お客様が入力した実体験の情報だけを元に、日本語で自然な口コミ文を作成してください。',
    '',
    '【ルール】',
    '- 200〜400文字程度にする',
    '- 自然で親しみやすい言葉遣いにする',
    '- 太字（**）などの装飾記号は使わない',
    '- 過度な誇張、断定的な効果効能（「必ず治る」「絶対痩せる」など）は書かない',
    '- 「No.1」「日本一」など最上級・比較表現は使わない',
    `- 次の言葉は、言葉の一部としても一切使わない（Googleの口コミで問題になるため）：${AVOID_WORDS.join('、')}`,
    '- 同業他店の批判や、スタッフ個人が特定できる氏名などは書かない',
    '- 入力にない事実を創作しない',
    isNegative
      ? '- 否定的な評価であっても、正直で建設的なフィードバックとして誠実に書く'
      : '- お客様の満足した気持ちが伝わるように書く',
    '',
    '出力は口コミ本文のみ。前置きや説明、引用符は付けないでください。',
  ].join('\n')
}

function buildUserPrompt(input: PromptInput, w: TenantConfig['words'], toneInstruction: string): string {
  const lines: string[] = []
  lines.push(`店舗名: ${input.storeName}`)
  // MEO対策として地域名を自然に含めるよう指示
  lines.push(`地域（MEO対策として本文に自然に一度含める）: ${input.storeArea}`)
  lines.push(`受けた${w.service}メニュー: ${input.menuNames.join('、') || '未指定'}`)
  if (input.purpose) lines.push(`来店した目的・お悩み: ${input.purpose}`)
  if (input.satisfaction) lines.push(`満足度: ${input.satisfaction}`)

  const staff = [...input.staffImpression]
  if (input.staffImpressionText) staff.push(input.staffImpressionText)
  if (staff.length) lines.push(`${w.staff}の印象: ${staff.join('、')}`)

  const atmos = [...input.atmosphere]
  if (input.atmosphereText) atmos.push(input.atmosphereText)
  if (atmos.length) lines.push(`${w.place}の雰囲気: ${atmos.join('、')}`)

  if (input.visitFrequency) lines.push(`${w.frequency}: ${input.visitFrequency}`)

  lines.push('')
  lines.push(`【この口コミのトーン】${toneInstruction}`)
  lines.push('')
  lines.push('上記の情報を元に、口コミ本文を1つ作成してください。')
  return lines.join('\n')
}

// 使わせない言葉が混ざったら、その言葉を示して2回まで書き直させる。それでも残れば穏やかな言い方に置き換える
async function generateOne(
  client: OpenAI,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  let text = await complete(client, systemPrompt, userPrompt)
  for (let i = 0; i < 2 && text; i++) {
    const hits = findAvoidWords(text)
    if (!hits.length) return text
    const retry = await complete(
      client,
      systemPrompt,
      `${userPrompt}\n\n【書き直し】次の下書きには使えない言葉（${hits.join('、')}）が入っています。内容と長さはそのままに、これらの言葉を一切使わずに自然な言い方へ書き直してください。\n\n${text}`,
    )
    if (retry) text = retry
  }
  return findAvoidWords(text).length ? softenAvoidWords(text) : text
}

async function complete(
  client: OpenAI,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.9,
    max_tokens: 700,
    // Gemini 2.5系は既定で「思考」が有効で max_tokens を消費し出力が途切れるため無効化する。
    // reasoning_effort は Gemini 独自の "none" を使うため型を緩めて渡す。
    reasoning_effort: 'none' as unknown as 'low',
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
  generate: activeProcedure.input(generateInput).mutation(async ({ input, ctx }) => {
    assertRateLimit(ctx.ip)
    const { config } = ctx.tenant
    const month = currentMonthJst()
    // 上限は1店舗あたり（契約書第7条第1号）。お店全体では × 店舗数
    const storeCount = config.monthlyLimit === null
      ? 0
      : (await db.select({ id: stores.id }).from(stores).where(eq(stores.tenantId, ctx.tenant.id))).length
    const limit = config.monthlyLimit === null ? null : config.monthlyLimit * Math.max(storeCount, 1)
    if (limit !== null && (await getGenerationCount(ctx.tenant.id, month)) >= limit) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: '今月の作成回数の上限に達したため、いまは下書きを作れません。お手数ですが、お店のスタッフにお知らせください。',
      })
    }
    const [store] = await db
      .select()
      .from(stores)
      .where(and(eq(stores.id, input.storeId), eq(stores.tenantId, ctx.tenant.id)))
    if (!store) throw new TRPCError({ code: 'BAD_REQUEST', message: '店舗が見つかりません' })
    const menuRows = input.menuIds.length
      ? await db
          .select({ id: menus.id, name: menus.name })
          .from(menus)
          .where(and(inArray(menus.id, input.menuIds), eq(menus.tenantId, ctx.tenant.id)))
      : []
    // 画面で選んだ順に並べる
    const menuNames = input.menuIds
      .map((id) => menuRows.find((m) => m.id === id)?.name)
      .filter((n): n is string => !!n)
    const promptInput: PromptInput = { ...input, storeName: store.name, storeArea: store.area, menuNames }

    const client = getClient()
    const isNegative = NEGATIVE_SATISFACTIONS.includes(input.satisfaction)
    const tones = isNegative ? negativeTones(config.words) : positiveTones(config.words)
    const systemPrompt = buildSystemPrompt(isNegative, config)

    try {
      // 3つのバリエーションを並列で生成
      const variations = await Promise.all(
        tones.map((tone) =>
          generateOne(client, systemPrompt, buildUserPrompt(promptInput, config.words, tone)),
        ),
      )
      const cleaned = variations
        .map((v) => v || '口コミの生成に失敗しました。もう一度お試しください。')
        // デモ版は、文章そのものに印を入れる（画面を通さずに使われても、そのまま投稿できないように）
        .map((v) => (config.demo ? `${DEMO_MARK}\n${v}\n${DEMO_MARK}` : v))
      // 数え損ねても、お客様の下書きは返す
      await addGeneration(ctx.tenant.id, month).catch((e) => console.error('[review.generate] 回数の記録に失敗', e))
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
