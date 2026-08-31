/**
 * 月次レポートの自動送信
 *
 * なぜ必要か:
 *   月額をいただく以上、毎月なにかお届けする必要がある。それがこのレポート。
 *   ただし人が毎月コマンドを叩いて送るのでは人件費が乗ってしまうので、
 *   毎月1日の朝に自動で公式LINEへ送る。人の手は入らない。
 *
 * 送り先:
 *   店舗さまの公式LINE（Messaging API のプッシュ）。
 *   環境変数 KUCHIKOMI_LINE_TOKEN（チャネルアクセストークン）と
 *   KUCHIKOMI_LINE_TO（送信先のユーザーID／グループID）が揃ったときだけ動く。
 *   未設定なら何もしない（ログだけ）。
 *
 * 二重送信の防止:
 *   report_deliveries に (month) を UNIQUE で入れてから送る。
 *   サーバーが再起動しても、同じ月を二度送らない。
 */
import { db } from './db'
import { sql } from 'drizzle-orm'

const TZ_OFFSET_MS = 9 * 60 * 60 * 1000 // JST

function jstNow(now = new Date()) {
  return new Date(now.getTime() + TZ_OFFSET_MS)
}

/** 送信対象の月（前月）を YYYY-MM で返す */
export function targetMonth(now = new Date()): string {
  const j = jstNow(now)
  const y = j.getUTCFullYear()
  const m = j.getUTCMonth() // 0-11。前月にするので、そのまま使うと1つ前になる
  const d = new Date(Date.UTC(y, m - 1, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number)
  const from = `${month}-01 00:00:00`
  const next = new Date(Date.UTC(y, m, 1))
  const to = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01 00:00:00`
  return { from, to }
}

export type Report = {
  month: string
  drafts: number
  people: number
  prevDrafts: number
  byStore: { name: string; n: number }[]
  byMenu: { name: string; n: number }[]
  consent: { checked: number; realExperience: number; notRelated: number }
}

export async function buildReport(month: string): Promise<Report> {
  const { from, to } = monthRange(month)
  const one = async (q: any) => (await db.execute(q)) as any

  const total = await one(sql`SELECT COUNT(*) AS n, COUNT(DISTINCT visitor_id) AS people
    FROM review_history WHERE created_at >= ${from} AND created_at < ${to}`)
  const prev = await one(sql`SELECT COUNT(*) AS n FROM review_history
    WHERE created_at >= DATE_SUB(${from}, INTERVAL 1 MONTH) AND created_at < ${from}`)
  const byStore = await one(sql`SELECT store_name AS name, COUNT(*) AS n
    FROM review_history WHERE created_at >= ${from} AND created_at < ${to}
    GROUP BY store_name ORDER BY n DESC`)
  const byMenu = await one(sql`SELECT menu_names AS name, COUNT(*) AS n
    FROM review_history WHERE created_at >= ${from} AND created_at < ${to}
    GROUP BY menu_names ORDER BY n DESC LIMIT 5`)
  const consent = await one(sql`SELECT COUNT(*) AS n,
      SUM(confirmed_real_experience) AS real_exp, SUM(is_not_related) AS not_related
    FROM review_history WHERE created_at >= ${from} AND created_at < ${to}`)

  const rows = (r: any) => (Array.isArray(r) ? (Array.isArray(r[0]) ? r[0] : r) : [])
  const t = rows(total)[0] ?? { n: 0, people: 0 }
  const p = rows(prev)[0] ?? { n: 0 }
  const c = rows(consent)[0] ?? { n: 0, real_exp: 0, not_related: 0 }

  return {
    month,
    drafts: Number(t.n ?? 0),
    people: Number(t.people ?? 0),
    prevDrafts: Number(p.n ?? 0),
    byStore: rows(byStore).map((r: any) => ({ name: String(r.name), n: Number(r.n) })),
    byMenu: rows(byMenu).map((r: any) => ({ name: String(r.name), n: Number(r.n) })),
    consent: {
      checked: Number(c.n ?? 0),
      realExperience: Number(c.real_exp ?? 0),
      notRelated: Number(c.not_related ?? 0),
    },
  }
}

/** LINEのトークに流す文面。長くしすぎない（スマホで読める量に収める） */
export function formatForLine(r: Report): string {
  const [y, m] = r.month.split('-')
  const diff = r.drafts - r.prevDrafts
  const sign = diff > 0 ? '＋' : diff < 0 ? '−' : '±'
  const jp = (n: number) => n.toLocaleString()

  const lines: string[] = []
  lines.push(`${y}年${Number(m)}月のご利用状況`)
  lines.push('')
  lines.push(`口コミの下書きが ${jp(r.drafts)}件 つくられました`)
  lines.push(`ご利用いただいた方 ${jp(r.people)}人`)
  lines.push(`前月（${jp(r.prevDrafts)}件）から ${sign}${jp(Math.abs(diff))}件`)

  if (r.byStore.length > 1) {
    lines.push('')
    lines.push('【店舗別】')
    for (const s of r.byStore) lines.push(`・${s.name}　${jp(s.n)}件`)
  }
  if (r.byMenu.length) {
    lines.push('')
    lines.push('【よく選ばれたメニュー】')
    for (const s of r.byMenu.slice(0, 3)) lines.push(`・${s.name}　${jp(s.n)}件`)
  }
  if (r.consent.checked > 0) {
    lines.push('')
    lines.push('【確認チェックの通過状況】')
    lines.push(`実体験の確認 ${jp(r.consent.realExperience)}/${jp(r.consent.checked)}`)
    lines.push(`関係者でないことの確認 ${jp(r.consent.notRelated)}/${jp(r.consent.checked)}`)
  }
  lines.push('')
  lines.push('※ この数字は「下書きがつくられた回数」です。実際にGoogleマップへ投稿されたかどうかは、こちらでは分かりません。投稿数はGoogleビジネスプロフィールでご確認ください。')

  return lines.join('\n')
}

async function pushLine(text: string): Promise<boolean> {
  const token = process.env.KUCHIKOMI_LINE_TOKEN
  const to = process.env.KUCHIKOMI_LINE_TO
  if (!token || !to) {
    console.log('[MonthlyReport] LINEの設定が無いため送信をスキップ（KUCHIKOMI_LINE_TOKEN / KUCHIKOMI_LINE_TO）')
    return false
  }
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
  })
  if (!res.ok) {
    console.error('[MonthlyReport] LINE送信に失敗', res.status, (await res.text()).slice(0, 200))
    return false
  }
  return true
}

/** 同じ月を二度送らないための記録。先に入れてから送る。 */
async function claimMonth(month: string): Promise<boolean> {
  try {
    await db.execute(sql`INSERT INTO report_deliveries (month, sent_at) VALUES (${month}, NOW())`)
    return true
  } catch {
    return false // UNIQUE制約に当たった＝送信済み
  }
}

async function markResult(month: string, ok: boolean) {
  await db.execute(sql`UPDATE report_deliveries SET status = ${ok ? 'sent' : 'failed'} WHERE month = ${month}`)
}

/**
 * 月次レポートを送る。毎月1日の朝に呼ばれる。
 * @param opts.month 明示指定（省略時は前月）
 * @param opts.force 送信済みでも送る（手動の再送用）
 */
export async function runMonthlyReport(opts: { month?: string; force?: boolean } = {}) {
  const month = opts.month ?? targetMonth()
  if (!opts.force) {
    const claimed = await claimMonth(month)
    if (!claimed) {
      console.log(`[MonthlyReport] ${month} は送信済みのためスキップ`)
      return { skipped: true, month }
    }
  }
  const report = await buildReport(month)
  const text = formatForLine(report)
  const ok = await pushLine(text)
  if (!opts.force) await markResult(month, ok)
  console.log(`[MonthlyReport] ${month} 下書き${report.drafts}件 送信=${ok ? '成功' : '未送信'}`)
  return { skipped: false, month, sent: ok, drafts: report.drafts }
}

/**
 * スケジューラ。毎月1日 9:00 JST に送る。
 * 1時間ごとに時刻を見るだけの素朴な方式（node-cronを足さずに済ませる）。
 * 起動直後にも1回見るので、1日にサーバーが再起動しても取りこぼさない。
 */
export function initMonthlyReportScheduler() {
  const tick = async () => {
    const j = jstNow()
    if (j.getUTCDate() !== 1 || j.getUTCHours() !== 9) return
    try {
      await runMonthlyReport()
    } catch (e) {
      console.error('[MonthlyReport] 実行エラー', e)
    }
  }
  // 起動時に1回＋以後1時間ごと
  setTimeout(tick, 20_000)
  const timer = setInterval(tick, 60 * 60 * 1000)
  if (timer.unref) timer.unref()
  console.log('[MonthlyReport] スケジューラを開始（毎月1日 9:00 JST）')
}
