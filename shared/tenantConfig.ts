/**
 * お店（契約先）ごとの設定。tenants.config に JSON で入る。
 *
 * 足りない項目は DEFAULT_TENANT_CONFIG（＝Moveact の値）で埋めるので、
 * 新しいお店はヒアリングで変わる所だけ書けばよい。
 * 満足度の選択肢は生成トーンの分岐（不満かどうか）に使うため、ここでは変えさせない。
 */
import { z } from 'zod'

export const SATISFACTION_OPTIONS = ['とても満足', '満足', '普通', '不満', 'とても不満']
export const NEGATIVE_SATISFACTIONS = ['不満', 'とても不満']

const colorsSchema = z.object({
  brand: z.string(),
  brandSoft: z.string(),
  primary: z.string(),
  primaryLight: z.string(),
})

const wordsSchema = z.object({
  /** 「実際に〇〇を受けた方」「〇〇メニュー」の〇〇。例：施術／レッスン／カット */
  service: z.string(),
  /** 「〇〇の雰囲気」の〇〇。例：店内／院内／スタジオ */
  place: z.string(),
  /** 担当者の呼び方。例：施術者／インストラクター／スタイリスト */
  staff: z.string(),
  /** 来店頻度の見出し。例：通院頻度／来店頻度 */
  frequency: z.string(),
})

const optionsSchema = z.object({
  purpose: z.array(z.string()),
  staff: z.array(z.string()),
  atmosphere: z.array(z.string()),
  frequency: z.array(z.string()),
})

export const tenantConfigSchema = z.object({
  /** ヘッダーに大きく出す名前 */
  brandName: z.string(),
  /** ロゴの代わりに四角に入れる1文字 */
  logoLetter: z.string(),
  /** フッターの1行（例：店名 — 所在地） */
  footer: z.string(),
  /** AIに伝える業種（例：鍼灸・ピラティス・整体院） */
  industry: z.string(),
  /** LINE・SNSで共有したときの画像（public/ に置いたファイルのパス）。空なら出さない */
  ogImage: z.string(),
  /**
   * 1か月にAIで下書きを作れる回数（1店舗あたり）。null なら上限なし。
   * 契約書第7条第1号「1店舗につき1か月100回」。お店全体の上限は、これ × 店舗数になる。
   * 上限に達すると、その月はお客様の画面で「作成できません」と表示される。
   */
  monthlyLimit: z.number().int().positive().nullable(),
  /**
   * デモ版（導入前にお見せする用）。true のあいだは、作った文章に「デモ」の印が入り、
   * コピー・Googleマップへの投稿ができない。お店の Google の投稿先も画面に渡さない。
   * 本契約になったら false（または消して）流し直す。
   */
  demo: z.boolean().optional(),
  colors: colorsSchema,
  words: wordsSchema,
  options: optionsSchema,
})

export type TenantConfig = z.infer<typeof tenantConfigSchema>

export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  brandName: 'Moveact',
  logoLetter: 'M',
  footer: 'Moveact — 岡山県倉敷市玉島・浅口市金光町',
  industry: '鍼灸・ピラティス・整体院',
  ogImage: '/ogp.png',
  monthlyLimit: null,
  colors: {
    brand: '#2a2960',
    brandSoft: '#eceaf7',
    primary: 'oklch(0.44 0.09 155)',
    primaryLight: 'oklch(0.52 0.1 155)',
  },
  words: {
    service: '施術',
    place: '店内',
    staff: '施術者',
    frequency: '通院頻度',
  },
  options: {
    purpose: [
      '肩こり・首こり', '腰痛', '頭痛', '姿勢改善',
      '美容・アンチエイジング', 'ダイエット・ボディメイク',
      'スポーツ障害・ケガ', 'ストレス・疲労回復', '産後ケア', 'その他',
    ],
    staff: [
      '丁寧な説明', '技術が高い', '親切・フレンドリー',
      'プロフェッショナル', '話しやすい', '的確なアドバイス',
    ],
    atmosphere: [
      '清潔感がある', '落ち着いた雰囲気', 'アクセスが良い',
      '駐車場が便利', '待ち時間が少ない', '設備が充実',
    ],
    frequency: ['初めて', '数回目', '定期的に通っている', '久しぶり'],
  },
}

/** DBの JSON 文字列を読み、無い項目を既定値で埋める。壊れていても既定値で動かす。 */
export function parseTenantConfig(raw: string | null | undefined): TenantConfig {
  let obj: Record<string, unknown> = {}
  try {
    obj = raw ? JSON.parse(raw) : {}
  } catch {
    console.error('[tenantConfig] config の JSON が壊れているため既定値で動かします')
  }
  const d = DEFAULT_TENANT_CONFIG
  const pick = <T extends object>(base: T, v: unknown): T =>
    v && typeof v === 'object' ? { ...base, ...(v as Partial<T>) } : base
  const merged = {
    ...d,
    ...obj,
    colors: pick(d.colors, obj.colors),
    words: pick(d.words, obj.words),
    options: pick(d.options, obj.options),
  }
  const parsed = tenantConfigSchema.safeParse(merged)
  if (!parsed.success) {
    console.error('[tenantConfig] config の形が正しくないため既定値で動かします', parsed.error.issues)
    return d
  }
  return parsed.data
}
